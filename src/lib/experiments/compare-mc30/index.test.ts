import { describe, expect, it } from "vitest";
import {
  CompareMC30ModelResults,
  calcCorrelation,
  mergeResults,
  unzipResults,
} from ".";
import { MultiDatasetScores } from "..";
import { Model } from "src/lib/models";

describe("compare-mc30", () => {
  describe("mergeResults", () => {
    it("should merge results", () => {
      const modelRes: CompareMC30ModelResults[] = [
        {
          variables: { model: { id: "gpt4" } as Model },
          data: [{ scores: [{ words: ["word1", "word2"], score: 0.5 }] }],
          usage: undefined,
        },
        {
          variables: { model: { id: "gpt4turbo" } as Model },
          data: [{ scores: [{ words: ["word1", "word2"], score: 0.1 }] }],
          usage: undefined,
        },
        {
          variables: { model: { id: "gpt35turbo" } as Model },
          data: [{ scores: [{ words: ["word1", "word2"], score: 0.9 }] }],
          usage: undefined,
        },
        {
          variables: { model: { id: "claude3opus" } as Model },
          data: [],
          usage: undefined,
        },
      ];

      const humanScores: MultiDatasetScores = {
        word1: {
          word2: {
            mc30: 0.1,
            rg65: 0.2,
          },
        },
      };
      const merged = mergeResults(modelRes, humanScores);
      expect(merged).toMatchInlineSnapshot(`
        {
          "word1": {
            "word2": {
              "human": {
                "mc30": 0.1,
                "rg65": 0.2,
              },
              "models": {
                "gpt35turbo": {
                  "avg": 0.9,
                  "values": [
                    0.9,
                  ],
                },
                "gpt4": {
                  "avg": 0.5,
                  "values": [
                    0.5,
                  ],
                },
                "gpt4turbo": {
                  "avg": 0.1,
                  "values": [
                    0.1,
                  ],
                },
              },
            },
          },
        }
      `);
    });
  });

  describe("unzipResults", () => {
    it("should unzip results", () => {
      const modelRes: CompareMC30ModelResults[] = [
        {
          variables: { model: { id: "gpt4" } as Model },
          data: [{ scores: [{ words: ["word1", "word2"], score: 0.5 }] }],
          usage: undefined,
        },
        {
          variables: { model: { id: "gpt4turbo" } as Model },
          data: [{ scores: [{ words: ["word1", "word2"], score: 0.1 }] }],
          usage: undefined,
        },
        {
          variables: { model: { id: "gpt35turbo" } as Model },
          data: [{ scores: [{ words: ["word1", "word2"], score: 0.9 }] }],
          usage: undefined,
        },
        {
          variables: { model: { id: "claude3opus" } as Model },
          data: [],
          usage: undefined,
        },
      ];

      const humanScores: MultiDatasetScores = {
        word1: {
          word2: {
            mc30: 0.1,
            rg65: 0.2,
            ps65: 0.3,
            ws353: 0.4,
          },
        },
      };
      const res = mergeResults(modelRes, humanScores);
      const unzipped = unzipResults(res);
      expect(unzipped).toMatchInlineSnapshot(`
        {
          "gpt35turbo": [
            0.9,
          ],
          "gpt4": [
            0.5,
          ],
          "gpt4turbo": [
            0.1,
          ],
          "mc30": [
            0.1,
          ],
          "ps65": [
            0.3,
          ],
          "rg65": [
            0.2,
          ],
          "ws353": [
            0.4,
          ],
        }
      `);
    });
  });

  describe("calcCorrelation", () => {
    it("should calculate correlation", () => {
      const arrays = [
        [0.9, 0.7, 0.1, 0.1, 0.3, 0.2, 0.4],
        [],
        [0.5, 0.3, 0.1, 0.3, 0.2, 0.4, 0.2],
        [0.1, 0.3, 0.9, 0.1, 0.4, 0.2, 0.1],
        [0.1, 0.9, 0.1, 0.7, 0.2, 0.1, 0.3],
        [0.3, 0.1, 0.4, 0.2, 0.9, 0.1, 0.1],
        [0.2, 0.4, 0.2, 0.1, 0.1, 0.7, 0.3],
        [0.4, 0.2, 0.1, 0.3, 0.1, 0.3, 0.9],
      ];

      const res = calcCorrelation(arrays).map(l =>
        l.map(v => v.pcorr.toFixed(5))
      );
      expect(res).toMatchInlineSnapshot(`
        [
          [
            "1.00000",
            ,
            "0.59798",
            "-0.39386",
            "0.12342",
            "-0.15004",
            "0.02193",
            "0.20238",
          ],
          [],
          [
            ,
            ,
            "1.00000",
            "-0.68672",
            "-0.02173",
            "-0.34336",
            "0.34300",
            "0.10292",
          ],
          [
            ,
            ,
            ,
            "1.00000",
            "-0.26576",
            "0.40000",
            "-0.16373",
            "-0.58750",
          ],
          [
            ,
            ,
            ,
            ,
            "1.00000",
            "-0.35435",
            "-0.08634",
            "-0.05311",
          ],
          [
            ,
            ,
            ,
            ,
            ,
            "1.00000",
            "-0.57307",
            "-0.50357",
          ],
          [
            ,
            ,
            ,
            ,
            ,
            ,
            "1.00000",
            "0.12270",
          ],
          [
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            "1.00000",
          ],
        ]
      `);
    });

    it("should not throw", () => {
      expect(() => calcCorrelation([[]])).not.toThrow();
      expect(() => calcCorrelation([[], []])).not.toThrow();
      expect(() =>
        calcCorrelation([
          [1, 2, 3],
          [1, 2, 3, 4],
        ])
      ).not.toThrow();
      expect(() =>
        calcCorrelation([
          [1, 2, 3],
          [1, 2, 3],
        ])
      ).not.toThrow();
      expect(
        calcCorrelation([
          [1, 2, 3, 4],
          [1, 2, 3, 4],
        ])
      ).toMatchInlineSnapshot(`
        [
          [
            {
              "alpha": 0.05,
              "alternative": "two-sided",
              "ci": [
                1,
                1,
              ],
              "method": "t-test for Pearson correlation coefficient",
              "nullValue": 0,
              "pValue": 0,
              "pcorr": 1,
              "print": [Function],
              "rejected": true,
              "statistic": Infinity,
            },
            {
              "alpha": 0.05,
              "alternative": "two-sided",
              "ci": [
                1,
                1,
              ],
              "method": "t-test for Pearson correlation coefficient",
              "nullValue": 0,
              "pValue": 0,
              "pcorr": 1,
              "print": [Function],
              "rejected": true,
              "statistic": Infinity,
            },
          ],
          [
            ,
            {
              "alpha": 0.05,
              "alternative": "two-sided",
              "ci": [
                1,
                1,
              ],
              "method": "t-test for Pearson correlation coefficient",
              "nullValue": 0,
              "pValue": 0,
              "pcorr": 1,
              "print": [Function],
              "rejected": true,
              "statistic": Infinity,
            },
          ],
        ]
      `);
    });
  });
});
