import { MakeOpenAIRequest } from "./openai";
import { MakeAnthropicRequest } from "./anthropic";
import { MakeCohereRequest } from "./cohere";

export interface ModelResponse {
  type: string;
  dataObj: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  getDataText: () => string;
}

type MakeRequest = MakeAnthropicRequest | MakeOpenAIRequest | MakeCohereRequest;

export interface ModelRequestParams {
  function: {
    name: string;
    schema: Record<string, unknown>;
    description: string;
  };
}

export class Model {
  id: string;
  makeRequest: MakeRequest;

  constructor(id: string, makeRequest: MakeRequest) {
    this.id = id;
    this.makeRequest = makeRequest;
  }
}
