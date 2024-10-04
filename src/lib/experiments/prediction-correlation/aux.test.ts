import { describe, expect, it } from "vitest";
import { rawResultsToAvg } from "./aux";
import { PairScoreList } from "../experiment/types";

describe("prediction-correlation aux", () => {
  describe("rawResultsToAvg", () => {
    it("should return average of results", () => {
      const rawResults: PairScoreList = [
        { words: ["w1", "w2"], score: 1 },
        { words: ["w1", "w2"], score: 2 },
        { words: ["w1", "w2"], score: 5 },
        { words: ["w3", "w4"], score: 4 },
        { words: ["w3", "w4"], score: 3 },
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

    it("should ignore NaN scores", () => {
      const rawResults: PairScoreList = [
        { words: ["w1", "w2"], score: 1 },
        { words: ["w1", "w2"], score: NaN },
        { words: ["w1", "w2"], score: 5 },
        { words: ["w1", "w4"], score: NaN },
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
