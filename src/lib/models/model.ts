import { MakeOpenAIRequest, OpenAIModelResponse } from "./openai";
import { AnthropicModelResponse, MakeAnthropicRequest } from "./anthropic";
import { CohereModelResponse, MakeCohereRequest } from "./cohere";
import { MakeMistralRequest, MistralModelResponse } from "./mistral";

export type ModelResponse =
  | OpenAIModelResponse
  | AnthropicModelResponse
  | CohereModelResponse
  | MistralModelResponse;

type MakeRequest =
  | MakeAnthropicRequest
  | MakeOpenAIRequest
  | MakeCohereRequest
  | MakeMistralRequest;

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
