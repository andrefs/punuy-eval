import { describe, test, expect } from "@jest/globals";
import { ExperimentData, Prompt, comparePrompts } from "..";
import { createMockDsPart, createMockModel } from "../prior-knowledge/mocks";

describe("comparePrompts", () => {
  describe("evaluate", () => {
    test("should evaluate", async () => {
      const expData: ExperimentData[] = [
        {
          variables: {
            dpart: createMockDsPart(),
            model: createMockModel("{}"),
            prompt: { id: "prompt-id", text: "prompt-text" } as Prompt,
          },
          meta: {
            traceId: 1,
            name: "experiment-name",
            schema: "result-schema",
          },
          results: {
            raw: ["result-1", "result-2"],
          },
        },
      ];

      const res = await comparePrompts.evaluate(expData);
      expect(res).toMatchInlineSnapshot();
    });
  });
});
