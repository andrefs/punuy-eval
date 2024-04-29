import { MeasureType } from "punuy-datasets/src/lib/types";
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

export interface ExpMeta<T extends GenericExpTypes> {
  trials: number;
  name: string;
  traceId: number;
  queryData: QueryData<T>;
}

export interface ExpResults<DataType, ExpectedType> {
  /** Raw results from the trials */
  raw: DataType[];
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
  totalTries: number;
  failedAttempts: ValidationResult<DataType>[];
  ok: boolean;
  usage?: Usages;
  result?: ValidData<DataType>;
}

export interface TrialsResultData<DataType> {
  variables: ExpVars;
  usage?: Usages;
  data: DataType[];
}

export interface AggregatedEvaluationResult {
  avg: number;
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
  score: number;
}
