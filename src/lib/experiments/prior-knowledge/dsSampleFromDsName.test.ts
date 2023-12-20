import { describe, expect, test } from "@jest/globals";
import dsSampleFromDsName from "./dsSampleFromDsName";
import { Model } from "../../models/model";
import { DatasetProfile } from "../../types";

const createMockDataset = () => ({
  id: "test",
  metadata: {
    name: "Dataset Name",
    description: "test",
    papers: [],
    urls: [],
    date: "2021-01-01",
    downloadUrls: [],
    measureTypes: [],
  },
  partitions: [
    {
      id: "test",
      measureType: "similarity" as const,
      data: [
        {
          word1: "test",
          word2: "test",
          value: 0.5,
          values: [0.5],
        },
      ],
    },
  ],
});

const createMockModel = (result: string) =>
  new Model(
    "test",
    jest.fn(() =>
      Promise.resolve({
        type: "openai",
        data: {
          id: "test",
          model: "test",
          object: "chat.completion",
          created: 0,
          choices: [
            {
              finish_reason: "function_call",
              index: 0,
              message: {
                content: null,
                role: "assistant",
                tool_calls: [
                  {
                    id: "test",
                    type: "function",
                    function: {
                      name: "test",
                      arguments: result,
                    },
                  },
                ],
              },
              logprobs: null,
            },
          ],
        },
      })
    )
  );

describe("dsSampleFromDsName", () => {
  describe("genPrompt", () => {
    test("should generate a prompt", () => {
      const ds: DatasetProfile = createMockDataset();

      const prompt = dsSampleFromDsName.genPrompt(ds);
      expect(prompt).toEqual(expect.stringContaining("Dataset Name"));
      expect(prompt).toEqual(expect.stringContaining("2021"));
    });
  });

  describe("run", () => {
    test("should call model.makeRequest", async () => {
      const ds: DatasetProfile = createMockDataset();

      const model = createMockModel("this is the result");

      await dsSampleFromDsName.runTrials(2, ds, model);
      expect(model.makeRequest).toHaveBeenCalledTimes(2);
    });

    test("should return model.makeRequest result", async () => {
      const ds: DatasetProfile = createMockDataset();

      const model = createMockModel("this is the result");

      const result = await dsSampleFromDsName.runTrials(2, ds, model);
      expect(result.length).toEqual(2);
      expect(result[0]).toEqual("this is the result");
      expect(result[1]).toEqual("this is the result");
    });

    test("should return empty string if model.makeRequest returns no data", async () => {
      const ds: DatasetProfile = createMockDataset();

      const model = createMockModel("");

      const result = await dsSampleFromDsName.runTrials(1, ds, model);
      expect(model.makeRequest).toHaveBeenCalled();
      expect(result.length).toEqual(1);
      expect(result[0]).toEqual("");
    });
  });

  describe("validateTrial", () => {
    test("should return NoData if data is empty", async () => {
      const ds: DatasetProfile = createMockDataset();

      const result = await dsSampleFromDsName.validateTrial(ds, "");
      expect(result.type).toEqual("no-data");
    });

    test("should return DataIncorrect if data is incorrect", async () => {
      const ds: DatasetProfile = createMockDataset();

      const result = await dsSampleFromDsName.validateTrial(
        ds,

        JSON.stringify({
          pairs: [["test", "test2"]],
        })
      );
      expect(result.type).toEqual("data-incorrect");
    });

    test("should return DataPartiallyIncorrect if data is partially incorrect", async () => {
      const ds: DatasetProfile = createMockDataset();

      const result = await dsSampleFromDsName.validateTrial(
        ds,

        JSON.stringify({
          pairs: [
            ["test", "test2"],
            ["test", "test"],
          ],
        })
      );
      expect(result.type).toEqual("data-partially-incorrect");
    });

    test("should return JsonSyntaxError if data is not valid JSON", async () => {
      const ds: DatasetProfile = createMockDataset();

      const result = await dsSampleFromDsName.validateTrial(
        ds,
        "not valid json"
      );
      expect(result.type).toEqual("json-syntax-error");
    });
  });
});
