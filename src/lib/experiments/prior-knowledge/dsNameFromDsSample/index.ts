import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../../experiment";
import { NonEvaluatedData, ValidData } from "../../../evaluation";
import { DsPartition } from "../../../dataset-adapters/DsPartition";
import { Static } from "@sinclair/typebox";
import query from "./query";
import { ToolSchema } from "src/lib/models";

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

interface ExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: { name: string; year: string };
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<ExpTypes>,
  vars: ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<ExpTypes["Data"]>> {
  const tool = {
    name: "validate_dataset_name",
    description: "Validates the dataset name.",
    schema: toolSchema,
  };

  const gotValidData = false;
  let attempts = 0;
  const failedAttempts = [];
  while (!gotValidData && attempts < maxRetries) {
    const attemptResult = await this.getResponse(
      vars.model,
      vars.prompt.text,
      tool
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

async function evaluateTrial(dpart: DsPartition, got: ExpTypes["Data"]) {
  const res: ExpTypes["Evaluation"] = {
    name: dpart.dataset.metadata.name,
    year: dpart.dataset.metadata.date.slice(0, 4),
  };
  return new NonEvaluatedData(got, res);
}

export default new Experiment<ExpTypes>(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  [promptGen]
);
