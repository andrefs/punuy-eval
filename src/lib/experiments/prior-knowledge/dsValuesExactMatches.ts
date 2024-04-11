import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  Prompt,
  TrialResult,
} from "../experiment";
import {
  DataCorrect,
  DataIncorrect,
  DataPartiallyIncorrect,
  NoUsableData,
  ValidData,
} from "../../evaluation";
import { DsPartition } from "../../dataset-adapters/DsPartition";

const name = "ds-values-exact-matches";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    return {
      id: `${name}-${vars.dpart.id}-prompt`,
      language: "en" as const,
      text:
        'Please rate the similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely unrelated" and 4 means "very similar". Feel free to use decimal numbers (e.g. 2.37 or 1.89).\n' +
        vars.dpart.data
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

async function runTrial(
  this: Experiment,
  vars: ExpVarsFixedPrompt,
  schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any,
  maxRetries: number = 3
): Promise<TrialResult> {
  const params = {
    function: {
      name: "validate_sample",
      description: "Validates the pairs sampled from the dataset.",
      schema,
    },
  };

  const gotValidData = false;
  let attempts = 0;
  const failedAttempts = [];
  while (!gotValidData && attempts < maxRetries) {
    const attemptResult = await this.getResponse(
      vars.model,
      vars.prompt.text,
      params
    );
    attempts++;
    if (attemptResult.ok) {
      return {
        totalTries: attempts,
        failedAttempts,
        ok: true,
        result: attemptResult.data as ValidData,
      };
    }
    failedAttempts.push(attemptResult);
  }

  return {
    totalTries: attempts,
    failedAttempts,
    ok: false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function evaluateTrial(dpart: DsPartition, got: any) {
  const res = {} as {
    [w1: string]: {
      [w2: string]: {
        expected: string | null;
        got: string | null;
      };
    };
  };

  for (const row of dpart.data) {
    const w1 = row.term1.toLowerCase();
    const w2 = row.term2.toLowerCase();

    let score: string;
    if ("value" in row && typeof row.value === "number") {
      score = row.value.toString();
    } else {
      const values = row.values!.filter(v => typeof v === "number") as number[];
      score = (values.reduce((a, b) => a + b, 0) / values.length).toString();
    }

    res[w1] = res[w1] || {};
    res[w1][w2] = { expected: score, got: null };
  }

  let i = 0;
  let noUsableData = 0;
  let exactMatches = 0;
  for (const { words, score } of got.scores) {
    if (!words || !score) {
      noUsableData++;
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
  if (noUsableData === i) {
    return new NoUsableData();
  }
  if (i === exactMatches) {
    return new DataCorrect(res);
  }
  if (exactMatches === 0) {
    return new DataIncorrect(res);
  }
  return new DataPartiallyIncorrect((exactMatches / i) * 100, res);
}

export default new Experiment(
  name,
  description,
  resultSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
