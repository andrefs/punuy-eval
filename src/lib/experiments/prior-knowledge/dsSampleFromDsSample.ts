import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  Prompt,
  TrialResult,
} from "../experiment";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
  ValidData,
} from "../../evaluation";
import { DsPartition } from "../../dataset-adapters/DsPartition";
import { Static, Type } from "@sinclair/typebox";

const name = "ds-sample-from-ds-sample";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const numberOfPairs = vars.dpart.data.length;
    return {
      id: `${name}-${vars.dpart.id}-prompt`,
      language: "en" as const,
      text:
        `A published semantic measure gold standard dataset is composed of ${numberOfPairs} pairs of concepts and their semantic ${vars.dpart.measureType} score as reported by humans. ` +
        `I only have 10 of the pairs included in the dataset. Please give me a list of 5 other pairs of concepts belonging to the same dataset but not included in my list.\n` +
        vars.dpart.data
          .slice(0, 10)
          .map(({ term1, term2 }) => `${term1} ${term2}`)
          .join("\n"),
    };
  },
};
const queryResponseSchema = Type.Object({
  pairs: Type.Array(Type.Tuple([Type.String(), Type.String()])),
});
type QueryResponse = Static<typeof queryResponseSchema>;

async function runTrial(
  this: Experiment<QueryResponse>,
  vars: ExpVarsFixedPrompt,
  schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any,
  maxRetries: number = 3
): Promise<TrialResult<QueryResponse>> {
  const params = {
    function: {
      name: "evaluate_sample",
      description: "evaluates the pairs sampled from the dataset.",
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
      const res: TrialResult<QueryResponse> = {
        totalTries: attempts,
        failedAttempts,
        ok: true,
        result: attemptResult,
      };
      return res;
    }
    failedAttempts.push(attemptResult);
  }

  const res: TrialResult<QueryResponse> = {
    totalTries: attempts,
    failedAttempts,
    ok: false,
  };
  return res;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function evaluateTrial(dpart: DsPartition, got: any) {
  const expectedDict: { [word: string]: { [word: string]: boolean } } = {};

  for (const { term1, term2 } of dpart.data) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    expectedDict[w1] = expectedDict[w1] || {};
    expectedDict[w1][w2] = true;
    expectedDict[w2] = expectedDict[w2] || {};
    expectedDict[w2][w1] = true;
  }
  let i = 0;
  let dataIncorrect = false;
  for (const [term1, term2] of got.pairs) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    if (expectedDict[w1]?.[w2] || expectedDict[w2]?.[w1]) {
      i++;
      expectedDict[w1][w2] = false;
      expectedDict[w2][w1] = false;
    } else {
      dataIncorrect = true;
    }
  }

  const expected: QueryResponse = {
    pairs: Object.keys(expectedDict).flatMap(w1 =>
      Object.keys(expectedDict[w1]).map(w2 => [w1, w2] as [string, string])
    ),
  };

  if (i === 0) {
    return new DataIncorrect(got, expected);
  }
  if (dataIncorrect) {
    return new DataPartiallyIncorrect(i / 5, got, expected);
  }
  if (i < 5) {
    return new DataIncomplete(i / 5, got, expected);
  }
  return new DataCorrect(got, expected);
}

export default new Experiment(
  name,
  description,
  queryResponseSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
