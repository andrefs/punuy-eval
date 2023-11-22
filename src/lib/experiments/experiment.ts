import OpenAI from "openai";
import { Model } from "../models";
import { DatasetProfile } from "../types";
import { ValidationResult, ValidationType } from "../validation";
import logger from "../logger";


class Experiment {
  name: string;
  description: string;
  genPrompt: (ds: DatasetProfile) => string;
  schema: any; // TODO
  runTrials: (this: Experiment, trials: number, ds: DatasetProfile, model: Model) => Promise<string[]>;
  validate: (ds: DatasetProfile, data: string[]) => Promise<ValidationResult>;
  perform: (this: Experiment, trials: number, ds: DatasetProfile, model: Model) => Promise<ValidationResult>;

  constructor(
    name: string,
    description: string,
    genPrompt: (ds: DatasetProfile) => string,
    schema: any,
    runTrial: (prompt: string, schema: any, ds: DatasetProfile, model: Model) => Promise<TrialResult>,
    validate: (ds: DatasetProfile, data: string[]) => Promise<ValidationResult>,
  ) {
    this.name = name;
    this.description = description;
    this.genPrompt = genPrompt;
    this.schema = schema;
    this.runTrials = async function(this: Experiment, trials: number, ds: DatasetProfile, model: Model) {
      const prompt = this.genPrompt(ds);
      logger.info(`Running experiment ${this.name} on model (${model.modelId}).`);
      logger.debug(`Prompt: ${prompt}`);

      const results = [];
      for (let i = 0; i < trials; i++) {
        const res = await runTrial(prompt, this.schema, ds, model);
        results.push(res.type === 'openai' ? res.data.choices[0].message.tool_calls?.[0].function.arguments || '' : '');
      }
      return results;
    }
    this.validate = validate;
    this.perform = async function(this: Experiment, trials: number, ds: DatasetProfile, model: Model) {
      const results = await this.runTrials(trials, ds, model);
      return this.validate(ds, results);
    }
  }
}

export interface ExperimentData {
  timestamp: number;
  prompt: string;
  schema: any;
  dsId: string;
  modelId: string;
  trials: [
    rawData: string,
    data: any,
    result: TrialResult
  ],
  result: ValidationResult,
}

export interface ValidationResult {
  avg: number;
  resultTypes: {
    [key in ValidationType]: number;
  }
}

export type TrialResult = {
  type: 'openai';
  data: OpenAI.Chat.Completions.ChatCompletion;
}

export default Experiment;


