import { describe, it, expect } from "vitest";
import { ExperimentData, Prompt, comparePrompts } from "..";
import { createMockDsPart, createMockModel } from "../prior-knowledge/mocks";

describe("comparePrompts", () => {
  describe("evaluate", () => {
    it("should evaluate", async () => {
      const expData: ExperimentData[] = [
        {
          variables: {
            dpart: createMockDsPart(),
            model: createMockModel("{}"),
            prompt: {
              id: "prompt-id-1",
              text: "prompt-text",
              pairs: [
                ["testWord1", "testWord2"],
                ["testWord3", "testWord4"],
                ["testWord5", "testWord6"],
                ["testWord7", "testWord8"],
                ["testWord9", "testWord10"],
              ],
            } as Prompt,
          },
          meta: {
            traceId: 1,
            name: "experiment-name",
            schema: "result-schema",
          },
          results: {
            raw: [
              JSON.stringify({
                scores: [
                  { words: ["testWord1", "testWord2"], score: "0.5" },
                  { words: ["testWord3", "testWord4"], score: "0.9" },
                  { words: ["testWord5", "testWord6"], score: "0.9" },
                  { words: ["testWord7", "testWord8"], score: "0.9" },
                  { words: ["testWord9", "testWord10"], score: "0.9" },
                ],
              }),
            ],
          },
        },
        {
          variables: {
            dpart: createMockDsPart(),
            model: createMockModel("{}"),
            prompt: {
              id: "prompt-id-2",
              text: "prompt-text",
              pairs: [
                ["testWord1", "testWord2"],
                ["testWord3", "testWord4"],
                ["testWord5", "testWord6"],
                ["testWord7", "testWord8"],
                ["testWord9", "testWord10"],
              ],
            } as Prompt,
          },
          meta: {
            traceId: 2,
            name: "experiment-name",
            schema: "result-schema",
          },
          results: {
            raw: [
              JSON.stringify({
                scores: [
                  { words: ["testWord1", "testWord2"], score: "0.5" },
                  { words: ["testWord3", "testWord4"], score: "0.9" },
                  { words: ["testWord5", "testWord6"], score: "0.9" },
                  { words: ["testWord7", "testWord8"], score: "0.9" },
                  { words: ["testWord9", "testWord10"], score: "0.9" },
                ],
              }),
            ],
          },
        },
      ];

      const res = await comparePrompts.evaluate(expData);
      expect(res).toMatchInlineSnapshot(`[]`);
    });
  });
});
