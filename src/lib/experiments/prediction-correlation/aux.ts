import logger from "src/lib/logger";
import {
  ExperimentData,
  ExpScore,
  GenericExpTypes,
  PairScoreList,
  ScoreDict,
} from "../experiment";
import { getVarIds, valueFromEntry } from "../experiment/aux";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import pcorrTest from "@stdlib/stats-pcorrtest";
import { MismatchedData } from "src/lib/evaluation";
import { pairsToHash } from "../aux";

/**
 * Evaluate the scores of the experiments
 * Correlate results of each experiment with its dataset
 * @param exps - The experiments to evaluate
 * @returns The evaluated scores
 * @throws {Error} If more than half of the trials failed to parse
 */
export function expEvalScores<T extends GenericExpTypes>(
  exps: ExperimentData<T>[]
): ExpScore[] {
  const res = [];
  for (const [i, exp] of exps.entries()) {
    for (const [iTrial, trial] of exp.results.raw.entries()) {
      const lcPairs = trial.turns
        .flatMap(t => t.prompt.pairs)
        .map(p => [p[0].toLowerCase(), p[1].toLowerCase()] as [string, string]);
      const rawResults = trial.turns
        .flatMap(t => t.data)
        .flatMap(t => t.scores) as PairScoreList;
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
  const gotData = rawResultsToAvg(raw.filter(x => x !== null));
  const pairHash = pairsToHash(pairs);
  const expData: ScoreDict = {};
  const targetScale = { min: 1, max: 5 };

  for (const pair of dpart.data) {
    const [w1, w2] = [
      pair.term1.toLowerCase(),
      pair.term2.toLowerCase(),
    ].sort();

    // pair was not included in the LLM prompt
    if (
      (!(w1 in pairHash) || !(w2 in pairHash[w1])) &&
      (!(w2 in pairHash) || !(w1 in pairHash[w2]))
    ) {
      continue;
    }

    const expValue = valueFromEntry(pair, dpart.scale, targetScale);
    if (typeof expValue !== "number") {
      // something went wrong with the scale conversion
      continue;
    }
    expData[w1] = expData[w1] || {};
    expData[w1][w2] = expValue;
  }

  // got and exp have different lengths, throw Mismatch
  if (raw.length !== pairs.length) {
    throw new MismatchedData(gotData, expData);
  }

  // they have the same length, but do they have the same pairs?
  const gotArr: number[] = [];
  const expArr: number[] = [];
  const gotVsExp: {
    [key: string]: { [key: string]: { got?: number; exp?: number } };
  } = {};
  for (const w1 in expData) {
    for (const w2 in expData[w1]) {
      if (
        (!(w1 in gotData) || !(w2 in gotData[w1])) &&
        (!(w2 in gotData) || !(w1 in gotData[w2]))
      ) {
        // nope, throw Mismatch
        throw new MismatchedData(gotData, expData);
      } else {
        const expVal = expData[w1]?.[w2] ?? expData[w2][w1];
        expArr.push(expVal);
        const gotVal = gotData[w1]?.[w2] ?? gotData[w2][w1];
        gotArr.push(gotVal);
        gotVsExp[w1] = gotVsExp[w1] || {};
        gotVsExp[w1][w2] = {
          got: gotVal,
          exp: expVal,
        };
      }
    }
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
