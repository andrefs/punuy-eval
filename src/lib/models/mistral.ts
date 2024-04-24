import MistralClient, { ChatCompletionResponse } from "@mistralai/mistralai";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { Usage } from "../experiments";

const apiKey =
  process.env.NODE_ENV === "test" ? "test" : process.env.MISTRAL_API_KEY;

export interface MistralModelResponse extends ModelResponse {
  type: "mistral";
  usage?: Usage;
  dataObj: ChatCompletionResponse;
}

export type MakeMistralRequest = (
  prompt: string,
  params: ModelTool
) => Promise<MistralModelResponse>;

if (!apiKey) {
  logger.error(
    "Mistral API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info("Mistral API key loaded from environment variable");
}
const mistral = new MistralClient(apiKey);

const buildModel = (
  mistral: MistralClient,
  modelId: string,
  pricing?: ModelPricing
) => {
  const makeRequest = async function (prompt: string, toolParams: ModelTool) {
    const req = {
      model: modelId,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: prompt,
        },
      ],
      tools: [
        {
          type: "function",
          // omitting description seems to yield better results
          function: {
            name: toolParams.name,
            description: toolParams.description,
            parameters: toolParams.schema,
          },
        },
      ],
    };

    const chatResponse = await mistral.chat(req);

    const res: MistralModelResponse = {
      type: "mistral" as const,
      dataObj: chatResponse,
      usage: chatResponse.usage
        ? {
            input_tokens: chatResponse.usage?.prompt_tokens,
            output_tokens: chatResponse.usage?.completion_tokens,
            total_tokens: chatResponse.usage?.total_tokens,
          }
        : undefined,
      getDataText: () => {
        return (
          chatResponse.choices[0]?.message.tool_calls?.filter(
            tc => tc.function.name === toolParams.name
          )?.[0].function.arguments || ""
        );
      },
    };
    return res;
  };

  return new Model(modelId, makeRequest, pricing);
};

// updated at 2024-04-18
const pricing = {
  mistralLarge: {
    input: 8 / 1_000_000,
    output: 24 / 1_000_000,
    currency: "$" as const,
  },
  mistralMedium: {
    input: 2.7 / 1_000_000,
    output: 8.1 / 1_000_000,
    currency: "$" as const,
  },
  mistralSmall: {
    input: 2 / 1_000_000,
    output: 6 / 1_000_000,
    currency: "$" as const,
  },
  openMistral7B: {
    input: 0.25 / 1_000_000,
    output: 0.25 / 1_000_000,
    currency: "$" as const,
  },
  openMistral8x7B: {
    input: 0.7 / 1_000_000,
    output: 0.7 / 1_000_000,
    currency: "$" as const,
  },
  openMistral8x22B: {
    input: 2 / 1_000_000,
    output: 6 / 1_000_000,
    currency: "$" as const,
  },
};

export const mistralLarge = buildModel(
  mistral,
  "mistral-large-latest",
  pricing.mistralLarge
);
export const mistralMedium = buildModel(
  mistral,
  "mistral-medium-latest",
  pricing.mistralMedium
);
export const mistralSmall = buildModel(
  mistral,
  "mistral-small-latest",
  pricing.mistralSmall
);
export const openMistral7B = buildModel(
  mistral,
  "open-mistral-7b",
  pricing.openMistral7B
);
export const openMistral8x7B = buildModel(
  mistral,
  "open-mistral-8x7b",
  pricing.openMistral8x7B
);
export const openMistral8x22B = buildModel(
  mistral,
  "open-mistral-8x22b",
  pricing.openMistral8x22B
);
