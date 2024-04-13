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
import { Value } from "@sinclair/typebox/value";

class Experiment<DataType> {
  name: string;
  description: string;
  schema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  prompts?: (Prompt | PromptGenerator)[] = [];
  getResponse: (
    this: Experiment<DataType>,
    model: Model,
    prompt: string,
    params: ModelRequestParams
  ) => Promise<ValidationResult<DataType>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateSchema: (this: Experiment<DataType>, got: any) => boolean;
  runTrial: (
    this: Experiment<DataType>,
    vars: ExpVarsFixedPrompt,
    schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any,
    maxRetries?: number
  ) => Promise<TrialResult<DataType>>;
  runTrials: (
    this: Experiment<DataType>,
    vars: ExpVars,
    trials: number
  ) => Promise<TrialsResultData<DataType>>;
  evaluateTrial: (
    dpart: DsPartition,
    got: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => Promise<EvaluationResult<DataType>>;
  evaluate: (exp: ExperimentData<DataType>) => Promise<{
    evaluation: EvaluationResult<DataType>[];
    aggregated: AggregatedEvaluationResult;
  }>;
  perform: (
    this: Experiment<DataType>,
    vars: ExpVars,
    trials: number,
    traceId?: number
  ) => Promise<ExperimentData<DataType>>;
  performMulti: (
    this: Experiment<DataType>,
    variables: ExpVarMatrix,
    trials: number
  ) => Promise<ExperimentData<DataType>[]>;

  constructor(
    name: string,
    description: string,
    schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    runTrial: (
      this: Experiment<DataType>,
      vars: ExpVarsFixedPrompt,
      schema: any, // eslint-disable-line @typescript-eslint/no-explicit-any,
      maxRetries?: number
    ) => Promise<TrialResult<DataType>>,
    evaluateTrial: (
      dpart: DsPartition,
      got: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => Promise<EvaluationResult<DataType>>,
    prompts?: (Prompt | PromptGenerator)[]
  ) {
    this.name = name;
    this.description = description;
    this.schema = schema;
    this.validateSchema = function (
      this: Experiment<DataType>,
      value: unknown
    ) {
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
        const got = JSON.parse(data) as DataType;
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
      this: Experiment<DataType>,
      vars: ExpVars,
      trials: number
    ) {
      const prompt =
        "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
      logger.info(
        `Running experiment ${this.name} ${trials} times on model ${vars.model.id}.`
      );
      logger.debug(`Prompt (${prompt.id}): ${prompt.text}`);

      const results: DataType[] = [];
      for (let i = 0; i < trials; i++) {
        logger.info(`  trial #${i + 1} of ${trials}`);
        const res = await this.runTrial({ ...vars, prompt }, this.schema);
        if (res.ok) {
          results.push(res.result!.data!); // TODO: handle failed attempts
        }
      }
      return {
        variables: vars,
        data: results,
      };
    };
    this.evaluateTrial = evaluateTrial;
    this.evaluate = async function (
      this: Experiment<DataType>,
      exp: ExperimentData<DataType>
    ) {
      const trialEvaluationResults = await Promise.all(
        exp.results.raw.map(d => this.evaluateTrial(exp.variables.dpart, d))
      );
      return {
        evaluation: trialEvaluationResults,
        aggregated: await combineEvaluations(trialEvaluationResults),
      };
    };
    this.perform = async function (
      this: Experiment<DataType>,
      vars: ExpVars,
      trials: number,
      traceId?: number
    ): Promise<ExperimentData<DataType>> {
      const trialsRes = await this.runTrials(vars, trials);
      const expData: ExperimentData<DataType> = {
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
      this: Experiment<DataType>,
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
      const res = [] as ExperimentData<DataType>[];
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

export interface ExpResults<DataType> {
  /** Raw results from the trials */
  raw: unknown[];
  /** Evaluation results for each trial */
  evaluation?: EvaluationResult<DataType>[];
  /** Aggregated evaluation results */
  aggregated?: AggregatedEvaluationResult;
}

export interface ExperimentData<DataType> {
  variables: ExpVars;
  meta: ExpMeta;
  results: ExpResults<DataType>;
}

export interface TrialResult<DataType> {
  totalTries: number;
  failedAttempts: ValidationResult<DataType>[];
  ok: boolean;
  result?: ValidData<DataType>;
}

export interface TrialsResultData<DataType> {
  variables: ExpVars;
  data: DataType[];
}

export interface AggregatedEvaluationResult {
  avg: number;
  resultTypes: {
    [key in EvaluationResultType]: number;
  };
}

export default Experiment;
