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

const numberOfPairs = 10;
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
        'Please rate the semantic similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely dissimilar" and 4 means "very similar". Feel free to use decimal numbers (e.g. 2.37 or 1.89).\n' +
        getRandom(vars.dpart.data, numberOfPairs)
          .map(({ term1, term2 }) => `${term1}, ${term2}`)
          .join("\n"),
    };
  },
};

/**
 * ExpType for ValuesExactMatches experiment
 */
interface VEMExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<VEMExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<VEMExpTypes["Data"]>> {
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
  this: Experiment<VEMExpTypes>,
  dpart: DsPartition,
  prompt: Prompt,
  got: VEMExpTypes["Data"]
): Promise<EvaluationResult<VEMExpTypes["Data"]>> {
  const res = {} as {
    [w1: string]: {
      [w2: string]: {
        expected: number | null;
        got: number | null;
      };
    };
  };

  const expected: VEMExpTypes["Data"] = { scores: [] };

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
    if (!words?.length || isNaN(score)) {
      nonUsableData++;
    }
    i++;
    const w1 = words[0].toLowerCase();
    const w2 = words[1].toLowerCase();

    // match truncating to max 2 decimal places
    if (res[w1] && res[w1][w2]) {
      let g = score.toString();
      const gParts = g.split(".");
      g = gParts[0] + (gParts[1] ? "." + gParts[1].slice(0, 2) : "");

      let e = res[w1][w2].expected!.toString();
      const eParts = e.split(".");
      e = eParts[0] + (eParts[1] ? "." + eParts[1].slice(0, 2) : "");

      if (g === e) {
        exactMatches++;
      }
    }

    // // match rounding to the same number of decimal places
    // if (res[w1] && res[w1][w2]) {
    //   const g = score.toString();
    //   const decPlaces = g.split(".")[1]?.length || 0;
    //   const e = res[w1][w2].expected?.toFixed(decPlaces) || "";
    //   if (g === e) {
    //     exactMatches++;
    //   }
    // }

    // // match truncating to the same number of decimal places
    // if (res[w1] && res[w1][w2]) {
    //   let g = score.toString();
    //   const gDecPlaces = g.split(".")[1]?.length || 0;
    //   let e = res[w1][w2].expected!.toString();
    //   const eDecPlaces = e?.split(".")[1]?.length || 0;
    //   const decPlaces = Math.min(gDecPlaces, eDecPlaces);
    //   g = g.split(".")[0] + (decPlaces ? "." + g.split(".")[1] : "");
    //   e = e?.split(".")[0] + (decPlaces ? "." + e.split(".")[1] : "");
    //   if (g === e) {
    //     exactMatches++;
    //   }
    // }

    // // match truncating to 1 decimal place
    // if (
    //   res[w1] &&
    //   res[w1][w2] &&
    //   res[w1][w2].expected?.toFixed(1) === score.toFixed(1)
    // ) {
    //   exactMatches++;
    // }

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
  return new DataPartiallyIncorrect(
    exactMatches / got.scores.length,
    got,
    expected
  );
}

function expDataToExpScore(
  this: Experiment<VEMExpTypes>,
  data: ExperimentData<VEMExpTypes>
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
  { expDataToExpScore, prompts: [promptGen] }
);
