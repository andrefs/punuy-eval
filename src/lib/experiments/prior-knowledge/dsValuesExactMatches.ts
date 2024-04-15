import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../experiment";
import {
  DataCorrect,
  DataIncorrect,
  DataPartiallyIncorrect,
  EvaluationResult,
  NonUsableData,
  ValidData,
} from "../../evaluation";
import { DsPartition } from "../../dataset-adapters/DsPartition";
import { Static, Type } from "@sinclair/typebox";

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
const queryResponseSchema = Type.Object({
  scores: Type.Array(
    Type.Object({
      words: Type.Array(Type.String(), { minItems: 2, maxItems: 2 }),
      score: Type.Number(),
    })
  ),
});
interface ExpTypes extends GenericExpTypes {
  Data: Static<typeof queryResponseSchema>;
  Evaluation: Static<typeof queryResponseSchema>;
  DataSchema: typeof queryResponseSchema;
}

async function runTrial(
  this: Experiment<ExpTypes>,
  vars: ExpVarsFixedPrompt,
  schema: ExpTypes["DataSchema"],
  maxRetries: number = 3
): Promise<TrialResult<ExpTypes["Data"]>> {
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
    if (attemptResult instanceof ValidData) {
      const res: TrialResult<ExpTypes["Data"]> = {
        totalTries: attempts,
        failedAttempts,
        ok: true,
        result: attemptResult,
      };
      return res;
    }
    failedAttempts.push(attemptResult);
  }

  const res: TrialResult<ExpTypes["Data"]> = {
    totalTries: attempts,
    failedAttempts,
    ok: false,
  };
  return res;
}

async function evaluateTrial(
  dpart: DsPartition,
  got: ExpTypes["Data"]
): Promise<EvaluationResult<ExpTypes["Data"]>> {
  const res = {} as {
    [w1: string]: {
      [w2: string]: {
        expected: number | null;
        got: number | null;
      };
    };
  };

  const expected: ExpTypes["Data"] = { scores: [] };

  for (const row of dpart.data) {
    const w1 = row.term1.toLowerCase();
    const w2 = row.term2.toLowerCase();

    let score: number;
    if ("value" in row && typeof row.value === "number") {
      score = row.value;
    } else {
      const values = row.values!.filter(v => typeof v === "number") as number[];
      score = values.reduce((a, b) => a + b, 0) / values.length;
    }

    expected.scores.push({ words: [w1, w2], score });

    res[w1] = res[w1] || {};
    res[w1][w2] = { expected: score, got: null };
  }

  let i = 0;
  let nonUsableData = 0;
  let exactMatches = 0;
  for (const { words, score } of got.scores) {
    if (!words || isNaN(score)) {
      nonUsableData++;
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
  if (nonUsableData === i) {
    return new NonUsableData(got, expected);
  }
  if (i === exactMatches) {
    return new DataCorrect(got, expected);
  }
  if (exactMatches === 0) {
    return new DataIncorrect(got, expected);
  }
  return new DataPartiallyIncorrect((exactMatches / i) * 100, got, expected);
}

export default new Experiment(
  name,
  description,
  queryResponseSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
