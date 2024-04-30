import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../../experiment";
import {
  DataCorrect,
  DataIncorrect,
  DataPartiallyIncorrect,
  EvaluationResult,
  NonUsableData,
} from "../../../evaluation";
import { DsPartition } from "../../../dataset-partitions/DsPartition";
import { Static } from "@sinclair/typebox";
import { ToolSchema } from "src/lib/models";
import query from "./query";
import logger from "src/lib/logger";
import { getRandom } from "src/lib/utils";

const name = "ds-values-exact-matches";
const description =
  "Check if LLM knows a dataset by asking it to rate the similarity of pairs of words from the dataset and checking whether values match exactly the ones in the dataset.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    return {
      id: `${name}-${vars.dpart.id}-prompt`,
      language: "en" as const,
      text:
        'Please rate the similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely dissimilar" and 4 means "very similar". Feel free to use decimal numbers (e.g. 2.37 or 1.89).\n' +
        getRandom(vars.dpart.data, 100)
          .map(({ term1, term2 }) => `${term1},${term2}`)
          .join("\n"),
    };
  },
};

interface ExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<ExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<ExpTypes["Data"]>> {
  const tool = {
    name: "validate_sample",
    description: "Validates the pairs sampled from the dataset.",
    schema: toolSchema,
  };

  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  logger.debug(`Prompt (${prompt.id}): ${prompt.text}`);

  const res = await this.getResponse({ ...vars, prompt }, tool, maxRetries);
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

function expDataToExpScore(
  this: Experiment<ExpTypes>,
  data: ExperimentData<ExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.avg,
  };
}

export default new Experiment(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  expDataToExpScore,
  [promptGen]
);
