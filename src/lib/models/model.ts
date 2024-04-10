import { MakeOpenAIRequest, OpenAIModelResponse } from "./openai";
import { AnthropicModelResponse, MakeAnthropicRequest } from "./anthropic";

export type ModelResponse = OpenAIModelResponse | AnthropicModelResponse;
export interface ModelRequestParams {
  function: {
    name: string;
    schema: Record<string, unknown>;
    description: string;
  };
}

export class Model {
  id: string;
  makeRequest: MakeAnthropicRequest | MakeOpenAIRequest;

  constructor(
    id: string,
    makeRequest: MakeAnthropicRequest | MakeOpenAIRequest
  ) {
    this.id = id;
    this.makeRequest = makeRequest;
  }
}
