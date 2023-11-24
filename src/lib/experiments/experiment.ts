import OpenAI from "openai";
import { Model } from "../models";
import { DatasetProfile } from "../types";
import { ValidationResult, ValidationType, combineValidations } from "../validation";
import logger from "../logger";
import fs from 'fs/promises';
import oldFs from 'fs';


class Experiment {
  name: string;
  description: string;
  genPrompt: (ds: DatasetProfile) => string;
  schema: any; // TODO
  runTrials: (this: Experiment, trials: number, ds: DatasetProfile, model: Model) => Promise<string[]>;
  validateTrial: (ds: DatasetProfile, data: string) => Promise<ValidationResult>;
  validate: (ds: DatasetProfile, data: string[]) => Promise<{ trialResults: ValidationResult[], combinedResult: AggregatedValidationResult }>;
  perform: (this: Experiment, trials: number, ds: DatasetProfile, model: Model, traceId?: number) => Promise<ExperimentData>;

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
      logger.info(`Running experiment ${this.name} ${trials} times on model ${model.modelId}.`);
      logger.debug(`Prompt: ${prompt}`);

      const results = [];
      for (let i = 0; i < trials; i++) {
        logger.info(`  trial #${i + 1} of ${trials}`)
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
    this.perform = async function(this: Experiment, trials: number, ds: DatasetProfile, model: Model, traceId?: number): Promise<ExperimentData> {
      const results = await this.runTrials(trials, ds, model);
      const { trialResults, combinedResult } = await this.validate(ds, results);

      const expData = {
        name: this.name,
        traceId: traceId ?? Date.now(),
        prompt: this.genPrompt(ds),
        schema: this.schema,
        dsId: ds.id,
        modelId: model.modelId,
        trialResults,
        combinedResult
      };

      await saveExperimentData(expData);
      return expData;
    }
  }
}

export async function saveExperimentData(data: ExperimentData) {
  const ts = data.traceId;
  const dsId = data.dsId;
  const expName = data.name;
  const modelId = data.modelId;
  const rootFolder = './results';
  const filename = `${rootFolder}/${ts}_${expName}_${dsId}_${modelId}.json`;
  const json = JSON.stringify(data, null, 2);

  logger.info(`Saving experiment ${data.name} ${data.trialResults.length} times on model ${data.modelId} to ${filename}.`);

  if (!oldFs.existsSync(rootFolder)) {
    await fs.mkdir(rootFolder);
  }

  await fs.writeFile(filename, json);
}

export interface ExperimentData {
  name: string;
  traceId: number;
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


