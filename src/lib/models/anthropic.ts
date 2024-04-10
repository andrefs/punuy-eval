import Anthropic from "@anthropic-ai/sdk";
import { Model } from "./model";
import logger from "../logger";
import "dotenv/config";

const configuration = {
  apiKey:
    process.env.NODE_ENV === "test" ? "test" : process.env.ANTHROPIC_API_KEY,
};

export interface AnthropicModelParams {
  type: "anthropic";
  function: Anthropic.Beta.Tools.Tool;
}

export interface AnthropicModelResponse {
  type: "anthropic";
  data: Anthropic.Beta.Tools.Messages.ToolsBetaMessage;
}

export type MakeAnthropicRequest = (
  prompt: string,
  params: AnthropicModelParams
) => Promise<AnthropicModelResponse>;

if (!configuration.apiKey) {
  logger.error(
    "OpenAI API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info("OpenAI API key loaded from environment variable");
}
const anthropic = new Anthropic(configuration);

const buildModel = (anthropic: Anthropic, modelId: string) => {
  const makeRequest = async function (
    prompt: string,
    params: AnthropicModelParams
  ) {
    const msg = await anthropic.beta.tools.messages.create({
      model: modelId,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: params.function.name,
          input_schema: params.function.input_schema,
          description: params.function.description,
        },
      ],
    });

    return { type: "anthropic" as const, data: msg };
  };

  return new Model(modelId, makeRequest);
};

export const claude3opus = buildModel(anthropic, "claude-3-opus-20240229");
export const claude3sonnet = buildModel(anthropic, "claude-3-sonnet-20240229");
export const claude3haiku = buildModel(anthropic, "claude-3-haiku-20240307");
