import { Static } from "@sinclair/typebox";
import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenToolSchema,
  GenericExpTypes,
  Prompt,
  PromptGenerator,
  TrialAttemptData as TrialAttempts,
  TrialOpts,
  TrialResult,
  TurnPrompt,
  TurnResponses,
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
import {
  getAttemptFailedPairs,
  getPairScoreListFromDPart,
} from "../experiment/aux";
import {
  getLastCacheFileName,
  loadFailedPairsCache,
} from "../experiment/exp-cache";

export const name = "cache-retry-fd";
const description =
  "Evaluate LLMs prediction correlation using full datasets, caching and retrying failed pairs.";

/**
 * ExpType for CacheRetryFD experiment
 */
export interface CRExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function tryLoadLastTry(
  this: Experiment<CRExpTypes>,
  folder: string
): Promise<[string, string][]> {
  const lastCacheFile = await getLastCacheFileName(folder);
  const { date, pairs } = await loadFailedPairsCache(lastCacheFile);

  if (!pairs.length) {
    logger.info(
      `  ❗ No pairs found in cache file ${lastCacheFile} (date: ${date})`
    );
  } else {
    logger.info(
      `  🫣 Found ${pairs.length} pairs in cache file ${lastCacheFile} (date: ${date})`
    );
  }
  return pairs;
}

async function tryLoadFailedPairsCache(
  this: Experiment<CRExpTypes>,
  folder: string
): Promise<[string, string][]> {
  const lastCacheFile = await getLastCacheFileName(folder);
  const { date, pairs: failedPairs } =
    await loadFailedPairsCache(lastCacheFile);

  if (!failedPairs.length) {
    logger.info(
      `  ❗ No failed pairs found in cache file ${lastCacheFile} (date: ${date})`
    );
  } else {
    logger.info(
      `  🫣 Found ${failedPairs.length} failed pairs in cache file ${lastCacheFile} (date: ${date})`
    );
  }
  return failedPairs;
}

/**
 *
 */
async function runTrial(
  this: Experiment<CRExpTypes>,
  vars: ExpVars,
  genToolSchema: GenToolSchema,
  opts: TrialOpts = { maxTrialAttempts: 3 }
): Promise<TrialAttempts<CRExpTypes["Data"]>> {
  if (opts.prevFailedPairs) {
    logger.info(
      `  🫣 Using previous failed pairs: ${opts.prevFailedPairs.length} pairs`
    );
  }
  let prompt = vars.prompt.generate(vars, opts.prevFailedPairs);
  logger.debug(`  ❔ Prompt: ${prompt.id}`);

  const toolSchema = genToolSchema(
    Array.isArray(prompt.pairs[0])
      ? prompt.pairs[0].length
      : prompt.pairs.length
  );

  // logger.info(`   ❔ Tool schema:\n${JSON.stringify(toolSchema, null, 2)}`);

  const tool = {
    name: "evaluate_pair_scores",
    description: "Evaluates the scores of the pairs returned",
    schema: toolSchema,
  };

  let i = 0;
  let notDone = true;
  const attempts: TrialAttempts<CRExpTypes["Data"]> = [];

  while (notDone && i < opts.maxTrialAttempts) {
    const att = await this.iterateConversation({ ...vars, prompt }, tool, opts);
    attempts.push(att);
    if (att.every(turn => turn.ok)) {
      logger.info(`    ✅ All pairs scored successfully.`);
      notDone = false;
      continue;
    }

    const failedPairs = getAttemptFailedPairs(att);
    prompt = vars.prompt.generate(vars, failedPairs);
    logger.warn(
      `    ❗ Some pairs failed to score (attempt #${i + 1} of ${opts.maxTrialAttempts}).`
    );
    i++;
  }

  return attempts;
}

function expDataToExpScore(
  this: Experiment<CRExpTypes>,
  data: ExperimentData<CRExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.okDataAvg,
  };
}

export async function evaluateTrial(
  this: Experiment<CRExpTypes>,
  dpart: DsPartition,
  got: { data: CRExpTypes["Data"]; prompt: TurnPrompt }[]
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
  this: Experiment<CRExpTypes>,
  parsed: any // eslint-disable-line @typescript-eslint/no-explicit-any
): CRExpTypes["Data"] {
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

export default (traceId: number, folder: string) =>
  new Experiment<CRExpTypes>(
    name,
    traceId,
    folder,
    description,
    query,
    runTrial,
    evaluateTrial,
    { expDataToExpScore, fixParsedJson } // TODO add customCombineEvals
  );
