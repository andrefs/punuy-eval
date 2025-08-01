import { RelationType } from "punuy-datasets/src/lib/types";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import {
  EvaluationResult,
  EvaluationResultType,
  ValidData,
  ValidationResult,
} from "src/lib/evaluation";
import { Model, ModelId, ToolSchema } from "src/lib/models";

export type GenToolSchema = (opts?: any) => ToolSchema; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface QueryData<T extends GenericExpTypes> {
  responseSchema: T["DataSchema"];
  genToolSchema: GenToolSchema;
}
export interface SinglePairScore {
  words: [string, string];
  score: number;
}
export type PairScoreList = SinglePairScore[];

export interface ScoreDict {
  [key: string]: { [key: string]: number };
}

export interface GenericExpTypes {
  Data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  DataSchema: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  Evaluation: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ExpVarMatrix {
  model: Model[];
  dpart: DsPartition[];
  language?: ({ id: "pt" } | { id: "en" })[];
  relationType?: { id: RelationType }[];
  prompt?: (Prompt | PromptGenerator)[];
  jobType?: { id: PromptJobType }[];
}

export type ExpVarsFixedPrompt = Omit<ExpVars, "prompt"> & { prompt: Prompt };

export interface ExpVars {
  dpart: DsPartition;
  model: Model;
  language?: {
    id: "pt" | "en";
  };
  relationType?: {
    id: RelationType;
  };
  prompt: PromptGenerator;
  jobType?: { id: PromptJobType };
}

export interface PromptGenerator {
  id: string;
  relationType?: RelationType;
  language: "pt" | "en";
  generate: (
    vars: Omit<ExpVars, "prompt">,
    pairs?: [string, string][]
  ) => Prompt;
}

/*
 * How to send pairs to the model
 * singlePair: send one pair at a time
 * batches: send pairs in batches
 * full: send all pairs at once
 */

export const jobTypes = ["singlePair", "batches", "allPairs"] as const;
export type PromptJobType = (typeof jobTypes)[number];

export interface BasePrompt {
  id: string;
  relationType?: RelationType;
  jobType: PromptJobType;
  language: "pt" | "en";
  pairs?: [string, string][] | [string, string][][];
  turns: TurnPrompt[];
}
export interface SinglePairPrompt extends BasePrompt {
  jobType: "singlePair";
  pairs: [string, string][];
}
export interface BatchesPrompt extends BasePrompt {
  jobType: "batches";
  pairs: [string, string][][];
}
export interface AllPairsPrompt extends BasePrompt {
  jobType: "allPairs";
  pairs: [string, string][];
}

export type Prompt = SinglePairPrompt | BatchesPrompt | AllPairsPrompt;

export interface ExpMeta<T extends GenericExpTypes> {
  numTrials: number;
  folder: string;
  name: string;
  traceId: number;
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

export interface ExperimentData<T extends GenericExpTypes> {
  variables: ExpVars;
  meta: ExpMeta<T["DataSchema"]>;
  results: ExpResults<T["Data"], T["Evaluation"]>;
  usage?: Usages;
}

export interface TrialsResultData<DataType> {
  variables: ExpVars;
  usage?: Usages;
  trials: TrialData<DataType>[];
}

export interface TrialResult<DataType> {
  promptId: string;
  turnPrompts: TurnPrompt[];
  totalTries: number;
  failedAttempts: TurnResponseNotOk<DataType>[][];
  ok: boolean;
  usage?: Usages;
  result?: ValidData<DataType>[];
}

/** Data for a single trial */
export interface TrialData<DataType> {
  /** The prompt ID used for this trial */
  promptId: string;

  /** The usages of each try and turn */
  usage?: Usages;

  /** The data for all turns of each attempt of this trial */
  attempts: TurnResponses<DataType>[];
}

export interface TurnData<DataType> {
  data: DataType;
  prompt: TurnPrompt;
}

export interface TurnPrompt {
  text: string;
  pairs: [string, string][];
}

export interface BaseTurnResponse<DataType> {
  turnPrompt: TurnPrompt;
  usage: Usages;
  result?: ValidationResult<DataType>;
  ok: boolean;
}
export interface TurnResponseOk<DataType> extends BaseTurnResponse<DataType> {
  ok: true;
  result: ValidData<DataType>;
}

export interface TurnResponseNotOk<DataType>
  extends BaseTurnResponse<DataType> {
  ok: false;
}

export type TurnResponse<DataType> =
  | TurnResponseOk<DataType>
  | TurnResponseNotOk<DataType>;

export type TurnResponses<DataType> = TurnResponse<DataType>[];

export type TrialAttempts<DataType> = TurnResponses<DataType>[];

export interface AggregatedEvaluationResult {
  /*
   * Average score over all results
   */
  allDataAvg: number | null;

  /**
   * Standard deviation over all results
   */
  allDataStdev?: number | null;

  /*
   * Average score over ok results
   */
  okDataAvg: number | null;

  /**
   * Standard deviation over ok results
   */
  okDataStdev?: number | null;

  resultTypes: {
    [key in EvaluationResultType]: number;
  };
}

export interface MultiDatasetScores {
  [w1: string]: {
    [w2: string]: {
      [dataset: string]: number;
    };
  };
}

export type Usages = { [key in ModelId]?: Usage };
export interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelId: ModelId;
  cost?: number;
  costCurrency?: "$" | "€" | "£";
}

export interface ExpScore {
  variables: ExpVars;
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
}
