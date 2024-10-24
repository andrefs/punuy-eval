import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  GenericExpTypes,
  Prompt,
  TrialResult,
  TurnPrompt,
} from "../../experiment";
import { NonEvaluatedData } from "../../../evaluation";
import { DsPartition } from "../../../dataset-partitions/DsPartition";
import { Static } from "@sinclair/typebox";
import query from "./query";
import { ModelTool, ToolSchema } from "src/lib/models";
import logger from "src/lib/logger";
import { getRandom } from "src/lib/utils";

const name = "ds-name-from-ds-sample";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs of words and asking its name.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const pairs = getRandom(vars.dpart.data, 10).map(
      p => [p.term1, p.term2] as [string, string]
    );
    return {
      id: `${name}-${vars.dpart.id}-prompt`,
      language: "en" as const,
      jobType: "allPairs" as const,
      pairs,
      turns: [
        {
          text:
            `Which semantic measures evaluation dataset do these pairs of concepts belong to?\n` +
            pairs.map(p => `${p[0]} ${p[1]}`).join("\n"),
          pairs,
        },
      ],
    };
  },
};

/**
 * ExpType for NameFromSample experiment
 * */
interface NFSExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: { name: string; year: string };
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<NFSExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<NFSExpTypes["Data"]>> {
  const tool: ModelTool = {
    name: "validate_dataset_name",
    description: "Validates the dataset name.",
    schema: toolSchema,
  };

  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  logger.debug(`  ❔ Prompt: ${prompt.id}`);

  const res = await this.iterateConversation(
    { ...vars, prompt },
    tool,
    maxRetries
  );
  return res;
}

async function evaluateTrial(
  this: Experiment<NFSExpTypes>,
  dpart: DsPartition,
  got: { data: NFSExpTypes["Data"]; prompt: TurnPrompt }[]
) {
  const res: NFSExpTypes["Evaluation"] = {
    name: dpart.dataset.metadata.name,
    year: dpart.dataset.metadata.date.slice(0, 4),
  };
  return new NonEvaluatedData(got[0].data, res);
}

export default new Experiment<NFSExpTypes>(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  { prompts: [promptGen] }
);
