import OpenAI from "openai";
import { Model } from "../models";
import { DatasetProfile } from "../types";
import {
  ValidationResult,
  ValidationType,
  combineValidations,
} from "../validation";
import logger from "../logger";
import fs from "fs/promises";
import oldFs from "fs";

class Experiment {
  name: string;
  description: string;
  genPrompt: (ds: DatasetProfile) => string;
  schema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  runTrials: (
    this: Experiment,
    trials: number,
    ds: DatasetProfile,
    model: Model
  ) => Promise<TrialsResult>;
  validateTrial: (
    ds: DatasetProfile,
    data: string
  ) => Promise<ValidationResult>;
  validate: (
    ds: DatasetProfile,
    tr: TrialsResult
  ) => Promise<{
    validation: ValidationResult[];
    aggregated: AggregatedValidationResult;
  }>;
  perform: (
    this: Experiment,
    trials: number,
    ds: DatasetProfile,
    model: Model,
    traceId?: number
  ) => Promise<ExperimentData>;

  constructor(
    name: string,
    description: string,
    genPrompt: (ds: DatasetProfile) => string,
    schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    runTrial: (
      prompt: string,
      schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ds: DatasetProfile,
      model: Model
    ) => Promise<ModelResponse>,
    validateTrial: (
      ds: DatasetProfile,
      data: string
    ) => Promise<ValidationResult>
  ) {
    this.name = name;
    this.description = description;
    this.genPrompt = genPrompt;
    this.schema = schema;
    this.runTrials = async function (
      this: Experiment,
      trials: number,
      ds: DatasetProfile,
      model: Model
    ) {
      const prompt = this.genPrompt(ds);
      logger.info(
        `Running experiment ${this.name} ${trials} times on model ${model.modelId}.`
      );
      logger.debug(`Prompt: ${prompt}`);

      const results: string[] = [];
      for (let i = 0; i < trials; i++) {
        logger.info(`  trial #${i + 1} of ${trials}`);
        const res = await runTrial(prompt, this.schema, ds, model);
        results.push(
          res.type === "openai"
            ? res.data.choices[0].message.tool_calls?.[0].function.arguments ||
                ""
            : ""
        );
      }
      return {
        variables: {
          dsId: ds.id,
          modelId: model.modelId,
          prompt: prompt,
        },
        data: results,
      };
    };
    this.validateTrial = validateTrial;
    this.validate = async function (
      this: Experiment,
      ds: DatasetProfile,
      tr: TrialsResult
    ) {
      const trialValidationResults = await Promise.all(
        tr.data.map(d => this.validateTrial(ds, d))
      );
      return {
        validation: trialValidationResults,
        aggregated: await combineValidations(trialValidationResults),
      };
    };
    this.perform = async function (
      this: Experiment,
      trials: number,
      ds: DatasetProfile,
      model: Model,
      traceId?: number
    ): Promise<ExperimentData> {
      const trialsRes = await this.runTrials(trials, ds, model);
      const { validation, aggregated } = await this.validate(ds, trialsRes);

      const expData: ExperimentData = {
        meta: {
          name: this.name,
          traceId: traceId ?? Date.now(),
          schema: this.schema,
        },
        variables: {
          prompt: this.genPrompt(ds),
          dsId: ds.id,
          modelId: model.modelId,
        },
        results: {
          raw: trialsRes.data,
          validation,
          aggregated,
        },
      };

      await saveExperimentData(expData);
      return expData;
    };
  }
}

export async function saveExperimentData(data: ExperimentData) {
  const ts = data.meta.traceId;
  const dsId = data.variables.dsId;
  const expName = data.meta.name;
  const modelId = data.variables.modelId;
  const rootFolder = "./results";
  const filename = `${rootFolder}/${ts}_${expName}_${dsId}_${modelId}.json`;
  const json = JSON.stringify(data, null, 2);

  logger.info(
    `Saving experiment ${data.meta.name} which ran ${
      data.results.raw.length
    } times on ${JSON.stringify(data.variables)} with traceId ${
      data.meta.traceId
    } to ${filename}.`
  );

  if (!oldFs.existsSync(rootFolder)) {
    await fs.mkdir(rootFolder);
  }

  await fs.writeFile(filename, json);
}

export interface ExperimentVariables {
  dsId: string;
  modelId: string;
  prompt?: string;
  promptId?: string;
}

export interface ExperimentMeta {
  name: string;
  traceId: number;
  schema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ExperimentResults {
  raw: string[];
  validation: ValidationResult[];
  aggregated: AggregatedValidationResult;
}

export interface ExperimentData {
  variables: ExperimentVariables;
  meta: ExperimentMeta;
  results: ExperimentResults;
}

export interface TrialsResult {
  variables: ExperimentVariables;
  data: string[];
}

export interface AggregatedValidationResult {
  avg: number;
  resultTypes: {
    [key in ValidationType]: number;
  };
}

export type ModelResponse = {
  type: "openai";
  data: OpenAI.Chat.Completions.ChatCompletion;
};

export default Experiment;
