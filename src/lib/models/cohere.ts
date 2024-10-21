import { Cohere, CohereClientV2 } from "cohere-ai";
import {
  Model,
  ModelTool,
  ModelResponse,
  ModelPricing,
  toolParamToGoogleFDSchema,
} from "./model";
import logger from "../logger";
import "dotenv/config";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";
import { V2ChatRequest } from "cohere-ai/api";

const configuration = {
  token: process.env.NODE_ENV === "test" ? "test" : process.env.COHERE_API_KEY,
};

export interface CohereModelResponse extends ModelResponse {
  type: "cohere";
  usage?: Usage;
  dataObj: Cohere.ChatResponse;
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
const cohere = new CohereClientV2(configuration);

const buildModel = (
  cohere: CohereClientV2,
  modelId: ModelId,
  pricing?: ModelPricing
): Model => {
  const makeRequest = async function (
    prompt: string,
    toolParams: ModelTool
  ): Promise<CohereModelResponse> {
    const jsonSchema = toolParamToGoogleFDSchema(toolParams.schema);
    const req: V2ChatRequest = {
      model: modelId,
      messages: [
        { role: "system" as const, content: "You are a helpful assistant." },
        {
          role: "user",
          content: prompt,
        },
      ],
      responseFormat: {
        type: "json_object",
        jsonSchema,
      },
    };
    try {
      const prediction = await cohere.chat(req);

      const resp: CohereModelResponse = {
        type: "cohere" as const,
        dataObj: prediction,
        usage: prediction.usage?.billedUnits
          ? {
            inputTokens: prediction.usage.billedUnits.inputTokens || 0,
            outputTokens: prediction.usage.billedUnits.outputTokens || 0,
            totalTokens:
              (prediction.usage.billedUnits.inputTokens || 0) +
              (prediction.usage.billedUnits.outputTokens || 0),
            modelId,
          }
          : undefined,
        getDataText: () => {
          let dataText;
          try {
            dataText = prediction.message?.content?.[0].text || "";
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
        `Request to model ${modelId} failed: ${e}\nRequest object: ${JSON.stringify(req, null, 2)}\nPrompt: ${prompt}`
      );
      throw new RequestError(message);
    }
  };

  return new Model(modelId, "cohere" as ModelProvider, makeRequest, pricing);
};

// https://cohere.com/pricing
// updated on 2024-10-03
const pricing = {
  commandR_032024: {
    input: 0.15 / 1_000_000,
    output: 0.6 / 1_000_000,
    currency: "$" as const,
  },
  commandR_082024: {
    input: 0.15 / 1_000_000,
    output: 0.6 / 1_000_000,
    currency: "$" as const,
  },
  commandRPlus_042024: {
    input: 2.5 / 1_000_000,
    output: 10 / 1_000_000,
    currency: "$" as const,
  },
  commandRPlus_082024: {
    input: 2.5 / 1_000_000,
    output: 10 / 1_000_000,
    currency: "$" as const,
  },
};

// https://docs.cohere.com/v2/docs/models
export const commandRPlus_042024 = buildModel(
  cohere,
  "command-r-plus-04-2024",
  pricing.commandRPlus_042024
);
export const commandRPlus_082024 = buildModel(
  cohere,
  "command-r-plus-08-2024",
  pricing.commandRPlus_082024
);
export const commandR_032024 = buildModel(
  cohere,
  "command-r-03-2024",
  pricing.commandR_032024
);
export const commandR_082024 = buildModel(
  cohere,
  "command-r-08-2024",
  pricing.commandR_082024
);
