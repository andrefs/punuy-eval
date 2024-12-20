/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from "vitest";
import {
  ExperimentData,
  GenericExpTypes,
  Prompt,
  TurnPrompt,
  comparePrompts,
} from "..";
import { createMockDsPart, createMockModel } from "../prior-knowledge/mocks";
import { Type, Static } from "@sinclair/typebox";
import { ComparisonGroup } from "../experiment/aux";

const mockSchema = Type.Object({
  scores: Type.Array(
    Type.Object({
      words: Type.Array(Type.String(), { minItems: 2, maxItems: 2 }),
      score: Type.Number(),
    })
  ),
});
interface MockSchema extends GenericExpTypes {
  Data: Static<typeof mockSchema>;
  DataSchema: typeof mockSchema;
  Evaluation: ComparisonGroup[];
}

describe("comparePrompts", () => {
  describe("evaluate", () => {
    it.skip("should evaluate", async () => {
      const expData: ExperimentData<MockSchema>[] = [
        {
          variables: {
            dpart: createMockDsPart(),
            model: createMockModel("{}"),
            prompt: {
              id: "prompt-id-1",
              text: "prompt-text",
              language: "en",
              jobType: "allPairs",
              pairs: [
                ["testWord1", "testWord2"],
                ["testWord3", "testWord4"],
                ["testWord5", "testWord6"],
                ["testWord7", "testWord8"],
                ["testWord9", "testWord10"],
              ],
              turns: [],
            } as Prompt,
          },
          meta: {
            trials: 1,
            traceId: 1,
            name: "experiment-name",
            queryData: comparePrompts.query,
          },
          results: {
            raw: [
              {
                turns: [
                  {
                    prompt: {} as TurnPrompt,
                    data: {
                      scores: [
                        { words: ["testWord1", "testWord2"], score: 0.5 },
                        { words: ["testWord3", "testWord4"], score: 0.9 },
                        { words: ["testWord5", "testWord6"], score: 0.9 },
                        { words: ["testWord7", "testWord8"], score: 0.9 },
                        { words: ["testWord9", "testWord10"], score: 0.9 },
                      ],
                    },
                  },
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
              language: "en",
              jobType: "allPairs",
              pairs: [
                ["testWord1", "testWord2"],
                ["testWord3", "testWord4"],
                ["testWord5", "testWord6"],
                ["testWord7", "testWord8"],
                ["testWord9", "testWord10"],
              ],
              turns: [],
            } as Prompt,
          },
          meta: {
            trials: 1,
            traceId: 2,
            name: "experiment-name",
            queryData: comparePrompts.query,
          },
          results: {
            raw: [
              {
                turns: [
                  {
                    prompt: {} as TurnPrompt,
                    data: {
                      scores: [
                        { words: ["testWord1", "testWord2"], score: 0.5 },
                        { words: ["testWord3", "testWord4"], score: 0.9 },
                        { words: ["testWord5", "testWord6"], score: 0.9 },
                        { words: ["testWord7", "testWord8"], score: 0.9 },
                        { words: ["testWord9", "testWord10"], score: 0.9 },
                      ],
                    },
                  },
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
