import { MakeOpenAIRequest } from "./openai";
import { MakeAnthropicRequest } from "./anthropic";
import { MakeCohereRequest } from "./cohere";
import { Usage } from "../experiments";
import { MakeMistralRequest } from "./mistral";
import { ModelProvider } from ".";

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
  | MakeMistralRequest;

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
  provider: ModelProvider;
  makeRequest: MakeRequest;
  pricing?: ModelPricing;

  constructor(
    id: string,
    provider: ModelProvider,
    makeRequest: MakeRequest,
    pricing?: ModelPricing
  ) {
    this.id = id;
    this.provider = provider;
    this.makeRequest = makeRequest;
    this.pricing = pricing;
  }
}
