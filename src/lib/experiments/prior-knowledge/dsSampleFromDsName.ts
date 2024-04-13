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

const numPairs = 5;

const name = "ds-sample-from-ds-name";
const description =
  "Check if LLM knows a dataset by asking it to list 5 pairs included in the dataset";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const year = vars.dpart.dataset.metadata.date.substring(0, 4);
    const measureTypes = vars.dpart.measureType;
    return {
      id: `${name}-prompt`,
      type: vars.dpart.measureType,
      language: "en" as const,
      text:
        `${vars.dpart.dataset.metadata.name} is a gold standard dataset published in ${year}. ` +
        `It is composed of pairs of concepts and their semantic ${measureTypes} score as reported by humans, ` +
        `and can be used to evaluate semantic measures. ` +
        `Please list ${numPairs} pairs of concepts sampled from this dataset.`,
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
  const expected: { [word: string]: { [word: string]: boolean } } = {};

  for (const { term1, term2 } of dpart.data) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    expected[w1] = expected[w1] || {};
    expected[w1][w2] = true;
    expected[w2] = expected[w2] || {};
    expected[w2][w1] = true;
  }
  let i = 0;
  let dataIncorrect = false;
  for (const [term1, term2] of got.pairs) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    if (expected[w1]?.[w2] || expected[w2]?.[w1]) {
      i++;
      expected[w1][w2] = false;
      expected[w2][w1] = false;
    } else {
      dataIncorrect = true;
    }
  }

  if (i === 0) {
    return new DataIncorrect(got);
  }
  if (dataIncorrect) {
    return new DataPartiallyIncorrect(i / numPairs, got);
  }
  if (i < numPairs) {
    return new DataIncomplete(i / numPairs, got);
  }
  return new DataCorrect(got);
}

export default new Experiment(
  name,
  description,
  queryResponseSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
