import OpenAI from "openai";
import { Model } from "../models";
import { DatasetProfile, MeasureType } from "../types";
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
  schema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  prompts?: (Prompt | PromptGenerator)[] = [];
  runTrials: (
    this: Experiment,
    vars: ExpVars,
    trials: number
  ) => Promise<TrialsResult>;
  validateTrial: (
    ds: DatasetProfile,
    data: string
  ) => Promise<ValidationResult>;
  validate: (exp: ExperimentData) => Promise<{
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
    schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    runTrial: (
      vars: ExpVarsFixedPrompt,
      schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => Promise<ModelResponse>,
    validateTrial: (
      ds: DatasetProfile,
      data: string
    ) => Promise<ValidationResult>,
    prompts?: (Prompt | PromptGenerator)[]
  ) {
    this.name = name;
    this.description = description;
    this.schema = schema;
    this.prompts = prompts;
    this.runTrials = async function (
      this: Experiment,
      vars: ExpVars,
      trials: number
    ) {
      const prompt =
        "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
      logger.info(
        `Running experiment ${this.name} ${trials} times on model ${vars.model.id}.`
      );
      logger.debug(`Prompt (${prompt.id}): ${prompt.text}`);

      const results: string[] = [];
      for (let i = 0; i < trials; i++) {
        logger.info(`  trial #${i + 1} of ${trials}`);
        const res = await runTrial({ ...vars, prompt }, this.schema);
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
    this.validate = async function (this: Experiment, exp: ExperimentData) {
      const trialValidationResults = await Promise.all(
        exp.results.raw.map(d => this.validateTrial(exp.variables.dataset, d))
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
      const expData: ExperimentData = {
        meta: {
          name: this.name,
          traceId: traceId ?? Date.now(),
          schema: this.schema,
        },
        variables: vars,
        results: {
          raw: trialsRes.data,
        },
      };
      const { validation, aggregated } = await this.validate(expData);
      expData.results.validation = validation;
      expData.results.aggregated = aggregated;

      await saveExperimentData(expData);
      return expData;
    };
    this.performMulti = async function (
      this: Experiment,
      variables: ExpVarMatrix,
      trials: number
    ) {
      if (!variables?.prompt?.length) {
        variables.prompt = this.prompts;
      }
      const varCombs = genValueCombinations(variables);
      logger.info(
        `Preparing to run experiment ${
          this.name
        }, ${trials} times on each variable combination:\n${varCombs
          .map(vc => "\t" + JSON.stringify(getVarIds(vc)))
          .join(",\n")}.`
      );
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
  const modelId = data.variables.model.id;
  const rootFolder = "./results";
  const filename = `${rootFolder}/${ts}_${expName}_${dsId}_${modelId}.json`;
  const json = JSON.stringify(data, null, 2);

  logger.info(
    `Saving experiment ${data.meta.name} with traceId ${
      data.meta.traceId
    } to ${filename}. It ran ${
      data.results.raw.length
    } times with variables ${JSON.stringify(getVarIds(data.variables))}.`
  );

  if (!oldFs.existsSync(rootFolder)) {
    await fs.mkdir(rootFolder);
  }

  await fs.writeFile(filename, json);
}

export function getVarIds(vars: ExpVars) {
  return Object.entries(vars).map(([k, v]) => ({ [k]: v.id }));
}

export interface ExpVarMatrix {
  model: Model[];
  dataset: DatasetProfile[];
  prompt?: (Prompt | PromptGenerator)[];
}

export type ExpVarsFixedPrompt = Omit<ExpVars, "prompt"> & { prompt: Prompt };

export interface ExpVars {
  dataset: DatasetProfile;
  model: Model;
  prompt: Prompt | PromptGenerator;
}

export function genValueCombinations(vars: ExpVarMatrix): ExpVars[] {
  const combs = genVCHelper(vars);
  return combs as ExpVars[];
}

function genVCHelper(vars: ExpVarMatrix): Partial<ExpVars>[] {
  const key = Object.keys(vars)?.shift();
  if (!key) {
    return [];
  }
  const values = vars[key as keyof ExpVarMatrix]!;
  const rest = { ...vars };
  delete rest[key as keyof ExpVarMatrix];

  const combs = genValueCombinations(rest);
  const res = [] as Partial<ExpVars>[];
  for (const v of values) {
    if (!combs.length) {
      res.push({ [key]: v });
      continue;
    }
    for (const c of combs) {
      res.push({ [key]: v, ...c });
    }
  }
  return res;
}

export interface PromptGenerator {
  id: string;
  types?: MeasureType[];
  generate: (vars: Omit<ExpVars, "prompt">) => Prompt;
}

export interface Prompt {
  id: string;
  types: MeasureType[];
  pairs?: [string, string][];
  text: string;
}

export interface ExpMeta {
  name: string;
  traceId: number;
  schema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ExpResults {
  raw: string[];
  validation?: ValidationResult[];
  aggregated?: AggregatedValidationResult;
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
