import { describe, expect, it } from "vitest";
import { evalScores, rawResultsToAvg } from "./aux";
import { ExpVars, Prompt } from "..";
import { Model } from "../../models";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import { PairScoreList } from "../experiment/types";
import pcorrTest from "@stdlib/stats-pcorrtest";
import { ComparisonGroup, getFixedValueGroup } from "../experiment/aux";

describe("compare-prompts aux", () => {
  describe("getFixedValueGroup", () => {
    it("should create a fixed value group when there's none", () => {
      const compGroups = [] as ComparisonGroup[];
      const fixedNames = ["model", "dpart"] as (keyof ExpVars)[];
      const vars = {
        model: { id: "m1" } as Model,
        dpart: { id: "d1" } as DsPartition,
        language: { id: "pt" as const },
        measureType: { id: "similarity" as const },
        prompt: { id: "p1" } as Prompt,
      };

      const group = getFixedValueGroup(
        compGroups,
        vars,
        fixedNames,
        "language",
        "measureType"
      );
      expect(compGroups).toHaveLength(1);
      expect(group).toMatchInlineSnapshot(`
        {
          "data": {},
          "fixedValueConfig": {
            "dpart": "d1",
            "model": "m1",
          },
          "variables": [
            "language",
            "measureType",
          ],
        }
      `);
    });

    it("should return existing fixed value group", () => {
      const compGroups = [
        {
          fixedValueConfig: { model: "m1", dpart: "d1" },
          variables: ["language", "measureType"],
          data: {},
        },
      ] as ComparisonGroup[];
      const fixedNames = ["model", "dpart"] as (keyof ExpVars)[];
      const vars = {
        model: { id: "m1" } as Model,
        dpart: { id: "d1" } as DsPartition,
        language: { id: "pt" as const },
        measureType: { id: "similarity" as const },
        prompt: { id: "p1" } as Prompt,
      };

      const group = getFixedValueGroup(
        compGroups,
        vars,
        fixedNames,
        "language",
        "measureType"
      );
      expect(compGroups).toHaveLength(1);
      expect(group).toMatchInlineSnapshot(`
        {
          "data": {},
          "fixedValueConfig": {
            "dpart": "d1",
            "model": "m1",
          },
          "variables": [
            "language",
            "measureType",
          ],
        }
      `);
    });

    it("should create a new fixed value group if fixed values are different", () => {
      const compGroups = [
        {
          fixedValueConfig: { model: "m1", dpart: "d1" },
          variables: ["language", "measureType"],
          data: {},
        },
      ] as ComparisonGroup[];
      const fixedNames = ["model", "dpart"] as (keyof ExpVars)[];
      const vars = {
        model: { id: "m2" } as Model,
        dpart: { id: "d1" } as DsPartition,
        language: { id: "pt" as const },
        measureType: { id: "similarity" as const },
        prompt: { id: "p1" } as Prompt,
      };

      const group = getFixedValueGroup(
        compGroups,
        vars,
        fixedNames,
        "language",
        "measureType"
      );
      expect(compGroups).toHaveLength(2);
      expect(group).toMatchInlineSnapshot(`
        {
          "data": {},
          "fixedValueConfig": {
            "dpart": "d1",
            "model": "m2",
          },
          "variables": [
            "language",
            "measureType",
          ],
        }
      `);
    });
  });

  describe("rawResultsToAvg", () => {
    it("should return average of results", () => {
      const rawResults: PairScoreList[] = [
        [
          { words: ["w1", "w2"], score: 1 },
          { words: ["w1", "w2"], score: 2 },
          { words: ["w1", "w2"], score: 5 },
        ],
        [
          { words: ["w3", "w4"], score: 4 },
          { words: ["w3", "w4"], score: 3 },
        ],
      ];
      const avg = rawResultsToAvg(rawResults);
      expect(avg).toMatchInlineSnapshot(`
        {
          "w1": {
            "w2": 2.6666666666666665,
          },
          "w3": {
            "w4": 3.5,
          },
        }
      `);
    });

    //it("should ignore results with empty word array", () => {
    //  const rawResults: PairScoreList[] = [
    //    [
    //      { words: ["w1", "w2"], score: 1 },
    //      { words: [], score: 2 },
    //      { words: ["w1", "w2"], score: 5 },
    //    ],
    //  ];
    //  const avg = rawResultsToAvg(rawResults);
    //  expect(avg).toMatchInlineSnapshot(`
    //    {
    //      "w1": {
    //        "w2": 3,
    //      },
    //    }
    //  `);
    //});

    it("should ignore NaN scores", () => {
      const rawResults: PairScoreList[] = [
        [
          { words: ["w1", "w2"], score: 1 },
          { words: ["w1", "w2"], score: NaN },
          { words: ["w1", "w2"], score: 5 },
          { words: ["w1", "w4"], score: NaN },
        ],
      ];
      const avg = rawResultsToAvg(rawResults);
      expect(avg).toMatchInlineSnapshot(`
        {
          "w1": {
            "w2": 3,
          },
        }
      `);
    });
  });

  describe("evalScores", () => {
    it("should return results", () => {
      const pairs = [
        ["w1", "w2"],
        ["w3", "w4"],
        ["w5", "w6"],
        ["w7", "w8"],
        ["w9", "w10"],
      ] as [string, string][];
      const rawResults: PairScoreList[] = [
        [
          { words: ["w1", "w2"], score: 1 },
          { words: ["w3", "w4"], score: 2 },
          { words: ["w7", "w8"], score: 5 },
        ],
        [
          { words: ["w3", "w4"], score: 4 },
          { words: ["w3", "w4"], score: 3 },
          { words: ["w9", "w10"], score: 3 },
        ],
      ];
      const dpart = {
        id: "d1",
        partitionId: "p1",
        scale: { value: { min: 0, max: 10 } },
        data: [
          { term1: "w1", term2: "w2", value: 3 },
          { term1: "w3", term2: "w4", value: 8 },
          { term1: "w5", term2: "w6", value: 8 },
          { term1: "w7", term2: "w8", value: 8 },
          { term1: "w9", term2: "w10", value: 8 },
        ],
      } as DsPartition;
      const res = evalScores(pairs, dpart, rawResults);
      expect(res).toMatchInlineSnapshot(`
        {
          "alpha": 0.05,
          "alternative": "two-sided",
          "ci": [
            -0.6716527363446572,
            0.9959990160224518,
          ],
          "method": "t-test for Pearson correlation coefficient",
          "nullValue": 0,
          "pValue": 0.1835034190722753,
          "pcorr": 0.8164965809277247,
          "print": [Function],
          "rejected": false,
          "statistic": 1.9999999999999905,
        }
      `);
    });
  });

  describe("pcorrTest", () => {
    it("returns NaN if one of the arrays has all values the same", () => {
      const a1 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const a2 = [
        2.133333333, 3.6875, 1.4, 2.3125, 1.764705882, 3.066666667, 2.125,
        2.384615385, 3.615384615, 3.642857143,
      ];

      const res = pcorrTest(a1, a2);
      expect(res).toMatchInlineSnapshot(`
        {
          "alpha": 0.05,
          "alternative": "two-sided",
          "ci": [
            NaN,
            NaN,
          ],
          "method": "t-test for Pearson correlation coefficient",
          "nullValue": 0,
          "pValue": NaN,
          "pcorr": NaN,
          "print": [Function],
          "rejected": false,
          "statistic": NaN,
        }
      `);
    });
  });
});
