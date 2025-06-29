import { Type } from "@sinclair/typebox";
import { GenToolSchema } from "../../experiment";

const responseSchema = Type.Object({
  name: Type.String(),
  year: Type.String(),
  authors: Type.Array(Type.String()),
});

const genToolSchema: GenToolSchema = () => ({
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
});

export default {
  genToolSchema,
  responseSchema,
};
