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
import { RawResult, evalScores, parseToRawResults } from "./aux";
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

  for (const l of ["en" as const, "pt" as const]) {
    for (const mt of ["similarity" as const, "relatedness" as const]) {
      const filtPrompts = variables.prompt.filter(
        p => p.language === l && p.type === mt
      );
      const filtDatasets = variables.dataset.filter(
        d =>
          d.metadata.languages.some(dsl => dsl === l) &&
          d.partitions[0].measureType === mt
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

async function validate(exps: ExperimentData[]) {
  const res = [];
  for (const exp of exps) {
    const { parsed, failed } = parseToRawResults(exp.results.raw);
    if (failed.length > parsed.length / 2) {
      logger.error(
        `Failed to parse the results of more than half of the trials for experiment ${exp.meta.traceId}.`
      );
      continue;
    }
    if (failed.length > 0) {
      logger.warn(
        `Failed to parse results of ${failed.length}/${exp.results.raw.length} (${failed}) results for experiment ${exp.meta.traceId}.`
      );
    }

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

  const comparisons = [];

  const varValues: { [key: string]: Set<string> } = {};
  for (const r of res) {
    for (const v in r.variables) {
      if (!varValues[v]) {
        varValues[v] = new Set();
      }
      varValues[v].add(r.variables[v as keyof ExpVars].id);
    }
  }

  const varNames = Object.keys(varValues) as (keyof ExpVars)[];
  for (let i = 0; i < varNames.length; i++) {
    const v1 = varNames[i];
    for (let j = i + 1; j < varNames.length; j++) {
      const v2 = varNames[j];
      if (varValues[v1].size === 1 && varValues[v2].size === 1) {
        continue;
      }
      const fixed = varNames.filter(v => v !== v1 && v !== v2);

      //const compV1V2 = [] as typeof res;
      const compV1V2 = {} as {
        [key: string]: { [key: string]: number };
      };
      const fixedValues = {} as { [key: string]: string };
      for (let k = 0; k < res.length; k++) {
        const r = res[k];
        if (k === 0) {
          for (const f of fixed) {
            fixedValues[f] = r.variables[f].id;
          }
          compV1V2[r.variables[v1].id] = {};
          compV1V2[r.variables[v1].id][r.variables[v2].id] = Number(
            r.corr.pcorr.toFixed(3)
          );
          continue;
        }
        if (fixed.some(f => r.variables[f].id !== fixedValues[f])) {
          continue;
        }
        compV1V2[r.variables[v1].id] = compV1V2[r.variables[v1].id] || {};
        compV1V2[r.variables[v1].id][r.variables[v2].id] = Number(
          r.corr.pcorr.toFixed(3)
        );
      }
      if (
        Object.keys(compV1V2).length === 1 &&
        Object.keys(compV1V2[Object.keys(compV1V2)[0]]).length === 1
      ) {
        continue;
      }
      console.log("XXXXXXXXXXXXX 1", JSON.stringify(compV1V2, null, 2));

      comparisons.push({
        variables: [v1, v2],
        fixed: fixedValues,
        data: compV1V2,
      });
    }
  }

  for (const comp of comparisons) {
    const tablePP = pp.table(comp.data);
    logger.info(
      `Comparing ${comp.variables.map(v => `[${v}]`).join(" and ")} with fixed variables ${JSON.stringify(comp.fixed)}\n${tablePP}`
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
