import { Type } from "@sinclair/typebox";
import { GenToolSchema } from "../experiment";

const responseSchema = Type.Object({
  scores: Type.Array(
    Type.Object({
      words: Type.Array(Type.String(), { minItems: 2, maxItems: 2 }),
      score: Type.Number(),
    })
  ),
});

const genToolSchema: GenToolSchema = function (numPairs: number) {
  return {
    type: "object",
    properties: {
      scores: {
        type: "array",
        description:
          "The list of word or multi-word expression pairs with their scores.",
        items: {
          type: "object",
          properties: {
            words: {
              type: "array",
              description: "The pair of words or multi-word expressions.",
              items: {
                type: "string",
              },
              minItems: 2,
              maxItems: 2,
            },
            score: {
              type: "number",
              description: "The semantic relation score.",
            },
          },
          required: ["words", "score"],
        },
        minItems: numPairs,
        maxItems: numPairs,
      },
    },
    required: ["scores"],
  };
};

export default {
  genToolSchema,
  responseSchema,
};
