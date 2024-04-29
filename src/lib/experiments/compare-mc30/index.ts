import pcorrtest from "@stdlib/stats-pcorrtest";
import path from "path";
import fs from "fs/promises";
import oldFs from "fs";

import { Model, ModelTool } from "../../models";
import {
  ExceptionThrown,
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
  ValidData,
} from "../../evaluation";
import logger from "../../logger";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import query, { QueryResponse } from "./query";
import { MultiDatasetScores, TrialResult, Usage } from "../experiment/types";
import { sumUsage } from "../experiment/aux";
import { renderTable } from "console-table-printer";

//export type CompareMC30ModelsResults = Partial<{
//  [key in ModelIds]: QueryResponse[];
//}>;
export type CompareMC30ModelResults = {
  variables: {
    model: Model;
  };
  usage: Usage | undefined;
  data: QueryResponse[];
};

interface LoadDatasetScoresParams {
  rg65: DsPartition;
  ps65: DsPartition;
  mc30: DsPartition;
  ws353: DsPartition;
}
export const loadDatasetScores = async ({
  rg65,
  mc30,
  ps65,
  ws353,
}: LoadDatasetScoresParams) => {
  const pairs: MultiDatasetScores = {};

  for (const entry of mc30.data) {
    pairs[entry.term1] = pairs[entry.term1] || {};
    pairs[entry.term1][entry.term2] = pairs[entry.term1][entry.term2] || {};
    if ("value" in entry && typeof entry.value === "number") {
      pairs[entry.term1][entry.term2][mc30.dataset.id] = entry.value;
    } else {
      const values = entry.values!.filter(
        x => typeof x === "number"
      ) as number[];
      pairs[entry.term1][entry.term2][mc30.dataset.id] =
        values!.reduce((a, b) => a! + b!, 0) / values.length;
    }
  }

  for (const entry of rg65.data) {
    const value =
      "value" in entry
        ? entry.value
        : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

    if (
      entry.term1 in pairs &&
      entry.term2 in pairs[entry.term1] &&
      typeof value === "number"
    ) {
      pairs[entry.term1][entry.term2][rg65.dataset.id] = value;
    } else if (
      entry.term2 in pairs &&
      entry.term1 in pairs[entry.term2] &&
      typeof value === "number"
    ) {
      pairs[entry.term2][entry.term1][rg65.dataset.id] = value;
    }
  }

  for (const entry of ws353.data) {
    const value =
      "value" in entry
        ? entry.value
        : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

    if (
      entry.term1 in pairs &&
      entry.term2 in pairs[entry.term1] &&
      typeof value === "number"
    ) {
      pairs[entry.term1][entry.term2][ws353.dataset.id] = value * (4 / 10);
    } else if (
      entry.term2 in pairs &&
      entry.term1 in pairs[entry.term2] &&
      typeof value === "number"
    ) {
      pairs[entry.term2][entry.term1][ws353.dataset.id] = value * (4 / 10);
    }
  }

  for (const entry of ps65.data) {
    const value =
      "value" in entry
        ? entry.value
        : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

    if (
      entry.term1 in pairs &&
      entry.term2 in pairs[entry.term1] &&
      typeof value === "number"
    ) {
      pairs[entry.term1][entry.term2][ps65.dataset.id] = value * (4 / 10);
    } else if (
      entry.term2 in pairs &&
      entry.term1 in pairs[entry.term2] &&
      typeof value === "number"
    ) {
      pairs[entry.term2][entry.term1][ps65.dataset.id] = value * (4 / 10);
    }
  }

  // chord vs cord
  // see http://dx.doi.org/10.1162/coli.2006.32.1.13
  delete pairs["chord"];

  return pairs;
};

const getPairs = (scores: MultiDatasetScores) => {
  const pairs: [string, string][] = [];

  for (const term1 in scores) {
    for (const term2 in scores[term1]) {
      pairs.push([term1, term2]);
    }
  }

  return pairs;
};

const name = "compare-mc30";
const description =
  "Compare the scores of multiple AI models with the scores from multiple human annotations of the MC30 pair set.";
const genPrompt = (pairs: string[][]) =>
  'Please rate the similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely unrelated" and 4 means "very similar". Fractional values are allowed.\n\n' +
  pairs.map(([w1, w2]) => `${w1} ${w2}`).join("\n");

async function tryResponse(model: Model, prompt: string, params: ModelTool) {
  let result;
  try {
    result = await model.makeRequest(prompt, params);
  } catch (e) {
    return {
      result: new ExceptionThrown(),
      usage: undefined,
    };
  }

  const usage = result?.usage;
  const data = result.getDataText();
  if (!data.trim()) {
    return { result: new NoData(), usage };
  }
  try {
    const got = JSON.parse(data) as QueryResponse;
    if (!query.validateSchema(got)) {
      return {
        result: new JsonSchemaError(data),
        usage,
      };
    }
    return {
      result: new ValidData(got),
      usage,
    };
  } catch (e) {
    return { result: new JsonSyntaxError(data), usage };
  }
}

