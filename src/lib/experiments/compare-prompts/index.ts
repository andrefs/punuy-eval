import fs from "fs/promises";
import oldFs from "fs";
import logger from "../../logger";
import pp from "not-a-log";

import {
  ExpVarMatrix,
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  TrialsResult,
  genValueCombinations,
  getVarIds,
} from "..";
import {
  ComparisonGroup,
  RawResult,
  evalScores,
  getFixedValueGroup,
  parseToRawResults,
} from "./aux";
import prompts from "./prompts";
export const name = "compare-prompts";
const description = "Compare the results obtained with different prompts";

const resultSchema = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          words: { type: "array", items: { type: "string" } },
          score: { type: "string" },
        },
      },
    },
  },
};

async function runTrial(vars: ExpVarsFixedPrompt) {
  const f = {
    name: "evaluate_scores",
    description: "Evaluate the word similarity or relatedness scores",
    parameters: resultSchema,
  };
  const res = await vars.model.makeRequest(vars.prompt.text, { function: f });
  return res;
}

async function runTrials(
  vars: ExpVarsFixedPrompt,
  trials: number
): Promise<TrialsResult> {
  logger.info(
    `Running experiment ${name} ${trials} times on model ${vars.model.id}.`
  );
  logger.debug(`Prompt (${vars.prompt.id}): ${vars.prompt.text}`);

  const results: string[] = [];
  for (let i = 0; i < trials; i++) {
    logger.info(`    trial #${i + 1} of ${trials}`);
    const res = await runTrial(vars);
    results.push(
      res.type === "openai"
        ? res.data.choices[0].message.tool_calls?.[0].function.arguments || ""
        : ""
    );
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

  const expData: ExperimentData = {
    meta: {
      name,
      traceId: traceId ?? Date.now(),
      schema: resultSchema,
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
      const filtDatasets = variables.dataset.filter(
        d =>
          d.metadata.languages.some(dsl => dsl === l.id) &&
          d.partitions[0].measureType === mt.id
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
        dataset: filtDatasets,
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

function failedMoreThanHalf(
  failed: number[],
  parsed: (RawResult[] | null)[],
  traceId: number
) {
  if (failed.length > parsed.length / 2) {
    logger.error(
      `Failed to parse the results of more than half of the trials for experiment ${traceId}.`
    );
    return true;
  }
  return false;
}

function warnIfFailed(failed: number[], exp: ExperimentData) {
  if (failed.length > 0) {
    logger.warn(
      `Failed to parse results of ${failed.length}/${exp.results.raw.length} (${failed}) results for experiment ${exp.meta.traceId}.`
    );
  }
}

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
function expEvalScores(exps: ExperimentData[]): ExpScore[] {
  const res = [];
  for (const exp of exps) {
    const { parsed, failed } = parseToRawResults(exp.results.raw);
    if (failedMoreThanHalf(failed, parsed, exp.meta.traceId)) {
      continue;
    }
    warnIfFailed(failed, exp);

    const corr = evalScores(
      (exp.variables as ExpVarsFixedPrompt).prompt.pairs!,
      exp.variables.dataset,
      parsed.filter(x => x !== null) as RawResult[][]
    );
    res.push({
      variables: exp.variables,
      corr,
    });
  }
  return res;
}

function calcVarValues(exps: ExperimentData[]) {
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
      `Exp with variables ${JSON.stringify(getVarIds(expScore.variables))} has correlation ${expScore.corr.pcorr}.`
    );
  }
}

async function validate(exps: ExperimentData[]) {
  const expScores = expEvalScores(exps);
  const { varValues, varNames } = calcVarValues(exps);

  logExpScores(expScores);

  const comparisons = [];
  for (const [i, v1] of varNames.entries()) {
    for (const v2 of varNames.slice(i + 1)) {
      if (varValues[v1].size === 1 && varValues[v2].size === 1) {
        // No need to compare if both variables have only one value
        continue;
      }

      let compGroups = [] as ComparisonGroup[];
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
    const tablePP = pp.table(comp.data);
    logger.info(
      `Comparing ${comp.variables.map(v => `[${v}]`).join(" and ")} with fixed variables ${JSON.stringify(comp.fixedValueConfig)}\n${tablePP}`
    );
  }
}

export async function saveExperimentData(data: ExperimentData) {
  const ts = data.meta.traceId;
  const dsId = data.variables.dataset.id;
  const promptId = data.variables.prompt.id;
  const expName = data.meta.name;
  const modelId = data.variables.model.id;
  const rootFolder = "./results";
  const filename = `${rootFolder}/${ts}_${expName}_${promptId}_${dsId}_${modelId}.json`;
  const json = JSON.stringify(data, null, 2);

  logger.info(
    `Saving experiment ${data.meta.name} with traceId ${
      data.meta.traceId
    } to ${filename}. It ran ${
      data.results.raw.length
    } times with variables ${JSON.stringify(getVarIds(data.variables))}.`
  );

  if (!oldFs.existsSync(rootFolder)) {
    await fs.mkdir(rootFolder);
  }

  await fs.writeFile(filename, json);
}

const ComparePromptsExperiment = {
  name,
  description,
  prompts,
  schema: resultSchema,
  performMulti,
  validate,
};

export default ComparePromptsExperiment;
