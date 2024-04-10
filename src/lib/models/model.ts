import {
  MakeOpenAIRequest,
  OpenAIModelParams,
  OpenAIModelResponse,
} from "./openai";
import {
  AnthropicModelParams,
  AnthropicModelResponse,
  MakeAnthropicRequest,
} from "./anthropic";

export type ModelResponse = OpenAIModelResponse | AnthropicModelResponse;

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

export type ModelParams = OpenAIModelParams | AnthropicModelParams;
