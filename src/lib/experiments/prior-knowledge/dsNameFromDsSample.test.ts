import { describe, expect, test } from "@jest/globals";
import { createMockDataset, createMockModel } from "./mocks";
import dsNameFromDsSample from "./dsNameFromDsSample";
import { ExpVarsFixedPrompt, PromptGenerator } from "..";
import { DatasetProfile } from "../../types";

describe("dsSampleFromDsName", () => {
  describe("evaluateTrial", () => {
    test("should return NoData if data is empty", async () => {
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDataset(),
        ""
      );
      expect(result.type).toEqual("no-data");
    });

    test("should return JsonSyntaxError if data is not valid JSON", async () => {
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDataset(),
        "{"
      );
      expect(result.type).toEqual("json-syntax-error");
    });

    test("should return JsonSchemaError if data does not match the JSON schema", async () => {
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDataset(),
        '{"key": "value"}'
      );
      expect(result.type).toEqual("json-schema-error");
    });

    test("should return NonEvaluatedData if data is valid", async () => {
      const mockDataset = createMockDataset();
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDataset(),
        JSON.stringify({
          name: mockDataset.metadata.name,
          year: "2021",
          authors: ["First Author", "Second Person Name"],
        })
      );
      expect(result.type).toEqual("non-evaluated-data");
    });

    test("should return original and obtained data", async () => {
      const mockDataset = createMockDataset();
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDataset(),
        JSON.stringify({
          name: mockDataset.metadata.name,
          year: "2021",
          authors: ["First Author", "Second Person Name"],
        })
      );
      expect(result.data).toMatchInlineSnapshot(`
        {
          "gotAuthors": [
            "First Author",
            "Second Person Name",
          ],
          "gotName": "Dataset Name",
          "gotYear": "2021",
          "originalName": "Dataset Name",
          "originalYear": "2021",
        }
      `);
    });
  });

  describe("prompt generator", () => {
    test("should generate a prompt", () => {
      const ds: DatasetProfile = createMockDataset();
      const promptGen = dsNameFromDsSample!.prompts![0] as PromptGenerator;
      const model = createMockModel("this is the result");
      const vars: ExpVarsFixedPrompt = {
        dataset: ds,
        model,
        prompt: promptGen.generate({ dataset: ds, model }),
      };

      expect(vars.prompt.text).toEqual(
        expect.stringContaining(ds.partitions[0].data[0].term1)
      );
      expect(vars.prompt.text).toEqual(
        expect.stringContaining(ds.partitions[0].data[0].term2)
      );
    });
  });

  describe("runTrial", () => {
    test("should return a result", async () => {
      const ds: DatasetProfile = createMockDataset();
      const promptGen = dsNameFromDsSample!.prompts![0] as PromptGenerator;
      const model = createMockModel("this is the result");
      const vars: ExpVarsFixedPrompt = {
        dataset: ds,
        model,
        prompt: promptGen.generate({ dataset: ds, model }),
      };
      await dsNameFromDsSample.runTrials(vars, 2);
      expect(model.makeRequest).toHaveBeenCalledTimes(2);
    });
  });
});
