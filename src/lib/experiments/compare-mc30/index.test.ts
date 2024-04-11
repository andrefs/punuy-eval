import { describe, expect, test } from "@jest/globals";
import { CompareMC30ModelsResults, mergeResults, unzipResults } from ".";
import { MultiDatasetScores } from "../../dataset-adapters/collection";

describe("compare-mc30", () => {
  describe("mergeResults", () => {
    test("should merge results", () => {
      const modelRes: CompareMC30ModelsResults = {
        gpt4: [{ scores: [{ words: ["word1", "word2"], score: 0.5 }] }],
        gpt4turbo: [{ scores: [{ words: ["word1", "word2"], score: 0.1 }] }],
        gpt35turbo: [{ scores: [{ words: ["word1", "word2"], score: 0.9 }] }],
      };

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
    test("should unzip results", () => {
      const modelRes: CompareMC30ModelsResults = {
        gpt4: [{ scores: [{ words: ["word1", "word2"], score: 0.5 }] }],
        gpt4turbo: [{ scores: [{ words: ["word1", "word2"], score: 0.1 }] }],
        gpt35turbo: [{ scores: [{ words: ["word1", "word2"], score: 0.9 }] }],
      };

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
});
