import Anthropic from "@anthropic-ai/sdk";
import { Model, ModelRequestParams, ModelResponse } from "./model";
import logger from "../logger";
import "dotenv/config";

const configuration = {
  apiKey:
    process.env.NODE_ENV === "test" ? "test" : process.env.ANTHROPIC_API_KEY,
};

export interface AnthropicModelResponse extends ModelResponse {
  type: "anthropic";
  dataObj: Anthropic.Beta.Tools.Messages.ToolsBetaMessage;
}

export type MakeAnthropicRequest = (
  prompt: string,
  params: ModelRequestParams
) => Promise<AnthropicModelResponse>;

if (!configuration.apiKey) {
  logger.error(
    "Anthropic API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info("Anthropic API key loaded from environment variable");
}
const anthropic = new Anthropic(configuration);

const buildModel = (anthropic: Anthropic, modelId: string) => {
  const makeRequest = async function (
    prompt: string,
    params: ModelRequestParams
  ): Promise<AnthropicModelResponse> {
    const msg = await anthropic.beta.tools.messages.create({
      model: modelId,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: params.function.name,
          input_schema: {
            type: "object",
            ...params.function.schema,
          },
          description: params.function.description,
        },
      ],
    });

    const res: AnthropicModelResponse = {
      type: "anthropic" as const,
      dataObj: msg,
      getDataText: () => {
        return msg.content
          .flatMap(c => (c.type === "text" ? c.text : []))
          .join("\n");
      },
    };
    return res;
  };

  return new Model(modelId, makeRequest);
};

export const claude3opus = buildModel(anthropic, "claude-3-opus-20240229");
export const claude3sonnet = buildModel(anthropic, "claude-3-sonnet-20240229");
export const claude3haiku = buildModel(anthropic, "claude-3-haiku-20240307");
