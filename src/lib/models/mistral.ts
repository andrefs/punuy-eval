import { Mistral } from "@mistralai/mistralai";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "@mistralai/mistralai/models/components";

const configuration = {
  apiKey:
    process.env.NODE_ENV === "test" ? "test" : process.env.MISTRAL_API_KEY,
};

export interface MistralModelResponse extends ModelResponse {
  type: "mistral";
  usage?: Usage;
  dataObj: ChatCompletionResponse;
}

export type MakeMistralRequest = (
  prompt: string,
  params: ModelTool
) => Promise<MistralModelResponse>;

if (!configuration.apiKey) {
  logger.error(
    "Mistral API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info(
    `Mistral API key loaded from environment variable: ${configuration.apiKey.slice(
      0,
      5
    )}...`
  );
}
const mistral = new Mistral(configuration);

const buildModel = (
  mistral: Mistral,
  modelId: ModelId,
  pricing?: ModelPricing
) => {
  const makeRequest = async function (prompt: string, toolParams: ModelTool) {
    const req: ChatCompletionRequest = {
      model: modelId,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: prompt,
        },
      ],
      toolChoice: "any",
      tools: [
        {
          type: "function",
          function: {
            name: toolParams.name,
            description: toolParams.description,
            parameters: toolParams.schema,
          },
        },
      ],
    };

    try {
      const chatResponse = await mistral.chat.complete(req);

      const res: MistralModelResponse = {
        type: "mistral" as const,
        dataObj: chatResponse,
        usage: chatResponse.usage
          ? {
            inputTokens: chatResponse.usage?.promptTokens,
            outputTokens: chatResponse.usage?.completionTokens,
            totalTokens: chatResponse.usage?.totalTokens,
            modelId,
          }
          : undefined,
        getDataText: () => {
          let dataText;
          try {
            const args = chatResponse.choices?.[0]?.message.toolCalls?.filter(
              tc => tc?.function?.name === toolParams.name
            )?.[0]?.function?.arguments;
            dataText =
              typeof args === "string"
                ? args
                : typeof args === "object"
                  ? JSON.stringify(args)
                  : "";
          } catch (e) {
            logger.error(`Error getting data text from model ${modelId}: ${e}`);
            logger.error(`Response object: ${JSON.stringify(chatResponse)}`);
            throw e;
          }
          return dataText;
        },
      };
      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      logger.error(
        `Request to model ${modelId} failed: ${e}\nRequest object: ${JSON.stringify(req, null, 2)}\nPrompt: ${prompt}`
      );
      throw new RequestError(message);
    }
  };

  return new Model(modelId, "mistral" as ModelProvider, makeRequest, pricing);
};

// https://mistral.ai/technology/#pricing
// updated on 2024-10-16
const pricing = {
  ministral8b_2410: {
    input: 0.1 / 1_000_000,
    output: 0.1 / 1_000_000,
    currency: "€" as const,
  },
  ministral3b_2410: {
    input: 0.04 / 1_000_000,
    output: 0.04 / 1_000_000,
    currency: "€" as const,
  },
  mistralLarge_2407: {
    input: 1.8 / 1_000_000,
    output: 5.4 / 1_000_000,
    currency: "€" as const,
  },
  mistralMedium_2312: {
    input: 2.5 / 1_000_000,
    output: 7.5 / 1_000_000,
    currency: "€" as const,
  },
  mistralSmall_2409: {
    input: 0.18 / 1_000_000,
    output: 0.54 / 1_000_000,
    currency: "€" as const,
  },
  openMistralNemo_2407: {
    input: 0.13 / 1_000_000,
    output: 0.13 / 1_000_000,
    currency: "€" as const,
  },
  openMistral7B: {
    input: 0.2 / 1_000_000,
    output: 0.2 / 1_000_000,
    currency: "€" as const,
  },
  openMixtral8x7B: {
    input: 0.65 / 1_000_000,
    output: 0.65 / 1_000_000,
    currency: "€" as const,
  },
  openMixtral8x22B: {
    input: 1.9 / 1_000_000,
    output: 5.6 / 1_000_000,
    currency: "€" as const,
  },
};

// https://docs.mistral.ai/getting-started/models/models_overview/
export const ministral8b_2410 = buildModel(
  mistral,
  "ministral-8b-2410",
  pricing.ministral8b_2410
);
export const ministral3b_2410 = buildModel(
  mistral,
  "ministral-3b-2410",
  pricing.ministral3b_2410
);
export const mistralLarge_2407 = buildModel(
  mistral,
  "mistral-large-2407",
  pricing.mistralLarge_2407
);
export const mistralMedium_2312 = buildModel(
  mistral,
  "mistral-medium-2312",
  pricing.mistralMedium_2312
);
export const mistralSmall_2409 = buildModel(
  mistral,
  "mistral-small-2409",
  pricing.mistralSmall_2409
);
export const openMistralNemo_2407 = buildModel(
  mistral,
  "open-mistral-nemo-2407",
  pricing.openMistralNemo_2407
);
export const openMistral7B = buildModel(
  mistral,
  "open-mistral-7b",
  pricing.openMistral7B
);
export const openMixtral8x7B = buildModel(
  mistral,
  "open-mixtral-8x7b",
  pricing.openMixtral8x7B
);
export const openMixtral8x22B = buildModel(
  mistral,
  "open-mixtral-8x22b",
  pricing.openMixtral8x22B
);
