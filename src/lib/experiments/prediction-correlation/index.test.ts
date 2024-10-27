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

    it("should not return MismatchedData if all word pairs match the prompt", async () => {
      const dpart = createMockDsPart();
      dpart.data = [
        {
          term1: "waterway transportation",
          term2: "waterway transportation",
          value: 5,
        },
        { term1: "oasis city", term2: "oasis city", value: 5 },
        { term1: "harbor city", term2: "port city", value: 4.634 },
        { term1: "frozen soil", term2: "plateau permafrost", value: 4.122 },
        {
          term1: "iron and steel industry",
          term2: "metallurgical industry",
          value: 3.9024,
        },
        {
          term1: "highway transportation",
          term2: "transportation",
          value: 3.8292,
        },
        {
          term1: "semi-arid climate",
          term2: "steppe climate",
          value: 3.8292,
        },
        { term1: "climate", term2: "weather", value: 3.756 },
        {
          term1: "agricultural product processing industry",
          term2: "industry",
          value: 3.4392,
        },
        {
          term1: "automobile industry",
          term2: "basic industry",
          value: 3.0488,
        },
        {
          term1: "agricultural environment",
          term2: "hydroclimate",
          value: 2.6584000000000003,
        },
        { term1: "feed industry", term2: "sugar industry", value: 2.5608 },
        { term1: "fair weather", term2: "overcast sky", value: 2.5608 },
        {
          term1: "air transportation ",
          term2: "marine transportation ",
          value: 2.512,
        },
        { term1: "disastrous weather", term2: "environment", value: 2.4636 },
        {
          term1: "cold air mass",
          term2: "marine climate",
          value: 2.2683999999999997,
        },
        {
          term1: "desert soil ",
          term2: "permafrost ",
          value: 2.2683999999999997,
        },
        {
          term1: "global environment ",
          term2: "human landscape ",
          value: 2.122,
        },
        { term1: "aluminum industry", term2: "petroleum industry", value: 2 },
        {
          term1: "shipbuilding industry",
          term2: "textile industry",
          value: 2,
        },
        { term1: "city ", term2: "textile industry ", value: 1.8048 },
        { term1: "megalopolis", term2: "regional climate", value: 1.7316 },
        {
          term1: "superaqual landscape",
          term2: "temperate climate ",
          value: 1.6827999999999999,
        },
        {
          term1: "quaternary climate",
          term2: "steppe landscape",
          value: 1.6583999999999999,
        },
        { term1: "cinnamon soil", term2: "glacial climate", value: 1.5608 },
        { term1: "marine environment ", term2: "soil ", value: 1.4392 },
        {
          term1: "semi-arid environment",
          term2: "subaqual landscape",
          value: 1.4148,
        },
        {
          term1: "coastal transportation",
          term2: "holocene climate",
          value: 1.1464,
        },
        { term1: "mining industry", term2: "polar climate", value: 1.0976 },
        {
          term1: "desert climate",
          term2: "labor intensive industry",
          value: 1.0244,
        },
      ];
      const got = [
        {
          data: {
            scores: [
              { words: ["polar climate", "mining industry"], score: 1 },
              { words: ["global environment", "human landscape"], score: 2 },
              { words: ["desert soil", "permafrost"], score: 3 },
              { words: ["regional climate", "megalopolis"], score: 2 },
              {
                words: ["desert climate", "labor intensive industry"],
                score: 3,
              },
              { words: ["oasis city", "oasis city"], score: 4 },
              {
                words: ["temperate climate", "superaqual landscape"],
                score: 2,
              },
              {
                words: ["marine transportation", "air transportation"],
                score: 3,
              },
              { words: ["glacial climate", "cinnamon soil"], score: 1 },
              {
                words: ["holocene climate", "coastal transportation"],
                score: 2,
              },
              {
                words: ["waterway transportation", "waterway transportation"],
                score: 4,
              },
              { words: ["highway transportation", "transportation"], score: 4 },
              { words: ["quaternary climate", "steppe landscape"], score: 2 },
              { words: ["semi-arid climate", "steppe climate"], score: 3 },
              {
                words: ["semi-arid environment", "subaqual landscape"],
                score: 1,
              },
              {
                words: ["textile industry", "shipbuilding industry"],
                score: 2,
              },
              { words: ["marine climate", "cold air mass"], score: 3 },
              { words: ["city", "textile industry"], score: 1 },
              {
                words: ["agricultural product processing industry", "industry"],
                score: 4,
              },
              { words: ["port city", "harbor city"], score: 4 },
              { words: ["fair weather", "overcast sky"], score: 4 },
              { words: ["feed industry", "sugar industry"], score: 3 },
              {
                words: ["iron and steel industry", "metallurgical industry"],
                score: 4,
              },
              { words: ["climate", "weather"], score: 4 },
              { words: ["marine environment", "soil"], score: 1 },
              { words: ["petroleum industry", "aluminum industry"], score: 2 },
              { words: ["environment", "disastrous weather"], score: 3 },
              { words: ["automobile industry", "basic industry"], score: 3 },
              { words: ["hydroclimate", "agricultural environment"], score: 3 },
              { words: ["plateau permafrost", "frozen soil"], score: 4 },
            ],
          },
          prompt: {
            text: "prompt-text",
            pairs: [
              ["highway transportation", "transportation"],
              ["cold wave", "disastrous weather"],
              ["cold wave", "cold air mass"],
              ["port city", "harbor city"],
              ["marine environment", "geographical environment"],
              ["marine environment", "soil"],
              ["agricultural product processing industry", "industry"],
              ["textile industry", "shipbuilding industry"],
              ["near shore environment", "coastal environment"],
              ["oasis city", "oasis city"],
              ["quaternary climate", "steppe landscape"],
              ["city", "textile industry"],
              ["computer industry", "building material industry"],
              ["climate", "city"],
              ["climate", "weather"],
              ["monsoon climate", "meadow cinnamon soil"],
              ["tropical climate", "coastal environment"],
              ["humid climate", "dust storm"],
              ["arid climate", "paleoclimate"],
              ["water environment", "steppe landscape"],
              ["hydroclimate", "agricultural environment"],
              ["low productive soil", "soil fertility"],
              ["holocene climate", "coastal transportation"],
              ["global environment", "human landscape"],
              ["environment", "disastrous weather"],
              ["marine climate", "cold air mass"],
              ["marine transportation", "air transportation"],
              ["gray desert soil", "brown desert soil"],
              ["mediterranean climate", "semi-arid environment"],
              ["geographical environment", "environment"],
            ] as [string, string][],
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
