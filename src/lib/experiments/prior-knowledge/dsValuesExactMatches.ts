import Experiment from "../experiment";
import { Model } from "../../models";
import { DatasetProfile } from "../../types";
import { DataCorrect, JsonSyntaxError, NoData } from "../../validation";

const name = "ds-values-exact-matches";
const description =
  "Check if LLM returns values exactly equal to the original dataset.";
const genPrompt = (ds: DatasetProfile) => {
  return (
    `Please rate the semantic similarity of the following pairs of words:\n` +
    ds.partitions[0].data
      .map(({ word1, word2 }) => `${word1},${word2}`)
      .join("\n")
  );
};
const resultSchema = {
  type: "object",
  properties: {
    word1: {
      type: "string",
    },
    word2: {
      type: "string",
    },
    value: {
      type: "number",
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
    name: "validate_dataset",
    description: "Validates the dataset information.",
    parameters: schema,
  };

  const result = await model.makeRequest(prompt, { function: f });
  return result;
}

async function validateTrial(ds: DatasetProfile, data: string) {
  if (!data.trim()) {
    return new NoData();
  }
  try {
    const got = JSON.parse(data);
    return new DataCorrect(got);
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
