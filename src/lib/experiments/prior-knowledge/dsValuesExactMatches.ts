import Experiment, { ExpVars, ExpVarsFixedPrompt, Prompt } from "../experiment";
import { DatasetProfile } from "../../types";
import {
  DataCorrect,
  DataIncorrect,
  DataPartiallyIncorrect,
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
} from "../../evaluation";
import Ajv, { JSONSchemaType } from "ajv";
const ajv = new Ajv();

const name = "ds-values-exact-matches";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    return {
      id: `${name}-${vars.dataset.id}-prompt`,
      language: "en" as const,
      text:
        'Please rate the similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely unrelated" and 4 means "very similar". Feel free to use decimal numbers (e.g. 2.37 or 1.89).\n' +
        vars.dataset.partitions[0].data
          .map(({ term1, term2 }) => `${term1},${term2}`)
          .join("\n"),
    };
  },
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
        required: ["words", "score"],
      },
    },
  },
  required: ["scores"],
};
type ResultSchema = JSONSchemaType<typeof resultSchema>;
const validateSchema = ajv.compile<ResultSchema>(resultSchema);

async function runTrial(
  vars: ExpVarsFixedPrompt,
  schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const f = {
    name: "validate_sample",
    description: "Validates the pairs sampled from the dataset.",
    parameters: schema,
  };

  const result = await vars.model.makeRequest(vars.prompt.text, {
    function: f,
  });
  return result;
}

async function evaluateTrial(ds: DatasetProfile, data: string) {
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
    if (!validateSchema(got)) {
      return new JsonSchemaError(data);
    }

    for (const row of ds.partitions[0].data) {
      const w1 = row.term1.toLowerCase();
      const w2 = row.term2.toLowerCase();

      let score: string;
      if ("value" in row && typeof row.value === "number") {
        score = row.value.toString();
      } else {
        const values = row.values!.filter(
          v => typeof v === "number"
        ) as number[];
        score = (values.reduce((a, b) => a + b, 0) / values.length).toString();
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
  resultSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
