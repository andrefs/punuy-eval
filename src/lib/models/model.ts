import { ExperimentResult } from "../experiments";

export class Model {
  modelId: string;
  makeRequest: (prompt: string, params: any) => Promise<ExperimentResult>;

  constructor(
    modelId: string,
    makeRequest: (prompt: string, params: any) => Promise<ExperimentResult>
  ) {
    this.modelId = modelId;
    this.makeRequest = makeRequest;
  }
}
