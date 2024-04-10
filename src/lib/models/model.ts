import { MakeOpenAIRequest, OpenAIModelResponse } from "./openai";
import { AnthropicModelResponse, MakeAnthropicRequest } from "./anthropic";
import { CohereModelResponse, MakeCohereRequest } from "./cohere";

export type ModelResponse =
  | OpenAIModelResponse
  | AnthropicModelResponse
  | CohereModelResponse;

export interface ModelRequestParams {
  function: {
    name: string;
    schema: Record<string, unknown>;
    description: string;
  };
}

export class Model {
  id: string;
  makeRequest: MakeAnthropicRequest | MakeOpenAIRequest | MakeCohereRequest;

  constructor(
    id: string,
    makeRequest: MakeAnthropicRequest | MakeOpenAIRequest | MakeCohereRequest
  ) {
    this.id = id;
    this.makeRequest = makeRequest;
  }
}
