import { Model, ModelTool } from "src/lib/models";
import Experiment, {
  ExpVarsFixedPrompt,
  GenericExpTypes,
  TurnPrompt,
  TurnResponseNotOk,
  TurnResponseOk,
  TurnResponses,
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

/**
 * Iterates through all turns which make up a trial of the experiment.
 */
export async function iterateConversation<T extends GenericExpTypes>(
  this: Experiment<T>,
  vars: ExpVarsFixedPrompt,
  tool: ModelTool
): Promise<TurnResponses<T["Data"]>> {
  const totalUsage: Usages = {};
  const prompts = vars.prompt.turns;
  const turnsRes = [];
  logger.debug(`    🛞 ${prompts.length} turns.`);

  for (const [i, turnPrompt] of prompts.entries()) {
    logger.info(`       ↪️ turn ${i + 1}/${prompts.length}`);
    const tRes = await this.getTurnResponse(vars.model, turnPrompt, tool);
    addUsage(totalUsage, tRes.usage);
    turnsRes.push(tRes);
  }
  logger.info(`     💬✔️ trial attempt finished.`);
  return turnsRes;
}

export async function getTurnResponse<T extends GenericExpTypes>(
  this: Experiment<T>,
  model: Model,
  prompt: TurnPrompt,
  tool: ModelTool
) {
  const totalUsage: Usages = {};
  logger.info(
    `         👥 ${prompt.pairs.length} ${prompt.pairs.length === 1 ? "pair" : "pairs"} ` +
      prompt.pairs.map(p => `[${p[0]}, ${p[1]}]`).join(", ")
  );
  const { result: attemptResult, usage } = await this.tryResponse(
    model,
    prompt.text,
    tool
  );
  addUsage(totalUsage, usage);
  if (attemptResult instanceof ValidData) {
    logger.info(`         pairs scoring succeeded.`);
    const res: TurnResponseOk<T["Data"]> = {
      turnPrompt: prompt,
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
    `       ✖  pairs scoring failed: ${attemptResult.type} (data: ${dataStr?.substring(0, 10_000)}${dataStr?.length > 10_000 ? "..." : ""})`
  );

  const res: TurnResponseNotOk<T["Data"]> = {
    turnPrompt: prompt,
    usage: totalUsage,
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
