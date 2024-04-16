import { Type } from "@sinclair/typebox";
import { ToolSchema } from "src/lib/models";

const responseSchema = Type.Object({
  pairs: Type.Array(Type.Array(Type.String(), { minItems: 2, maxItems: 2 })),
});

const toolSchema: ToolSchema = {
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
    },
  },
  required: ["pairs"],
};

export default {
  toolSchema,
  responseSchema,
};
