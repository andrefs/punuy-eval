/* eslint-disable @typescript-eslint/no-unused-vars */
import logger from "src/lib/logger";
import { renderTable } from "console-table-printer";
import { type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import {
  ExpVarMatrix,
  ExpVars,
  ExperimentData,
  GenericExpTypes,
  TrialResult,
  TrialsResultData,
} from "..";
import { evalScores } from "./aux";
import prompts from "./prompts";
import {
  ComparisonGroup,
  getFixedValueGroup,
  calcVarValues,
  getVarIds,
  saveExpVarCombData,
  addUsage,
  splitVarCombsMTL,
} from "../experiment/aux";
import { Model, ModelTool } from "src/lib/models";
import {
  ExceptionThrown,
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
  ValidData,
} from "src/lib/evaluation";
import {
  ExpScore,
  ExpVarsFixedPrompt,
  PairScoreList,
  TurnPrompt,
  TurnResponse,
  TurnResponseNotOk,
  TurnResponseOk,
  Usages,
} from "../experiment/types";
import query from "./query";
export const name = "compare-prompts";
const description = "Compare the results obtained with different prompts";

const validateSchema = (value: unknown): value is CPExpTypes["Data"] =>
  Value.Check(query.responseSchema, value);
export interface CPExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
  Evaluation: ComparisonGroup[];
}

async function tryResponse(model: Model, prompt: string, params: ModelTool) {
  let result;
  let usage;
  let data;
  try {
    result = await model.makeRequest(prompt, params);
    usage = result?.usage;
    data = result.getDataText();
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
    const got = JSON.parse(data) as CPExpTypes["Data"];
    if (!validateSchema(got)) {
      return { result: new JsonSchemaError(data), usage };
    }
    return { result: new ValidData(got), usage };
  } catch (e) {
    return { result: new JsonSyntaxError(data), usage };
  }
}

