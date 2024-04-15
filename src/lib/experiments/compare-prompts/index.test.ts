import { describe, it, expect } from "vitest";
import { ExperimentData, Prompt, comparePrompts } from "..";
import { createMockDsPart, createMockModel } from "../prior-knowledge/mocks";
import { Type, Static } from "@sinclair/typebox";
import { ComparisonGroup } from "./aux";

const mockSchema = Type.Object({
  scores: Type.Array(
    Type.Object({
      words: Type.Array(Type.String(), { minItems: 2, maxItems: 2 }),
      score: Type.Number(),
    })
  ),
});
type MockSchema = Static<typeof mockSchema>;

describe("comparePrompts", () => {
  describe("evaluate", () => {
    it.skip("should evaluate", async () => {
      const expData: ExperimentData<MockSchema, ComparisonGroup[]>[] = [
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
              {
                scores: [
                  { words: ["testWord1", "testWord2"], score: 0.5 },
                  { words: ["testWord3", "testWord4"], score: 0.9 },
                  { words: ["testWord5", "testWord6"], score: 0.9 },
                  { words: ["testWord7", "testWord8"], score: 0.9 },
                  { words: ["testWord9", "testWord10"], score: 0.9 },
                ],
              },
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
              {
                scores: [
                  { words: ["testWord1", "testWord2"], score: 0.5 },
                  { words: ["testWord3", "testWord4"], score: 0.9 },
                  { words: ["testWord5", "testWord6"], score: 0.9 },
                  { words: ["testWord7", "testWord8"], score: 0.9 },
                  { words: ["testWord9", "testWord10"], score: 0.9 },
                ],
              },
            ],
          },
        },
      ];

      const res = await comparePrompts.evaluate(expData);
      expect(res).toMatchInlineSnapshot(`[]`);
    });
  });
});
