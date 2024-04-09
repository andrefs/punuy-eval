import { OpenAIModelParams } from "./openai";
import { ModelResponse } from "experiments";

export class Model {
  id: string;
  makeRequest: (prompt: string, params: ModelParams) => Promise<ModelResponse>;

  constructor(
    id: string,
    makeRequest: (prompt: string, params: ModelParams) => Promise<ModelResponse>
  ) {
    this.id = id;
    this.makeRequest = makeRequest;
  }
}

export type ModelParams = OpenAIModelParams;
