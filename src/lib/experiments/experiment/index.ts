/* eslint-disable @typescript-eslint/no-unused-vars */
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
  ComparisonGroup,
  addUsage,
  calcUsageCost,
  calcVarValues,
  genValueCombinations,
  getFixedValueGroup,
  getVarIds,
  sanityCheck,
  saveExpVarCombData,
  saveExperimentsData,
} from "./aux";
import { DsPartition } from "../../dataset-partitions/DsPartition";
import { Value } from "@sinclair/typebox/value";
import {
  AggregatedEvaluationResult,
  ExpScore,
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
  Usages,
} from "./types";
import { renderTable } from "console-table-printer";
export * from "./types";

/** Class representing an experiment. */
export default class Experiment<T extends GenericExpTypes> {
  name: string;
  description: string;
  queryData: QueryData<T>;
  prompts?: (Prompt | PromptGenerator)[] = [];
  getResponse: (
    this: Experiment<T>,
    vars: ExpVarsFixedPrompt,
    tool: ModelTool,
    maxAttempts: number
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
    vars: ExpVars | ExpVarsFixedPrompt,
    toolSchema: ToolSchema,
    maxAttempts?: number
  ) => Promise<TrialResult<T["Data"]>>;
  runTrials: (
    this: Experiment<T>,
    vars: ExpVars,
    trials: number,
    maxAttempts?: number
  ) => Promise<TrialsResultData<T["Data"]>>;
  evaluateTrial: (
    dpart: DsPartition,
    prompt: Prompt,
    got: T["Data"]
  ) => Promise<EvaluationResult<T["Data"], T["Evaluation"]>>;
  evaluate: (exp: ExperimentData<T>) => Promise<{
    evaluation: EvaluationResult<T["Data"], T["Evaluation"]>[];
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
    usage?: Usages;
  }>;
  expDataToExpScore?: (this: Experiment<T>, exp: ExperimentData<T>) => ExpScore;
  printExpResTable: (this: Experiment<T>, exps: ExperimentData<T>[]) => void;
  printUsage: (this: Experiment<T>, usage: Usages | undefined) => void;
  /**
   * Make sure experiment can run with these parameters
   * @param folder - path to the folder where the data will be saved
   * @returns - void
   * @throws - Error if the folder already exists with a different experiment
   */
  sanityCheck: (folder: string) => Promise<void>;

