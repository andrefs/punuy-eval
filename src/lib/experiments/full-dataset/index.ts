import { Static } from "@sinclair/typebox";
import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenToolSchema,
  GenericExpTypes,
  TrialResult,
  TurnPrompt,
} from "../experiment";
import query from "../prediction-correlation/query";
import logger from "src/lib/logger";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import {
  DataCorrect,
  DataPartiallyIncorrect,
  EvaluationResult,
  NonUsableData,
} from "src/lib/evaluation";
import { trialEvalScores } from "../prediction-correlation/aux";
import { getPairScoreListFromDPart } from "../experiment/aux";

export const name = "full-dataset";
const description = "Evaluate LLMs prediction correlation using full datasets";

/**
 * ExpType for FullDataset experiment
 */
export interface FDExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

/**
 *
 */
async function runTrial(
  this: Experiment<FDExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  genToolSchema: GenToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<FDExpTypes["Data"]>> {
  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  logger.debug(`  ❔ Prompt: ${prompt.id}`);

  const toolSchema = genToolSchema(
    Array.isArray(prompt.pairs[0])
      ? prompt.pairs[0].length
      : prompt.pairs.length
  );

  console.log(`  ❔ Tool schema: ${JSON.stringify(toolSchema, null, 2)}`);

  const tool = {
    name: "evaluate_pair_scores",
    description: "Evaluates the scores of the pairs returned",
    schema: toolSchema,
  };

  const res = await this.iterateConversation(
    { ...vars, prompt },
    tool,
    maxRetries
  );
  //const res = await this.getTurnResponse({ ...vars, prompt }, tool, maxRetries);
  return res;
}

function expDataToExpScore(
  this: Experiment<FDExpTypes>,
  data: ExperimentData<FDExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.okDataAvg,
  };
}

export async function evaluateTrial(
  this: Experiment<FDExpTypes>,
  dpart: DsPartition,
  got: { data: FDExpTypes["Data"]; prompt: TurnPrompt }[]
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
  this: Experiment<FDExpTypes>,
  parsed: any // eslint-disable-line @typescript-eslint/no-explicit-any
): FDExpTypes["Data"] {
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

export default new Experiment<FDExpTypes>(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  { expDataToExpScore, fixParsedJson } // TODO add customCombineEvals
);
