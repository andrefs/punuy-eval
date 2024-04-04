import { Model } from "../../models";

export const createMockDataset = () => ({
  id: "test",
  metadata: {
    languages: ["en" as const],
    domain: "general" as const,
    name: "Dataset Name",
    description: "test dataset",
    papers: [],
    urls: [],
    date: "2021-01-01",
    downloadUrls: [],
    measureTypes: [],
  },
  partitions: [
    {
      id: "testPartition",
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
      ],
    },
  ],
});

export const createMockModel = (result: string) =>
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
