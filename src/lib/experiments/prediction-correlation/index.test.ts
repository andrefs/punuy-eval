import { describe, expect, it } from "vitest";
import { evaluateTrial, PCExpTypes } from "./index";
import Experiment, { Prompt } from "../experiment";
import { createMockDsPart } from "../prior-knowledge/mocks";

describe("prediction-correlation", () => {
  describe("evaluateTrial", () => {
    it("should return NoUsableData if pairs are not usable", async () => {
      const dpart = createMockDsPart();
      const prompt: Prompt = {
        id: "prompt-id",
        text: "prompt-text",
        language: dpart.language,
        pairs: [["a", "b"]],
      };
      const got = {
        scores: [],
      };
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
        prompt,
        got
      );
      expect(result.type).toEqual("non-usable-data");
    });

    it("should return InsufficientData if less than half of the pairs are usable", async () => {
      const dpart = createMockDsPart();
      const prompt: Prompt = {
        id: "prompt-id",
        text: "prompt-text",
        language: dpart.language,
        pairs: [
          ["a", "b"],
          ["c", "d"],
        ],
      };
      const got = {
        scores: [
          { words: ["a", "b"], score: 1 },
          { words: ["c", "d"], score: 1 },
        ],
      };
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
        prompt,
        got
      );
      expect(result.type).toEqual("insufficient-data");
    });

    it("should return DataCorrect if all pair scores are equal", async () => {
      const pairs = [...Array(30).keys()].map(
        i => [`testWord${i}`, `testWord${i + 1}`] as [string, string]
      );
      const dpart = createMockDsPart({
        data: pairs.map(([term1, term2], i) => ({
          term1,
          term2,
          value: i / 10,
          values: [i / 10],
        })),
      });
      const prompt: Prompt = {
        id: "prompt-id",
        text: "prompt-text",
        language: dpart.language,
        pairs,
      };
      const got = {
        scores: dpart.data.slice(0, 20).map(({ term1, term2, value }) => ({
          words: [term1, term2],
          score: value!,
        })),
      };
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
        prompt,
        got
      );
      expect(result.type).toEqual("data-correct");
    });

    it("should return DataPartiallyIncorrect if some pair scores are not equal", async () => {
      const pairs = [...Array(30).keys()].map(
        i => [`testWord${i}`, `testWord${i + 1}`] as [string, string]
      );
      const dpart = createMockDsPart({
        data: pairs.map(([term1, term2], i) => ({
          term1,
          term2,
          value: i / 10,
          values: [i / 10],
        })),
      });
      const prompt: Prompt = {
        id: "prompt-id",
        text: "prompt-text",
        language: dpart.language,
        pairs,
      };
      const got = {
        scores: dpart.data.slice(0, 20).map(({ term1, term2, value }) => ({
          words: [term1, term2],
          score: value! * value!,
        })),
      };
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
        prompt,
        got
      );
      expect(result.type).toEqual("data-partially-incorrect");
    });
  });
});
