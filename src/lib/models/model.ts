import { MakeOpenAIRequest } from "./openai";
import { MakeAnthropicRequest } from "./anthropic";
import { MakeCohereRequest } from "./cohere";

export interface ModelResponse {
  type: string;
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
}
interface ToolItemParam {
  type: string;
}
interface ToolBaseParam extends ToolItemParam {
  description: string;
}
type ToolParam = ToolObjectParam | ToolArrayParam | ToolBaseParam;

export interface ModelTool {
  name: string;
  description: string;
  schema: {
    type: "object";
    properties: Record<string, ToolParam>;
    required: string[];
  };
}

export interface ModelRequestParams {
  function: ModelTool;
}

export class Model {
  id: string;
  makeRequest: MakeRequest;

  constructor(id: string, makeRequest: MakeRequest) {
    this.id = id;
    this.makeRequest = makeRequest;
  }
}
