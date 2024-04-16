import { Type } from "@sinclair/typebox";
import { ToolSchema } from "src/lib/models";

const responseSchema = Type.Object({
  name: Type.String(),
  year: Type.String(),
  authors: Type.Array(Type.String()),
});

const toolSchema: ToolSchema = {
  type: "object" as const,
  properties: {
    name: {
      type: "string",
      description: "The name of the dataset.",
    },
    year: {
      type: "string",
      description: "The year the dataset was published.",
    },
    authors: {
      type: "array",
      description: "The authors of the scientific article.",
      items: {
        type: "string",
      },
    },
  },
  required: ["name", "year", "authors"],
};

export default {
  toolSchema,
  responseSchema,
};
