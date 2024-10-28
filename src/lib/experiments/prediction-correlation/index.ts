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
  logger.debug(`  ❔ Prompt: ${prompt.id}`);

  const res = await this.iterateConversation(
    { ...vars, prompt },
    tool,
    maxRetries
  );
  //const res = await this.getTurnResponse({ ...vars, prompt }, tool, maxRetries);
  return res;
}

function expDataToExpScore(
  this: Experiment<PCExpTypes>,
  data: ExperimentData<PCExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.okDataAvg,
  };
}

export async function evaluateTrial(
  this: Experiment<PCExpTypes>,
  dpart: DsPartition,
  got: { data: PCExpTypes["Data"]; prompt: TurnPrompt }[]
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

export function fixParsedJson(
  this: Experiment<PCExpTypes>,
  parsed: any // eslint-disable-line @typescript-eslint/no-explicit-any
): PCExpTypes["Data"] {
  if (parsed?.scores && Array.isArray(parsed.scores)) {
    for (const s of parsed.scores) {
      // score sometimes comes as string
      if (typeof s.score === "string") {
        s.score = Number(s.score);

        s.words = s.words.map((w: string) =>
          w
            .replace(/’/g, "'")
            .replace(/‘/g, "'")
            .replace(/”/g, '"')
            .replace(/“/g, '"')
            .replace(/–/g, "-")
            .replace(/_+/g, " ")
            .trim()
        );
      }
    }
  }
  return parsed;
}

export default new Experiment<PCExpTypes>(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  { expDataToExpScore, fixParsedJson } // TODO add customCombineEvals
);
