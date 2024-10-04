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
import { trialEvalScores } from "./aux";
import { getPairScoreListFromDPart } from "../experiment/aux";

export const name = "prediction-correlation";
const description =
  "Assess LLMs to predict semantic measures by correlating predictions with human judgments.";

/**
 * ExpType for PredictionCorrelation experiment
 */
export interface PCExpTypes extends GenericExpTypes {
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
  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;

  logger.debug(`Prompt (${prompt.id}): ${prompt.text}`);

  const res = await this.getResponse({ ...vars, prompt }, tool, maxRetries);
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
  const pairs = prompt.pairs!.map(
    p => [p[0].toLowerCase(), p[1].toLowerCase()] as [string, string]
  );
  const lcGotScores = got.scores.map(s => ({
    words: [s.words[0].toLowerCase(), s.words[1].toLowerCase()] as [
      string,
      string,
    ],
    score: s.score,
  }));

  const corr = trialEvalScores(pairs, dpart, lcGotScores);
  const nonUsableData = got.scores.filter(
    ({ words, score }) => !words?.length || isNaN(score)
  ).length;

  const expected = { scores: getPairScoreListFromDPart(pairs, dpart) };

  if (nonUsableData === got.scores.length) {
    return new NonUsableData(got, expected);
  }

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
