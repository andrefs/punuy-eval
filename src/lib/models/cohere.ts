import { CohereClient, Cohere } from "cohere-ai";
import { Model, ModelTool, ModelResponse } from "./model";
import logger from "../logger";
import "dotenv/config";

const configuration = {
  token: process.env.NODE_ENV === "test" ? "test" : process.env.COHERE_API_KEY,
};

export interface CohereModelResponse extends ModelResponse {
  type: "cohere";
  dataObj: Cohere.NonStreamedChatResponse;
}

export type MakeCohereRequest = (
  prompt: string,
  params: ModelTool
) => Promise<CohereModelResponse>;

if (!configuration.token) {
  logger.error(
    "Cohere API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info("Cohere API key loaded from environment variable");
}
const cohere = new CohereClient(configuration);

const buildModel = (cohere: CohereClient, modelId: string): Model => {
  const makeRequest = async function (
    prompt: string,
    toolParams: ModelTool
  ): Promise<CohereModelResponse> {
    const prediction = await cohere.chat({
      model: modelId,
      message: prompt,
      tools: [
        {
          name: toolParams.name,
          description: toolParams.description,
          parameterDefinitions: Object.fromEntries(
            Object.entries(toolParams.schema.properties).map(
              ([paramName, param]) => [
                paramName,
                {
                  required: true,
                  type: param.type,
                  description: param.description,
                },
              ]
            )
          ),
        },
      ],
    });
    const resp: CohereModelResponse = {
      type: "cohere" as const,
      dataObj: prediction,
      getDataText: () => {
        return JSON.stringify(prediction.toolCalls?.[0].parameters) || "";
      },
    };

    return resp;
  };

  return new Model(modelId, makeRequest);
};

export const commandRPlus = buildModel(cohere, "command-r-plus");
