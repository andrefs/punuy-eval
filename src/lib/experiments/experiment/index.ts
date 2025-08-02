import { Model, ModelTool, ToolSchema } from "../../models";
import { EvaluationResult, ValidationResult } from "../../evaluation";
import logger from "../../logger";
import { DsPartition } from "../../dataset-partitions/DsPartition";
import {
  AggregatedEvaluationResult,
  ExpScore,
  ExpVarMatrix,
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenToolSchema,
  GenericExpTypes,
  Prompt,
  PromptGenerator,
  QueryData,
  TrialAttempts,
  TrialData,
  TrialOpts,
  TrialsResultData,
  TurnData,
  TurnPrompt,
  TurnResponse,
  TurnResponses,
  Usage,
  Usages,
} from "./types";
import {
  getTurnResponse,
  iterateConversation,
  tryResponse,
} from "./conversation";
import { printExpResTable, printUsage } from "./print";
import { handleEarlyExit } from "./exit";
import { perform, performMulti } from "./perform";
import { evaluate, validateSchema } from "./val-eval";
import { addUsage, getPreviousResults, sanityCheck } from "./aux";
import path from "node:path";
export * from "./types";
import oldFs from "fs";
import fs from "node:fs/promises";
import {
  buildExpVCFileName,
  genNextExpIndex,
  getCurExpIndex,
} from "./exp-cache";

