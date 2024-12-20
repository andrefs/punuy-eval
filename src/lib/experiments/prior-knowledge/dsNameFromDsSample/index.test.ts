import { describe, expect, it } from "vitest";
import { createMockDsPart, createMockModel } from "../mocks";
import dsNameFromDsSample from ".";
import { ExpVarsFixedPrompt, PromptGenerator } from "../..";
import { DsPartition } from "../../../dataset-partitions/DsPartition";

describe("dsNameFromDsSample", () => {
  describe("evaluateTrial", () => {
    // TODO migrate to getResponse tests
    //
    // it("should return NoData if data is empty", async () => {
    //   const result = await dsNameFromDsSample.evaluateTrial(
    //     createMockDsPart(),
    //     ""
    //   );
    //   expect(result.type).toEqual("no-data");
    // });

    // it("should return JsonSyntaxError if data is not valid JSON", async () => {
    //   const result = await dsNameFromDsSample.evaluateTrial(
    //     createMockDsPart(),
    //     "{"
    //   );
    //   expect(result.type).toEqual("json-syntax-error");
    // });

    // it("should return JsonSchemaError if data does not match the JSON schema", async () => {
    //   const result = await dsNameFromDsSample.evaluateTrial(
    //     createMockDsPart(),
    //     '{"key": "value"}'
    //   );
    //   expect(result.type).toEqual("json-schema-error");
    // });

    it("should return NonEvaluatedData if data is valid", async () => {
      const mockDsPartition = createMockDsPart();
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDsPart(),
        [
          {
            data: {
              name: mockDsPartition.dataset.metadata.name,
              year: "2021",
              authors: ["First Author", "Second Person Name"],
            },
            prompt: {
              text: "",
              pairs: [],
            },
          },
        ]
      );
      expect(result.type).toEqual("non-evaluated-data");
    });

    it("should return original and obtained data", async () => {
      const mockDsPartition = createMockDsPart();
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDsPart(),
        [
          {
            data: {
              name: mockDsPartition.dataset.metadata.name,
              year: "2021",
              authors: ["First Author", "Second Person Name"],
            },
            prompt: {
              text: "",
              pairs: [],
            },
          },
        ]
      );
      expect(result).toMatchInlineSnapshot(`
        NonEvaluatedData {
          "expected": {
            "name": "Dataset Name",
            "year": "2021",
          },
          "got": {
            "authors": [
              "First Author",
              "Second Person Name",
            ],
            "name": "Dataset Name",
            "year": "2021",
          },
          "ok": false,
          "type": "non-evaluated-data",
        }
      `);
    });
  });

  describe("prompt generator", () => {
    it("should generate a prompt", () => {
      const dpart: DsPartition = createMockDsPart();
      const promptGen = dsNameFromDsSample!.prompts![0] as PromptGenerator;
      const model = createMockModel("this is the result");
      const vars: ExpVarsFixedPrompt = {
        dpart: dpart,
        model,
        prompt: promptGen.generate({ dpart: dpart, model }),
      };

      expect(vars.prompt.turns[0].text).toEqual(
        expect.stringContaining(dpart.data[0].term1)
      );
      expect(vars.prompt.turns[0].text).toEqual(
        expect.stringContaining(dpart.data[0].term2)
      );
    });
  });

  describe("runTrial", () => {
    it("should return a result", async () => {
      const dpart: DsPartition = createMockDsPart();
      const promptGen = dsNameFromDsSample!.prompts![0] as PromptGenerator;
      const result = JSON.stringify({
        name: "Dataset Name",
        year: "2021",
        authors: ["First Author", "Second Person Name"],
      });
      const model = createMockModel(result);
      const vars: ExpVarsFixedPrompt = {
        dpart: dpart,
        model,
        prompt: promptGen.generate({ dpart: dpart, model }),
      };
      await dsNameFromDsSample.runTrials(vars, 2, 1);
      expect(model.makeRequest).toHaveBeenCalledTimes(2);
    });
  });
});
