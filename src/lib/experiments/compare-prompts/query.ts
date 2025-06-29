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

const genToolSchema: GenToolSchema = ({ numPairs }: { numPairs: number }) => ({
  type: "object" as const,
  properties: {
    scores: {
      type: "array",
      description: "The list of word similarity scores.",
      items: {
        type: "object",
        properties: {
          words: {
            type: "array",
            description: "The pair of words.",
            items: {
              type: "string",
            },
            minItems: 2,
            maxItems: 2,
          },
          score: {
            description: "The semantic relation score.",
            type: "number",
          },
        },
        required: ["words", "score"],
      },
      minItems: numPairs,
      maxItems: numPairs,
    },
  },
  required: ["scores"],
});

export default {
  responseSchema,
  genToolSchema,
};
