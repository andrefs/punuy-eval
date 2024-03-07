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
    vars: ExpVars,
    trials: number
  ) => Promise<TrialsResult>;
  validateTrial: (
    ds: DatasetProfile,
    data: string
  ) => Promise<ValidationResult>;
  validate: (tr: TrialsResult) => Promise<{
    validation: ValidationResult[];
    aggregated: AggregatedValidationResult;
  }>;
  perform: (
    this: Experiment,
    vars: ExpVars,
    trials: number,
    traceId?: number
  ) => Promise<ExperimentData>;
  performMulti: (
    this: Experiment,
    variables: ExpVarMatrix,
    trials: number
  ) => Promise<ExperimentData[]>;

  constructor(
    name: string,
    description: string,
    genPrompt: (ds: DatasetProfile) => string,
    schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    runTrial: (
      vars: ExpVars,
      schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
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
      vars: ExpVars,
      trials: number
    ) {
      const prompt = vars.prompt ?? this.genPrompt(vars.dataset);
      logger.info(
        `Running experiment ${this.name} ${trials} times on model ${vars.model.modelId}.`
      );
      logger.debug(`Prompt: ${prompt}`);

      const results: string[] = [];
      for (let i = 0; i < trials; i++) {
        logger.info(`  trial #${i + 1} of ${trials}`);
        const res = await runTrial(vars, this.schema);
        results.push(
          res.type === "openai"
            ? res.data.choices[0].message.tool_calls?.[0].function.arguments ||
                ""
            : ""
        );
      }
      return {
        variables: vars,
        data: results,
      };
    };
    this.validateTrial = validateTrial;
    this.validate = async function (this: Experiment, tr: TrialsResult) {
      const trialValidationResults = await Promise.all(
        tr.data.map(d => this.validateTrial(tr.variables.dataset, d))
      );
      return {
        validation: trialValidationResults,
        aggregated: await combineValidations(trialValidationResults),
      };
    };
    this.perform = async function (
      this: Experiment,
      vars: ExpVars,
      trials: number,
      traceId?: number
    ): Promise<ExperimentData> {
      const trialsRes = await this.runTrials(vars, trials);
      const { validation, aggregated } = await this.validate(trialsRes);

      const expData: ExperimentData = {
        meta: {
          name: this.name,
          traceId: traceId ?? Date.now(),
          schema: this.schema,
        },
        variables: vars,
        results: {
          raw: trialsRes.data,
          validation,
          aggregated,
        },
      };

      await saveExperimentData(expData);
      return expData;
    };
    this.performMulti = async function (
      this: Experiment,
      variables: ExpVarMatrix,
      trials: number
    ) {
      const varCombs = genValueCombinations(variables);
      const res = [] as ExperimentData[];
      for (const v of varCombs) {
        res.push(await this.perform(v, trials, Date.now()));
      }
      return res;
    };
  }
}

export async function saveExperimentData(data: ExperimentData) {
  const ts = data.meta.traceId;
  const dsId = data.variables.dataset.id;
  const expName = data.meta.name;
  const modelId = data.variables.model.modelId;
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

export interface ExpVarMatrix {
  model: Model[];
  dataset: DatasetProfile[];
  prompt?: string[];
  promptId?: string[];
}

export interface ExpVars {
  dataset: DatasetProfile;
  model: Model;
  prompt?: string;
  promptId?: string;
}

function genValueCombinations(vars: ExpVarMatrix): ExpVars[] {
  const key = Object.keys(vars)?.shift();
  if (!key) {
    return [];
  }
  const values = vars[key as keyof ExpVarMatrix]!;
  const rest = { ...vars };
  delete rest[key as keyof ExpVarMatrix];

  const combs = genValueCombinations(rest);
  const res = [] as ExpVars[];
  for (const v of values) {
    for (const c of combs) {
      res.push({ [key]: v, ...c });
    }
  }
  return res;
}

export interface ExpMeta {
  name: string;
  traceId: number;
  schema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ExpResults {
  raw: string[];
  validation: ValidationResult[];
  aggregated: AggregatedValidationResult;
}

export interface ExperimentData {
  variables: ExpVars;
  meta: ExpMeta;
  results: ExpResults;
}

export interface TrialsResult {
  variables: ExpVars;
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
