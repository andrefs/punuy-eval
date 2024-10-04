import pcorrTest from "@stdlib/stats-pcorrtest";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import logger from "src/lib/logger";
import { PairScoreList, ScoreDict, SinglePairScore } from "../experiment/types";
import { pairsToHash } from "../aux";
import { rawResultsToAvg } from "../prediction-correlation/aux";
import { valueFromEntry } from "../experiment/aux";

export function parseToRawResults(raw: string[]) {
  const failed = [];
  const objs = [] as (SinglePairScore[] | null)[];
  for (const [i, r] of raw.entries()) {
    try {
      const obj = JSON.parse(r).scores as SinglePairScore[];
      objs.push(obj);
    } catch (e) {
      logger.warn(`Failed to parse result ${i + 1}: ${e}`);
      failed.push(i + 1);
      objs.push(null);
    }
  }
  return { parsed: objs, failed };
}

export function evalScores(
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

  const corr = pcorrTest(gotArr, expArr);
  return corr;
}
