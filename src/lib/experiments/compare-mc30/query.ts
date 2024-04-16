import { Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const responseSchema = Type.Object({
  scores: Type.Array(
    Type.Object({
      words: Type.Array(Type.String()),
      score: Type.Number(),
    })
  ),
});
export type QueryResponse = Static<typeof responseSchema>;
const validateSchema = (value: unknown): value is QueryResponse =>
  Value.Check(responseSchema, value);
const toolParams = {
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
          },
          score: {
            description: "The similarity score.",
            type: "number",
          },
        },
        required: ["words", "score"],
      },
    },
  },
  required: ["scores"],
};

export default {
  toolParams,
  responseSchema,
  validateSchema,
};
