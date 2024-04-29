import OpenAI from "openai";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { FunctionParameters } from "openai/resources/shared.mjs";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";

const configuration = {
  apiKey: process.env.NODE_ENV === "test" ? "test" : process.env.OPENAI_API_KEY,
};

export interface OpenAIModelResponse extends ModelResponse {
  type: "openai";
  usage?: Usage;
  dataObj: OpenAI.Chat.Completions.ChatCompletion;
}

export type MakeOpenAIRequest = (
  prompt: string,
  params: ModelTool
) => Promise<OpenAIModelResponse>;

if (!configuration.apiKey) {
  logger.error(
    "OpenAI API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info("OpenAI API key loaded from environment variable");
}
const openai = new OpenAI(configuration);

const buildModel = (
  openai: OpenAI,
  modelId: ModelId,
  pricing?: ModelPricing
) => {
  const makeRequest = async function (prompt: string, toolParams: ModelTool) {
    const req = {
      model: modelId,
      messages: [
        { role: "system" as const, content: "You are a helpful assistant." },
        {
          role: "user" as const,
          content: prompt,
        },
      ],
      tools: [
        {
          type: "function" as const,
          function: {
            name: toolParams.name,
            description: toolParams.description,
            parameters: toolParams.schema as unknown as FunctionParameters,
          },
        },
      ],
    };

    try {
      const completion = await openai.chat.completions.create(req);
      const res: OpenAIModelResponse = {
        type: "openai" as const,
        dataObj: completion,
        usage: completion.usage
          ? {
              inputTokens: completion.usage?.prompt_tokens,
              outputTokens: completion.usage?.completion_tokens,
              totalTokens: completion.usage?.total_tokens,
              modelId,
            }
          : undefined,
        getDataText: () => {
          return (
            completion.choices[0].message.tool_calls?.[0].function.arguments ||
            ""
          );
        },
      };
      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      logger.error(
        `Request to model ${modelId} failed: ${e}.\nPrompt: ${prompt}`
      );
      throw new RequestError(message);
    }
  };

  return new Model(modelId, "openai" as ModelProvider, makeRequest, pricing);
};

// updated at 2024-04-18
const pricing = {
  gpt35turbo: {
    input: 0.5 / 1_000_000,
    output: 1.5 / 1_000_000,
    currency: "$" as const,
  },
  gpt4: {
    input: 30 / 1_000_000,
    output: 60 / 1_000_000,
    currency: "$" as const,
  },
  gpt4turbo: {
    input: 10 / 1_000_000,
    output: 30 / 1_000_000,
    currency: "$" as const,
  },
};

export const gpt35turbo = buildModel(
  openai,
  "gpt-3.5-turbo-0125",
  pricing.gpt35turbo
);
export const gpt4 = buildModel(openai, "gpt-4", pricing.gpt4);
export const gpt4turbo = buildModel(
  openai,
  "gpt-4-turbo-2024-04-09",
  pricing.gpt4turbo
);
