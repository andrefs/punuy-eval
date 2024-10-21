import { MakeOpenAIRequest } from "./openai";
import { MakeAnthropicRequest } from "./anthropic";
import { MakeCohereRequest } from "./cohere";
import { Usage } from "../experiments";
import { MakeMistralRequest } from "./mistral";
import { MakeGoogleRequest, ModelProvider } from ".";
import {
  FunctionDeclaration,
  FunctionDeclarationSchema,
  SchemaType,
} from "@google/generative-ai";

export interface ModelPricing {
  input: number;
  output: number;
  currency: "$" | "€" | "£";
}
export interface ModelResponse {
  type: string;
  usage?: Usage;
  dataObj: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  /**
   * Get the text data from the response object
   * @returns {string} The text data
   * @throws If the text data cannot be extracted
   */
  getDataText: () => string;
}

type MakeRequest =
  | MakeAnthropicRequest
  | MakeOpenAIRequest
  | MakeCohereRequest
  | MakeGoogleRequest
  | MakeMistralRequest;

export interface ToolSchema {
  type: "object";
  properties: Record<string, ToolParam>;
  required: string[];
}

interface ToolObjectParam extends ToolBaseParam {
  type: "object";
  properties: Record<string, ToolParam>;
  required: string[];
}
export interface ToolArrayParam extends ToolBaseParam {
  type: "array";
  items: ToolParam | ToolItemParam;
  minItems?: number;
  maxItems?: number;
}

export function toolParamToGoogleFDSchema(param: ToolParam | ToolItemParam) {
  switch (param.type) {
    case "object": {
      return toolObjectParamToGoogleFDSchema(param as ToolObjectParam);
    }
    case "array": {
      return toolArrayParamToGoogleFDSchemaProperty(param as ToolArrayParam);
    }
    default: {
      return "description" in param
        ? toolBaseParamToGoogleFDSchema(param)
        : toolItemParamToGoogleFDSchema();
    }
  }
}

function toolObjectParamToGoogleFDSchema(param: ToolObjectParam): {
  type: SchemaType;
  properties: Record<string, FunctionDeclarationSchema>;
  required: string[];
} {
  const properties: Record<string, FunctionDeclarationSchema> = {};
  for (const [key, value] of Object.entries(param.properties)) {
    properties[key] = toolParamToGoogleFDSchema(value);
  }
  return {
    type: SchemaType.OBJECT,
    properties,
    required: param.required,
  };
}

function toolArrayParamToGoogleFDSchemaProperty(param: ToolArrayParam): {
  type: SchemaType;
  items: FunctionDeclarationSchema;
  description: string;
  properties: Record<string, FunctionDeclarationSchema>;
} {
  return {
    type: SchemaType.ARRAY,
    items: toolParamToGoogleFDSchema(param.items),
    description: param.description,
    properties: {},
  };
}

export interface ToolItemParam {
  type: string;
}

interface ToolBaseParam extends ToolItemParam {
  description: string;
}
function toolItemParamToGoogleFDSchema() {
  return {
    type: SchemaType.STRING,
    properties: {},
  };
}

function toolBaseParamToGoogleFDSchema(param: ToolBaseParam | ToolItemParam) {
  return {
    type: SchemaType.STRING,
    description: "description" in param ? param.description : "",
    properties: {},
  };
}

export type ToolParam = ToolObjectParam | ToolArrayParam | ToolBaseParam;

export function modelToolToGoogleFunctionDecl(
  tool: ModelTool
): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: toolParamToGoogleFDSchema(tool.schema),
  };
}

export interface ModelTool {
  name: string;
  description: string;
  schema: ToolSchema;
}

export interface ModelRequestParams {
  function: ModelTool;
}

export class Model {
  id: string;
  provider: ModelProvider;
  makeRequest: MakeRequest;
  pricing?: ModelPricing;
  reqDelayMs?: number;

  constructor(
    id: string,
    provider: ModelProvider,
    makeRequest: MakeRequest,
    options: {
      pricing?: ModelPricing;
      reqDelayMs?: number;
    } = {}
  ) {
    this.id = id;
    this.provider = provider;
    this.makeRequest = makeRequest;
    if (options.pricing) {
      this.pricing = options.pricing;
    }
    if (options.reqDelayMs) {
      this.reqDelayMs = options.reqDelayMs;
    }
  }
}
