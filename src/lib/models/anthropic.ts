import Anthropic from "@anthropic-ai/sdk";
import { Model, ModelTool, ModelResponse } from "./model";
import logger from "../logger";
import "dotenv/config";
import { ToolUseBlock } from "@anthropic-ai/sdk/resources/beta/tools/messages.mjs";

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

const buildModel = (anthropic: Anthropic, modelId: string) => {
  const makeRequest = async function (
    prompt: string,
    toolParams: ModelTool
  ): Promise<AnthropicModelResponse> {
    console.log("XXXXXXXXXXXXXx 5", JSON.stringify(toolParams, null, 2));
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
    console.log("XXXXXXXXXXXXXx 6", JSON.stringify(msg, null, 2));

    const res: AnthropicModelResponse = {
      type: "anthropic" as const,
      dataObj: msg,
      getDataText: () => {
        const toolCalls = msg.content.filter(
          c => c.type === "tool_use"
        ) as ToolUseBlock[];
        return JSON.stringify(toolCalls?.[0].input) || "";
      },
    };
    return res;
  };

  return new Model(modelId, makeRequest);
};

export const claude3opus = buildModel(anthropic, "claude-3-opus-20240229");
export const claude3sonnet = buildModel(anthropic, "claude-3-sonnet-20240229");
export const claude3haiku = buildModel(anthropic, "claude-3-haiku-20240307");
