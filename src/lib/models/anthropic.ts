import Anthropic from "@anthropic-ai/sdk";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { ToolUseBlock } from "@anthropic-ai/sdk/resources/beta/tools/messages.mjs";
import { Usage } from "../experiments";

const configuration = {
  apiKey:
    process.env.NODE_ENV === "test" ? "test" : process.env.ANTHROPIC_API_KEY,
};

export interface AnthropicModelResponse extends ModelResponse {
  type: "anthropic";
  usage?: Usage;
  dataObj: Anthropic.Beta.Tools.Messages.ToolsBetaMessage;
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
  logger.info("Anthropic API key loaded from environment variable");
}
const anthropic = new Anthropic(configuration);

const buildModel = (
  anthropic: Anthropic,
  modelId: string,
  pricing?: ModelPricing
) => {
  const makeRequest = async function (
    prompt: string,
    toolParams: ModelTool
  ): Promise<AnthropicModelResponse> {
    const msg = await anthropic.beta.tools.messages.create({
      model: modelId,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: toolParams.name,
          input_schema: {
            ...toolParams.schema,
          },
          description: toolParams.description,
        },
      ],
    });

    const res: AnthropicModelResponse = {
      type: "anthropic" as const,
      dataObj: msg,
      usage: msg.usage
        ? {
            input_tokens: msg.usage.input_tokens,
            output_tokens: msg.usage.output_tokens,
            total_tokens: msg.usage.input_tokens + msg.usage.output_tokens,
          }
        : undefined,
      getDataText: () => {
        const toolCalls = msg.content.filter(
          c => c.type === "tool_use"
        ) as ToolUseBlock[];
        return JSON.stringify(toolCalls?.[0]?.input) || "";
      },
    };
    return res;
  };

  return new Model(modelId, makeRequest, pricing);
};

// updated at 2024-04-18
const pricing = {
  claude3opus: {
    input: 15 / 1_000_000,
    output: 75 / 1_000_000,
    currency: "$" as const,
  },
  claude3sonnet: {
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

export const claude3opus = buildModel(
  anthropic,
  "claude-3-opus-20240229",
  pricing.claude3opus
);
export const claude3sonnet = buildModel(
  anthropic,
  "claude-3-sonnet-20240229",
  pricing.claude3haiku
);
export const claude3haiku = buildModel(
  anthropic,
  "claude-3-haiku-20240307",
  pricing.claude3sonnet
);
