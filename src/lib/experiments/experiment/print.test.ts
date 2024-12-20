import {
  calcCorrVarValues,
  CorrVarValues,
  generateComparisons,
  genTable,
  mergeCorrVarNames,
} from "./print";
import { describe, expect, it } from "vitest";
import { ExpScore, Prompt } from "./types";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import { Model } from "src/lib/models";
import { ComparisonGroup } from "./aux";

describe("print", () => {
  describe("generateComparisons", () => {
    it("should return a single comparison if there's only one variable", () => {
      const varValues = {
        dpart: new Set(["train"]),
        model: new Set(["gpt2"]),
        language: new Set(["en", "pt"]),
        prompt: new Set(["prompt1"]),
      };

      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "en" },
          },
          score: 0.1,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "pt" },
          },
          score: 0.2,
        },
      ];

      const res = generateComparisons(varValues, expScores);
      expect(res).toMatchInlineSnapshot(`
        [
          {
            "data": {
              "": {
                "en": 0.1,
                "pt": 0.2,
              },
            },
            "fixedValueConfig": {
              "dpart": "train",
              "model": "gpt2",
              "prompt": "prompt1",
            },
            "variables": [
              [
                "language",
              ],
            ],
          },
        ]
      `);
    });

    it.skip("should return comparisons (1)", () => {
      const varValues = {
        dpart: new Set(["train"]),
        model: new Set(["gpt2"]),
        language: new Set(["en", "pt"]),
        prompt: new Set(["prompt1", "prompt2"]),
      };

      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "en" },
          },
          score: 0.1,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt2" } as Prompt,
            language: { id: "pt" },
          },
          score: 0.2,
        },
      ];

      const res = generateComparisons(varValues, expScores);
      expect(res).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "dpart=train, model=gpt2": {
              "prompt=prompt1, language=en": 0.1,
              "prompt=prompt2, language=pt": 0.2,
            },
          },
          "fixedValueConfig": {},
          "variables": [
            [
              "dpart",
              "model",
            ],
            [
              "prompt",
              "language",
            ],
          ],
        },
      ]
    `);
    });

    it("should return comparisons (2)", () => {
      const varValues = {
        dpart: new Set(["train"]),
        model: new Set(["gpt2"]),
        language: new Set(["en", "pt"]),
        prompt: new Set(["prompt1", "prompt2"]),
      };

      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "en" },
          },
          score: 0.1,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt2" } as Prompt,
            language: { id: "pt" },
          },
          score: 0.2,
        },
      ];

      const res = generateComparisons(varValues, expScores);
      expect(res).toMatchInlineSnapshot(`
        [
          {
            "data": {
              "": {
                "prompt=prompt1;language=en": 0.1,
                "prompt=prompt2;language=pt": 0.2,
              },
            },
            "fixedValueConfig": {
              "dpart": "train",
              "model": "gpt2",
            },
            "variables": [
              [
                "prompt",
                "language",
              ],
            ],
          },
        ]
      `);
    });

    it("should return comparisons (3)", () => {
      const varValues = {
        dpart: new Set(["train"]),
        model: new Set(["gpt2"]),
        language: new Set(["en", "pt"]),
        prompt: new Set(["prompt1", "prompt2"]),
        relationType: new Set(["similarity"]),
      };

      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "en" },
            relationType: { id: "similarity" },
          },
          score: 0.1,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "pt" },
            relationType: { id: "similarity" },
          },
          score: 0.2,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt2" } as Prompt,
            language: { id: "pt" },
            relationType: { id: "similarity" },
          },
          score: 0.2,
        },
      ];

      const res = generateComparisons(varValues, expScores);
      expect(res).toMatchInlineSnapshot(`
        [
          {
            "data": {
              "prompt1": {
                "en": 0.1,
                "pt": 0.2,
              },
              "prompt2": {
                "pt": 0.2,
              },
            },
            "fixedValueConfig": {
              "dpart": "train",
              "model": "gpt2",
              "relationType": "similarity",
            },
            "variables": [
              [
                "prompt",
              ],
              [
                "language",
              ],
            ],
          },
        ]
      `);
    });

    it("should return comparisons (4)", () => {
      const varValues = {
        dpart: new Set(["train"]),
        model: new Set(["gpt2"]),
        language: new Set(["en", "pt"]),
        prompt: new Set(["prompt1", "prompt2"]),
        relationType: new Set(["similarity", "relatedness"]),
      };

      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "en" },
            relationType: { id: "similarity" },
          },
          score: 0.1,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "pt" },
            relationType: { id: "similarity" },
          },
          score: 0.2,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt2" } as Prompt,
            language: { id: "pt" },
            relationType: { id: "relatedness" },
          },
          score: 0.2,
        },
      ];

      const res = generateComparisons(varValues, expScores);
      expect(res).toMatchInlineSnapshot(`
        [
          {
            "data": {
              "prompt=prompt1;relationType=similarity": {
                "en": 0.1,
                "pt": 0.2,
              },
              "prompt=prompt2;relationType=relatedness": {
                "pt": 0.2,
              },
            },
            "fixedValueConfig": {
              "dpart": "train",
              "model": "gpt2",
            },
            "variables": [
              [
                "prompt",
                "relationType",
              ],
              [
                "language",
              ],
            ],
          },
        ]
      `);
    });
  });

  describe("calcCorrVarValues", () => {
    it("should calculate tree of variable values", () => {
      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
          },
          score: 0.1,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt2" } as Prompt,
          },
          score: 0.2,
        },
      ];

      const res = calcCorrVarValues(expScores);
      expect(res).toMatchInlineSnapshot(`
        {
          "dpart": {
            "train": {
              "model": Set {
                "gpt2",
              },
              "prompt": Set {
                "prompt1",
                "prompt2",
              },
            },
          },
          "model": {
            "gpt2": {
              "dpart": Set {
                "train",
              },
              "prompt": Set {
                "prompt1",
                "prompt2",
              },
            },
          },
          "prompt": {
            "prompt1": {
              "dpart": Set {
                "train",
              },
              "model": Set {
                "gpt2",
              },
            },
            "prompt2": {
              "dpart": Set {
                "train",
              },
              "model": Set {
                "gpt2",
              },
            },
          },
        }
      `);
    });
  });
  describe("mergeCorrVarNames", () => {
    it("should not duplicate variable names", () => {
      const cvv: CorrVarValues = {
        dpart: {
          train: {
            language: new Set(["en", "pt"]),
            model: new Set(["gpt2"]),
            prompt: new Set(["prompt1", "prompt2"]),
          },
        },
        language: {
          en: {
            dpart: new Set(["train"]),
            model: new Set(["gpt2"]),
            prompt: new Set(["prompt1"]),
          },
          pt: {
            dpart: new Set(["train"]),
            model: new Set(["gpt2"]),
            prompt: new Set(["prompt2"]),
          },
        },
        model: {
          gpt2: {
            dpart: new Set(["train"]),
            language: new Set(["en", "pt"]),
            prompt: new Set(["prompt1", "prompt2"]),
          },
        },
        prompt: {
          prompt1: {
            dpart: new Set(["train"]),
            language: new Set(["en"]),
            model: new Set(["gpt2"]),
          },
          prompt2: {
            dpart: new Set(["train"]),
            language: new Set(["pt"]),
            model: new Set(["gpt2"]),
          },
        },
      };
      const res = mergeCorrVarNames(cvv, ["dpart", "model"]);
      expect(res).toMatchInlineSnapshot(`
        [
          Set {
            "language",
            "prompt",
          },
        ]
      `);
    });
    it("should merge variable names", () => {
      const cvv: CorrVarValues = {
        a: {
          "1": {
            b: new Set(["1"]),
          },
          "2": {
            c: new Set(["2"]),
          },
          "5": {
            d: new Set(["5"]),
          },
        },
        b: {
          "1": {
            a: new Set(["1"]),
          },
        },
        c: {
          "3": {
            a: new Set(["3", "4"]),
          },
        },
        d: {
          "5": {
            a: new Set(["5"]),
          },
        },
      };

      const res = mergeCorrVarNames(cvv, []);
      expect(res).toMatchInlineSnapshot(`
        [
          Set {
            "a",
            "b",
            "d",
          },
          Set {
            "c",
          },
        ]
      `);
    });
  });

  describe("genTable", () => {
    it("should generate a table", () => {
      const comp: ComparisonGroup = {
        data: {
          "dpart=train, model=gpt2": {
            "prompt=prompt1, language=en": 0.1,
            "prompt=prompt2, language=pt": 0.2,
          },
        },
        fixedValueConfig: {},
        variables: [
          ["dpart", "model"],
          ["prompt", "language"],
        ],
      };
      const { csv, table } = genTable(comp);
      expect(csv).toMatchInlineSnapshot(`
        ",prompt=prompt1, language=en,prompt=prompt2, language=pt
        dpart=train, model=gpt2,0.1,0.2
        "
      `);
      expect(table).toMatchInlineSnapshot(`
        [
          {
            "(index)": "dpart=train, model=gpt2",
            "prompt=prompt1, language=en": 0.1,
            "prompt=prompt2, language=pt": 0.2,
          },
        ]
      `);
    });
  });
});
