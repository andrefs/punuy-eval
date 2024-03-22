import { describe, expect, test } from "@jest/globals";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
  combineEvaluations,
} from ".";

describe("evaluation", () => {
  describe("combineEvaluations", () => {
    test("should calculate average of evaluations", async () => {
      const evaluations = [
        new JsonSyntaxError(),
        new JsonSchemaError(),
        new DataIncomplete(0.5),
        new DataPartiallyIncorrect(0.25),
        new DataIncorrect(),
        new NoData(),
        new DataCorrect(),
      ];

      const result = await combineEvaluations(evaluations);
      expect(result.avg).toMatchInlineSnapshot(`0.25`);
    });

    test("should return correctly aggregated evaluations", async () => {
      const evaluations = [
        new JsonSyntaxError(),
        new JsonSchemaError(),
        new DataIncomplete(0.5),
        new DataPartiallyIncorrect(0.25),
        new DataIncorrect(),
        new NoData(),
        new DataCorrect(),
      ];
      const result = await combineEvaluations(evaluations);
      expect(result).toMatchInlineSnapshot(`
        {
          "avg": 0.25,
          "resultTypes": {
            "data-correct": 1,
            "data-incomplete": 1,
            "data-incorrect": 1,
            "data-partially-incorrect": 1,
            "json-schema-error": 1,
            "json-syntax-error": 1,
            "no-data": 1,
          },
        }
      `);
    });
  });
});
