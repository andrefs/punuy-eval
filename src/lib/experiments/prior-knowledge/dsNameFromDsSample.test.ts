import { describe, expect, test } from "@jest/globals";
import { createMockDataset } from "./mocks";
import dsNameFromDsSample from "./dsNameFromDsSample";

describe("dsSampleFromDsName", () => {
  describe("evaluateTrial", () => {
    test("should return NoData if data is empty", async () => {
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDataset(),
        ""
      );
      expect(result.type).toEqual("no-data");
    });

    test("should return DataCorrect if data is valid", async () => {
      const mockDataset = createMockDataset();
      const result = await dsNameFromDsSample.evaluateTrial(
        createMockDataset(),
        JSON.stringify({
          name: mockDataset.metadata.name,
          year: "2021",
          authors: ["First Author", "Second Person Name"],
        })
      );
      console.log("XXXXXXXXXXXX 10", { result });
      expect(result.type).toEqual("data-correct");
    });
  });
});
