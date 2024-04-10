import { CohereClient, Cohere } from "cohere-ai";
import { Model, ModelRequestParams } from "./model";
import logger from "../logger";
import "dotenv/config";
import { ToolParameterDefinitionsValue } from "cohere-ai/api";

const configuration = {
  token: process.env.NODE_ENV === "test" ? "test" : process.env.COHERE_API_KEY,
};

export interface CohereModelResponse {
  type: "cohere";
  data: Cohere.NonStreamedChatResponse;
}

export type MakeCohereRequest = (
  prompt: string,
  params: ModelRequestParams
) => Promise<CohereModelResponse>;

if (!configuration.token) {
  logger.error(
    "Cohere API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info("Cohere API key loaded from environment variable");
}
const cohere = new CohereClient(configuration);

const buildModel = (cohere: CohereClient, modelId: string) => {
  const makeRequest = async function (
    prompt: string,
    params: ModelRequestParams
  ) {
    const prediction = await cohere.chat({
      model: modelId,
      message: prompt,
      tools: [
        {
          name: params.function.name,
          description: params.function.description,
          parameterDefinitions: params.function.schema as Record<
            string,
            ToolParameterDefinitionsValue
          >,
        },
      ],
    });

    return { type: "cohere" as const, data: prediction };
  };

  return new Model(modelId, makeRequest);
};

export const commandRPlus = buildModel(cohere, "command-r-plus");
