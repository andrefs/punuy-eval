import { CohereClient, Cohere } from "cohere-ai";
import { Model, ModelTool, ModelResponse, ModelPricing } from "./model";
import logger from "../logger";
import "dotenv/config";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";

const configuration = {
  token: process.env.NODE_ENV === "test" ? "test" : process.env.COHERE_API_KEY,
};

export interface CohereModelResponse extends ModelResponse {
  type: "cohere";
  usage?: Usage;
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
  logger.info(
    `Cohere API key loaded from environment variable: ${configuration.token.slice(
      0,
      5
    )}...`
  );
}
const cohere = new CohereClient(configuration);

const buildModel = (
  cohere: CohereClient,
  modelId: ModelId,
  pricing?: ModelPricing
): Model => {
  const makeRequest = async function (
    prompt: string,
    toolParams: ModelTool
  ): Promise<CohereModelResponse> {
    const req = {
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
    };
    try {
      const prediction = await cohere.chat(req);

      const resp: CohereModelResponse = {
        type: "cohere" as const,
        dataObj: prediction,
        usage: prediction.meta?.billedUnits
          ? {
              inputTokens: prediction.meta.billedUnits.inputTokens || 0,
              outputTokens: prediction.meta.billedUnits.outputTokens || 0,
              totalTokens:
                (prediction.meta.billedUnits.inputTokens || 0) +
                (prediction.meta.billedUnits.outputTokens || 0),
              modelId,
            }
          : undefined,
        getDataText: () => {
          let dataText;
          try {
            dataText =
              JSON.stringify(prediction.toolCalls?.[0]?.parameters) || "";
          } catch (e) {
            logger.error(`Error getting data text from model ${modelId}: ${e}`);
            logger.error(`Response object: ${JSON.stringify(prediction)}`);
            throw e;
          }
          return dataText;
        },
      };

      return resp;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      logger.error(
        `Request to model ${modelId} failed: ${e}.\nPrompt: ${prompt}`
      );
      throw new RequestError(message);
    }
  };

  return new Model(modelId, "cohere" as ModelProvider, makeRequest, pricing);
};

// updated on 2024-04-18
const pricing = {
  commandR: {
    input: 0.5 / 1_000_000,
    output: 1.5 / 1_000_000,
    currency: "$" as const,
  },
  commandRPlus: {
    input: 3 / 1_000_000,
    output: 15 / 1_000_000,
    currency: "$" as const,
  },
};

export const commandRPlus = buildModel(
  cohere,
  "command-r-plus",
  pricing.commandRPlus
);
export const commandR = buildModel(cohere, "command-r", pricing.commandR);
