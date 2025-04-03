import { RelationType } from "punuy-datasets/src/lib/types";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import {
  EvaluationResult,
  EvaluationResultType,
  ValidData,
  ValidationResult,
} from "src/lib/evaluation";
import { Model, ModelId, ToolSchema } from "src/lib/models";

export interface QueryData<T extends GenericExpTypes> {
  responseSchema: T["DataSchema"];
  toolSchema: ToolSchema;
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
  prompt: Prompt | PromptGenerator;
  jobType?: { id: PromptJobType };
}

export interface PromptGenerator {
  id: string;
  relationType?: RelationType;
  language: "pt" | "en";
  generate: (vars: Omit<ExpVars, "prompt">) => Prompt;
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
  trials: number;
  name: string;
  traceId: number;
  queryData: QueryData<T>;
}

export interface ExpResults<DataType, ExpectedType> {
  /** Raw results from the trials */
  raw: {
    turns: {
      data: DataType;
      prompt: TurnPrompt;
    }[];
  }[];
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

export interface TrialResult<DataType> {
  promptId: string;
  turnPrompts: TurnPrompt[];
  totalTries: number;
  failedAttempts: TurnResponseNotOk<DataType>[][];
  ok: boolean;
  usage?: Usages;
  result?: ValidData<DataType>[];
}

export interface TurnPrompt {
  text: string;
  pairs: [string, string][];
}

export interface BaseTurnResponse<DataType> {
  turnPrompt: TurnPrompt;
  usage: Usages;
  result?: ValidationResult<DataType>;
  failedAttempts: ValidationResult<DataType>[];
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

export interface TrialsResultData<DataType> {
  variables: ExpVars;
  usage?: Usages;
  trials: {
    turns: {
      data: DataType;
      prompt: TurnPrompt;
    }[];
  }[];
}

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
