import MistralClient, {
  ChatCompletionResponse,
  ToolChoice,
} from "@mistralai/mistralai";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";

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
  modelId: ModelId,
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
      toolChoice: "any" as ToolChoice,
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
      const chatResponse = await mistral.chat(req);

      const res: MistralModelResponse = {
        type: "mistral" as const,
        dataObj: chatResponse,
        usage: chatResponse.usage
          ? {
              inputTokens: chatResponse.usage?.prompt_tokens,
              outputTokens: chatResponse.usage?.completion_tokens,
              totalTokens: chatResponse.usage?.total_tokens,
              modelId,
            }
          : undefined,
        getDataText: () => {
          let dataText;
          try {
            dataText =
              chatResponse.choices[0]?.message.tool_calls?.filter(
                tc => tc?.function?.name === toolParams.name
              )?.[0]?.function?.arguments || "";
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
        `Request to model ${modelId} failed: ${e}.\nPrompt: ${prompt}`
      );
      throw new RequestError(message);
    }
  };

  return new Model(modelId, "mistral" as ModelProvider, makeRequest, pricing);
};

// updated at 2024-04-18
const pricing = {
  mistralLarge: {
    input: 8 / 1_000_000,
    output: 24 / 1_000_000,
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
  openMixtral8x7B: {
    input: 0.7 / 1_000_000,
    output: 0.7 / 1_000_000,
    currency: "$" as const,
  },
  openMixtral8x22B: {
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
