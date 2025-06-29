import { Type } from "@sinclair/typebox";
import { GenToolSchema } from "../../experiment";

const responseSchema = Type.Object({
  pairs: Type.Array(Type.Array(Type.String(), { minItems: 2, maxItems: 2 })),
});

const genToolSchema: GenToolSchema = ({ numWords }: { numWords: number }) => ({
  type: "object" as const,
  properties: {
    pairs: {
      type: "array",
      description: "The list of word pairs.",
      items: {
        type: "array",
        description: "The pair of words.",
        items: {
          type: "string",
        },
        minItems: 2,
        maxItems: 2,
      },
      minItems: numWords,
      maxItems: numWords,
    },
  },
  required: ["pairs"],
});

export default {
  genToolSchema,
  responseSchema,
};