async function getTurnResponse(
  model: Model,
  prompt: TurnPrompt,
  tool: ModelTool,
  maxTurnAttempts = 3
): Promise<TurnResponse<CPExpTypes["Data"]>> {
  const totalUsage: Usages = {};
  const failedAttempts = [];
  while (failedAttempts.length < maxTurnAttempts) {
    const faCount = failedAttempts.length;
    logger.info(`        💪 attempt #${faCount + 1}`);
    const tryResp = await tryResponse(model, prompt.text, tool);
    addUsage(totalUsage, tryResp.usage);
    if (tryResp.result instanceof ValidData) {
      logger.info(`        ✔️  attempt #${faCount + 1} succeeded.`);
      const res: TurnResponseOk<CPExpTypes["Data"]> = {
        turnPrompt: prompt,
        failedAttempts,
        ok: true,
        usage: totalUsage,
        result: tryResp.result,
      };
      return res;
    }
    logger.warn(
      `         👎 attempt #${faCount + 1} failed: ${tryResp.result.type}`
    );
    failedAttempts.push(tryResp.result);

    if (failedAttempts.length < maxTurnAttempts) {
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

  const res: TurnResponseNotOk<CPExpTypes["Data"]> = {
    turnPrompt: prompt,
    usage: totalUsage,
    failedAttempts,
    ok: false,
  };
  return res;
}

async function iterateConversation(
  vars: ExpVarsFixedPrompt,
  tool: ModelTool,
  maxAttempts: number = 3
) {
  const totalUsage: Usages = {};
  const prompts = vars.prompt.turns;

  const failedAttempts: TurnResponseNotOk<CPExpTypes["Data"]>[][] = [];
  while (failedAttempts.length < maxAttempts) {
    const faCount = failedAttempts.length;
    logger.info(`    💬 conversation attempt #${faCount + 1}`);
    const tRes = await getTurnResponse(
      vars.model,
      prompts[0],
      tool,
      3 // max turn response attempts
    );
    addUsage(totalUsage, tRes.usage);
    if (tRes.ok) {
      const res: TrialResult<CPExpTypes["Data"]> = {
        promptId: vars.prompt.id,
        turnPrompts: [tRes.turnPrompt],
        result: [tRes.result] as ValidData<CPExpTypes["Data"]>[],
        totalTries: failedAttempts.length,
        usage: totalUsage,
        failedAttempts,
        ok: true,
      };
      return res;
    }
    logger.warn(
      `    ❗ conversation attempt #${faCount + 1} failed: ${tRes.failedAttempts.map(fa => fa.type)}`
    );
    failedAttempts[faCount] = failedAttempts[faCount] || [];
    failedAttempts[faCount].push(tRes);
    logger.info(`    ✅ conversation attempt #${faCount + 1} succeeded.`);
  }

  const res: TrialResult<CPExpTypes["Data"]> = {
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

async function runTrial(
  vars: ExpVars,
  maxRetries = 3
): Promise<TrialResult<CPExpTypes["Data"]>> {
  const tool = {
    name: "evaluate_scores",
    description: "Evaluate the word similarity or relatedness scores",
    schema: query.toolSchema,
  };
  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  logger.debug(`Prompt ${prompt.id}`);

  const res = await iterateConversation({ ...vars, prompt }, tool, maxRetries);

  return res;
}

async function runTrials(
  vars: ExpVars,
  numTrials: number
): Promise<TrialsResultData<CPExpTypes["Data"]>> {
  const totalUsage: Usages = {};
  logger.info(
    `Running experiment ${name} ${numTrials} times on model ${vars.model.id}.`
  );

  const trials = [];
  for (let i = 0; i < numTrials; i++) {
    logger.info(`   ⚔️  trial #${i + 1} of ${numTrials}`);
    const trialRes = await runTrial(vars);
    addUsage(totalUsage, trialRes.usage);
    const turns = [];
    if (trialRes.ok && trialRes.result?.[0].data) {
      turns.push({
        data: trialRes.result[0].data,
        prompt: trialRes.turnPrompts[0],
      });
      trials.push({ turns });
    }
  }
  return {
    variables: vars,
    usage: totalUsage,
    trials,
  };
}

async function perform(
  vars: ExpVars,
  trials: number,
  traceId: number,
  folder: string
) {
  const trialsRes = await runTrials(vars, trials);

  const expData: ExperimentData<CPExpTypes> = {
    meta: {
      trials,
      name,
      traceId,
      queryData: query,
    },
    variables: vars,
    usage: trialsRes.usage,
    results: {
      raw: trialsRes.trials,
    },
  };

  await saveExpVarCombData(expData, folder);
  return expData;
}

async function performMulti(
  variables: ExpVarMatrix,
  trials: number,
  folder: string
) {
  if (!variables?.prompt?.length) {
    variables.prompt = prompts;
  }
  const totalUsage: Usages = {};
  const varCombs = splitVarCombsMTL(variables);

  const res = [];
  logger.info(
    `Preparing to run experiment ${name}, ${trials} times on each variable combination (${varCombs.length
    }):\n${varCombs
      .map(vc => "\t" + JSON.stringify(getVarIds(vc)))
      .join(",\n")}.`
  );
  for (const vc of varCombs) {
    res.push(await perform(vc, trials, Date.now(), folder));
    addUsage(totalUsage, res[res.length - 1].usage);
  }
  return {
    experiments: res,
    usage: totalUsage,
  };
}

//function failedMoreThanHalf(
//  failed: number[],
//  parsed: (RawResult[] | null)[],
//  traceId: number
//) {
//  if (failed.length > parsed.length / 2) {
//    logger.error(
//      `Failed to parse the results of more than half of the trials for experiment ${traceId}.`
//    );
//    return true;
//  }
//  return false;
//}
//
//function warnIfFailed(failed: number[], exp: ExperimentData) {
//  if (failed.length > 0) {
//    logger.warn(
//      `Failed to parse results of ${failed.length}/${exp.results.raw.length} (${failed}) results for experiment ${exp.meta.traceId}.`
//    );
//  }
//}

/**
 * Evaluate the scores of the experiments
 * Correlate results of each experiment with its dataset
 * @param exps - The experiments to evaluate
 * @returns The evaluated scores
 * @throws {Error} If more than half of the trials failed to parse
 */
function expEvalScores(exps: ExperimentData<CPExpTypes>[]): ExpScore[] {
  const res = [];
  for (const [i, exp] of exps.entries()) {
    for (const trial of exp.results.raw) {
      const lcPairs = trial.turns
        .flatMap(({ prompt }) => prompt.pairs)
        .map(p => [p[0].toLowerCase(), p[1].toLowerCase()] as [string, string]);

      const rawResults: PairScoreList = trial.turns.flatMap(({ data }) =>
        data.scores.map(s => ({
          words: s.words as [string, string],
          score: s.score,
        }))
      );

      try {
        const corr = evalScores(lcPairs, exp.variables.dpart, rawResults);
        res.push({
          variables: exp.variables,
          score: corr!.pcorr,
        });
      } catch (e) {
        logger.warn(
          `Error calculating correlation for expVC ${i} with variables ${JSON.stringify(
            getVarIds(exp.variables)
          )}: ${e}`
        );
      }
    }
  }
  return res;
}

function logExpScores(expScores: ExpScore[]) {
  for (const expScore of expScores) {
    logger.info(
      `Exp with variables ${JSON.stringify(
        getVarIds(expScore.variables)
      )} has correlation ${expScore.score}.`
    );
  }
}

async function evaluate(exps: ExperimentData<CPExpTypes>[]) {
  const expScores = expEvalScores(exps);
  const { varNames } = calcVarValues(exps);

  logExpScores(expScores);

  const comparisons: CPExpTypes["Evaluation"] = [];
  for (const [i, v1] of varNames.entries()) {
    for (const v2 of varNames.slice(i + 1)) {
      //if (varValues[v1].size === 1 && varValues[v2].size === 1) {
      //  // No need to compare if both variables have only one value
      //  continue;
      //}

      let compGroups = [] as CPExpTypes["Evaluation"];
      const fixedNames = varNames.filter(v => v !== v1 && v !== v2);

      for (const expScore of expScores) {
        const v1Val = expScore.variables[v1]!.id;
        const v2Val = expScore.variables[v2]!.id;
        const corr = Number(expScore.score.toFixed(3));

        const group = getFixedValueGroup(
          compGroups,
          expScore.variables,
          fixedNames,
          v1,
          v2
        );

        group.data[v1Val] = group.data[v1Val] || {};
        group.data[v1Val][v2Val] = corr;
      }

      if (compGroups.length > 1) {
        // keep only groups with more than one value for each variable
        compGroups = compGroups.filter(
          g =>
            Object.keys(g.data).length > 1 &&
            Object.keys(g.data).every(k => Object.keys(g.data[k]).length > 1)
        );
      }

      comparisons.push(...compGroups);
    }
  }

  for (const comp of comparisons) {
    const table = Object.entries(comp.data).map(([v1, v2s]) => {
      return { "(index)": v1, ...v2s };
    });
    const tablePP = renderTable(table);
    logger.info(
      `🆚 Comparing ${comp.variables
        .map(v => `[${v}]`)
        .join(" and ")} with fixed variables ${JSON.stringify(
          comp.fixedValueConfig
        )}\n${tablePP}`
    );
  }

  return comparisons;
}

const ComparePromptsExperiment = {
  name,
  description,
  prompts,
  query,
  performMulti,
  evaluate,
};

export default ComparePromptsExperiment;
