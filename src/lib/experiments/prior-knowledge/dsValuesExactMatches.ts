import Experiment from "../experiment";
import { Model } from "../../models";
import { DatasetProfile } from "../../types";
import {
  DataCorrect,
  DataIncorrect,
  DataPartiallyIncorrect,
  JsonSyntaxError,
  NoData,
} from "../../validation";

const name = "ds-values-exact-matches";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.";
const genPrompt = (ds: DatasetProfile) => {
  return (
    'Please rate the similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely unrelated" and 4 means "very similar". Feel free to use decimal numbers (e.g. 2.37 or 1.89).\n' +
    ds.partitions[0].data
      .map(({ word1, word2 }) => `${word1},${word2}`)
      .join("\n")
  );
};
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

async function runTrial(
  prompt: string,
  schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  _: DatasetProfile,
  model: Model
) {
  const f = {
    name: "validate_sample",
    description: "Validates the pairs sampled from the dataset.",
    parameters: schema,
  };

  const result = await model.makeRequest(prompt, { function: f });
  return result;
}

async function validateTrial(ds: DatasetProfile, data: string) {
  const res = {} as {
    [w1: string]: {
      [w2: string]: {
        expected: string | null;
        got: string | null;
      };
    };
  };
  if (!data.trim()) {
    return new NoData();
  }
  try {
    const got = JSON.parse(data);

    for (const row of ds.partitions[0].data) {
      const w1 = row.word1.toLowerCase();
      const w2 = row.word2.toLowerCase();

      let score: string;
      if ("value" in row) {
        score = row.value.toString();
      } else {
        score = (
          row.values.reduce((a, b) => a + b, 0) / row.values.length
        ).toString();
      }

      res[w1] = res[w1] || {};
      res[w1][w2] = { expected: score, got: null };
    }

    let i = 0;
    let noData = 0;
    let exactMatches = 0;
    for (const { words, score } of got.scores) {
      if (!words || !score) {
        noData++;
      }
      i++;
      const w1 = words[0].toLowerCase();
      const w2 = words[1].toLowerCase();
      if (res[w1] && res[w1][w2] && res[w1][w2].expected === score) {
        exactMatches++;
      }

      res[w1] = res[w1] || {};
      res[w1][w2] = res[w1][w2] || { expected: null, got: null };
      res[w1][w2].got = score;
    }
    if (noData === i) {
      return new NoData();
    }
    if (i === exactMatches) {
      return new DataCorrect(res);
    }
    if (exactMatches === 0) {
      return new DataIncorrect(res);
    }
    return new DataPartiallyIncorrect((exactMatches / i) * 100, res);
  } catch (e) {
    return new JsonSyntaxError(data);
  }
}

export default new Experiment(
  name,
  description,
  genPrompt,
  resultSchema,
  runTrial,
  validateTrial
);
