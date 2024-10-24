import { describe, expect, it } from "vitest";
import { evaluateTrial, PCExpTypes } from "./index";
import Experiment, { TurnPrompt } from "../experiment";
import { createMockDsPart } from "../prior-knowledge/mocks";

describe("prediction-correlation", () => {
  describe("evaluateTrial", () => {
    it("should return NoUsableData if pairs are not usable", async () => {
      const dpart = createMockDsPart();
      const got: { data: PCExpTypes["Data"]; prompt: TurnPrompt }[] = [];
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
        got
      );
      expect(result.type).toEqual("non-usable-data");
    });

    it("should return NonUsableData if there are not enough pairs", async () => {
      const dpart = createMockDsPart();
      const got = [
        {
          data: {
            scores: [
              { words: ["a", "b"], score: 1 },
              { words: ["c", "d"], score: 1 },
            ],
          },
          prompt: {
            text: "prompt-text",
            pairs: [
              ["a", "b"],
              ["c", "d"],
            ] as [string, string][],
          },
        },
      ];
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
        got
      );
      expect(result.type).toEqual("non-usable-data");
    });
    it("should return MismatchedData if not all word pairs match the prompt", async () => {
      const dpart = createMockDsPart();
      dpart.data = [
        { term1: "a", term2: "b", value: 0.1 },
        { term1: "c", term2: "d", value: 0.2 },
        { term1: "e", term2: "f", value: 0.3 },
        { term1: "g", term2: "h", value: 0.4 },
        { term1: "i", term2: "j", value: 0.5 },
        { term1: "k", term2: "l", value: 0.6 },
        { term1: "m", term2: "n", value: 0.7 },
        { term1: "o", term2: "p", value: 0.8 },
        { term1: "q", term2: "r", value: 0.9 },
        { term1: "s", term2: "t", value: 1 },
      ];
      const got = [
        {
          data: {
            scores: [
              { words: ["a", "b"], score: 0.5 },
              { words: ["c", "d"], score: 0.3 },
              { words: ["e", "f"], score: 0.4 },
              { words: ["g", "h"], score: 0.1 },
              { words: ["k", "l"], score: 0.2 },
              { words: ["m", "n"], score: 0.1 },
              { words: ["o", "p"], score: 0.9 },
              { words: ["u", "v"], score: 0.9 },
              { words: ["w", "x"], score: 0.1 },
              { words: ["y", "z"], score: 0.1 },
            ],
          },
          prompt: {
            text: "prompt-text",
            pairs: [
              ["a", "b"],
              ["c", "d"],
              ["e", "f"],
              ["g", "h"],
              ["i", "j"],
              ["k", "l"],
              ["m", "n"],
              ["o", "p"],
              ["q", "r"],
              ["s", "t"],
            ] as [string, string][],
          },
        },
      ];
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
        got
      );
      expect(result.type).toEqual("mismatched-data");
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

      const got = [
        {
          data: {
            scores: dpart.data.slice(0, 20).map(({ term1, term2, value }) => ({
              words: [term1, term2],
              score: value!,
            })),
          },
          prompt: {
            text: "prompt-text",
            pairs: pairs.slice(0, 20),
          },
        },
      ];
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
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

      const got = [
        {
          data: {
            scores: dpart.data.slice(0, 20).map(({ term1, term2, value }) => ({
              words: [term1, term2],
              score: value! * value!,
            })),
          },
          prompt: {
            text: "prompt-text",
            pairs: pairs.slice(0, 20),
          },
        },
      ];
      const result = await evaluateTrial.call(
        { name: "name", description: "description" } as Experiment<PCExpTypes>,
        dpart,
        got
      );
      expect(result.type).toEqual("data-partially-incorrect");
    });
  });
});
