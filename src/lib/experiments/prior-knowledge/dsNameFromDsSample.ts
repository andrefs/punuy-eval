import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  Prompt,
  TrialResult,
} from "../experiment";
import { NonEvaluatedData, ValidData } from "../../evaluation";
import { DsPartition } from "../../dataset-adapters/DsPartition";
import { Static, Type } from "@sinclair/typebox";

const name = "ds-name-from-ds-sample";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => ({
    id: `${name}-${vars.dpart.id}-prompt`,
    language: "en" as const,
    text:
      `Which semantic measures evaluation dataset do these pairs of concepts belong to?\n` +
      vars.dpart.data
        .slice(0, 10)
        .map(({ term1, term2 }) => `${term1} ${term2}`)
        .join("\n"),
  }),
};
const queryResponseSchema = Type.Object({
  name: Type.String(),
  year: Type.String(),
  authors: Type.Array(Type.String()),
});
type QueryResponse = Static<typeof queryResponseSchema>;

async function runTrial(
  this: Experiment<QueryResponse, ExpectedResult>,
  vars: ExpVarsFixedPrompt,
  schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any,
  maxRetries: number = 3
): Promise<TrialResult<QueryResponse>> {
  const params = {
    function: {
      name: "validate_dataset",
      description: "Validates the dataset information.",
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

async function evaluateTrial(dpart: DsPartition, got: QueryResponse) {
  const res: ExpectedResult = {
    name: dpart.dataset.metadata.name,
    year: dpart.dataset.metadata.date.slice(0, 4),
  };
  return new NonEvaluatedData(got, res);
}

interface ExpectedResult {
  name: string;
  year: string;
  //originalAuthors: string[];
}

export default new Experiment<QueryResponse, ExpectedResult>(
  name,
  description,
  queryResponseSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
