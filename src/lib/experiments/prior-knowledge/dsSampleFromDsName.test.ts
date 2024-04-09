import { describe, expect, test } from "@jest/globals";
import dsSampleFromDsName from "./dsSampleFromDsName";
import { ExpVars, PromptGenerator } from "..";
import { createMockDsPart, createMockModel } from "./mocks";
import { DataIncomplete, DataPartiallyIncorrect } from "../../evaluation";
import { DsPartition } from "../../dataset-adapters/DsPartition";

describe("dsSampleFromDsName", () => {
  //describe("genPrompt", () => {
  //  test("should generate a prompt", () => {
  //    const ds: DatasetProfile = createMockDataset();

  //    const prompt = dsSampleFromDsName.genPrompt(ds);
  //    expect(prompt).toEqual(expect.stringContaining("Dataset Name"));
  //    expect(prompt).toEqual(expect.stringContaining("2021"));
  //  });
  //});

  describe("runTrials", () => {
    test("should call model.makeRequest", async () => {
      const dpart: DsPartition = createMockDsPart();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const model = createMockModel("this is the result");
      const vars: ExpVars = {
        dpart: dpart,
        model,
        prompt: promptGen.generate({ dpart: dpart, model }),
      };

      await dsSampleFromDsName.runTrials(vars, 2);
      expect(model.makeRequest).toHaveBeenCalledTimes(2);
    });

    test("should return model.makeRequest result", async () => {
      const dpart: DsPartition = createMockDsPart();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const model = createMockModel("this is the result");
      const vars: ExpVars = {
        dpart: dpart,
        model,
        prompt: promptGen.generate({ dpart: dpart, model }),
      };

      const tr = await dsSampleFromDsName.runTrials(vars, 2);
      expect(tr.data.length).toEqual(2);
      expect(tr.data[0]).toEqual("this is the result");
      expect(tr.data[1]).toEqual("this is the result");
    });

    test("should return empty string if model.makeRequest returns no data", async () => {
      const dpart: DsPartition = createMockDsPart();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const model = createMockModel("");
      const vars: ExpVars = {
        dpart: dpart,
        model,
        prompt: promptGen.generate({ dpart: dpart, model }),
      };

      const tr = await dsSampleFromDsName.runTrials(vars, 1);
      expect(model.makeRequest).toHaveBeenCalled();
      expect(tr.data.length).toEqual(1);
      expect(tr.data[0]).toEqual("");
    });
  });

  describe("evaluateTrial", () => {
    test("should return JsonSchemaError if data is not valid schema", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(
        dpart,
        '{"invalid": "schema"}'
      );
      expect(result.type).toEqual("json-schema-error");
    });

    test("should return NoData if data is empty", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(dpart, "");
      expect(result.type).toEqual("no-data");
    });

    test("should return DataIncorrect if data is incorrect", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(
        dpart,

        JSON.stringify({
          pairs: [["fail", "fail"]],
        })
      );
      expect(result.type).toEqual("data-incorrect");
    });

    test("should return DataPartiallyIncorrect if data is partially incorrect", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(
        dpart,
        JSON.stringify({
          pairs: [
            ["testWord1", "failWord"],
            ["testWord1", "testWord2"],
          ],
        })
      );
      expect(result.type).toEqual("data-partially-incorrect");
      expect((result as DataPartiallyIncorrect).percentage).toEqual(0.2);
    });

    test("should return DataIncomplete if data is incomplete", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(
        dpart,

        JSON.stringify({
          pairs: [
            ["testWord1", "testWord2"],
            ["testWord3", "testWord4"],
            ["testWord5", "testWord6"],
          ],
        })
      );
      expect(result.type).toEqual("data-incomplete");
      expect((result as DataIncomplete).percentage).toEqual(0.6);
    });

    test("should return JsonSyntaxError if data is not valid JSON", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(
        dpart,
        "not valid json"
      );
      expect(result.type).toEqual("json-syntax-error");
    });

    test("should return DataCorrect if data is correct", async () => {
      const dpart: DsPartition = createMockDsPart();

      const result = await dsSampleFromDsName.evaluateTrial(
        dpart,
        JSON.stringify({
          pairs: [
            ["testWord1", "testWord2"],
            ["testWord4", "testWord3"],
            ["testWord5", "testWord6"],
            ["testWord7", "testWord8"],
            ["testWord9", "testWord10"],
          ],
        })
      );
      expect(result.type).toEqual("data-correct");
    });
  });
});
