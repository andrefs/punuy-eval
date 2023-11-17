import { OpenAIModelParams } from "./openai";
import { ExperimentResult } from "../experiments";

export class Model {
  modelId: string;
  makeRequest: (prompt: string, params: ModelParams) => Promise<ExperimentResult>;

  constructor(
    modelId: string,
    makeRequest: (prompt: string, params: ModelParams) => Promise<ExperimentResult>
  ) {
    this.modelId = modelId;
    this.makeRequest = makeRequest;
  }
}

export type ModelParams = OpenAIModelParams;

