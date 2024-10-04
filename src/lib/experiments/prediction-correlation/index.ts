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
import {
  DataCorrect,
  DataPartiallyIncorrect,
  NonUsableData,
} from "src/lib/evaluation";
import pcorrTest from "@stdlib/stats-pcorrtest";

export const name = "prediction-correlation";
const description =
  "Assess LLMs to predict semantic measures by correlating predictions with human judgments.";

/**
 * ExpType for PredictionCorrelation experiment
 */
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
  const res = {} as {
    [w1: string]: {
      [w2: string]: {
        expected: number | null;
        got: number | null;
      };
    };
  };

  const expected: PCExpTypes["Data"] = { scores: [] };

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
  }

  let i = 0;
  let nonUsableData = 0;
  for (const { words, score } of got.scores) {
    if (!words?.length || isNaN(score)) {
      nonUsableData++;
    }
    i++;
    const w1 = words[0].toLowerCase();
    const w2 = words[1].toLowerCase();

    res[w1] = res[w1] || {};
    res[w1][w2] = res[w1][w2] || { expected: null, got: null };
    res[w1][w2].got = score;
  }
  if (nonUsableData === i) {
    return new NonUsableData(got, expected);
  }

  const intersec = [];
  for (const w1 in res) {
    for (const w2 in res[w1]) {
      if (res[w1][w2].got !== null && res[w1][w2].expected !== null) {
        intersec.push(res[w1][w2]);
      }
    }
  }
  if (intersec.length < 10) {
    return new NonUsableData(got, expected);
  }
  const gotScores = intersec.map(({ got }) => got);
  const expectedScores = intersec.map(({ expected }) => expected);

  const corr = pcorrTest(gotScores, expectedScores);

  if (corr.pcorr === null) {
    return new NonUsableData(got, expected);
  }
  if (corr.pcorr === 1) {
    return new DataCorrect(got, expected);
  }

  return new DataPartiallyIncorrect(corr.pcorr, got, expected);
}

export default new Experiment(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  expDataToExpScore
);
