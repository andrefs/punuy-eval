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
  GenericExpTypes,
  Prompt,
  PromptGenerator,
  QueryData,
  TrialResult,
  TrialsResultData,
  TurnPrompt,
  TurnResponse,
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
import { addUsage, sanityCheck } from "./aux";
export * from "./types";

/** Class representing an experiment. */
export default class Experiment<T extends GenericExpTypes> {
  name: string;
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
    maxAttempts: number
  ) => Promise<TrialResult<T["Data"]>>;
  getTurnResponse: (
    this: Experiment<T>,
    model: Model,
    prompt: TurnPrompt,
    tool: ModelTool,
    maxAttempts: number
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
    got: { data: T["Data"]; prompt: TurnPrompt }[]
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
    folder: string,
    maxAttempts?: number
  ) => Promise<ExperimentData<T>>;
  performMulti: (
    this: Experiment<T>,
    variables: ExpVarMatrix,
    trials: number,
    folder: string,
    maxAttempts?: number
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

    this.runTrials = async function (
      this: Experiment<T>,
      vars: ExpVars,
      numTrials: number,
      maxAttempts: number = 3
    ) {
      const totalUsage: Usages = {};

      logger.info(
        `🧪 Running experiment ${this.name} ${numTrials} times on model ${vars.model.id}.`
      );

      const trials: T["Data"][] = [];
      for (let i = 0; i < numTrials; i++) {
        logger.info(`  ⚔️  trial #${i + 1} of ${numTrials} `);
        const trialRes = await this.runTrial(
          vars,
          this.queryData.toolSchema,
          maxAttempts
        );
        addUsage(totalUsage, trialRes.usage);
        const turns = [];
        if (trialRes.ok) {
          for (const [i, turnRes] of trialRes.result!.entries()) {
            turns.push({
              data: turnRes.data,
              prompt: trialRes.turnPrompts[i],
            });
          }
          trials.push({ turns });
        } else {
          logger.warn(`  🤦 trial #${i + 1} failed all conversations`);
        }
      }
      return {
        variables: vars,
        usage: totalUsage,
        trials,
      };
    };
  }
}
