import { Type } from "@sinclair/typebox";

const responseSchema = Type.Object({
  title: Type.String(),
});

const toolSchema = {
  type: "object" as const,
  properties: {
    title: {
      type: "string",
      description: "The title of the paper.",
    },
  },
  required: ["title"],
};

export default {
  toolSchema,
  responseSchema,
};
