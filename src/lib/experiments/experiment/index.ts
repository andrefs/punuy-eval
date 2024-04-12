import { Model, ModelRequestParams } from "../../models";
import { MeasureType } from "punuy-datasets/src/lib/types";
import {
  EvaluationResult,
  EvaluationResultType,
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
  ValidData,
  ValidationResult,
  combineEvaluations,
} from "../../evaluation";
import logger from "../../logger";
import { genValueCombinations, getVarIds, saveExperimentData } from "./aux";
import { DsPartition } from "../../dataset-adapters/DsPartition";
import { Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

class Experiment {
  name: string;
  description: string;
  schema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  prompts?: (Prompt | PromptGenerator)[] = [];
  getResponse: (
    this: Experiment,
    model: Model,
    prompt: string,
    params: ModelRequestParams
  ) => Promise<ValidationResult>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateSchema: (this: Experiment, got: any) => boolean;
  runTrial: (
    this: Experiment,
    vars: ExpVarsFixedPrompt,
    schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any,
    maxRetries?: number
  ) => Promise<TrialResult>;
  runTrials: (
    this: Experiment,
    vars: ExpVars,
    trials: number
  ) => Promise<TrialsResultData>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluateTrial: (dpart: DsPartition, got: any) => Promise<EvaluationResult>;
  evaluate: (exp: ExperimentData) => Promise<{
    evaluation: EvaluationResult[];
    aggregated: AggregatedEvaluationResult;
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
      this: Experiment,
      vars: ExpVarsFixedPrompt,
      schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any,
      maxRetries?: number
    ) => Promise<TrialResult>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluateTrial: (dpart: DsPartition, got: any) => Promise<EvaluationResult>,
    prompts?: (Prompt | PromptGenerator)[]
  ) {
    this.name = name;
    this.description = description;
    this.schema = schema;
    type ResultSchema = Static<typeof this.schema>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.validateSchema = function (this: Experiment, value: unknown) {
      return Value.Check(this.schema, value);
    };
    this.prompts = prompts;
    this.getResponse = async function (
      model: Model,
      prompt: string,
      params: ModelRequestParams
    ) {
      const result = await model.makeRequest(prompt, params);

      const data = result.getDataText();
      if (!data.trim()) {
        return new NoData();
      }
      try {
        const got = JSON.parse(data) as ResultSchema;
        if (!this.validateSchema(got)) {
          return new JsonSchemaError(data);
        }
        return new ValidData(got);
      } catch (e) {
        return new JsonSyntaxError(data);
      }
    };
    this.runTrial = runTrial;
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

      const results: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
      for (let i = 0; i < trials; i++) {
        logger.info(`  trial #${i + 1} of ${trials}`);
        const res = await this.runTrial({ ...vars, prompt }, this.schema);
        if (res.ok) {
          results.push(res.result); // TODO: handle failed attempts
        }
      }
      return {
        variables: vars,
        data: results,
      };
    };
    this.evaluateTrial = evaluateTrial;
    this.evaluate = async function (this: Experiment, exp: ExperimentData) {
      const trialEvaluationResults = await Promise.all(
        exp.results.raw.map(d => this.evaluateTrial(exp.variables.dpart, d))
      );
      return {
        evaluation: trialEvaluationResults,
        aggregated: await combineEvaluations(trialEvaluationResults),
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
      const { evaluation, aggregated } = await this.evaluate(expData);
      expData.results.evaluation = evaluation;
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

export interface ExpVarMatrix {
  model: Model[];
  dpart: DsPartition[];
  language?: ({ id: "pt" } | { id: "en" })[];
  measureType?: { id: MeasureType }[];
  prompt?: (Prompt | PromptGenerator)[];
}

export type ExpVarsFixedPrompt = Omit<ExpVars, "prompt"> & { prompt: Prompt };

export interface ExpVars {
  dpart: DsPartition;
  model: Model;
  language?: {
    id: "pt" | "en";
  };
  measureType?: {
    id: MeasureType;
  };
  prompt: Prompt | PromptGenerator;
}

export interface PromptGenerator {
  id: string;
  type?: MeasureType;
  language: "pt" | "en";
  generate: (vars: Omit<ExpVars, "prompt">) => Prompt;
}

export interface Prompt {
  id: string;
  type?: MeasureType;
  language: "pt" | "en";
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
  evaluation?: EvaluationResult[];
  aggregated?: AggregatedEvaluationResult;
}

export interface ExperimentData {
  variables: ExpVars;
  meta: ExpMeta;
  results: ExpResults;
}

export interface TrialResult {
  totalTries: number;
  failedAttempts: ValidationResult[];
  ok: boolean;
  result?: ValidData;
}

export interface TrialsResultData {
  variables: ExpVars;
  data: string[];
}

export interface AggregatedEvaluationResult {
  avg: number;
  resultTypes: {
    [key in EvaluationResultType]: number;
  };
}

export default Experiment;
