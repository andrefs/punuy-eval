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
      console.warn("XXXXXXXXXXX 1");
      if (!variables?.prompt?.length) {
        variables.prompt = this.prompts;
      }
      console.warn("XXXXXXXXXXX 2", JSON.stringify(variables, null, 2));
      const varCombs = genValueCombinations(variables);
      console.warn("XXXXXXXXXXX 3", { varCombs });
      const res = [] as ExperimentData[];
      for (const v of varCombs) {
        console.warn("XXXXXXXXXXX 4", { v });
        res.push(await this.perform(v, trials, Date.now()));
      }
      console.warn("XXXXXXXXXXX 5", { res });
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
    `Saving experiment ${data.meta.name} which ran ${
      data.results.raw.length
    } times on ${JSON.stringify(getVarIds(data.variables))} with traceId ${
      data.meta.traceId
    } to ${filename}.`
  );

  if (!oldFs.existsSync(rootFolder)) {
    await fs.mkdir(rootFolder);
  }

  await fs.writeFile(filename, json);
}

function getVarIds(vars: ExpVars) {
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

function genValueCombinations(vars: ExpVarMatrix): ExpVars[] {
  return genVCHelper(vars) as ExpVars[];
}

function genVCHelper(vars: ExpVarMatrix): Partial<ExpVars>[] {
  console.warn("XXXXXXXXXXX 2.1", { vars });
  const key = Object.keys(vars)?.shift();
  console.warn("XXXXXXXXXXX 2.2", { key });
  if (!key) {
    return [];
  }
  console.warn("XXXXXXXXXXX 2.3");
  const values = vars[key as keyof ExpVarMatrix]!;
  const rest = { ...vars };
  delete rest[key as keyof ExpVarMatrix];
  console.warn("XXXXXXXXXXX 2.4", { values, rest });

  const combs = genValueCombinations(rest);
  console.warn("XXXXXXXXXXX 2.5", { combs });
  const res = [] as Partial<ExpVars>[];
  for (const v of values) {
    console.warn("XXXXXXXXXXX 2.6", { key, v });
    if (!combs.length) {
      res.push({ [key]: v });
      continue;
    }
    for (const c of combs) {
      console.warn("XXXXXXXXXXX 2.7", { c });
      res.push({ [key]: v, ...c });
    }
  }
  return res;
}

export interface PromptGenerator {
  id: string;
  generate: (vars: ExpVars) => Prompt;
}

export interface Prompt {
  id: string;
  types: MeasureType[];
  text: string;
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
