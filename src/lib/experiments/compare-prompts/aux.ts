import pcorrTest from "@stdlib/stats-pcorrtest";
import { PartitionScale, PartitionData } from "punuy-datasets/src/lib/types";
import { ExpVars } from "..";
import { DsPartition } from "../../dataset-adapters/DsPartition";
import logger from "src/lib/logger";
import { PairScoreList, ScoreDict, SinglePairScore } from "../experiment/types";

export interface ComparisonGroup {
  fixedValueConfig: FixedValueConfig;
  variables: [keyof ExpVars, keyof ExpVars];
  data: {
    [v1: string]: {
      [v2: string]: number;
    };
  };
}
export interface FixedValueConfig {
  [varName: string]: string;
}

export function getFixedValueGroup(
  compGroups: ComparisonGroup[],
  variables: ExpVars,
  fixedNames: (keyof ExpVars)[],
  v1: keyof ExpVars,
  v2: keyof ExpVars
): ComparisonGroup {
  for (const g of compGroups) {
    if (fixedNames.every(f => variables[f]!.id === g.fixedValueConfig[f])) {
      return g;
    }
  }
  const fvc = {} as FixedValueConfig;
  for (const f of fixedNames) {
    fvc[f] = variables[f]!.id;
  }
  const newGroup = {
    fixedValueConfig: fvc,
    data: {},
    variables: [v1, v2] as [keyof ExpVars, keyof ExpVars],
  };
  compGroups.push(newGroup);
  return newGroup;
}

export function rawResultsToAvg(parsed: PairScoreList[]) {
  const values = {} as { [key: string]: { [key: string]: number[] } };
  for (const r of parsed) {
    if (!r) {
      continue;
    }
    for (const { words, score } of r) {
      if (words?.length !== 2 || isNaN(score)) {
        continue;
      }
      const [w1, w2] = words.map(x => x.toLowerCase());
      values[w1] = values[w1] || {};
      values[w1][w2] = values[w1][w2] || [];
      values[w1][w2].push(Number(score));
    }
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

export function normalizeScale(
  value: number,
  sourceScale: { min: number; max: number },
  targetScale: { min: number; max: number }
) {
  return (
    targetScale.min +
    ((value - sourceScale.min) * (targetScale.max - targetScale.min)) /
      (sourceScale.max - sourceScale.min)
  );
}

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

export function valueFromEntry(
  entry: PartitionData,
  sourceScale: PartitionScale,
  targetScale: { min: number; max: number }
) {
  let value;
  if ("value" in entry && typeof entry.value === "number") {
    value = normalizeScale(entry.value, sourceScale.value, targetScale);
  } else {
    const values = entry.values!.filter(x => typeof x === "number") as number[];
    value = values!.reduce((a, b) => a! + b!, 0) / values.length;
  }
  return value;
}

function pairsToHash(pairs: [string, string][]) {
  const res = {} as {
    [key: string]: { [key: string]: boolean };
  };
  for (const [w1, w2] of pairs) {
    res[w1] = res[w1] || {};
    res[w1][w2] = true;
  }
  return res;
}

export function evalScores(
  pairs: [string, string][],
  dpart: DsPartition,
  raw: PairScoreList[]
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

  return pcorrTest(gotArr, expArr);
}
