import { OpenAIModelParams } from "./openai";
import { ModelResponse } from "../experiments";

export class Model {
  modelId: string;
  makeRequest: (prompt: string, params: ModelParams) => Promise<ModelResponse>;

  constructor(
    modelId: string,
    makeRequest: (prompt: string, params: ModelParams) => Promise<ModelResponse>
  ) {
    this.modelId = modelId;
    this.makeRequest = makeRequest;
  }
}

export type ModelParams = OpenAIModelParams;
