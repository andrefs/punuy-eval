import logger from "src/lib/logger";
import { renderTable } from "console-table-printer";
import { type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import {
  ExpVarMatrix,
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenericExpTypes,
  TrialResult,
  TrialsResultData,
} from "..";
import { ComparisonGroup, evalScores, getFixedValueGroup } from "./aux";
import prompts from "./prompts";
import {
  genValueCombinations,
  getVarIds,
  saveExperimentData,
} from "../experiment/aux";
import { Model, ModelTool } from "src/lib/models";
import {
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
  ValidData,
} from "src/lib/evaluation";
import { PairScoreList } from "../experiment/types";
import query from "./query";
export const name = "compare-prompts";
const description = "Compare the results obtained with different prompts";

const validateSchema = (value: unknown): value is ExpTypes["Data"] =>
  Value.Check(query.responseSchema, value);
interface ExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
  Evaluation: ComparisonGroup[];
}

async function tryResponse(model: Model, prompt: string, params: ModelTool) {
  const result = await model.makeRequest(prompt, params);

  const data = result.getDataText();
  if (!data.trim()) {
    return new NoData();
  }
  try {
    const got = JSON.parse(data) as ExpTypes["Data"];
    if (!validateSchema(got)) {
      return new JsonSchemaError(data);
    }
    return new ValidData(got);
  } catch (e) {
    return new JsonSyntaxError(data);
  }
}

async function getResponse(
  model: Model,
  prompt: string,
  tool: ModelTool,
  maxRetries = 3
) {
  const failedAttempts = [];
  while (failedAttempts.length < maxRetries) {
    logger.info(`      attempt #${failedAttempts.length + 1}`);
    const attemptResult = await tryResponse(model, prompt, tool);
    if (attemptResult instanceof ValidData) {
      logger.info(`      attempt #${failedAttempts.length + 1} succeeded.`);
      const res: TrialResult<ExpTypes["Data"]> = {
        totalTries: failedAttempts.length + 1,
        failedAttempts,
        ok: true,
        result: attemptResult,
      };
      return res;
    }
    logger.warn(
      `      attempt #${failedAttempts.length + 1} failed: ${
        attemptResult.type
      }`
    );
    failedAttempts.push(attemptResult);
  }

  const res: TrialResult<ExpTypes["Data"]> = {
    totalTries: failedAttempts.length,
    failedAttempts,
    ok: false,
  };
  return res;
}

async function runTrial(vars: ExpVarsFixedPrompt, maxRetries = 3) {
  const tool = {
    name: "evaluate_scores",
    description: "Evaluate the word similarity or relatedness scores",
    schema: query.toolSchema,
  };

  const res = await getResponse(vars.model, vars.prompt.text, tool, maxRetries);
  return res;
}

async function runTrials(
  vars: ExpVarsFixedPrompt,
  trials: number
): Promise<TrialsResultData<ExpTypes["Data"]>> {
  logger.info(
    `Running experiment ${name} ${trials} times on model ${vars.model.id}.`
  );
  logger.debug(`Prompt (${vars.prompt.id}): ${vars.prompt.text}`);

  const results: ExpTypes["Data"][] = [];
  for (let i = 0; i < trials; i++) {
    logger.info(`    trial #${i + 1} of ${trials}`);
    const res = await runTrial(vars);
    if (res.ok && res.result) {
      results.push(res.result.data);
    }
  }
  return {
    variables: vars,
    data: results,
  };
}

async function perform(vars: ExpVars, trials: number, traceId?: number) {
  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  const varsFixedPrompt = { ...vars, prompt } as ExpVarsFixedPrompt;
  const trialsRes = await runTrials(varsFixedPrompt, trials);

  const expData: ExperimentData<ExpTypes> = {
    meta: {
      trials,
      name,
      traceId: traceId ?? Date.now(),
      queryData: query,
    },
    variables: varsFixedPrompt,
    results: {
      raw: trialsRes.data,
    },
  };

  await saveExperimentData(expData);
  return expData;
}