  /**
   * Create an experiment.
   * @param name - The name of the experiment.
   * @param description - The description of the experiment.
   * @param queryData - The query data for the experiment.
   * @param runTrial - The function to run a single trial of the experiment.
   * @param evaluateTrial - The function to evaluate a single trial of the experiment.
   * @param expDataToExpScore - The function to convert experiment data to a numeric experiment score.
   * @param prompts - The prompts for the experiment.
   * @returns - A new experiment.
   *
   */
  constructor(
    name: string,
    description: string,
    queryData: QueryData<T>,
    runTrial: (
      this: Experiment<T>,
      vars: ExpVars | ExpVarsFixedPrompt,
      toolSchema: ToolSchema,
      maxAttempts?: number
    ) => Promise<TrialResult<T["Data"]>>,
    evaluateTrial: (
      dpart: DsPartition,
      prompt: Prompt,
      got: T["Data"]
    ) => Promise<EvaluationResult<T["Data"], T["Evaluation"]>>,
    expDataToExpScore?: (
      this: Experiment<T>,
      exp: ExperimentData<T>
    ) => ExpScore,
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
      maxAttempts: number = 3
    ) {
      const totalUsage: Usages = {};
      const failedAttempts = [];
      while (failedAttempts.length < maxAttempts) {
        const faCount = failedAttempts.length + 1;
        logger.info(`    💪 attempt #${faCount}`);
        const { result: attemptResult, usage } = await this.tryResponse(
          vars.model,
          vars.prompt.text,
          tool
        );

        addUsage(totalUsage, usage);
        if (attemptResult instanceof ValidData) {
          logger.info(`    ✅ attempt #${faCount} succeeded.`);
          const res: TrialResult<T["Data"]> = {
            prompt: vars.prompt,
            totalTries: failedAttempts.length + 1,
            failedAttempts,
            ok: true,
            usage: totalUsage,
            result: attemptResult,
          };
          return res;
        }
        logger.warn(`    ❗ attempt #${faCount} failed: ${attemptResult.type}`);
        failedAttempts.push(attemptResult);

        // add exponential backoff if the number of failed attempts is less than the max
        if (failedAttempts.length < maxAttempts) {
          await new Promise(resolve => {
            logger.info(
              `      ⌛ waiting for ${Math.pow(
                2,
                faCount - 1
              )} seconds before retrying.`
            );
            setTimeout(resolve, Math.pow(2, faCount - 1) * 1000);
          });
        }
      }

      const res: TrialResult<T["Data"]> = {
        prompt: vars.prompt,
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
      let data;
      let usage;
      try {
        result = await model.makeRequest(prompt, params);
        usage = result?.usage;
        data = result.getDataText();
      } catch (e) {
        return {
          result: new ExceptionThrown(),
          usage: undefined,
        };
      }

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
      trials: number,
      maxAttempts: number = 3
    ) {
      const totalUsage: Usages = {};

      logger.info(
        `🧪 Running experiment ${this.name} ${trials} times on model ${vars.model.id}.`
      );

      const results: T["Data"][] = [];
      for (let i = 0; i < trials; i++) {
        logger.info(`  ⚔️  trial #${i + 1} of ${trials}`);
        const res = await this.runTrial(
          vars,
          this.queryData.toolSchema,
          maxAttempts
        );
        addUsage(totalUsage, res.usage);
        if (res.ok) {
          results.push({
            data: res.result!.data,
            prompt: res.prompt,
          }); // TODO: handle failed attempts
        }
      }
      return {
        variables: vars,
        usage: totalUsage,
        trials: results,
      };
    };
    this.evaluateTrial = evaluateTrial;
    this.evaluate = async function (
      this: Experiment<T>,
      exp: ExperimentData<T>
    ) {
      const trialEvaluationResults = await Promise.all(
        exp.results.raw.map(d =>
          this.evaluateTrial(exp.variables.dpart, d.prompt, d.data)
        )
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
      calcUsageCost(trialsRes.usage);
      const expData: ExperimentData<T> = {
        meta: {
          trials,
          name: this.name,
          traceId: traceId ?? Date.now(),
          queryData: this.queryData,
        },
        variables: vars,
        usage: trialsRes.usage,
        results: {
          raw: trialsRes.trials,
        },
      };
      const { evaluation, aggregated } = await this.evaluate(expData);
      expData.results.evaluation = evaluation;
      expData.results.aggregated = aggregated;

      this.printUsage(expData.usage);
      await saveExpVarCombData(expData, folder);
      return expData;
    };
    this.sanityCheck = sanityCheck;
    this.performMulti = async function (
      this: Experiment<T>,
      variables: ExpVarMatrix,
      trials: number,
      folder: string
    ) {
      await this.sanityCheck(folder);
      const totalUsage: Usages = {};
      if (!variables?.prompt?.length) {
        variables.prompt = this.prompts;
      }
      const varCombs = genValueCombinations(variables);
      logger.info(
        `🔬 Preparing to run experiment ${
          this.name
        }, ${trials} times on each variable combination:\n${varCombs
          .map(vc => "\t" + JSON.stringify(getVarIds(vc)))
          .join(",\n")}.`
      );
      const res = [] as ExperimentData<T>[];
      for (const [index, vc] of varCombs.entries()) {
        logger.info(
          `⚗️  Running experiment ${index}/${varCombs.length}: ${
            this.name
          } with variables ${JSON.stringify(getVarIds(vc))}.`
        );
        res.push(await this.perform(vc, trials, Date.now(), folder));
        addUsage(totalUsage, res[res.length - 1].usage);
      }
      await saveExperimentsData(this.name, res, totalUsage, folder);
      if (this.expDataToExpScore) {
        this.printExpResTable(res);
      }
      return {
        experiments: res,
        usage: totalUsage,
      };
    };
    this.expDataToExpScore = expDataToExpScore;
    this.printExpResTable = function (
      this: Experiment<T>,
      exps: ExperimentData<T>[]
    ) {
      if (!this.expDataToExpScore) {
        return;
      }
      const expScores = exps.map(e => this.expDataToExpScore!(e));
      const { varNames } = calcVarValues(exps);

      const comparisons: ComparisonGroup[] = [];
      for (const [i, v1] of varNames.entries()) {
        for (const v2 of varNames.slice(i + 1)) {
          //if (varValues[v1].size === 1 && varValues[v2].size === 1) {
          //  continue;
          //}

          let compGroups = [] as ComparisonGroup[];
          const fixedNames = varNames.filter(v => v !== v1 && v !== v2);

          for (const expScore of expScores) {
            const v1Val = expScore.variables[v1]!.id;
            const v2Val = expScore.variables[v2]!.id;
            const score =
              typeof expScore.score === "number" && !isNaN(expScore.score)
                ? Number(expScore.score.toFixed(3))
                : null;

            const group = getFixedValueGroup(
              compGroups,
              expScore.variables,
              fixedNames,
              v1,
              v2
            );

            group.data[v1Val] = group.data[v1Val] || {};
            group.data[v1Val][v2Val] = score;
          }

          if (compGroups.length > 1) {
            // keep only groups with more than one value for each variable
            compGroups = compGroups.filter(
              g =>
                Object.keys(g.data).length > 1 &&
                Object.keys(g.data).every(
                  k => Object.keys(g.data[k]).length > 1
                )
            );
          }

          comparisons.push(...compGroups);
        }
      }

      for (const comp of comparisons) {
        let csv = "";
        const columnNames: { [key: string]: boolean } = {};
        const rowNames: { [key: string]: boolean } = {};
        const table = [];
        for (const [v1, v2s] of Object.entries(comp.data)) {
          rowNames[v1] = true;
          for (const v2 of Object.keys(v2s)) {
            columnNames[v2] = true;
          }
          table.push({ "(index)": v1, ...v2s });
        }
        csv += "," + Object.keys(columnNames).sort().join(",") + "\n";
        for (const rN of Object.keys(rowNames).sort()) {
          const line = [rN.toString()];
          for (const cN of Object.keys(columnNames).sort()) {
            line.push(comp.data[rN][cN]?.toString() || "");
          }
          csv += line.join(",") + "\n";
        }
        const tablePP = renderTable(table);
        logger.info(
          `🆚 Comparing ${comp.variables
            .map(v => `[${v}]`)
            .join(" and ")} with fixed variables ${JSON.stringify(
            comp.fixedValueConfig
          )}\n${tablePP}\n${csv}`
        );
      }
    };
    this.printUsage = function (
      this: Experiment<T>,
      usage: Usages | undefined
    ) {
      if (!usage) {
        return;
      }
      logger.info(
        "📈 Usage estimate:\n" +
          Object.values(usage)
            .map(u => `\t${JSON.stringify(u)}`)
            .join("\n")
      );
    };
  }
}
