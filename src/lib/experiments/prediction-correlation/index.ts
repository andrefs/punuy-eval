import { Static } from "@sinclair/typebox";
import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../experiment";
import query from "./query";
import { ToolSchema } from "src/lib/models";
import logger from "src/lib/logger";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";

export const name = "prediction-correlation";
const description =
  "Assess LLMs to predict semantic measures by correlating predictions with human judgments.";

interface PCExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<PCExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<PCExpTypes["Data"]>> {
  const tool = {
    name: "evaluate_pair_scores",
    description: "Evaluates the scores of the pairs returned",
    schema: toolSchema,
  };
  const _vars = vars as ExpVarsFixedPrompt;

  logger.debug(`Prompt (${_vars.prompt.id}): ${_vars.prompt.text}`);

  const res = await this.getResponse(_vars, tool, maxRetries);
  return res;
}

function expDataToExpScore(
  this: Experiment<PCExpTypes>,
  data: ExperimentData<PCExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.avg,
  };
}

async function evaluateTrial(
  this: Experiment<PCExpTypes>,
  dpart: DsPartition,
  prompt: Prompt,
  got: PCExpTypes["Data"]
) {
  console.log("XXXXXXXXXXXXXX evaluateTrial", { dpart, prompt, got });

  throw new Error("Not implemented");
}

export default new Experiment(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  expDataToExpScore
);
