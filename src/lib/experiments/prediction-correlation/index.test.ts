import { describe, expect, it } from "vitest";
import { evaluateTrial, PCExpTypes } from "./index";
import Experiment, { Prompt } from "../experiment";
import { createMockDsPart } from "../prior-knowledge/mocks";

describe.skip("prediction-correlation", () => {
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
      expect(result).toMatchInlineSnapshot();
    });
  });
});
