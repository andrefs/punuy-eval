import { MakeOpenAIRequest, OpenAIModelResponse } from "./openai";
import { AnthropicModelResponse, MakeAnthropicRequest } from "./anthropic";
import { CohereModelResponse, MakeCohereRequest } from "./cohere";

export type ModelResponse =
  | OpenAIModelResponse
  | AnthropicModelResponse
  | CohereModelResponse;

type MakeRequest =
  | MakeAnthropicRequest
  | MakeOpenAIRequest
  | MakeCohereRequest;

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
