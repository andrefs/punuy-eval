import { OpenAIModelParams } from "./openai";
import { TrialResult } from "../experiments";

export class Model {
  modelId: string;
  makeRequest: (prompt: string, params: ModelParams) => Promise<TrialResult>;

  constructor(
    modelId: string,
    makeRequest: (prompt: string, params: ModelParams) => Promise<TrialResult>
  ) {
    this.modelId = modelId;
    this.makeRequest = makeRequest;
  }
}

export type ModelParams = OpenAIModelParams;

