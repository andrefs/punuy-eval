import OpenAI from "openai";
import { Model } from "../models";
import { DatasetProfile } from "../types";
import { ValidationResult, ValidationType, combineValidations } from "../validation";
import logger from "../logger";


class Experiment {
  name: string;
  description: string;
  genPrompt: (ds: DatasetProfile) => string;
  schema: any; // TODO
  runTrials: (this: Experiment, trials: number, ds: DatasetProfile, model: Model) => Promise<string[]>;
  validateTrial: (ds: DatasetProfile, data: string) => Promise<ValidationResult>;
  validate: (ds: DatasetProfile, data: string[]) => Promise<{ trialResults: ValidationResult[], combinedResult: AggregatedValidationResult }>;
  perform: (this: Experiment, trials: number, ds: DatasetProfile, model: Model) => Promise<ExperimentData>;

  constructor(
    name: string,
    description: string,
    genPrompt: (ds: DatasetProfile) => string,
    schema: any,
    runTrial: (prompt: string, schema: any, ds: DatasetProfile, model: Model) => Promise<TrialResult>,
    validateTrial: (ds: DatasetProfile, data: string) => Promise<ValidationResult>,
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
    this.validateTrial = validateTrial;
    this.validate = async function(this: Experiment, ds: DatasetProfile, data: string[]) {
      const trialResults = await Promise.all(data.map((d) => this.validateTrial(ds, d)));
      return { trialResults, combinedResult: await combineValidations(trialResults) };
    };
    this.perform = async function(this: Experiment, trials: number, ds: DatasetProfile, model: Model): Promise<ExperimentData> {
      const results = await this.runTrials(trials, ds, model);
      const { trialResults, combinedResult } = await this.validate(ds, results);

      return {
        timestamp: Date.now(),
        prompt: this.genPrompt(ds),
        schema: this.schema,
        dsId: ds.id,
        modelId: model.modelId,
        trialResults,
        combinedResult
      }
    }
  }
}

export interface ExperimentData {
  timestamp: number;
  prompt: string
  schema: any;
  dsId: string;
  modelId: string;
  trialResults: ValidationResult[],
  combinedResult: AggregatedValidationResult,
}

export interface AggregatedValidationResult {
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


