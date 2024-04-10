import OpenAI from "openai";
import { Model, ModelRequestParams } from "./model";
import logger from "../logger";
import "dotenv/config";

const configuration = {
  apiKey: process.env.NODE_ENV === "test" ? "test" : process.env.OPENAI_API_KEY,
};

export interface OpenAIModelResponse {
  type: "openai";
  data: OpenAI.Chat.Completions.ChatCompletion;
}

export type MakeOpenAIRequest = (
  prompt: string,
  params: ModelRequestParams
) => Promise<OpenAIModelResponse>;

if (!configuration.apiKey) {
  logger.error(
    "OpenAI API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info("OpenAI API key loaded from environment variable");
}
const openai = new OpenAI(configuration);

const buildModel = (openai: OpenAI, modelId: string) => {
  const makeRequest = async function (
    prompt: string,
    params: ModelRequestParams
  ) {
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
            name: params.function.name,
            description: params.function.description,
            parameters: params.function.schema,
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: params.function.name },
      },
    });
    return { type: "openai" as const, data: completion };
  };

  return new Model(modelId, makeRequest);
};

export const gpt35turbo = buildModel(openai, "gpt-3.5-turbo-0125");
export const gpt4 = buildModel(openai, "gpt-4-0613");
export const gpt4turbo = buildModel(openai, "gpt-4-0125-preview");
