import { Model, ModelTool } from "src/lib/models";
import Experiment, {
  ExpVarsFixedPrompt,
  GenericExpTypes,
  TrialOpts,
  TrialResult,
  TurnPrompt,
  TurnResponseNotOk,
  TurnResponseOk,
  Usages,
} from ".";
import logger from "../../logger";
import { addUsage } from "./aux";
import {
  ExceptionThrown,
  InvalidData,
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
  ValidData,
} from "src/lib/evaluation";
import { delay } from "src/lib/utils";
import { saveFailedPairsCache } from "./failed-pairs-cache";

export async function iterateConversation<T extends GenericExpTypes>(
  this: Experiment<T>,
  vars: ExpVarsFixedPrompt,
  tool: ModelTool,
  opts: TrialOpts = { maxConvAttempts: 3, maxTurnRetries: 3 }
) {
  const totalUsage: Usages = {};
  const prompts = vars.prompt.turns;

  const failedAttempts: TurnResponseNotOk<T>[][] = [];
  const failedPairs: [string, string][][] = [];

  //CONV_ATTEMPTS_LOOP:
  while (failedAttempts.length < opts.maxConvAttempts) {
    const faCount = failedAttempts.length;
    logger.info(`    💬 conversation attempt #${faCount + 1}`);
    const turnsRes = [];
    TURNS_LOOP: for (const turnPrompt of prompts) {
      const tRes = await this.getTurnResponse(
        vars.model,
        turnPrompt,
        tool,
        opts.maxTurnRetries // max turn response attempts
      );
      addUsage(totalUsage, tRes.usage);
      //if (tRes.ok) {
      if (!tRes.ok) {
        failedPairs.push(tRes.turnPrompt.pairs);
      }
      turnsRes.push(tRes);
      continue TURNS_LOOP; // continue next turn
      //}
      //logger.warn(
      //  `    ❗ conversation attempt #${faCount + 1} failed: ${tRes.failedAttempts.map(fa => fa.type)}`
      //);
      //failedAttempts[faCount] = failedAttempts[faCount] || [];
      //failedAttempts[faCount].push(tRes);
      //continue CONV_ATTEMPTS_LOOP; // start new conversation attempt
    }
    logger.info(`    ✅ conversation attempt #${faCount + 1} succeeded.`);

    // reached end of turns, conversation succeeded
    const res: TrialResult<T["Data"]> = {
      promptId: vars.prompt.id,
      turnPrompts: turnsRes.map(t => t.turnPrompt),
      result: turnsRes.map(t => t.result) as ValidData<T["Data"]>[],
      totalTries: failedAttempts.length,
      usage: totalUsage,
      failedAttempts,
      ok: true,
    };

    await saveFailedPairsCache(failedPairs, this.folder);
    return res;
  }

  // reached max attempts, conversation failed
  await saveFailedPairsCache(failedPairs, this.folder);

  const res: TrialResult<T["Data"]> = {
    promptId: vars.prompt.id,
    turnPrompts: failedAttempts
      .sort((a, b) => b.length - a.length)[0]
      .map(t => t.turnPrompt),
    totalTries: failedAttempts.length,
    usage: totalUsage,
    failedAttempts,
    ok: false,
  };
  return res;
}

export async function getTurnResponse<T extends GenericExpTypes>(
  this: Experiment<T>,
  model: Model,
  prompt: TurnPrompt,
  tool: ModelTool,
  maxTurnRetries: number = 3
) {
  const totalUsage: Usages = {};
  const failedAttempts = [];
  logger.info(
    `      👥 ${prompt.pairs.length === 1 ? "pair" : "pairs"} ` +
    prompt.pairs.map(p => `[${p[0]}, ${p[1]}]`).join(", ")
  );
  while (failedAttempts.length < maxTurnRetries) {
    const faCount = failedAttempts.length;
    logger.info(`        💪 pairs attempt #${faCount + 1} `);
    const { result: attemptResult, usage } = await this.tryResponse(
      model,
      prompt.text,
      tool
    );

    addUsage(totalUsage, usage);
    if (attemptResult instanceof ValidData) {
      logger.info(`          pairs attempt #${faCount + 1} succeeded.`);
      const res: TurnResponseOk<T["Data"]> = {
        turnPrompt: prompt,
        failedAttempts,
        ok: true,
        usage: totalUsage,
        result: attemptResult,
      };
      return res;
    }
    const dataStr =
      typeof attemptResult.data === "string"
        ? attemptResult.data
        : JSON.stringify(attemptResult.data);
    logger.warn(
      `        ✖  pairs attempt #${faCount + 1} failed: ${attemptResult.type} (data: ${dataStr?.substring(0, 10_000)}${dataStr?.length > 10_000 ? "..." : ""})`
    );
    failedAttempts.push(attemptResult);

    // add exponential backoff if the number of failed attempts is less than the max
    if (failedAttempts.length < maxTurnRetries) {
      await new Promise(resolve => {
        logger.info(
          `      ⌛ waiting for ${Math.pow(
            2,
            faCount
          )} seconds before retrying.`
        );
        setTimeout(resolve, Math.pow(2, faCount) * 1000);
      });
    }
  }

  const res: TurnResponseNotOk<T["Data"]> = {
    turnPrompt: prompt,
    usage: totalUsage,
    failedAttempts,
    ok: false,
  };
  return res;
}

export async function tryResponse<T extends GenericExpTypes>(
  this: Experiment<T>,
  model: Model,
  prompt: string,
  params: ModelTool,
  customPredicate?: (value: T["Data"]) => boolean
) {
  let result;
  let data;
  let usage;

  if (model?.reqDelayMs) {
    logger.trace(
      `       ⏳ waiting for ${model.reqDelayMs} ms (provider rate limit) before making request.`
    );
    await delay(model.reqDelayMs!);
  }
  try {
    result = await model.makeRequest(prompt, params);
    usage = result?.usage;
    data = result.getDataText();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return {
      result: new ExceptionThrown(),
      usage: undefined,
    };
  }

  if (!data.trim()) {
    return { result: new NoData(), usage };
  }
  try {
    const parsed = JSON.parse(data);
    const got = this.fixParsedJson ? this.fixParsedJson(parsed) : parsed;

    if (!this.validateSchema(got)) {
      return {
        result: new JsonSchemaError(data),
        usage,
      };
    }
    return {
      result:
        !customPredicate || customPredicate(got)
          ? new ValidData(got)
          : new InvalidData(got),
      usage,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return { result: new JsonSyntaxError(data), usage };
  }
}
