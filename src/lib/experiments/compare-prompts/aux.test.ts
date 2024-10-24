import { describe, expect, it } from "vitest";
import { evalScores } from "./aux";
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
        ["language"],
        ["measureType"]
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
            [
              "language",
            ],
            [
              "measureType",
            ],
          ],
        }
      `);
    });

    it("should return existing fixed value group", () => {
      const compGroups = [
        {
          fixedValueConfig: { model: "m1", dpart: "d1" },
          variables: [["language", "measureType"]],
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
        ["language"],
        ["measureType"]
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
            [
              "language",
              "measureType",
            ],
          ],
        }
      `);
    });

    it("should create a new fixed value group if fixed values are different", () => {
      const compGroups = [
        {
          fixedValueConfig: { model: "m1", dpart: "d1" },
          variables: [["language"], ["measureType"]],
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
        ["language"],
        ["measureType"]
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
            [
              "language",
            ],
            [
              "measureType",
            ],
          ],
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
        ["w11", "w12"],
        ["w13", "w14"],
        ["w15", "w16"],
        ["w17", "w18"],
        ["w19", "w20"],
      ] as [string, string][];
      const rawResults: PairScoreList = [
        { words: ["w1", "w2"], score: 1 },
        { words: ["w3", "w4"], score: 2 },
        { words: ["w7", "w8"], score: 5 },
        { words: ["w3", "w4"], score: 4 },
        { words: ["w3", "w4"], score: 3 },
        { words: ["w9", "w10"], score: 3 },
        { words: ["w11", "w12"], score: 3 },
        { words: ["w13", "w14"], score: 3 },
        { words: ["w15", "w16"], score: 3 },
        { words: ["w17", "w18"], score: 3 },
        { words: ["w19", "w20"], score: 3 },
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
          { term1: "w11", term2: "w12", values: [1, 2, 3] },
          { term1: "w13", term2: "w14", values: [1, 2, 3] },
          { term1: "w15", term2: "w16", values: [1, 2, 3] },
          { term1: "w17", term2: "w18", values: [1, 2, 3] },
          { term1: "w19", term2: "w20", values: [1, 2, 3] },
        ],
      } as DsPartition;
      const res = evalScores(pairs, dpart, rawResults);
      expect(res).toMatchInlineSnapshot(`
        {
          "alpha": 0.05,
          "alternative": "two-sided",
          "ci": [
            -0.27663612849435365,
            0.8993883049793071,
          ],
          "method": "t-test for Pearson correlation coefficient",
          "nullValue": 0,
          "pValue": 0.17503735886453775,
          "pcorr": 0.5316817773513496,
          "print": [Function],
          "rejected": false,
          "statistic": 1.5377034888769747,
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
