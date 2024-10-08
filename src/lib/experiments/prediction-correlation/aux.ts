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
import { pairsToHash } from "../aux";
import { InsufficientData } from "src/lib/evaluation";

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
    for (const trial of exp.results.raw) {
      const lcPairs = trial.prompt.pairs!.map(
        p => [p[0].toLowerCase(), p[1].toLowerCase()] as [string, string]
      );
      const rawResults = trial.data.scores as PairScoreList;
      try {
        const corr = trialEvalScores(lcPairs, exp.variables.dpart, rawResults);
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

export function trialEvalScores(
  pairs: [string, string][],
  dpart: DsPartition,
  raw: PairScoreList
): ReturnType<typeof pcorrTest> {
  const got = rawResultsToAvg(raw.filter(x => x !== null));
  const pairsHash = pairsToHash(pairs);
  const targetScale = { min: 1, max: 5 };
  const expected = {} as ScoreDict;

  for (const entry of dpart.data) {
    const value = valueFromEntry(entry, dpart.scale, targetScale);
    const w1 = entry.term1.toLowerCase();
    const w2 = entry.term2.toLowerCase();
    if (w1 in got && w2 in got[w1] && pairsHash[w1] && pairsHash[w1][w2]) {
      expected[w1] = expected[w1] || {};
      expected[w1][w2] = value;
    }
  }

  const gotArr = [] as number[];
  const expArr = [] as number[];
  for (const w1 in expected) {
    for (const w2 in expected[w1]) {
      if (w1 in got && w2 in got[w1]) {
        gotArr.push(Number(got[w1][w2]));
        expArr.push(Number(expected[w1][w2]));
      }
    }
  }

  if (gotArr.length < 10 || gotArr.length < pairs.length / 2) {
    throw new InsufficientData(gotArr, expArr);
  }
  if (gotArr.length !== expArr.length) {
    throw new Error("Got and expected arrays have different lengths");
  }

  const corr = pcorrTest(gotArr, expArr);
  return corr;
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