async function getResponse(
  model: Model,
  prompt: string,
  tool: ModelTool,
  maxRetries: number = 3
) {
  let totalUsage;
  const failedAttempts = [];
  while (failedAttempts.length < maxRetries) {
    logger.info(`      attempt #${failedAttempts.length + 1}`);
    const { result: attemptResult, usage } = await tryResponse(
      model,
      prompt,
      tool
    );
    totalUsage = sumUsage(totalUsage, usage);
    if (attemptResult instanceof ValidData) {
      logger.info(`      attempt #${failedAttempts.length + 1} succeeded.`);
      const res: TrialResult<QueryResponse> = {
        totalTries: failedAttempts.length + 1,
        failedAttempts,
        ok: true,
        usage: totalUsage,
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

  const res: TrialResult<QueryResponse> = {
    totalTries: failedAttempts.length,
    usage: totalUsage,
    failedAttempts,
    ok: false,
  };
  return res;
}

/** Run a single trial of the experiment, with a single model */
async function runTrialModel(model: Model, prompt: string, maxRetries = 3) {
  const tool: ModelTool = {
    name: "evaluate_scores",
    description: "Evaluate the word similarity scores.",
    schema: query.toolSchema,
  };

  const res = await getResponse(model, prompt, tool, maxRetries);
  return res;
}

/** Run multiple trials of the experiment, with a single model */
async function runTrials(trials: number, model: Model, prompt: string) {
  let totalUsage;
  logger.info(
    `Running experiment ${name} ${trials} times on model ${model.id}.`
  );
  logger.debug(`Prompt: ${prompt}`);

  const results = [];
  for (let i = 0; i < trials; i++) {
    logger.info(`    trial #${i + 1} of ${trials}`);
    const res = await runTrialModel(model, prompt);
    totalUsage = sumUsage(totalUsage, res.usage);
    if (res.ok) {
      results.push(res.result!.data); // TODO: handle failed attempts
    }
  }
  return {
    variables: { model },
    usage: totalUsage,
    data: results,
  };
}

/** Run multiple trials of the experiment, with multiple models */
async function performMultiNoEval(
  models: Model[],
  trials: number,
  scores: MultiDatasetScores
) {
  let totalUsage;
  const pairs = getPairs(scores);
  const prompt = genPrompt(pairs);

  logger.info(
    `Preparing to run experiment ${name}, ${trials} times on each model:\n${models
      .map(m => "\t" + m.id)
      .join(",\n")}.`
  );

  const res: CompareMC30ModelResults[] = [];
  for (const model of models) {
    res.push(await runTrials(trials, model, prompt));
    totalUsage = sumUsage(totalUsage, res[res.length - 1].usage);
  }
  return {
    experiments: res,
    usage: totalUsage,
  };
}

interface MC30Results {
  [term1: string]: {
    [term2: string]: {
      models: {
        [model: string]: {
          avg: number;
          values: number[];
          sum: number;
          count: number;
        };
      };
      human: {
        [dataset: string]: number;
      };
    };
  };
}

export function unzipResults(results: MC30Results) {
  const res: { [key: string]: number[] } = {};

  for (const w1 in results) {
    for (const w2 in results[w1]) {
      for (const modelName in results[w1][w2].models) {
        res[modelName] = res[modelName] || [];
        res[modelName].push(results[w1][w2].models[modelName].avg);
      }

      for (const dsName in results[w1][w2].human) {
        res[dsName] = res[dsName] || [];
        res[dsName].push(results[w1][w2].human[dsName]);
      }
    }
  }

  return res;
}

function printPairValues(results: MC30Results) {
  const table = [];
  for (const w1 in results) {
    for (const w2 in results[w1]) {
      const row: { [key: string]: string } = { Pair: `${w1}, ${w2}` };
      for (const modelName in results[w1][w2].models) {
        const avg = results[w1][w2].models[modelName].avg;
        row[modelName] = avg.toString();
      }
      for (const dsName in results[w1][w2].human) {
        const score = results[w1][w2].human[dsName];
        row[dsName] = score.toString();
      }
      table.push(row);
    }
  }

  const tablePP = renderTable(table);
  logger.info("\n" + tablePP);
}

async function evaluate(
  modelsRes: CompareMC30ModelResults[],
  humanScores: MultiDatasetScores,
  trials: number,
  folder: string
) {
  const res = mergeResults(modelsRes, humanScores);
  const arrays = unzipResults(res);
  for (const modelNames of modelsRes.map(exp => exp.variables.model.id)) {
    if (!arrays[modelNames]) {
      arrays[modelNames] = [];
    }
  }

  printPairValues(res);

  //console.table(arrays);
  const corrMat = calcCorrelation(Object.values(arrays));
  const varNames = Object.keys(arrays);

  const tests = {} as { [dsVsds: string]: string };
  for (let i = 0; i < varNames.length - 1; i++) {
    for (let j = i; j < varNames.length; j++) {
      const r = corrMat[i][j];
      if (r) {
        tests[`${varNames[i]} vs ${varNames[j]}`] = r.print();
      }
    }
  }
  printTests(tests);
  const simplifiedMatrix = simpleCorrMatrix(corrMat);
  console.log(simpMatrixCSV(varNames, simplifiedMatrix));
  const simpMatObj = simpMatrixToObject(varNames, simplifiedMatrix);
  const table = Object.entries(simpMatObj).map(([v1, v2s]) => {
    return { "(index)": v1, ...v2s };
  });
  const tablePP = renderTable(table);
  logger.info("\n" + tablePP);

  const traceId = Date.now();
  const log: MC30LogFile = {
    trials,
    traceId,
    results: res,
    arrays,
    corrMat,
    varNames: Object.keys(arrays),
    simplifiedMatrix: simpMatObj,
    tests,
  };

  await saveFile(log, folder);
}

async function saveFile(log: MC30LogFile, folder: string) {
  const traceId = log.traceId;
  const filename = path.join(folder, `${traceId}_${name}.json`);
  logger.info(
    `Saving experiment ${name} with ${log.trials} trials to ${filename}.`
  );

  const json = JSON.stringify(log, null, 2);

  if (!oldFs.existsSync(folder)) {
    await fs.mkdir(folder, { recursive: true });
  }

  await fs.writeFile(filename, json);
}

interface MC30LogFile {
  trials: number;
  traceId: number;
  results: MC30Results;
  arrays: ReturnType<typeof unzipResults>;
  corrMat: ReturnType<typeof calcCorrelation>;
  tests: { [dsVsds: string]: string };
  varNames: string[];
  simplifiedMatrix: ReturnType<typeof simpMatrixToObject>;
}

function simpleCorrMatrix(matrix: ReturnType<typeof pcorrtest>[][]) {
  const resMat = [] as number[][];
  for (let i = 0; i < matrix.length; i++) {
    resMat[i] = matrix[i].map(r => r?.pcorr);
  }

  return resMat;
}

function printTests(tests: { [dsVsds: string]: string }) {
  for (const test in tests) {
    logger.debug(`----------------------\n${test}`);
    logger.debug(tests[test]);
  }
}

function simpMatrixToObject(varNames: string[], matrix: number[][]) {
  const res = {} as { [v1: string]: { [v2: string]: number } };
  for (let i = 0; i < varNames.length; i++) {
    res[varNames[i]] = {};
    for (let j = i; j < varNames.length; j++) {
      res[varNames[i]][varNames[j]] = matrix[i][j];
    }
  }
  return res;
}

function simpMatrixCSV(varNames: string[], matrix: number[][]) {
  let res = "," + varNames.join(",") + "\n";
  for (let i = 0; i < varNames.length; i++) {
    res += [varNames[i], ...matrix[i].map(r => r.toFixed(2))].join(",");
    res += "\n";
  }
  return res;
}

export type CorrResults = ReturnType<typeof pcorrtest>[][];

export function calcCorrelation(data: number[][]) {
  const corrMatrix = [] as CorrResults;

  for (let i = 0; i < data.length; i++) {
    corrMatrix[i] = [];
    for (let j = 0; j < data.length; j++) {
      if (i <= j) {
        try {
          const corr = pcorrtest(data[i], data[j]);
          corrMatrix[i][j] = corr;
        } catch (e) {
          logger.warn(
            `Error calculating correlation between ${i} and ${j}: ${e}`
          );
        }
      }
    }
  }
  return corrMatrix;
}

/** Merge the results from the models and the human scores */
export function mergeResults(
  modelsRes: CompareMC30ModelResults[],
  humanScores: MultiDatasetScores
) {
  const res = {} as MC30Results;

  for (const exp of modelsRes) {
    const model = exp.variables.model;
    const modelName = model.id;

    for (const score of exp.data.flatMap(({ scores }) => [...scores])) {
      const [w1, w2] = score.words;
      res[w1] = res[w1] || {};
      res[w1][w2] = res[w1][w2] || { human: {}, models: {} };
      res[w1][w2].models[modelName] = res[w1][w2].models[modelName] || {
        values: [],
      };
      res[w1][w2].models[modelName].values.push(score.score);
    }
    for (const w1 in res) {
      for (const w2 in res[w1]) {
        if (res[w1][w2].models[modelName]?.values) {
          res[w1][w2].models[modelName].avg =
            res[w1][w2].models[modelName].values.reduce((a, b) => a + b, 0) /
            res[w1][w2].models[modelName].values.length;
        }
      }
    }
  }

  for (const w1 in humanScores) {
    for (const w2 in humanScores[w1]) {
      res[w1][w2].human = humanScores[w1][w2];
    }
  }
  return res;
}

const CompareMC30Experiment = {
  name,
  description,
  genPrompt,
  query,
  performMultiNoEval,
  evaluate,
};

export default CompareMC30Experiment;
