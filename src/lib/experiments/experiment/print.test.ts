import {
  calcCorrVarValues,
  CorrVarValues,
  generateComparisons,
  mergeCorrVarNames,
} from "./print";
import { describe, expect, it } from "vitest";
import { ExpScore, Prompt } from "./types";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import { Model } from "src/lib/models";

describe("print", () => {
  describe("generateComparisons", () => {
    //  it("should return a single comparison if there's only one variable", () => {
    //    const varValues = {
    //      dpart: new Set(["train"]),
    //      model: new Set(["gpt2"]),
    //      language: new Set(["en", "pt"]),
    //      prompt: new Set(["prompt1"]),
    //    };

    //    const expScores: ExpScore[] = [
    //      {
    //        variables: {
    //          dpart: { id: "train" } as DsPartition,
    //          model: { id: "gpt2" } as Model,
    //          prompt: { id: "prompt1" } as Prompt,
    //          language: { id: "en" },
    //        },
    //        score: 0.1,
    //      },
    //      {
    //        variables: {
    //          dpart: { id: "train" } as DsPartition,
    //          model: { id: "gpt2" } as Model,
    //          prompt: { id: "prompt1" } as Prompt,
    //          language: { id: "pt" },
    //        },
    //        score: 0.2,
    //      },
    //    ];

    //    const res = generateComparisons(varValues, expScores);
    //    expect(res).toMatchInlineSnapshot(`
    //      [
    //        {
    //          "data": {
    //            "": {
    //              "en": 0.1,
    //              "pt": 0.2,
    //            },
    //          },
    //          "fixedValueConfig": [
    //            "dpart",
    //            "model",
    //            "prompt",
    //          ],
    //          "variables": [
    //            "language",
    //          ],
    //        },
    //      ]
    //    `);
    //  });

    it("should return comparisons (1)", () => {
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
    it("should return comparisons (3)", () => {
      const varValues = {
        dpart: new Set(["train"]),
        model: new Set(["gpt2"]),
        language: new Set(["en", "pt"]),
        prompt: new Set(["prompt1", "prompt2"]),
        measureType: new Set(["similarity"]),
      };

      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "en" },
            measureType: { id: "similarity" },
          },
          score: 0.1,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "pt" },
            measureType: { id: "similarity" },
          },
          score: 0.2,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt2" } as Prompt,
            language: { id: "pt" },
            measureType: { id: "similarity" },
          },
          score: 0.2,
        },
      ];

      const res = generateComparisons(varValues, expScores);
      expect(res).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "dpart=train, model=gpt2, measureType=similarity": {
              "prompt1": 0.1,
            },
          },
          "fixedValueConfig": {
            "language": "en",
          },
          "variables": [
            [
              "dpart",
              "model",
              "measureType",
            ],
            [
              "prompt",
            ],
          ],
        },
        {
          "data": {
            "dpart=train, model=gpt2, measureType=similarity": {
              "prompt1": 0.2,
              "prompt2": 0.2,
            },
          },
          "fixedValueConfig": {
            "language": "pt",
          },
          "variables": [
            [
              "dpart",
              "model",
              "measureType",
            ],
            [
              "prompt",
            ],
          ],
        },
        {
          "data": {
            "dpart=train, model=gpt2, measureType=similarity": {
              "en": 0.1,
              "pt": 0.2,
            },
          },
          "fixedValueConfig": {
            "prompt": "prompt1",
          },
          "variables": [
            [
              "dpart",
              "model",
              "measureType",
            ],
            [
              "language",
            ],
          ],
        },
        {
          "data": {
            "dpart=train, model=gpt2, measureType=similarity": {
              "pt": 0.2,
            },
          },
          "fixedValueConfig": {
            "prompt": "prompt2",
          },
          "variables": [
            [
              "dpart",
              "model",
              "measureType",
            ],
            [
              "language",
            ],
          ],
        },
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
            "measureType": "similarity",
            "model": "gpt2",
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
        measureType: new Set(["similarity", "relatedness"]),
      };

      const expScores: ExpScore[] = [
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "en" },
            measureType: { id: "similarity" },
          },
          score: 0.1,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt1" } as Prompt,
            language: { id: "pt" },
            measureType: { id: "similarity" },
          },
          score: 0.2,
        },
        {
          variables: {
            dpart: { id: "train" } as DsPartition,
            model: { id: "gpt2" } as Model,
            prompt: { id: "prompt2" } as Prompt,
            language: { id: "pt" },
            measureType: { id: "relatedness" },
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
              "prompt=prompt1, measureType=similarity": 0.1,
            },
          },
          "fixedValueConfig": {
            "language": "en",
          },
          "variables": [
            [
              "dpart",
              "model",
            ],
            [
              "prompt",
              "measureType",
            ],
          ],
        },
        {
          "data": {
            "dpart=train, model=gpt2": {
              "prompt=prompt1, measureType=similarity": 0.2,
              "prompt=prompt2, measureType=relatedness": 0.2,
            },
          },
          "fixedValueConfig": {
            "language": "pt",
          },
          "variables": [
            [
              "dpart",
              "model",
            ],
            [
              "prompt",
              "measureType",
            ],
          ],
        },
        {
          "data": {
            "dpart=train, model=gpt2": {
              "en": 0.1,
              "pt": 0.2,
            },
          },
          "fixedValueConfig": {
            "measureType": "similarity",
            "prompt": "prompt1",
          },
          "variables": [
            [
              "dpart",
              "model",
            ],
            [
              "language",
            ],
          ],
        },
        {
          "data": {
            "dpart=train, model=gpt2": {
              "pt": 0.2,
            },
          },
          "fixedValueConfig": {
            "measureType": "relatedness",
            "prompt": "prompt2",
          },
          "variables": [
            [
              "dpart",
              "model",
            ],
            [
              "language",
            ],
          ],
        },
        {
          "data": {
            "prompt=prompt1, measureType=similarity": {
              "en": 0.1,
              "pt": 0.2,
            },
            "prompt=prompt2, measureType=relatedness": {
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
              "measureType",
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
      const res = mergeCorrVarNames(cvv);
      expect(res).toMatchInlineSnapshot(`
        [
          Set {
            "dpart",
            "model",
          },
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

      const res = mergeCorrVarNames(cvv);
      expect(res).toMatchInlineSnapshot(`
        [
          [
            "a",
            "b",
            "d",
          ],
          ,
          [
            "c",
          ],
          ,
        ]
      `);
    });
  });
});
