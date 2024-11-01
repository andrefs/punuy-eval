import { describe, it, expect } from "vitest";
import { modelToolToGoogleFunctionDecl } from "./model";

describe("Conversion of ModelTool to Google FunctionDeclaration", () => {
  it("should convert", () => {
    const tool = {
      name: "evaluate_scores",
      description: "Evaluate the word similarity or relatedness scores",
      schema: {
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
                  description: "The semantic relation score.",
                  type: "number",
                },
              },
              required: ["words", "score"],
            },
          },
        },
        required: ["scores"],
      },
    };

    expect(modelToolToGoogleFunctionDecl(tool)).toMatchInlineSnapshot(`
      {
        "description": "Evaluate the word similarity or relatedness scores",
        "name": "evaluate_scores",
        "parameters": {
          "properties": {
            "scores": {
              "description": "The list of word similarity scores.",
              "items": {
                "properties": {
                  "score": {
                    "description": "The semantic relation score.",
                    "properties": {},
                    "type": "string",
                  },
                  "words": {
                    "description": "The pair of words.",
                    "items": {
                      "properties": {},
                      "type": "string",
                    },
                    "properties": {},
                    "type": "array",
                  },
                },
                "required": [
                  "words",
                  "score",
                ],
                "type": "object",
              },
              "properties": {},
              "type": "array",
            },
          },
          "required": [
            "scores",
          ],
          "type": "object",
        },
      }
    `);
  });
});
