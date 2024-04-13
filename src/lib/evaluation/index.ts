/***************
 * Validation *
 **************/

export type ValidationResultType =
  | "json-syntax-error"
  | "json-schema-error"
  | "no-data"
  | "valid-data";

export class ValidationResult<DataType> {
  type: ValidationResultType;
  ok: boolean;
  data?: DataType | string;

  constructor(type: ValidationResultType, ok: boolean, data?: DataType) {
    this.type = type;
    this.ok = ok;
    this.data = data;
  }
}

export class JsonSyntaxError extends ValidationResult<string> {
  constructor(data: string) {
    super("json-syntax-error", false, data);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class JsonSchemaError extends ValidationResult<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("json-schema-error", false, data);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class NoData extends ValidationResult<any> {
  constructor() {
    super("no-data", false);
  }
}
export class ValidData<DataType> extends ValidationResult<DataType> {
  data: DataType;

  constructor(data: DataType) {
    super("valid-data", true);
    this.data = data;
  }
}

/**************
 * Evaluation *
 **************/

import { AggregatedEvaluationResult } from "../experiments";
export type EvaluationResultType =
  | "data-incomplete"
  | "data-partially-incorrect"
  | "data-incorrect"
  | "non-evaluated-data"
  | "data-invalid-on-all-tries"
  | "non-usable-data"
  | "data-correct";

export class EvaluationResult<DataType> {
  type: EvaluationResultType;
  ok: boolean;
  data?: DataType;

  constructor(type: EvaluationResultType, ok: boolean, data?: DataType) {
    this.type = type;
    this.ok = ok;
    this.data = data;
  }
}

export class DataIncomplete<DataType> extends EvaluationResult<DataType> {
  percentage: number;

  constructor(percentage: number, data: DataType) {
    super("data-incomplete", false, data);
    this.percentage = percentage;
  }
}

export class DataPartiallyIncorrect<
  DataType
> extends EvaluationResult<DataType> {
  percentage: number;

  constructor(percentage: number, data: DataType) {
    super("data-partially-incorrect", false, data);
    this.percentage = percentage;
  }
}

export class DataIncorrect<DataType> extends EvaluationResult<DataType> {
  expected?: DataType;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data: DataType, expected?: any) {
    super("data-incorrect", false, data);
    this.expected = expected;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class DataInvalidOnAllTries extends EvaluationResult<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data: any) {
    super("data-invalid-on-all-tries", false, data);
  }
}

export class DataCorrect<DataType> extends EvaluationResult<DataType> {
  constructor(data: DataType) {
    super("data-correct", true, data);
  }
}

export class NonEvaluatedData<
  DataType,
  ExtraType = void
> extends EvaluationResult<DataType> {
  extra?: ExtraType;
  constructor(data?: DataType, extra?: ExtraType) {
    super("non-evaluated-data", true, data);
    this.extra = extra;
  }
}

export class NonUsableData<DataType> extends EvaluationResult<DataType> {
  constructor(data?: DataType) {
    super("non-usable-data", false, data);
  }
}

export async function combineEvaluations<DataType>(
  vs: EvaluationResult<DataType>[]
): Promise<AggregatedEvaluationResult> {
  let sum = 0;
  const resultTypes = {} as { [key in EvaluationResultType]: number };

  for (const v of vs) {
    resultTypes[v.type] = resultTypes[v.type] || 0;
    resultTypes[v.type]++;
    if (v.type === "data-correct") {
      sum += 1;
    }
    if ("percentage" in v && typeof v.percentage === "number") {
      sum += v.percentage;
    }
  }

  return { avg: sum / vs.length, resultTypes };
}
