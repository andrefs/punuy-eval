import { Type } from "@sinclair/typebox";
import { GenToolSchema } from "../../experiment";

const responseSchema = Type.Object({
  title: Type.String(),
});

const genToolSchema: GenToolSchema = () => ({
  type: "object" as const,
  properties: {
    title: {
      type: "string",
      description: "The title of the paper.",
    },
  },
  required: ["title"],
});

export default {
  genToolSchema,
  responseSchema,
};
