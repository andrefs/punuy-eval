import { DsPartition } from "../../dataset-partitions/DsPartition";
import { Model, OpenAIModelResponse } from "../../models";
import { vi } from "vitest";

export const createMockDsPart = (): DsPartition => ({
  id: "test_testPartition",
  dataset: {
    id: "test",
    metadata: {
      domain: "general" as const,
      name: "Dataset Name",
      description: "test dataset",
      papers: [],
      urls: [],
      date: "2021-01-01",
      downloadUrls: [],
    },
  },
  language: "en" as const,
  partitionId: "testPartition",
  scale: {
    value: {
      min: 0,
      max: 1,
    },
  },
  metrics: {
    annotators: {
      total: 1,
      minEachPair: 1,
    },
    interAgreement: {
      spearman: null,
      pearson: null,
    },
  },
  measureType: "similarity" as const,
  data: [
    {
      term1: "testWord1",
      term2: "testWord2",
      value: 0.5,
      values: [0.5],
    },
    {
      term1: "testWord3",
      term2: "testWord4",
      value: 0.2,
      values: [0.2],
    },
    {
      term1: "testWord5",
      term2: "testWord6",
      value: 0.3,
      values: [0.3],
    },
    {
      term1: "testWord7",
      term2: "testWord8",
      value: 0.6,
      values: [0.6],
    },
    {
      term1: "testWord9",
      term2: "testWord10",
      value: 0.9,
      values: [0.9],
    },
  ],
});

export const createMockModel = (result: string) =>
  new Model(
    "test",
    "openai",
    vi.fn(() =>
      Promise.resolve({
        type: "openai",
        dataObj: {
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
        getDataText: vi.fn(() => result),
      } as OpenAIModelResponse)
    )
  );