/** Class representing an experiment. */
export default class Experiment<T extends GenericExpTypes> {
  name: string;
  traceId: number;
  folder: string;
  description: string;
  queryData: QueryData<T>;
  prompts?: (Prompt | PromptGenerator)[] = [];
  totalUsage: Usages;
  exitedEarly: boolean;
  handleEarlyExit: (
    this: Experiment<T>,
    res: ExperimentData<T>[],
    folder: string
  ) => Promise<void>;
  iterateConversation: (
    this: Experiment<T>,
    vars: ExpVarsFixedPrompt,
    tool: ModelTool,
    opts?: TrialOpts
  ) => Promise<TurnResponses<T["Data"]>>;
  getTurnResponse: (
    this: Experiment<T>,
    model: Model,
    prompt: TurnPrompt,
    tool: ModelTool
  ) => Promise<TurnResponse<T["Data"]>>;
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
    genToolSchema: GenToolSchema,
    opts?: TrialOpts
  ) => Promise<TrialAttempts<T["Data"]>>;
  runTrials: (
    this: Experiment<T>,
    vars: ExpVars,
    numTrials: number,
    trialsFailedPairs: [string, string][][],
    opts?: TrialOpts
  ) => Promise<TrialsResultData<T["Data"]>>;
  evaluateTrial: (
    dpart: DsPartition,
    got: TurnData<T["Data"]>[] // Array of turns with data and prompt
  ) => Promise<EvaluationResult<T["Data"], T["Evaluation"]>>;
  evaluate: (exp: ExperimentData<T>) => Promise<{
    evaluation: EvaluationResult<T["Data"], T["Evaluation"]>[];
    aggregated: AggregatedEvaluationResult;
  }>;
  perform: (
    this: Experiment<T>,
    vars: ExpVars,
    trials: number,
    opts: TrialOpts
  ) => Promise<ExperimentData<T>>;
  performMulti: (
    this: Experiment<T>,
    variables: ExpVarMatrix,
    trials: number,
    opts: TrialOpts
  ) => Promise<{
    experiments: ExperimentData<T>[];
    usage?: Usages;
  }>;
  expDataToExpScore?: (this: Experiment<T>, exp: ExperimentData<T>) => ExpScore;
  printExpResTable: (this: Experiment<T>, exps: ExperimentData<T>[]) => void;
  printUsage: (
    this: Experiment<T>,
    usage: Usages | undefined,
    final?: boolean
  ) => void;
  fixParsedJson?: (parsed: any) => T["Data"]; // eslint-disable-line @typescript-eslint/no-explicit-any
  customCombineEvals?: (
    vs: EvaluationResult<T["Data"], T["Evaluation"]>[]
  ) => Promise<AggregatedEvaluationResult>;
  /**
   * Make sure experiment can run with these parameters
   * @param folder - path to the folder where the data will be saved
   * @returns - void
   * @throws - Error if the folder already exists with a different experiment
   */
  sanityCheck: (folder: string) => Promise<void>;
  loadExpCache: (
    this: Experiment<T>,
    vars: ExpVars
  ) => Promise<ExperimentData<T> | undefined>;
  getResFileName: (
    this: Experiment<T>,
    vars: ExpVars
  ) => Promise<string | null>;

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
    traceId: number,
    folder: string,
    description: string,
    queryData: QueryData<T>,
    runTrial: (
      this: Experiment<T>,
      vars: ExpVars | ExpVarsFixedPrompt,
      genToolSchema: GenToolSchema,
      opts?: TrialOpts
    ) => Promise<TrialAttempts<T["Data"]>>,
    evaluateTrial: (
      dpart: DsPartition,
      got: { data: T["Data"]; prompt: TurnPrompt }[]
    ) => Promise<EvaluationResult<T["Data"], T["Evaluation"]>>,
    {
      expDataToExpScore,
      prompts,
      customCombineEvals,
      fixParsedJson,
    }: {
      expDataToExpScore?: (
        this: Experiment<T>,
        exp: ExperimentData<T>
      ) => ExpScore;
      prompts?: (Prompt | PromptGenerator)[];
      customCombineEvals?: (
        vs: EvaluationResult<T["Data"], T["Evaluation"]>[]
      ) => Promise<AggregatedEvaluationResult>;
      fixParsedJson?: (parsed: any) => T["Data"]; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  ) {
    // parameters
    this.name = name;
    this.traceId = traceId;
    this.folder = folder;
    this.description = description;
    this.queryData = queryData;
    this.runTrial = runTrial;
    this.evaluateTrial = evaluateTrial;
    // optional parameters
    this.expDataToExpScore = expDataToExpScore;
    this.prompts = prompts;
    this.customCombineEvals = customCombineEvals;
    this.fixParsedJson = fixParsedJson;
    // attributes
    this.totalUsage = {};
    this.exitedEarly = true;
    //imported
    this.validateSchema = validateSchema;
    this.iterateConversation = iterateConversation;
    this.getTurnResponse = getTurnResponse;
    this.tryResponse = tryResponse;
    this.evaluate = evaluate;
    this.perform = perform;
    this.sanityCheck = sanityCheck;
    this.performMulti = performMulti;
    this.handleEarlyExit = handleEarlyExit;
    this.printExpResTable = printExpResTable;
    this.printUsage = printUsage;

    this.getResFileName = async function (
      this: Experiment<T>,
      vars: ExpVars
    ): Promise<string | null> {
      const index = await getCurExpIndex(this.folder);
      const fn = buildExpVCFileName(
        this.traceId,
        this.name,
        vars.prompt.id,
        vars.dpart.id,
        vars.model.id
      );
      return path.join(this.folder, `${index}-${fn}`);
    };

    this.loadExpCache = async function (
      this: Experiment<T>,
      vars: ExpVars
    ): Promise<ExperimentData<T> | undefined> {
      const expFP = await this.getResFileName(vars);
      if (!expFP) {
        return undefined;
      }
      if (oldFs.existsSync(expFP)) {
        logger.info(`🗃️ Loading experiment cache from ${expFP}.`);
        try {
          const json = await fs.readFile(expFP, "utf-8");
          const exp = JSON.parse(json) as ExperimentData<T>;
          return exp;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          logger.info(`🗃️ Failed to load experiment cache from ${expFP}.`);
        }
      }
      return undefined;
    };

    this.runTrials = async function (
      this: Experiment<T>,
      vars: ExpVars,
      numTrials: number,
      trialsFailedPairs: [string, string][][],
      opts: TrialOpts = { maxTrialAttempts: 3 }
    ) {
      const totalUsage: Usages = {};
      const trials: TrialData<T["Data"]>[] = [];

      logger.info(
        `🧪 Running experiment ${this.name} ${numTrials} times on model ${vars.model.id}.`
      );

      for (let i = 0; i < numTrials; i++) {
        logger.info(`  ⚔️  trial #${i + 1} of ${numTrials} `);
        const trialUsage: Usages = {};

        const attempts = await this.runTrial(
          vars,
          this.queryData.genToolSchema,
          {
            ...opts,
            prevFailedPairs: trialsFailedPairs[i] || [],
          }
        );
        for (const attempt of attempts) {
          for (const turn of attempt) {
            addUsage(trialUsage, turn.usage);
          }
        }
        trials.push({
          promptId: vars.prompt.id,
          usage: trialUsage,
          attempts,
        });
        addUsage(totalUsage, trialUsage);
      }
      return {
        variables: vars,
        usage: totalUsage,
        trials,
      };
    };
  }
}
