import { describe, expect, test } from "@jest/globals";
import dsSampleFromDsName from "./dsSampleFromDsName";
import { DatasetProfile } from "../../types";
import { ExpVars, ExpVarsFixedPrompt, PromptGenerator } from "..";
import { createMockDataset, createMockModel } from "./mocks";

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
      const ds: DatasetProfile = createMockDataset();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const model = createMockModel("this is the result");
      const vars: ExpVars = {
        dataset: ds,
        model,
        prompt: promptGen.generate({ dataset: ds, model }),
      };

      await dsSampleFromDsName.runTrials(vars, 2);
      expect(model.makeRequest).toHaveBeenCalledTimes(2);
    });

    test("should return model.makeRequest result", async () => {
      const ds: DatasetProfile = createMockDataset();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const model = createMockModel("this is the result");
      const vars: ExpVars = {
        dataset: ds,
        model,
        prompt: promptGen.generate({ dataset: ds, model }),
      };

      const tr = await dsSampleFromDsName.runTrials(vars, 2);
      expect(tr.data.length).toEqual(2);
      expect(tr.data[0]).toEqual("this is the result");
      expect(tr.data[1]).toEqual("this is the result");
    });

    test("should return empty string if model.makeRequest returns no data", async () => {
      const ds: DatasetProfile = createMockDataset();
      const promptGen = dsSampleFromDsName!.prompts![0] as PromptGenerator;
      const model = createMockModel("");
      const vars: ExpVars = {
        dataset: ds,
        model,
        prompt: promptGen.generate({ dataset: ds, model }),
      };

      const tr = await dsSampleFromDsName.runTrials(vars, 1);
      expect(model.makeRequest).toHaveBeenCalled();
      expect(tr.data.length).toEqual(1);
      expect(tr.data[0]).toEqual("");
    });
  });

  describe("evaluateTrial", () => {
    test("should return NoData if data is empty", async () => {
      const ds: DatasetProfile = createMockDataset();

      const result = await dsSampleFromDsName.evaluateTrial(ds, "");
      expect(result.type).toEqual("no-data");
    });

    test("should return DataIncorrect if data is incorrect", async () => {
      const ds: DatasetProfile = createMockDataset();

      const result = await dsSampleFromDsName.evaluateTrial(
        ds,

        JSON.stringify({
          pairs: [["test", "test2"]],
        })
      );
      expect(result.type).toEqual("data-incorrect");
    });

    test("should return DataPartiallyIncorrect if data is partially incorrect", async () => {
      const ds: DatasetProfile = createMockDataset();

      const result = await dsSampleFromDsName.evaluateTrial(
        ds,

        JSON.stringify({
          pairs: [
            ["testWord1", "failWord"],
            ["testWord1", "testWord2"],
          ],
        })
      );
      expect(result.type).toEqual("data-partially-incorrect");
    });

    test("should return JsonSyntaxError if data is not valid JSON", async () => {
      const ds: DatasetProfile = createMockDataset();

      const result = await dsSampleFromDsName.evaluateTrial(
        ds,
        "not valid json"
      );
      expect(result.type).toEqual("json-syntax-error");
    });
  });
});
