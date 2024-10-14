import { describe, expect, it } from "vitest";
import dsSampleFromDsName from ".";
import { ExpVars, Prompt, PromptGenerator, TurnPrompt } from "../..";
import { createMockDsPart, createMockModel } from "../mocks";
import { DataIncomplete, DataPartiallyIncorrect } from "../../../evaluation";
import { DsPartition } from "../../../dataset-partitions/DsPartition";

describe("dsSampleFromDsName", () => {
  //describe("genPrompt", () => {
  //  it("should generate a prompt", () => {
  //    const ds: DatasetProfile = createMockDataset();

  //    const prompt = dsSampleFromDsName.genPrompt(ds);
  //    expect(prompt).toEqual(expect.stringContaining("Dataset Name"));
  //    expect(prompt).toEqual(expect.stringContaining("2021"));
  //  });
  //});

  describe("runTrials", () => {
    it("should call model.makeRequest", async () => {
      const dpart: DsPartition = createMockDsPart();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const model = createMockModel("this is the result");
      const vars: ExpVars = {
        dpart: dpart,
        model,
        prompt: promptGen.generate({ dpart: dpart, model }),
      };

      await dsSampleFromDsName.runTrials(vars, 2, 1);
      expect(model.makeRequest).toHaveBeenCalled();
    });

    it("should return model.makeRequest result", async () => {
      const dpart: DsPartition = createMockDsPart();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const result = '{"pairs": [["testWord1", "testWord2"]]}';
      const model = createMockModel(result);
      const vars: ExpVars = {
        dpart: dpart,
        model,
        prompt: promptGen.generate({ dpart: dpart, model }),
      };

      const tr = await dsSampleFromDsName.runTrials(vars, 2, 1);
      expect(tr.trials.length).toEqual(2);
      expect(tr.trials[0]).toMatchInlineSnapshot(`
        {
          "turns": [
            {
              "data": {
                "pairs": [
                  [
                    "testWord1",
                    "testWord2",
                  ],
                ],
              },
              "prompt": {
                "pairs": [],
                "text": "Dataset Name is a gold standard dataset published in 2021. It is composed of pairs of concepts and their semantic similarity score as reported by humans, and can be used to evaluate semantic measures. Please list 5 pairs of concepts sampled from this dataset.",
              },
            },
          ],
        }
      `);
      expect(tr.trials[1]).toMatchInlineSnapshot(`
        {
          "turns": [
            {
              "data": {
                "pairs": [
                  [
                    "testWord1",
                    "testWord2",
                  ],
                ],
              },
              "prompt": {
                "pairs": [],
                "text": "Dataset Name is a gold standard dataset published in 2021. It is composed of pairs of concepts and their semantic similarity score as reported by humans, and can be used to evaluate semantic measures. Please list 5 pairs of concepts sampled from this dataset.",
              },
            },
          ],
        }
      `);
    });

    it("should return no results if model.makeRequest returns no data", async () => {
      const dpart: DsPartition = createMockDsPart();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const model = createMockModel("");
      const vars: ExpVars = {
        dpart: dpart,
        model,
        prompt: promptGen.generate({ dpart: dpart, model }),
      };

      const tr = await dsSampleFromDsName.runTrials(vars, 1, 1);
      expect(model.makeRequest).toHaveBeenCalled();
      expect(tr.trials.flatMap(t => t.turns).length).toEqual(0);
    });
  });

  describe("evaluateTrial", () => {
    // TODO migrate to getResponse tests
    //
    // it("should return JsonSchemaError if data is not valid schema", async () => {
    //   const dpart: DsPartition = createMockDsPart();

    //   const result = await dsSampleFromDsName.evaluateTrial(
    //     dpart,
    //     '{"invalid": "schema"}'
    //   );
    //   expect(result.type).toEqual("json-schema-error");
    // });

    // it("should return NoData if data is empty", async () => {
    //   const dpart: DsPartition = createMockDsPart();

    //   const result = await dsSampleFromDsName.evaluateTrial(dpart, "");
    //   expect(result.type).toEqual("no-data");
    // });
    //
    //   const dpart: DsPartition = createMockDsPart();

    //   const result = await dsSampleFromDsName.evaluateTrial(
    //     dpart,
    //     "not valid json"
    //   );
    //   expect(result.type).toEqual("json-syntax-error");
    // });

    it("should return DataIncorrect if data is incorrect", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(dpart, [
        {
          data: {
            pairs: [["fail", "fail"]],
          },
          prompt: {} as TurnPrompt,
        },
      ]);
      expect(result.type).toEqual("data-incorrect");
    });

    it("should return DataPartiallyIncorrect if data is partially incorrect", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(dpart, [
        {
          data: {
            pairs: [
              ["testWord1", "failWord"],
              ["testWord1", "testWord2"],
            ],
          },
          prompt: {} as TurnPrompt,
        },
      ]);
      expect(result.type).toEqual("data-partially-incorrect");
      expect(
        (result as DataPartiallyIncorrect<{ pairs: [string, string] }>)
          .percentage
      ).toEqual(0.2);
    });

    it("should return DataIncomplete if data is incomplete", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(dpart, [
        {
          data: {
            pairs: [
              ["testWord1", "testWord2"],
              ["testWord3", "testWord4"],
              ["testWord5", "testWord6"],
            ],
          },
          prompt: {} as TurnPrompt,
        },
      ]);
      expect(result.type).toEqual("data-incomplete");
      expect(
        (result as DataIncomplete<{ pairs: [string, string] }>).percentage
      ).toEqual(0.6);
    });

    it("should return DataCorrect if data is correct", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(dpart, [
        {
          data: {
            pairs: [
              ["testWord1", "testWord2"],
              ["testWord4", "testWord3"],
              ["testWord5", "testWord6"],
              ["testWord7", "testWord8"],
              ["testWord9", "testWord10"],
            ],
          },
          prompt: {} as TurnPrompt,
        },
      ]);
      expect(result.type).toEqual("data-correct");
    });
  });
});
