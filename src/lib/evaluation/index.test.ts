import { describe, it, expect } from "vitest";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
  combineEvaluations,
} from ".";

describe("evaluation", () => {
  describe("combineEvaluations", () => {
    it("should calculate average of evaluations", async () => {
      const evaluations = [
        //new JsonSyntaxError(),
        //new JsonSchemaError(),
        //new NoData(),
        new DataIncomplete(0.5, null, null),
        new DataPartiallyIncorrect(0.25, null, null),
        new DataIncorrect(null, null),
        new DataCorrect(null, null),
      ];

      const result = await combineEvaluations(evaluations);
      expect(result.allDataAvg).toMatchInlineSnapshot(`0.4375`);
    });

    it("should return correctly aggregated evaluations", async () => {
      const evaluations = [
        //new JsonSyntaxError(),
        //new JsonSchemaError(),
        //new NoData(),
        new DataIncomplete(0.5, null, null),
        new DataPartiallyIncorrect(0.25, null, null),
        new DataIncorrect(null, null),
        new DataCorrect(null, null),
      ];
      const result = await combineEvaluations(evaluations);
      expect(result).toMatchInlineSnapshot(`
        {
          "allDataAvg": 0.4375,
          "allDataStdev": 0.2981060004427955,
          "okDataAvg": 0.5833333333333334,
          "okDataStdev": 0.31180478223116176,
          "resultTypes": {
            "data-correct": 1,
            "data-incomplete": 1,
            "data-incorrect": 1,
            "data-partially-incorrect": 1,
          },
        }
      `);
    });
  });
});
