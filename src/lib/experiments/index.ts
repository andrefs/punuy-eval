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
    run: (this: Experiment, ds: DatasetProfile, model: Model) => Promise<ExperimentResult>,
    validate: (ds: DatasetProfile, result: ExperimentResult) => Promise<ValidationResult>,
  ) {
    this.name = name;
    this.description = description;
    this.genPrompt = genPrompt;
    this.schema = schema;
    this.run = run;
    this.validate = validate;
  }
}

export type ExperimentResult = OpenAI.Chat.Completions.ChatCompletion;

export default Experiment;

