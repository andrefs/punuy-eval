import { Static } from "@sinclair/typebox";
import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenericExpTypes,
  TrialResult,
  TurnPrompt,
} from "../experiment";
import query from "./query";
import { ToolSchema } from "src/lib/models";
import logger from "src/lib/logger";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import {
  DataCorrect,
  DataPartiallyIncorrect,
  EvaluationResult,
  NonUsableData,
} from "src/lib/evaluation";
import { getPairScoreListFromDPart } from "../experiment/aux";
import { trialEvalScores } from "../prediction-correlation/aux";
import { fixParsedJson } from "../prediction-correlation";

export const name = "batch-vs-single-pair";
const description = "Compare the sending pairs one at a time or in batch(es)";

/**
 * ExpType for PredictionCorrelation experiment
 */
export interface BVSPExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<BVSPExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<BVSPExpTypes["Data"]>> {
  const tool = {
    name: "evaluate_pair_scores",
    description: "Evaluates the scores of the pairs returned",
    schema: toolSchema,
  };
  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;

  logger.debug(`  ❓ Prompt ${prompt.id}`);

  const res = await this.iterateConversation(
    { ...vars, prompt },
    tool,
    maxRetries
  );
  //const res = await this.getTurnResponse({ ...vars, prompt }, tool, maxRetries);
  return res;
}

function expDataToExpScore(
  this: Experiment<BVSPExpTypes>,
  data: ExperimentData<BVSPExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.okDataAvg,
  };
}

export async function evaluateTrial(
  this: Experiment<BVSPExpTypes>,
  dpart: DsPartition,
  got: { data: BVSPExpTypes["Data"]; prompt: TurnPrompt }[]
) {
  const pairs = got
    .flatMap(({ prompt }) => prompt.pairs)
    .map(
      p => [p[0].toLowerCase(), p[1].toLowerCase()].sort() as [string, string]
    );

  const expected = { scores: getPairScoreListFromDPart(pairs, dpart) };

  const lcGotScores = got.flatMap(({ data }) =>
    data.scores.map(s => ({
      words: [s.words[0].toLowerCase(), s.words[1].toLowerCase()] as [
        string,
        string,
      ],
      score: s.score,
    }))
  );

  // if all pairs are non-usable, return non-usable data
  const nonUsableData = got
    .flatMap(({ data }) => data.scores)
    .filter(s => !s.words?.length || isNaN(s.score)).length;
  if (nonUsableData === got.length) {
    return new NonUsableData(got, expected);
  }

  try {
    const { corr, gotVsExp } = trialEvalScores(pairs, dpart, lcGotScores);
    const intersecSize = Object.keys(gotVsExp).reduce(
      (acc, w1) => acc + Object.keys(gotVsExp[w1]).length,
      0
    );
    logger.trace(
      `Pairs expected (${pairs.length}) and received (${lcGotScores.length}) values (intersection ${intersecSize}, correlation ${corr.pcorr}):\n${JSON.stringify(gotVsExp, null, 2)}`
    );

    if (corr.pcorr === null) {
      return new NonUsableData(got, expected);
    }
    if (corr.pcorr === 1) {
      // FIXME what if got has less pairs than expected?
      return new DataCorrect(got, expected);
    }

    return new DataPartiallyIncorrect(corr.pcorr, got, expected);
  } catch (e) {
    if (e instanceof EvaluationResult) {
      return e;
    }
    return new NonUsableData(got, expected);
  }
}

export default new Experiment(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  { expDataToExpScore, fixParsedJson } // TODO add customCombineEvals
);
