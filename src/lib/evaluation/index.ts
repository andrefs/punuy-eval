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

export class EvaluationResult<DataType, ExpectedType = DataType> {
  type: EvaluationResultType;
  ok: boolean;
  got?: DataType;
  expected?: ExpectedType;

  constructor(
    type: EvaluationResultType,
    ok: boolean,
    got?: DataType,
    expected?: ExpectedType
  ) {
    this.type = type;
    this.ok = ok;
    this.got = got;
    this.expected = expected;
  }
}

export class DataIncomplete<
  DataType,
  ExpectedType = DataType
> extends EvaluationResult<DataType, ExpectedType> {
  percentage: number;

  constructor(percentage: number, got: DataType, expected: ExpectedType) {
    super("data-incomplete", false, got, expected);
    this.percentage = percentage;
  }
}

export class DataPartiallyIncorrect<
  DataType,
  ExpectedType = DataType
> extends EvaluationResult<DataType, ExpectedType> {
  percentage: number;

  constructor(percentage: number, got: DataType, expected: ExpectedType) {
    super("data-partially-incorrect", false, got, expected);
    this.percentage = percentage;
  }
}

export class DataIncorrect<
  DataType,
  ExpectedType = DataType
> extends EvaluationResult<DataType, ExpectedType> {
  constructor(got: DataType, expected: ExpectedType) {
    super("data-incorrect", false, got, expected);
  }
}

export class DataInvalidOnAllTries<
  DataType,
  ExpectedType = DataType
> extends EvaluationResult<DataType, ExpectedType> {
  constructor(got: DataType, expected: ExpectedType) {
    super("data-invalid-on-all-tries", false, got, expected);
  }
}

export class DataCorrect<
  DataType,
  ExpectedType = DataType
> extends EvaluationResult<DataType, ExpectedType> {
  constructor(got: DataType, expected: ExpectedType) {
    super("data-correct", true, got, expected);
  }
}

export class NonEvaluatedData<
  DataType,
  ExpectedType = DataType
> extends EvaluationResult<DataType, ExpectedType> {
  constructor(got: DataType, expected: ExpectedType) {
    super("non-evaluated-data", true, got, expected);
  }
}

export class NonUsableData<
  DataType,
  ExpectedType = DataType
> extends EvaluationResult<DataType, ExpectedType> {
  constructor(got: DataType, expected: ExpectedType) {
    super("non-usable-data", false, got, expected);
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
