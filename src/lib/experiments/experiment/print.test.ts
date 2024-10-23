import { generateComparisons } from "./print";
import { describe, expect, it } from "vitest";
import { ExpScore, ExpVars, Prompt } from "./types";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import { Model } from "src/lib/models";

describe("print", () => {
  describe("generateComparisons", () => {
    it("should return comparisons", () => {
      const varNames: (keyof ExpVars)[] = [
        "dpart",
        "model",
        "language",
      ] as (keyof ExpVars)[];

      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "en" },
          },
          score: 0.5,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "pt" },
          },
          score: 0.5,
        },
      ];

      const res = generateComparisons(varNames, expScores);
      expect(res).toMatchInlineSnapshot(`
        [
          {
            "data": {
              "train": {
                "en": 0.5,
                "pt": 0.5,
              },
            },
            "fixedValueConfig": {
              "model": "gpt2",
            },
            "variables": [
              "dpart",
              "language",
            ],
          },
          {
            "data": {
              "gpt2": {
                "en": 0.5,
                "pt": 0.5,
              },
            },
            "fixedValueConfig": {
              "dpart": "train",
            },
            "variables": [
              "model",
              "language",
            ],
          },
        ]
      `);
    });
  });
});
