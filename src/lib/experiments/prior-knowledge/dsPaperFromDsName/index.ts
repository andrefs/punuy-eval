import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  GenericExpTypes,
  GenToolSchema,
  Prompt,
  TrialResult,
  TurnPrompt,
} from "../../experiment";
import { DataCorrect, DataIncorrect } from "../../../evaluation";
import { distance } from "fastest-levenshtein";
import { DsPartition } from "../../../dataset-partitions/DsPartition";
import { Static } from "@sinclair/typebox";
import query from "./query";
import { ModelTool, ToolSchema } from "src/lib/models";
import logger from "src/lib/logger";

const name = "ds-paper-from-ds-name";
const description =
  "Check if LLM can, when given a dataset name, identify the scientific paper describing it";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const year = vars.dpart.dataset.metadata.date.substring(0, 4);
    return {
      id: `${name}-${vars.dpart.id}-prompt`,
      language: "en" as const,
      jobType: "allPairs",
      pairs: [],
      turns: [
        {
          text: `${vars.dpart.dataset.metadata.name} is a semantic measure gold standard dataset, published in ${year}. Please return the title of the scientific article describing this dataset.`,
          pairs: [],
        },
      ],
    };
  },
};
interface PFNExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: { titles: string[] };
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<PFNExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  genToolSchema: GenToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<PFNExpTypes["Data"]>> {
  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  logger.debug(`  ❔ Prompt: ${prompt.id}`);

  const toolSchema: ToolSchema = genToolSchema(
    Array.isArray(prompt.pairs[0])
      ? prompt.pairs[0].length
      : prompt.pairs.length
  );

  const tool: ModelTool = {
    name: "return_paper_name",
    description:
      "returns the title of the scientific article describing the dataset",
    schema: toolSchema,
  };

  const res = await this.iterateConversation(
    { ...vars, prompt },
    tool,
    maxRetries
  );
  return res;
}

async function evaluateTrial(
  this: Experiment<PFNExpTypes>,
  dpart: DsPartition,
  got: { data: PFNExpTypes["Data"]; prompt: TurnPrompt }[]
) {
  const expected = dpart.dataset.metadata.papers.map(p => ({
    title: p.title,
  }));

  let bestScore = 1;
  // let bestIndex = -1

  for (const [, exp] of expected.entries()) {
    const e = exp.title.toLowerCase().trim();
    const g = got[0].data.title.toLowerCase().trim();
    const d = distance(e, g) / ((e.length + g.length) / 2);
    if (d < bestScore) {
      bestScore = d;
      // bestIndex = i
    }
  }

  const threshold = 0.2;
  if (bestScore < threshold) {
    return new DataCorrect(
      { title: got[0].data.title },
      { titles: expected.map(e => e.title) }
    );
  }
  return new DataIncorrect(
    { title: got[0].data.title },
    { titles: expected.map(e => e.title) }
  );
}

export default new Experiment<PFNExpTypes>(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  { prompts: [promptGen] }
);
