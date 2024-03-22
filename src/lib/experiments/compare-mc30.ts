import mc30 from "punuy-datasets/datasets/mc30";
import rg65 from "punuy-datasets/datasets/rg65";
import ws353 from "punuy-datasets/datasets/ws353";
import ps65 from "punuy-datasets/datasets/ps65";
import pcorrtest from "@stdlib/stats-pcorrtest";
import fs from "fs/promises";
import oldFs from "fs";

import { Model, ModelIds, gpt35turbo, gpt4, gpt4turbo } from "../models";
import { JsonSyntaxError } from "../evaluation";
import logger from "../logger";
import { MultiDatasetScores } from "../dataset-adapters/collection";

type ModelsResults = {
  [key in ModelIds]: string[];
};

export const loadDatasetScores = async () => {
  const pairs: MultiDatasetScores = {};

  for (const part of mc30.partitions) {
    for (const entry of part.data) {
      pairs[entry.term1] = pairs[entry.term1] || {};
      pairs[entry.term1][entry.term2] = pairs[entry.term1][entry.term2] || {};
      if ("value" in entry && typeof entry.value === "number") {
        pairs[entry.term1][entry.term2]["mc30"] = entry.value;
      } else {
        const values = entry.values!.filter(
          x => typeof x === "number"
        ) as number[];
        pairs[entry.term1][entry.term2]["mc30"] =
          values!.reduce((a, b) => a! + b!, 0) / values.length;
      }
    }
  }

  for (const part of rg65.partitions) {
    for (const entry of part.data) {
      const value =
        "value" in entry
          ? entry.value
          : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

      if (
        entry.term1 in pairs &&
        entry.term2 in pairs[entry.term1] &&
        typeof value === "number"
      ) {
        pairs[entry.term1][entry.term2][rg65.id] = value;
      } else if (
        entry.term2 in pairs &&
        entry.term1 in pairs[entry.term2] &&
        typeof value === "number"
      ) {
        pairs[entry.term2][entry.term1][rg65.id] = value;
      }
    }
  }

  for (const part of ws353.partitions) {
    for (const entry of part.data) {
      const value =
        "value" in entry
          ? entry.value
          : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

      if (
        entry.term1 in pairs &&
        entry.term2 in pairs[entry.term1] &&
        typeof value === "number"
      ) {
        pairs[entry.term1][entry.term2][ws353.id] = value * (4 / 10);
      } else if (
        entry.term2 in pairs &&
        entry.term1 in pairs[entry.term2] &&
        typeof value === "number"
      ) {
        pairs[entry.term2][entry.term1][ws353.id] = value * (4 / 10);
      }
    }
  }

  for (const part of ps65.partitions) {
    for (const entry of part.data) {
      const value =
        "value" in entry
          ? entry.value
          : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

      if (
        entry.term1 in pairs &&
        entry.term2 in pairs[entry.term1] &&
        typeof value === "number"
      ) {
        pairs[entry.term1][entry.term2][ps65.id] = value * (4 / 10);
      } else if (
        entry.term2 in pairs &&
        entry.term1 in pairs[entry.term2] &&
        typeof value === "number"
      ) {
        pairs[entry.term2][entry.term1][ps65.id] = value * (4 / 10);
      }
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
const resultSchema = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          words: { type: "array", items: { type: "string" } },
          score: { type: "number" },
        },
      },
    },
  },
};

/** Run a single trial of the experiment, with a single model */
async function runTrialModel(model: Model, prompt: string) {
  const f = {
    name: "evaluate_scores",
    description: "Evaluate the word similarity scores.",
    parameters: resultSchema,
  };

  const res = await model.makeRequest(prompt, { function: f });
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
    results.push(
      res.type === "openai"
        ? res.data.choices[0].message.tool_calls?.[0].function.arguments || ""
        : ""
    );
  }
  return results;
}

/** Run multiple trials of the experiment, with multiple models */
async function runTrials(trials: number) {
  const scores = await loadDatasetScores();
  const pairs = getPairs(scores);
  const prompt = genPrompt(pairs);

  logger.info(
    `Running experiment ${name} with ${trials} trials on models [gpt35turbo, gpt4, gpt4turbo] and datasets [mc30, rg65, ps65, ws353].`
  );

  const gpt35turbo_res = await runTrialsModel(trials, gpt35turbo, prompt);
  const gpt4_res = await runTrialsModel(trials, gpt4, prompt);
  const gpt4turbo_res = await runTrialsModel(trials, gpt4turbo, prompt);

  return {
    gpt35turbo: gpt35turbo_res,
    gpt4: gpt4_res,
    gpt4turbo: gpt4turbo_res,
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

function unzipResults(results: MC30Results) {
  const res = {
    gpt35turbo: [] as number[],
    gpt4: [] as number[],
    gpt4turbo: [] as number[],
    mc30: [] as number[],
    rg65: [] as number[],
    ps65: [] as number[],
    ws353: [] as number[],
  };

  for (const w1 in results) {
    for (const w2 in results[w1]) {
      res.gpt35turbo.push(results[w1][w2].models.gpt35turbo.avg);
      res.gpt4.push(results[w1][w2].models.gpt4.avg);
      res.gpt4turbo.push(results[w1][w2].models.gpt4turbo.avg);
      res.mc30.push(results[w1][w2].human.mc30);
      res.rg65.push(results[w1][w2].human.rg65);
      res.ps65.push(results[w1][w2].human.ps65);
      res.ws353.push(results[w1][w2].human.ws353);
    }
  }

  return res;
}

async function evaluate(
  modelsRes: ModelsResults,
  humanScores: MultiDatasetScores,
  trials: number
) {
  try {
    const res = mergeResults(modelsRes, humanScores);
    const arrays = unzipResults(res);
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
  } catch (e) {
    return new JsonSyntaxError();
  }
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

function calcCorrelation(data: number[][]) {
  const corrMatrix = [] as ReturnType<typeof pcorrtest>[][];

  for (let i = 0; i < data.length; i++) {
    corrMatrix[i] = [];
    for (let j = 0; j < data.length; j++) {
      if (i <= j) {
        const corr = pcorrtest(data[i], data[j]);
        corrMatrix[i][j] = corr;
      }
    }
  }
  return corrMatrix;
}

/** Merge the results from the models and the human scores */
function mergeResults(
  modelsRes: ModelsResults,
  humanScores: MultiDatasetScores
) {
  const res = {} as MC30Results;

  try {
    const gpt35turbo = modelsRes.gpt35turbo.map(r => JSON.parse(r)); // TODO cast to resultSchema somehow
    const gpt4 = modelsRes.gpt4.map(r => JSON.parse(r));
    const gpt4turbo = modelsRes.gpt4turbo.map(r => JSON.parse(r));

    let modelName = "gpt35turbo";
    for (const score of gpt35turbo.flatMap(({ scores }) => [...scores])) {
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

    modelName = "gpt4";
    for (const score of gpt4.flatMap(({ scores }) => [...scores])) {
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

    modelName = "gpt4turbo";
    for (const score of gpt4turbo.flatMap(({ scores }) => [...scores])) {
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

    for (const w1 in humanScores) {
      for (const w2 in humanScores[w1]) {
        res[w1][w2].human = humanScores[w1][w2];
      }
    }
    return res;
  } catch (e) {
    throw new JsonSyntaxError();
  }
}

const CompareMC30Experiment = {
  name,
  description,
  genPrompt,
  schema: resultSchema,
  runTrials,
  evaluate,
};

export default CompareMC30Experiment;
