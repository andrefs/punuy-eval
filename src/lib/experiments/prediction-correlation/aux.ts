import logger from "src/lib/logger";
import {
  ExperimentData,
  ExpScore,
  PairScoreList,
  ScoreDict,
} from "../experiment";
import { getVarIds, valueFromEntry } from "../experiment/aux";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import pcorrTest from "@stdlib/stats-pcorrtest";
import { PCExpTypes } from ".";
import { InsufficientData } from "src/lib/evaluation";
import { pairsToHash } from "../aux";

/**
 * Evaluate the scores of the experiments
 * Correlate results of each experiment with its dataset
 * @param exps - The experiments to evaluate
 * @returns The evaluated scores
 * @throws {Error} If more than half of the trials failed to parse
 */
export function expEvalScores(exps: ExperimentData<PCExpTypes>[]): ExpScore[] {
  const res = [];
  for (const [i, exp] of exps.entries()) {
    for (const [iTrial, trial] of exp.results.raw.entries()) {
      const lcPairs = trial.prompt.pairs!.map(
        p => [p[0].toLowerCase(), p[1].toLowerCase()] as [string, string]
      );
      const rawResults = trial.data.scores as PairScoreList;
      try {
        const { corr, gotVsExp } = trialEvalScores(
          lcPairs,
          exp.variables.dpart,
          rawResults
        );
        logger.debug(
          `Trial ${iTrial} of exp ${i} (${exp.meta.name}) got correlation ${corr.pcorr}: ${gotVsExp}`
        );
        res.push({
          variables: exp.variables,
          score: corr!.pcorr,
        });
      } catch (e) {
        logger.warn(
          `Error calculating correlation for expVC ${i} with variables ${JSON.stringify(
            getVarIds(exp.variables)
          )}: ${e}`
        );
      }
    }
  }
  return res;
}

export interface TrialEvalScoresResult {
  corr: ReturnType<typeof pcorrTest>;
  gotVsExp: {
    [key: string]: { [key: string]: { got?: number; exp?: number } };
  };
}

export function trialEvalScores(
  pairs: [string, string][],
  dpart: Pick<DsPartition, "data" | "scale">,
  raw: PairScoreList
): TrialEvalScoresResult {
  const got = rawResultsToAvg(raw.filter(x => x !== null));
  const pairHash = pairsToHash(
    pairs.map(
      ([w1, w2]) =>
        [w1.toLowerCase(), w2.toLowerCase()].sort() as [string, string]
    )
  );
  const targetScale = { min: 1, max: 5 };
  const gotVsExp: {
    [key: string]: { [key: string]: { got?: number; exp?: number } };
  } = {};

  for (const expected of dpart.data) {
    const expValue = valueFromEntry(expected, dpart.scale, targetScale);
    if (typeof expValue !== "number") {
      continue;
    }
    const [w1, w2] = [
      expected.term1.toLowerCase(),
      expected.term2.toLowerCase(),
    ].sort();

    // pair was not included in the LLM prompt
    if (
      (!(w1 in pairHash) || !(w2 in pairHash[w1])) &&
      (!(w2 in pairHash) || !(w1 in pairHash[w2]))
    ) {
      continue;
    }
    // pair was not included in the LLM response
    if (
      (!(w1 in got) || !(w2 in got[w1])) &&
      (!(w2 in got) || !(w1 in got[w2]))
    ) {
      continue;
    }
    // pair included in dataset partition, LLM prompt and LLM response
    if ((w1 in got && w2 in got[w1]) || (w2 in got && w1 in got[w2])) {
      gotVsExp[w1] = gotVsExp[w1] || {};
      gotVsExp[w1][w2] = gotVsExp[w1][w2] || {};
      gotVsExp[w1][w2] = {
        got: got[w1]?.[w2] ?? got[w2][w1],
        exp: expValue,
      };
    }
  }

  const gotArr = [] as number[];
  const expArr = [] as number[];
  for (const w1 in gotVsExp) {
    for (const w2 in gotVsExp[w1]) {
      gotArr.push(gotVsExp[w1][w2].got!);
      expArr.push(gotVsExp[w1][w2].exp!);
    }
  }
  if (gotArr.length < 10 || gotArr.length < pairs.length / 2) {
    throw new InsufficientData(gotArr, expArr);
  }
  if (gotArr.length !== expArr.length) {
    throw new Error("Got and expected arrays have different lengths");
  }

  const corr = pcorrTest(gotArr, expArr);
  return {
    corr,
    gotVsExp,
  };
}

export function rawResultsToAvg(parsed: PairScoreList) {
  const values = {} as { [key: string]: { [key: string]: number[] } };
  for (const { words, score } of parsed) {
    if (words?.length !== 2 || isNaN(score)) {
      continue;
    }
    const [w1, w2] = words.map(x => x.toLowerCase());
    values[w1] = values[w1] || {};
    values[w1][w2] = values[w1][w2] || [];
    values[w1][w2].push(Number(score));
  }

  const res = {} as ScoreDict;
  for (const w1 in values) {
    res[w1] = {};
    for (const w2 in values[w1]) {
      res[w1][w2] =
        values[w1][w2].reduce((a, b) => a + b, 0) / values[w1][w2].length;
    }
  }
  return res;
}
