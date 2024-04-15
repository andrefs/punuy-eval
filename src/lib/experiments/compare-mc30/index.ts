import pcorrtest from "@stdlib/stats-pcorrtest";
import fs from "fs/promises";
import oldFs from "fs";

import {
  Model,
  ModelIds,
  ModelRequestParams,
  claude3opus,
  commandRPlus,
  gpt35turbo,
  gpt4,
  gpt4turbo,
} from "../../models";
import {
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
  ValidData,
} from "../../evaluation";
import logger from "../../logger";
import { MultiDatasetScores } from "../../dataset-adapters/collection";
import { DsPartition } from "src/lib/dataset-adapters/DsPartition";
import { Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { TrialResult } from "..";

export type CompareMC30ModelsResults = Partial<{
  [key in ModelIds]: QueryResponse[];
}>;

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

// TODO fix when OpenAI supports items with tuple definition in JSON schema
// https://community.openai.com/t/json-schema-tuple-validation-support/273554
// and @sinclair/typebox also
const queryResponseSchema = Type.Object({
  scores: Type.Array(
    Type.Object({
      words: Type.Array(Type.String()),
      score: Type.Number(),
    })
  ),
});
type QueryResponse = Static<typeof queryResponseSchema>;
const validateSchema = (value: unknown) =>
  Value.Check(queryResponseSchema, value);

async function getResponse(
  model: Model,
  prompt: string,
  params: ModelRequestParams
) {
  const result = await model.makeRequest(prompt, params);

  const data = result.getDataText();
  if (!data.trim()) {
    return new NoData();
  }
  try {
    const got = JSON.parse(data) as QueryResponse;
    if (!validateSchema(got)) {
      return new JsonSchemaError(data);
    }
    return new ValidData(got);
  } catch (e) {
    return new JsonSyntaxError(data);
  }
}

/** Run a single trial of the experiment, with a single model */
async function runTrialModel(model: Model, prompt: string, maxRetries = 3) {
  const params = {
    function: {
      name: "evaluate_scores",
      description: "Evaluate the word similarity scores.",
      schema: queryResponseSchema,
    },
  };

  let attempts = 0;
  const failedAttempts = [];
  while (attempts < maxRetries) {
    logger.info(`      attempt #${attempts + 1}`);
    const attemptResult = await getResponse(model, prompt, params);
    attempts++;
    if (attemptResult instanceof ValidData) {
      const res: TrialResult<QueryResponse> = {
        totalTries: attempts,
        failedAttempts,
        ok: true,
        result: attemptResult,
      };
      return res;
    }
    logger.warn(`      attempt #${attempts + 1} failed: ${attemptResult.type}`);
    failedAttempts.push(attemptResult);
  }

  const res: TrialResult<QueryResponse> = {
    totalTries: attempts,
    failedAttempts,
    ok: false,
  };
  return res;
}

/** Run multiple trials of the experiment, with a single model */
async function runTrialsModel(trials: number, model: Model, prompt: string) {
  logger.info(`  model ${model.id}.`);
  logger.debug(`Prompt: ${prompt}`);
  const results = [];
  for (let i = 0; i < trials; i++) {
    logger.info(`    trial #${i + 1} of ${trials}`);
    const res = await runTrialModel(model, prompt);
    if (res.ok) {
      results.push(res.result!.data); // TODO: handle failed attempts
    }
  }
  return results;
}

/** Run multiple trials of the experiment, with multiple models */
async function runTrials(trials: number, scores: MultiDatasetScores) {
  const pairs = getPairs(scores);
  const prompt = genPrompt(pairs);

  logger.info(
    `Running experiment ${name} with ${trials} trials on models [gpt35turbo, gpt4, gpt4turbo, commandRPlus, claude3opus] and datasets [mc30, rg65, ps65, ws353].`
  );

  const gpt35turbo_res = await runTrialsModel(trials, gpt35turbo, prompt);
  const gpt4_res = await runTrialsModel(trials, gpt4, prompt);
  const gpt4turbo_res = await runTrialsModel(trials, gpt4turbo, prompt);
  const commandRplus_res = await runTrialsModel(trials, commandRPlus, prompt);
  const claude3opus_res = await runTrialsModel(trials, claude3opus, prompt);

  return {
    gpt35turbo: gpt35turbo_res,
    gpt4: gpt4_res,
    gpt4turbo: gpt4turbo_res,
    commandRplus: commandRplus_res,
    claude3opus: claude3opus_res,
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
    }
  }

  for (const w1 in results) {
    for (const w2 in results[w1]) {
      for (const dsName in results[w1][w2].human) {
        res[dsName] = res[dsName] || [];
        res[dsName].push(results[w1][w2].human[dsName]);
      }
    }
  }

  return res;
}

async function evaluate(
  modelsRes: CompareMC30ModelsResults,
  humanScores: MultiDatasetScores,
  trials: number
) {
  const res = mergeResults(modelsRes, humanScores);
  const arrays = unzipResults(res);
  console.table(arrays);
  const corrMat = calcCorrelation(Object.values(arrays));
  const varNames = Object.keys(arrays);

  const tests = {} as { [dsVsds: string]: string };
  for (let i = 0; i < varNames.length - 1; i++) {
    for (let j = i; j < varNames.length; j++) {
      const r = corrMat[i][j];
      tests[`${varNames[i]} vs ${varNames[j]}`] = r.print();
    }
  }
  printTests(tests);
  const simplifiedMatrix = simpleCorrMatrix(corrMat);
  console.log(simpMatrixCSV(varNames, simplifiedMatrix));
  const simpMatObj = simpMatrixToObject(varNames, simplifiedMatrix);
  console.table(simpMatObj, varNames);

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

  await saveFile(log);
}

async function saveFile(log: MC30LogFile) {
  const traceId = log.traceId;
  const rootFolder = "./results";
  const filename = `${rootFolder}/${traceId}_${name}.json`;
  logger.info(
    `Saving experiment ${name} with ${log.trials} trials to ${filename}.`
  );

  const json = JSON.stringify(log, null, 2);

  if (!oldFs.existsSync(rootFolder)) {
    await fs.mkdir(rootFolder);
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
    console.log(`----------------------\n${test}`);
    console.log(tests[test]);
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
  modelsRes: CompareMC30ModelsResults,
  humanScores: MultiDatasetScores
) {
  const res = {} as MC30Results;

  for (const [modelName, model] of Object.entries(modelsRes)) {
    for (const score of model.flatMap(({ scores }) => [...scores])) {
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
        res[w1][w2].models[modelName].avg =
          res[w1][w2].models[modelName].values.reduce((a, b) => a + b, 0) /
          res[w1][w2].models[modelName].values.length;
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
  schema: queryResponseSchema,
  runTrials,
  evaluate,
};

export default CompareMC30Experiment;
