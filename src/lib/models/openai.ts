import OpenAI from "openai";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { FunctionParameters } from "openai/resources/shared.mjs";
import { Usage } from "../experiments";

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
  modelId: string,
  pricing?: ModelPricing
) => {
  const makeRequest = async function (prompt: string, toolParams: ModelTool) {
    const completion = await openai.chat.completions.create({
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
            parameters: toolParams.schema as unknown as FunctionParameters,
          },
        },
      ],
    });
    const res: OpenAIModelResponse = {
      type: "openai" as const,
      dataObj: completion,
      usage: completion.usage
        ? {
            input_tokens: completion.usage?.prompt_tokens,
            output_tokens: completion.usage?.completion_tokens,
            total_tokens: completion.usage?.total_tokens,
          }
        : undefined,
      getDataText: () => {
        return (
          completion.choices[0].message.tool_calls?.[0].function.arguments || ""
        );
      },
    };
    return res;
  };

  return new Model(modelId, makeRequest, pricing);
};

// updated at 2024-04-18
const pricing = {
  gpt35turbo: {
    input: 0.5 / 1_000_000,
    output: 1.5 / 1_000_000,
  },
  gpt4: {
    input: 30 / 1_000_000,
    output: 60 / 1_000_000,
  },
  gpt4turbo: {
    input: 10 / 1_000_000,
    output: 30 / 1_000_000,
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
