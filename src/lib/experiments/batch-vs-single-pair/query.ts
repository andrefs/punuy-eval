import { Type } from "@sinclair/typebox";
import { ToolSchema } from "src/lib/models";

const responseSchema = Type.Object({
  scores: Type.Array(
    Type.Object({
      words: Type.Array(Type.String(), { minItems: 2, maxItems: 2 }),
      score: Type.Number(),
    })
  ),
});

const toolSchema: ToolSchema = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      description: "The list of word pairs with their scores.",
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
            type: "number",
            description: "The semantic relation score.",
          },
        },
        required: ["words", "score"],
      },
    },
  },
  required: ["scores"],
};
export default {
  toolSchema,
  responseSchema,
};
