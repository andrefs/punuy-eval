import { MakeOpenAIRequest } from "./openai";
import { MakeAnthropicRequest } from "./anthropic";
import { MakeCohereRequest } from "./cohere";
import OpenAI from "openai";

export interface ModelPricing {
  prompt: number;
  completion: number;
}
export interface ModelResponse {
  type: string;
  usage?: OpenAI.Completions.CompletionUsage;
  dataObj: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  getDataText: () => string;
}

type MakeRequest = MakeAnthropicRequest | MakeOpenAIRequest | MakeCohereRequest;

interface ToolObjectParam extends ToolBaseParam {
  type: "object";
  properties: Record<string, ToolParam>;
  required: string[];
}
interface ToolArrayParam extends ToolBaseParam {
  type: "array";
  items: ToolParam | ToolItemParam;
  minItems?: number;
  maxItems?: number;
}
interface ToolItemParam {
  type: string;
}
interface ToolBaseParam extends ToolItemParam {
  description: string;
}
type ToolParam = ToolObjectParam | ToolArrayParam | ToolBaseParam;

export interface ToolSchema {
  type: "object";
  properties: Record<string, ToolParam>;
  required: string[];
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
  makeRequest: MakeRequest;
  pricing?: ModelPricing;

  constructor(id: string, makeRequest: MakeRequest, pricing?: ModelPricing) {
    this.id = id;
    this.makeRequest = makeRequest;
    this.pricing = pricing;
  }
}
