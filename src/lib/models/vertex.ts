import { Model, ModelResponse, ModelPricing, ModelTool } from "./model";
import logger from "../logger";
import "dotenv/config";
import { Usage } from "../experiments";
import { RequestError } from "../evaluation";
import { ModelId, ModelProvider } from ".";
import {
  GenerateContentCandidate,
  GenerateContentRequest,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from "@google-cloud/vertexai";

const configuration = {
  project:
    process.env.NODE_ENV === "test" ? "test" : process.env.VERTEX_PROJECT!,
  location:
    process.env.NODE_ENV === "test" ? "test" : process.env.VERTEX_LOCATION!,
};

export interface VertexModelResponse extends ModelResponse {
  type: "vertexai";
  usage?: Usage;
  dataObj: GenerateContentCandidate;
}

export type MakeVertexRequest = (
  prompt: string,
  params: ModelTool
) => Promise<VertexModelResponse>;

if (!configuration.project) {
  logger.error(
    "Vertex project not configured, please follow instructions in README.md"
  );
} else {
  logger.info(
    `Vertex project loaded from environment variable: ${configuration.project}`
  );
}

const safetSettings = [
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
const vertexAI = new VertexAI(configuration);

const buildModel = (
  vertexAI: VertexAI,
  modelId: ModelId,
  pricing?: ModelPricing
) => {
  const genModel = vertexAI.preview.getGenerativeModel({
    model: modelId,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 1,
      topP: 1,
    },
    safetySettings: safetSettings,
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
    };

    try {
      const result = await genModel.generateContent(req);
      const res: VertexModelResponse = {
        type: "vertexai" as const,
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

  return new Model(modelId, "vertexai" as ModelProvider, makeRequest, pricing);
};

// updated at 2024-04-18
const pricing = {
  gpt35turbo: {
    input: 0.5 / 1_000_000,
    output: 1.5 / 1_000_000,
    currency: "$" as const,
  },
  gpt4: {
    input: 30 / 1_000_000,
    output: 60 / 1_000_000,
    currency: "$" as const,
  },
  gpt4turbo: {
    input: 10 / 1_000_000,
    output: 30 / 1_000_000,
    currency: "$" as const,
  },
};

export const gemini10pro = buildModel(
  vertexAI,
  "gemini-1.0-pro",
  pricing.gpt35turbo
);
