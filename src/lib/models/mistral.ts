import MistralClient, {
  ResponseFormats,
  ChatCompletionResponse,
} from "@mistralai/mistralai";

import { Model, ModelRequestParams } from "./model";
import logger from "../logger";
import "dotenv/config";

const apiKey =
  process.env.NODE_ENV === "test" ? "test" : process.env.MISTRAL_API_KEY;

export interface MistralModelResponse {
  type: "mistral";
  data: ChatCompletionResponse;
}

export type MakeMistralRequest = (
  prompt: string,
  params: ModelRequestParams
) => Promise<MistralModelResponse>;

if (!apiKey) {
  logger.error(
    "Mistral API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info("Mistral API key loaded from environment variable");
}

const mistral = new MistralClient(apiKey);

const buildModel = (mistral: MistralClient, modelId: string) => {
  const makeRequest = async function (
    prompt: string,
    params: ModelRequestParams
  ) {
    const chatResponse = await mistral.chat({
      model: modelId,
      responseFormat: { type: ResponseFormats.json_object },
      messages: [{ role: "user", content: prompt }],
    });

    return { type: "mistral" as const, data: chatResponse };
  };

  return new Model(modelId, makeRequest);
};

export const mistralLarge = buildModel(mistral, "mistral-large");
