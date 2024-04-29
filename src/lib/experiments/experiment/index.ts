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
  ExceptionThrown,
} from "../../evaluation";
import logger from "../../logger";
import {
  calcUsageCost,
  genValueCombinations,
  getVarIds,
  saveExpVarCombData,
  saveExperimentsData,
  sumUsage,
} from "./aux";
import { DsPartition } from "../../dataset-partitions/DsPartition";
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
  Usage,
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
  ) => Promise<{
    result: ValidationResult<T["Data"]>;
    usage?: Usage;
  }>;
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
    traceId: number,
    folder: string
  ) => Promise<ExperimentData<T>>;
  performMulti: (
    this: Experiment<T>,
    variables: ExpVarMatrix,
    trials: number,
    folder: string
  ) => Promise<{
    experiments: ExperimentData<T>[];
    usage?: Usage;
  }>;

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
      let totalUsage;
      const failedAttempts = [];
      while (failedAttempts.length < maxRetries) {
        logger.info(`      attempt #${failedAttempts.length + 1}`);
        const { result: attemptResult, usage } = await this.tryResponse(
          vars.model,
          vars.prompt.text,
          tool
        );
        totalUsage = sumUsage(totalUsage, usage);
        if (attemptResult instanceof ValidData) {
          logger.info(`      attempt #${failedAttempts.length + 1} succeeded.`);
          const res: TrialResult<T["Data"]> = {
            totalTries: failedAttempts.length + 1,
            failedAttempts,
            ok: true,
            usage: totalUsage,
            result: attemptResult,
          };
          return res;
        }
        logger.warn(
          `      attempt #${failedAttempts.length + 1} failed: ${
            attemptResult.type
          }`
        );
        failedAttempts.push(attemptResult);
      }

      const res: TrialResult<T["Data"]> = {
        totalTries: failedAttempts.length,
        usage: totalUsage,
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
      let result;
      try {
        result = await model.makeRequest(prompt, params);
      } catch (e) {
        return {
          result: new ExceptionThrown(),
          usage: undefined,
        };
      }

      const usage = result?.usage;
      const data = result.getDataText();
      if (!data.trim()) {
        return { result: new NoData(), usage };
      }
      try {
        const got = JSON.parse(data) as T["Data"];
        if (!this.validateSchema(got)) {
          return {
            result: new JsonSchemaError(data),
            usage,
          };
        }
        return {
          result:
            !customPredicate || customPredicate(got)
              ? new ValidData(got)
              : new InvalidData(got),
          usage,
        };
      } catch (e) {
        return { result: new JsonSyntaxError(data), usage };
      }
    };
    this.runTrial = runTrial;
    this.runTrials = async function (
      this: Experiment<T>,
      vars: ExpVars,
      trials: number
    ) {
      let totalUsage;
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
        totalUsage = sumUsage(totalUsage, res.usage);
        if (res.ok) {
          results.push(res.result!.data); // TODO: handle failed attempts
        }
      }
      return {
        variables: vars,
        usage: totalUsage,
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
      traceId: number,
      folder: string
    ): Promise<ExperimentData<T>> {
      const trialsRes = await this.runTrials(vars, trials);
      const expData: ExperimentData<T> = {
        meta: {
          trials,
          name: this.name,
          traceId: traceId ?? Date.now(),
          queryData: this.queryData,
        },
        variables: vars,
        usage: trialsRes.usage
          ? {
              ...trialsRes.usage,
              cost:
                trialsRes.usage && vars.model.pricing
                  ? calcUsageCost(trialsRes.usage, vars.model.pricing)
                  : undefined,
            }
          : undefined,
        results: {
          raw: trialsRes.data,
        },
      };
      const { evaluation, aggregated } = await this.evaluate(expData);
      expData.results.evaluation = evaluation;
      expData.results.aggregated = aggregated;

      await saveExpVarCombData(expData, folder);
      return expData;
    };
    this.performMulti = async function (
      this: Experiment<T>,
      variables: ExpVarMatrix,
      trials: number,
      folder: string
    ) {
      let totalUsage;
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
      for (const vc of varCombs) {
        res.push(await this.perform(vc, trials, Date.now(), folder));
        totalUsage = sumUsage(totalUsage, res[res.length - 1].usage);
      }
      saveExperimentsData(this.name, res, totalUsage as Usage, folder);
      return {
        experiments: res,
        usage: totalUsage,
      };
    };
  }
}
