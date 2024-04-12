import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  Prompt,
  TrialResult,
} from "../experiment";
import { NonEvaluatedData } from "../../evaluation";
import { DsPartition } from "../../dataset-adapters/DsPartition";
import { Type } from "@sinclair/typebox";

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
const modelResponseDataSchema = Type.Object({
  name: Type.String(),
  year: Type.String(),
  authors: Type.Array(Type.String()),
});

async function runTrial(
  this: Experiment,
  vars: ExpVarsFixedPrompt,
  schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any,
  maxRetries: number = 3
): Promise<TrialResult> {
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
    if (attemptResult.ok) {
      return {
        totalTries: attempts,
        failedAttempts,
        ok: true,
        result: attemptResult.data,
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
  return new NonEvaluatedData({
    originalName: dpart.dataset.metadata.name,
    originalYear: dpart.dataset.metadata.date.slice(0, 4),
    gotName: got.name,
    gotYear: got.year,
    gotAuthors: got.authors,
  } as DsNameFromDsSampleResult);
}

interface DsNameFromDsSampleResult {
  originalName: string;
  originalYear: string;
  originalAuthors: string[];
  gotName: string;
  gotYear: string;
  gotAuthors: string[];
}

export default new Experiment(
  name,
  description,
  modelResponseDataSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
