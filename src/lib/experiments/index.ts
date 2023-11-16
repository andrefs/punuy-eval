import OpenAI from "openai";
import { Model } from "../models";
import { DatasetProfile } from "../types";
import { ValidationResult } from "../validation";

export * from './datasetAwareness';


class Experiment {
  name: string;
  description: string;
  genPrompt: (ds: DatasetProfile) => string;
  schema: any; // TODO
  run: (this: Experiment, ds: DatasetProfile, model: Model) => Promise<ExperimentResult>;
  validate: (ds: DatasetProfile, result: ExperimentResult) => Promise<ValidationResult>;

  constructor(
    name: string, description: string,
    genPrompt: (ds: DatasetProfile) => string,
    schema: any,
    run: (prompt: string, schema: any, ds: DatasetProfile, model: Model) => Promise<ExperimentResult>,
    validate: (ds: DatasetProfile, result: ExperimentResult) => Promise<ValidationResult>,
  ) {
    this.name = name;
    this.description = description;
    this.genPrompt = genPrompt;
    this.schema = schema;
    this.run = async function(this: Experiment, ds: DatasetProfile, model: Model) {
      const prompt = this.genPrompt(ds);
      console.warn(`Running experiment ${this.name} on model (${model.modelId}).`);
      console.warn(`Prompt: ${prompt}`);
      return run(prompt, this.schema, ds, model);
    }
    this.validate = validate;
  }
}

export type ExperimentResult = OpenAI.Chat.Completions.ChatCompletion;

export default Experiment;

