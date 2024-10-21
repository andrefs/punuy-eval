import OpenAI, { ClientOptions } from "openai";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { FunctionParameters } from "openai/resources/shared.mjs";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";

const configuration: ClientOptions = {
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
  logger.info(
    `OpenAI API key loaded from environment variable: ${configuration.apiKey.slice(
      0,
      5
    )}...${configuration.apiKey.slice(-5)}`
  );
}
const openai = new OpenAI(configuration);

const buildModel = (
  openai: OpenAI,
  modelId: ModelId,
  pricing?: ModelPricing
) => {
  const makeRequest = async function(prompt: string, toolParams: ModelTool) {
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
          let dataText;
          try {
            dataText =
              completion.choices[0]?.message?.tool_calls?.[0]?.function
                ?.arguments || "";
          } catch (e) {
            logger.error(`Error getting data text from model ${modelId}: ${e}`);
            logger.error(`Response object: ${JSON.stringify(completion)}`);
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

  return new Model(modelId, "openai" as ModelProvider, makeRequest, {
    pricing,
  });
};

// https://openai.com/api/pricing/
// updated on 2024-10-03
const pricing = {
  gpt35turbo_0125: {
    input: 0.5 / 1_000_000,
    output: 1.5 / 1_000_000,
    currency: "$" as const,
  },
  gpt4_0613: {
    input: 30 / 1_000_000,
    output: 60 / 1_000_000,
    currency: "$" as const,
  },
  gpt4turbo_20240409: {
    input: 10 / 1_000_000,
    output: 30 / 1_000_000,
    currency: "$" as const,
  },
  gpt4omini_20240718: {
    input: 0.15 / 1_000_000,
    output: 0.6 / 1_000_000,
    currency: "$" as const,
  },
  gpt4o_20240513: {
    input: 5 / 1_000_000,
    output: 15 / 1_000_000,
    currency: "$" as const,
  },
  gpt4o_20240806: {
    input: 2.5 / 1_000_000,
    output: 10 / 1_000_000,
    currency: "$" as const,
  },

  // these don't support json output (yet?)
  o1preview_20240912: {
    input: 15 / 1_000_000,
    output: 60 / 1_000_000,
    currency: "$" as const,
  },
  o1mini_20240912: {
    input: 3 / 1_000_000,
    output: 12 / 1_000_000,
    currency: "$" as const,
  },
};

// https://platform.openai.com/docs/models
// replaced by gp4-4o-mini
export const gpt35turbo_0125 = buildModel(
  openai,
  "gpt-3.5-turbo-0125",
  pricing.gpt35turbo_0125
);
export const gpt4_0613 = buildModel(openai, "gpt-4-0613", pricing.gpt4_0613);
export const gpt4turbo_20240409 = buildModel(
  openai,
  "gpt-4-turbo-2024-04-09",
  pricing.gpt4turbo_20240409
);
export const o1preview_20240912 = buildModel(
  openai,
  "o1-preview-2024-09-12",
  pricing.o1preview_20240912
);
export const o1mini_20240912 = buildModel(
  openai,
  "o1-mini-2024-09-12",
  pricing.o1mini_20240912
);
export const gpt4omini_20240718 = buildModel(
  openai,
  "gpt-4o-mini-2024-07-18",
  pricing.gpt4omini_20240718
);
export const gpt4o_20240513 = buildModel(
  openai,
  "gpt-4o-2024-05-13",
  pricing.gpt4o_20240513
);
export const gpt4o_20240806 = buildModel(
  openai,
  "gpt-4o-2024-08-06",
  pricing.gpt4o_20240806
);
