import { RelationType } from "punuy-datasets/src/lib/types";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import {
  EvaluationResult,
  EvaluationResultType,
  ValidData,
  ValidationResult,
} from "src/lib/evaluation";
import { Model, ModelId, ToolSchema } from "src/lib/models";

/** Function type for generating tool schemas */
export type GenToolSchema = (opts?: any) => ToolSchema; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Query data configuration for experiments */
export interface QueryData<T extends GenericExpTypes> {
  /** Response schema for the experiment */
  responseSchema: T["DataSchema"];
  /** Function to generate tool schema */
  genToolSchema: GenToolSchema;
}

/** Score for a single word pair */
export interface SinglePairScore {
  /** The word pair being scored */
  words: [string, string];
  /** The similarity score */
  score: number;
}

/** List of pair scores */
export type PairScoreList = SinglePairScore[];

/** Dictionary mapping words to their similarity scores */
export interface ScoreDict {
  [key: string]: { [key: string]: number };
}

/** Generic type structure for experiment types */
export interface GenericExpTypes {
  /** The data type for the experiment */
  Data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** The data schema type */
  DataSchema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** The evaluation type */
  Evaluation: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Matrix of experiment variables for running multiple experiments */
export interface ExpVarMatrix {
  /** Array of models to test */
  model: Model[];
  /** Array of dataset partitions to use */
  dpart: DsPartition[];
  /** Optional array of languages */
  language?: ({ id: "pt" } | { id: "en" })[];
  /** Optional array of relation types */
  relationType?: { id: RelationType }[];
  /** Optional array of prompts or prompt generators */
  prompt?: (Prompt | PromptGenerator)[];
  /** Optional array of job types */
  jobType?: { id: PromptJobType }[];
}

/** Experiment variables with a fixed prompt instead of a generator */
export type ExpVarsFixedPrompt = Omit<ExpVars, "prompt"> & { prompt: Prompt };

/** Variables for a single experiment configuration */
export interface ExpVars {
  /** Dataset partition to use */
  dpart: DsPartition;
  /** Model to use for the experiment */
  model: Model;
  /** Optional language configuration */
  language?: {
    id: "pt" | "en";
  };
  /** Optional relation type */
  relationType?: {
    id: RelationType;
  };
  /** Prompt generator for the experiment */
  prompt: PromptGenerator;
  /** Optional job type configuration */
  jobType?: { id: PromptJobType };
}

/** Generator for creating prompts based on experiment variables */
export interface PromptGenerator {
  /** Unique identifier for the prompt generator */
  id: string;
  /** Optional relation type this generator is designed for */
  relationType?: RelationType;
  /** Language this generator supports */
  language: "pt" | "en";
  /** Function to generate a prompt from variables and optional pairs */
  generate: (
    vars: Omit<ExpVars, "prompt">,
    pairs?: [string, string][]
  ) => Prompt;
}

/**
 * How to send pairs to the model:
 * - singlePair: send one pair at a time
 * - batches: send pairs in batches
 * - allPairs: send all pairs at once
 */
export const jobTypes = ["singlePair", "batches", "allPairs"] as const;

/** Type representing different ways to send word pairs to the model */
export type PromptJobType = (typeof jobTypes)[number];

/** Base interface for all prompt types */
export interface BasePrompt {
  /** Unique identifier for the prompt */
  id: string;
  /** Optional relation type for the prompt */
  relationType?: RelationType;
  /** How pairs should be sent to the model */
  jobType: PromptJobType;
  /** Language of the prompt */
  language: "pt" | "en";
  /** Word pairs to be processed */
  pairs?: [string, string][] | [string, string][][];
  /** Conversation turns for the prompt */
  turns: TurnPrompt[];
}

/** Prompt that sends one pair at a time */
export interface SinglePairPrompt extends BasePrompt {
  jobType: "singlePair";
  /** Single array of word pairs */
  pairs: [string, string][];
}

/** Prompt that sends pairs in batches */
export interface BatchesPrompt extends BasePrompt {
  jobType: "batches";
  /** Array of batches, each containing word pairs */
  pairs: [string, string][][];
}

/** Prompt that sends all pairs at once */
export interface AllPairsPrompt extends BasePrompt {
  jobType: "allPairs";
  /** Single array of all word pairs */
  pairs: [string, string][];
}

/** Union type representing any type of prompt */
export type Prompt = SinglePairPrompt | BatchesPrompt | AllPairsPrompt;

/** Metadata for an experiment */
export interface ExpMeta<T extends GenericExpTypes> {
  /** Number of trials to run */
  numTrials: number;
  /** Folder where results are stored */
  folder: string;
  /** Name of the experiment */
  name: string;
  /** Unique trace identifier */
  traceId: number;
  /** Query data configuration */
  queryData: QueryData<T>;
}

export interface ExpResults<DataType, ExpectedType> {
  /** Raw results from the trials */
  raw: TrialData<DataType>[];
  /** Evaluation results for each trial */
  evaluation?: EvaluationResult<DataType, ExpectedType>[];
  /** Aggregated evaluation results */
  aggregated?: AggregatedEvaluationResult;
}

/** Complete experiment data including variables, metadata, and results */
export interface ExperimentData<T extends GenericExpTypes> {
  /** Experiment variables configuration */
  variables: ExpVars;
  /** Experiment metadata */
  meta: ExpMeta<T["DataSchema"]>;
  /** Experiment results */
  results: ExpResults<T["Data"], T["Evaluation"]>;
  /** Optional usage statistics */
  usage?: Usages;
}

/** Result data from multiple trials */
export interface TrialsResultData<DataType> {
  /** Experiment variables used */
  variables: ExpVars;
  /** Optional usage statistics */
  usage?: Usages;
  /** Array of trial data */
  trials: TrialData<DataType>[];
}

/** Result from a single trial */
export interface TrialResult<DataType> {
  /** ID of the prompt used */
  promptId: string;
  /** Turn prompts used in this trial */
  turnPrompts: TurnPrompt[];
  /** Total number of attempts made */
  totalTries: number;
  /** Failed attempts for each turn */
  failedAttempts: TurnResponseNotOk<DataType>[][];
  /** Whether the trial was successful */
  ok: boolean;
  /** Optional usage statistics */
  usage?: Usages;
  /** Valid results if successful */
  result?: ValidData<DataType>[];
}

/** Data for a single trial */
export interface TrialData<DataType> {
  /** The prompt ID used for this trial */
  promptId: string;

