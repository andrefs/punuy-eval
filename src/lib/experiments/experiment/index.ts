import { Model, ModelTool, ToolSchema } from "../../models";
import {
  EvaluationResult,
  InvalidData,
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
import {
  AggregatedEvaluationResult,
  ExpVarMatrix,
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenericExpTypes,
  Prompt,
  PromptGenerator,
  QueryData,
  TrialResult,
  TrialsResultData,
} from "./types";
export * from "./types";

export default class Experiment<T extends GenericExpTypes> {
  name: string;
  description: string;
  queryData: QueryData<T>;
  prompts?: (Prompt | PromptGenerator)[] = [];
  getResponse: (
    this: Experiment<T>,
    vars: ExpVarsFixedPrompt,
    tool: ModelTool,
    maxRetries: number
  ) => Promise<TrialResult<T["Data"]>>;
  tryResponse: (
    this: Experiment<T>,
    model: Model,
    prompt: string,
    params: ModelTool,
    customPredicate?: (value: T["Data"]) => boolean
  ) => Promise<ValidationResult<T["Data"]>>;
  validateSchema: (
    this: Experiment<T>,
    got: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => boolean;
  runTrial: (
    this: Experiment<T>,
    vars: ExpVarsFixedPrompt,
    toolSchema: ToolSchema,
    maxRetries?: number
  ) => Promise<TrialResult<T["Data"]>>;
  runTrials: (
    this: Experiment<T>,
    vars: ExpVars,
    trials: number
  ) => Promise<TrialsResultData<T["Data"]>>;
  evaluateTrial: (
    dpart: DsPartition,
    got: T["Data"]
  ) => Promise<EvaluationResult<T["Data"], T["Evaluation"]>>;
  evaluate: (exp: ExperimentData<T>) => Promise<{
    evaluation: EvaluationResult<T>[];
    aggregated: AggregatedEvaluationResult;
  }>;
  perform: (
    this: Experiment<T>,
    vars: ExpVars,
    trials: number,
    traceId?: number
  ) => Promise<ExperimentData<T>>;
  performMulti: (
    this: Experiment<T>,
    variables: ExpVarMatrix,
    trials: number
  ) => Promise<ExperimentData<T>[]>;

  constructor(
    name: string,
    description: string,
    queryData: QueryData<T>,
    runTrial: (
      this: Experiment<T>,
      vars: ExpVarsFixedPrompt,
      toolSchema: ToolSchema,
      maxRetries?: number
    ) => Promise<TrialResult<T["Data"]>>,
    evaluateTrial: (
      dpart: DsPartition,
      got: T["Data"]
    ) => Promise<EvaluationResult<T["Data"], T["Evaluation"]>>,
    prompts?: (Prompt | PromptGenerator)[]
  ) {
    this.name = name;
    this.description = description;
    this.queryData = queryData;
    this.validateSchema = function (this: Experiment<T>, value: unknown) {
      return Value.Check(this.queryData.responseSchema, value);
    };
    this.prompts = prompts;
    this.getResponse = async function (
      this: Experiment<T>,
      vars: ExpVarsFixedPrompt,
      tool: ModelTool,
      maxRetries: number = 3
    ) {
      const gotValidData = false;
      let attempts = 0;
      const failedAttempts = [];
      while (!gotValidData && attempts < maxRetries) {
        const attemptResult = await this.tryResponse(
          vars.model,
          vars.prompt.text,
          tool
        );
        attempts++;
        if (attemptResult instanceof ValidData) {
          const res: TrialResult<T["Data"]> = {
            totalTries: attempts,
            failedAttempts,
            ok: true,
            result: attemptResult,
          };
          return res;
        }
        failedAttempts.push(attemptResult);
      }

      const res: TrialResult<T["Data"]> = {
        totalTries: attempts,
        failedAttempts,
        ok: false,
      };
      return res;
    };
    this.tryResponse = async function (
      model: Model,
      prompt: string,
      params: ModelTool,
      customPredicate?: (value: T["Data"]) => boolean
    ) {
      const result = await model.makeRequest(prompt, params);

      const data = result.getDataText();
      if (!data.trim()) {
        return new NoData();
      }
      try {
        const got = JSON.parse(data) as T["Data"];
        if (!this.validateSchema(got)) {
          return new JsonSchemaError(data);
        }
        return !customPredicate || customPredicate(got)
          ? new ValidData(got)
          : new InvalidData(got);
      } catch (e) {
        return new JsonSyntaxError(data);
      }
    };
    this.runTrial = runTrial;
    this.runTrials = async function (
      this: Experiment<T>,
      vars: ExpVars,
      trials: number
    ) {
      const prompt =
        "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
      logger.info(
        `Running experiment ${this.name} ${trials} times on model ${vars.model.id}.`
      );
      logger.debug(`Prompt (${prompt.id}): ${prompt.text}`);

      const results: T["Data"][] = [];
      for (let i = 0; i < trials; i++) {
        logger.info(`  trial #${i + 1} of ${trials}`);
        const res = await this.runTrial(
          { ...vars, prompt },
          this.queryData.toolSchema
        );
        if (res.ok) {
          results.push(res.result!.data); // TODO: handle failed attempts
        }
      }
      return {
        variables: vars,
        data: results,
      };
    };
    this.evaluateTrial = evaluateTrial;
    this.evaluate = async function (
      this: Experiment<T>,
      exp: ExperimentData<T>
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
      this: Experiment<T>,
      vars: ExpVars,
      trials: number,
      traceId?: number
    ): Promise<ExperimentData<T>> {
      const trialsRes = await this.runTrials(vars, trials);
      const expData: ExperimentData<T> = {
        meta: {
          name: this.name,
          traceId: traceId ?? Date.now(),
          queryData: this.queryData,
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
      this: Experiment<T>,
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
      const res = [] as ExperimentData<T>[];
      for (const v of varCombs) {
        res.push(await this.perform(v, trials, Date.now()));
      }
      return res;
    };
  }
}
