import Anthropic from "@anthropic-ai/sdk";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";
import { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages.mjs";

const configuration = {
  apiKey:
    process.env.NODE_ENV === "test" ? "test" : process.env.ANTHROPIC_API_KEY,
};

export interface AnthropicModelResponse extends ModelResponse {
  type: "anthropic";
  usage?: Usage;
  dataObj: Anthropic.Messages.Message;
}

export type MakeAnthropicRequest = (
  prompt: string,
  params: ModelTool
) => Promise<AnthropicModelResponse>;

if (!configuration.apiKey) {
  logger.error(
    "Anthropic API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info(
    `Anthropic API key loaded from environment variable: ${configuration.apiKey.slice(
      0,
      5
    )}...`
  );
}
const anthropic = new Anthropic(configuration);

const buildModel = (
  anthropic: Anthropic,
  modelId: ModelId,
  pricing?: ModelPricing
) => {
  const makeRequest = async function (
    prompt: string,
    toolParams: ModelTool
  ): Promise<AnthropicModelResponse> {
    const req: Anthropic.Messages.MessageCreateParamsNonStreaming = {
      model: modelId,
      max_tokens: 1024,
      messages: [
        {
          role: "user" as const,
          content: prompt,
        },
      ],
      tool_choice: {
        type: "tool",
        name: toolParams.name,
      },
      tools: [
        {
          name: toolParams.name,
          input_schema: {
            ...toolParams.schema,
          },
          description: toolParams.description,
        },
      ],
    };
    try {
      const msg = await anthropic.messages.create(req);

      const res: AnthropicModelResponse = {
        type: "anthropic" as const,
        dataObj: msg,
        usage: msg.usage
          ? {
            inputTokens: msg.usage.input_tokens,
            outputTokens: msg.usage.output_tokens,
            totalTokens: msg.usage.input_tokens + msg.usage.output_tokens,
            modelId,
          }
          : undefined,
        getDataText: () => {
          let dataText;
          try {
            const toolCalls = msg.content.filter(
              c => c.type === "tool_use"
            ) as ToolUseBlock[];
            dataText = JSON.stringify(toolCalls?.[0]?.input) || "";
          } catch (e) {
            logger.error(`Error getting data text from model ${modelId}: ${e}`);
            logger.error(`Response object: ${JSON.stringify(msg)}`);
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

  return new Model(modelId, "anthropic" as ModelProvider, makeRequest, {
    pricing,
  });
};

// https://www.anthropic.com/pricing#anthropic-api
// updated on 2024-10-03
const pricing = {
  claude3opus: {
    input: 15 / 1_000_000,
    output: 75 / 1_000_000,
    currency: "$" as const,
  },
  claude3sonnet_20240229: {
    input: 3 / 1_000_000,
    output: 15 / 1_000_000,
    currency: "$" as const,
  },
  claude35sonnet_20240620: {
    input: 3 / 1_000_000,
    output: 15 / 1_000_000,
    currency: "$" as const,
  },
  claude3haiku: {
    input: 0.25 / 1_000_000,
    output: 1.25 / 1_000_000,
    currency: "$" as const,
  },
};

// https://docs.anthropic.com/en/docs/about-claude/models
export const claude3opus = buildModel(
  anthropic,
  "claude-3-opus-20240229",
  pricing.claude3opus
);
export const claude3sonnet_20240229 = buildModel(
  anthropic,
  "claude-3-sonnet-20240229",
  pricing.claude3sonnet_20240229
);
export const claude35sonnet_20240620 = buildModel(
  anthropic,
  "claude-3-5-sonnet-20240620",
  pricing.claude35sonnet_20240620
);
export const claude3haiku = buildModel(
  anthropic,
  "claude-3-haiku-20240307",
  pricing.claude3haiku
);