async function performMulti(variables: ExpVarMatrix, trials: number) {
  if (!variables?.prompt?.length) {
    variables.prompt = prompts;
  }

  const varCombs = [];
  const res = [];

  for (const l of [{ id: "en" as const }, { id: "pt" as const }]) {
    for (const mt of [
      { id: "similarity" } as const,
      { id: "relatedness" as const },
    ]) {
      const filtPrompts = variables.prompt.filter(
        p => p.language === l.id && p.type === mt.id
      );
      const filtDatasets = variables.dpart.filter(
        d => d.language === l.id && d.measureType === mt.id
      );
      if (filtPrompts.length === 0 || filtDatasets.length === 0) {
        logger.warn(
          `No prompts or datasets for language [${l}] and measure type [${mt}]. Skipping.`
        );
        continue;
      }
      logger.info(
        `Running experiments for language [${l}] and measure type [${mt}]`
      );
      const vm: ExpVarMatrix = {
        ...variables,
        prompt: filtPrompts,
        dpart: filtDatasets,
        language: [l],
        measureType: [mt],
      };
      varCombs.push(...genValueCombinations(vm));
    }
  }
  logger.info(
    `Preparing to run experiment ${name}, ${trials} times on each variable combination:\n${varCombs
      .map(vc => "\t" + JSON.stringify(getVarIds(vc)))
      .join(",\n")}.`
  );
  for (const vc of varCombs) {
    res.push(await perform(vc, trials, Date.now()));
  }
  return res;
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

interface ExpScore {
  variables: ExpVars;
  corr: ReturnType<typeof evalScores>;
}

/**
 * Evaluate the scores of the experiments
 * Correlate results of each experiment with its dataset
 * @param exps - The experiments to evaluate
 * @returns The evaluated scores
 * @throws {Error} If more than half of the trials failed to parse
 */
function expEvalScores(exps: ExperimentData<ExpTypes>[]): ExpScore[] {
  const res = [];
  for (const exp of exps) {
    const lcPairs = (exp.variables as ExpVarsFixedPrompt).prompt.pairs!.map(
      p => [p[0].toLowerCase(), p[1].toLowerCase()] as [string, string]
    );

    const rawResults: PairScoreList[] = exp.results.raw.map(r => {
      return r.scores as PairScoreList;
    });
    const corr = evalScores(lcPairs, exp.variables.dpart, rawResults);
    res.push({
      variables: exp.variables,
      corr,
    });
  }
  return res;
}

function calcVarValues(exps: ExperimentData<ExpTypes>[]) {
  const varValues: { [key: string]: Set<string> } = {};
  for (const r of exps) {
    for (const v in r.variables) {
      if (!varValues[v]) {
        varValues[v] = new Set();
      }
      const value = r.variables[v as keyof ExpVars]!;
      varValues[v].add(value.id);
    }
  }
  const varNames = Object.keys(varValues).sort() as (keyof ExpVars)[];
  return { varValues, varNames };
}

function logExpScores(expScores: ExpScore[]) {
  for (const expScore of expScores) {
    logger.info(
      `Exp with variables ${JSON.stringify(
        getVarIds(expScore.variables)
      )} has correlation ${expScore.corr.pcorr}.`
    );
  }
}

async function evaluate(exps: ExperimentData<ExpTypes>[]) {
  const expScores = expEvalScores(exps);
  const { varValues, varNames } = calcVarValues(exps);

  logExpScores(expScores);

  const comparisons: ExpTypes["Evaluation"] = [];
  for (const [i, v1] of varNames.entries()) {
    for (const v2 of varNames.slice(i + 1)) {
      if (varValues[v1].size === 1 && varValues[v2].size === 1) {
        // No need to compare if both variables have only one value
        continue;
      }

      let compGroups = [] as ExpTypes["Evaluation"];
      const fixedNames = varNames.filter(v => v !== v1 && v !== v2);

      for (const expScore of expScores) {
        const v1Val = expScore.variables[v1]!.id;
        const v2Val = expScore.variables[v2]!.id;
        const corr = Number(expScore.corr.pcorr.toFixed(3));

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

      // keep only groups with more than one value for each variable
      compGroups = compGroups.filter(
        g =>
          Object.keys(g.data).length > 1 &&
          Object.keys(g.data).every(k => Object.keys(g.data[k]).length > 1)
      );

      comparisons.push(...compGroups);
    }
  }

  for (const comp of comparisons) {
    const table = Object.entries(comp.data).map(([v1, v2s]) => {
      return { "(index)": v1, ...v2s };
    });
    const tablePP = renderTable(table);
    logger.info(
      `Comparing ${comp.variables
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
