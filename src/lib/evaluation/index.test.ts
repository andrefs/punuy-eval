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
      expect(result.avg).toMatchInlineSnapshot(`0.4375`);
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
          "avg": 0.4375,
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