  /** The usages of each try and turn */
  usage?: Usages;

  /** The data for all turns of each attempt of this trial */
  attempts: TrialAttempts<DataType>;
}

/** Data for a single conversation turn */
export interface TurnData<DataType> {
  /** The parsed data from the turn */
  data: DataType;
  /** The prompt used for this turn */
  prompt: TurnPrompt;
}

/** A single turn in a conversation prompt */
export interface TurnPrompt {
  /** The text content of the prompt */
  text: string;
  /** Word pairs associated with this turn */
  pairs: [string, string][];
}

/** Base interface for turn responses */
export interface BaseTurnResponse<DataType> {
  /** The prompt that was used for this turn */
  turnPrompt: TurnPrompt;
  /** Usage statistics for this turn */
  usage: Usages;
  /** Optional validation result */
  result?: ValidationResult<DataType>;
  /** Whether the turn was successful */
  ok: boolean;
}

/** Successful turn response */
export interface TurnResponseOk<DataType> extends BaseTurnResponse<DataType> {
  ok: true;
  /** Valid data from the successful turn */
  result: ValidData<DataType>;
}

/** Failed turn response */
export interface TurnResponseNotOk<DataType>
  extends BaseTurnResponse<DataType> {
  ok: false;
}

/** Union type for turn responses */
export type TurnResponse<DataType> =
  | TurnResponseOk<DataType>
  | TurnResponseNotOk<DataType>;

/** Array of turn responses */
export type TurnResponses<DataType> = TurnResponse<DataType>[];

/** Array of trial attempts, each containing turn responses */
export type TrialAttempts<DataType> = TurnResponses<DataType>[];

/** Aggregated evaluation results across multiple trials */
export interface AggregatedEvaluationResult {
  /** Average score over all results */
  allDataAvg: number | null;

  /** Standard deviation over all results */
  allDataStdev?: number | null;

  /** Average score over successful results only */
  okDataAvg: number | null;

  /** Standard deviation over successful results only */
  okDataStdev?: number | null;

  /** Count of each result type */
  resultTypes: {
    [key in EvaluationResultType]: number;
  };
}

/** Multi-dimensional scores indexed by word pairs and datasets */
export interface MultiDatasetScores {
  [w1: string]: {
    [w2: string]: {
      [dataset: string]: number;
    };
  };
}

/** Usage statistics indexed by model ID */
export type Usages = { [key in ModelId]?: Usage };

/** Usage statistics for a model */
export interface Usage {
  /** Number of input tokens used */
  inputTokens: number;
  /** Number of output tokens generated */
  outputTokens: number;
  /** Total number of tokens used */
  totalTokens: number;
  /** ID of the model used */
  modelId: ModelId;
  /** Optional cost of the usage */
  cost?: number;
  /** Currency of the cost */
  costCurrency?: "$" | "€" | "£";
}

/** Experiment score with associated variables */
export interface ExpScore {
  /** Variables used in the experiment */
  variables: ExpVars;
  /** Score achieved, null if failed */
  score: number | null;
}

/** Options for running a trial */
export interface TrialOpts {
  /**
   * Maximum number of attempts to retry the failed pairs of a trial
   */
  maxTrialAttempts: number;

  /**
   * Previous failed pairs to retry
   * This is used when a trial has already been attempted and we want to retry the failed pairs
   */
  prevFailedPairs?: [string, string][];

  /** Whether to use cached results if available */
  useCache?: boolean;
}
