import { Model, ModelResponse, ModelPricing, ModelTool } from "./model";
import logger from "../logger";
import "dotenv/config";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";
import {
  FunctionCallingMode,
  GenerateContentCandidate,
  GenerateContentRequest,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

const configuration = {
  apiKey: process.env.NODE_ENV === "test" ? "test" : process.env.GOOGLE_API_KEY,
};

export interface VertexModelResponse extends ModelResponse {
  type: "google";
  usage?: Usage;
  dataObj: GenerateContentCandidate;
}

export type MakeVertexRequest = (
  prompt: string,
  params: ModelTool
) => Promise<VertexModelResponse>;

if (!configuration.apiKey) {
  logger.error(
    "Google API key not configured, please follow instructions in README.md"
  );
} else {
  logger.info(
    `Google API key loaded from environment variable: ${configuration.apiKey.slice(
      0,
      5
    )}...`
  );
}

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];
const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

const buildModel = (
  genAI: GoogleGenerativeAI,
  modelId: ModelId,
  pricing?: ModelPricing
) => {
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 1,
      topP: 1,
    },
    safetySettings,
  });

  const makeRequest = async function (prompt: string, toolParams: ModelTool) {
    const req: GenerateContentRequest = {
      contents: [
        {
          role: "model" as const,
          parts: [{ text: "You are a helpful assistant." }],
        },
        {
          role: "user" as const,
          parts: [{ text: prompt }],
        },
      ],
      tools: [
        {
          functionDeclarations: [
            {
              name: toolParams.name,
              description: toolParams.description,
              parameters: toolParams.schema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY" as FunctionCallingMode,
          allowedFunctionNames: [toolParams.name],
        },
      },
    };

    try {
      const result = await model.generateContent(req);
      const res: VertexModelResponse = {
        type: "google" as const,
        dataObj: result.response.candidates![0],
        usage: result.response.usageMetadata
          ? {
              inputTokens: result.response.usageMetadata.promptTokenCount!,
              outputTokens: result.response.usageMetadata.candidatesTokenCount!,
              totalTokens: result.response.usageMetadata.totalTokenCount!,
              modelId,
            }
          : undefined,
        getDataText: () => {
          let dataText;
          try {
            dataText =
              result.response.candidates?.[0].content.parts?.[0].text || "";
          } catch (e) {
            logger.error(`Error getting data text from model ${modelId}: ${e}`);
            logger.error(`Response object: ${JSON.stringify(result)}`);
            throw e;
          }
          return dataText;
        },
      };
      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      logger.error(
        `Request to model ${modelId} failed: ${e}.\nPrompt: ${prompt}`
      );
      throw new RequestError(message);
    }
  };

  return new Model(modelId, "google" as ModelProvider, makeRequest, pricing);
};

// updated at 2024-04-18
const pricing = {};

export const gemini10pro = buildModel(genAI, "gemini-1.0-pro");
