import { describe, expect, test } from "@jest/globals";
import {
  ComparisonGroup,
  getFixedValueGroup,
  normalizeScale,
  rawResultsToAvg,
} from "./aux";
import { ExpVars, Prompt } from "..";
import { Model } from "../../models";
import { DsPartition } from "../../dataset-adapters/DsPartition";

describe("compare-prompts aux", () => {
  describe("getFixedValueGroup", () => {
    test("should create a fixed value group when there's none", () => {
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

    test("should return existing fixed value group", () => {
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

    test("should create a new fixed value group if fixed values are different", () => {
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

  describe("normalizeScale", () => {
    test("0/10 to 0/100", () => {
      const value = 5;
      const sourceScale = { min: 0, max: 10 };
      const targetScale = { min: 0, max: 100 };
      const result = normalizeScale(value, sourceScale, targetScale);
      expect(result).toBe(50);
    });

    test("0/10 to 50/100", () => {
      const value = 5;
      const sourceScale = { min: 0, max: 10 };
      const targetScale = { min: 50, max: 100 };
      const result = normalizeScale(value, sourceScale, targetScale);
      expect(result).toBe(75);
    });

    test("0/4 to 1/5", () => {
      const value = 3;
      const sourceScale = { min: 0, max: 4 };
      const targetScale = { min: 1, max: 5 };
      const result = normalizeScale(value, sourceScale, targetScale);
      expect(result).toBe(4);
    });
  });
  describe("rawResultsToAvg", () => {
    test("should return average of results", () => {
      const rawResults = [
        [
          { words: ["w1", "w2"], score: "1" },
          { words: ["w1", "w2"], score: "2" },
          { words: ["w1", "w2"], score: "5" },
        ],
        [
          { words: ["w3", "w4"], score: "4" },
          { words: ["w3", "w4"], score: "3" },
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

    test("should ignore results with empty word array", () => {
      const rawResults = [
        [
          { words: ["w1", "w2"], score: "1" },
          { words: [], score: "2" },
          { words: ["w1", "w2"], score: "5" },
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

    test("should ignore empty or NaN scores", () => {
      const rawResults = [
        [
          { words: ["w1", "w2"], score: "1" },
          { words: ["w1", "w2"], score: "" },
          { words: ["w1", "w2"], score: "5" },
          { words: ["w1", "w2"], score: "NaN" },
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
});
