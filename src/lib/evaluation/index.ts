/***************
 * Validation *
 **************/

export type ValidationResultType =
  | "json-syntax-error"
  | "json-schema-error"
  | "invalid-data"
  | "exception-thrown"
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
export class InvalidData<DataType> extends ValidationResult<DataType> {
  data: DataType;

  constructor(data: DataType) {
    super("invalid-data", false);
    this.data = data;
  }
}

export class ExceptionThrown extends ValidationResult<null> {
  constructor() {
    super("exception-thrown", false);
  }
}

export class ValidData<DataType> extends ValidationResult<DataType> {
  data: DataType;

  constructor(data: DataType) {
    super("valid-data", true);
    this.data = data;
  }
}

/** Exception */

export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
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

export class DataOk<DataType, ExpectedType = DataType> extends EvaluationResult<
  DataType,
  ExpectedType
> {
  percentage: number;

  constructor(
    type: EvaluationResultType,
    percentage: number,
    got: DataType,
    expected: ExpectedType
  ) {
    super(type, true, got, expected);
    this.percentage = percentage;
    this.ok = true;
  }
}

export class DataNotOk<
  DataType,
  ExpectedType = DataType,
> extends EvaluationResult<DataType, ExpectedType> {
  constructor(
    type: EvaluationResultType,
    got: DataType,
    expected: ExpectedType
  ) {
    super(type, false, got, expected);
    this.ok = false;
  }
}
export class DataIncomplete<DataType, ExpectedType = DataType> extends DataOk<
  DataType,
  ExpectedType
> {
  percentage: number;
  constructor(percentage: number, got: DataType, expected: ExpectedType) {
    super("data-incomplete", percentage, got, expected);
    this.percentage = percentage;
  }
}

export class DataPartiallyIncorrect<
  DataType,
  ExpectedType = DataType,
> extends DataOk<DataType, ExpectedType> {
  percentage: number;

  constructor(percentage: number, got: DataType, expected: ExpectedType) {
    super("data-partially-incorrect", percentage, got, expected);
    this.percentage = percentage;
  }
}

export class DataCorrect<DataType, ExpectedType = DataType> extends DataOk<
  DataType,
  ExpectedType
> {
  percentage = 1;
  constructor(got: DataType, expected: ExpectedType) {
    super("data-correct", 1, got, expected);
  }
}

export class DataIncorrect<DataType, ExpectedType = DataType> extends DataNotOk<
  DataType,
  ExpectedType
> {
  constructor(got: DataType, expected: ExpectedType) {
    super("data-incorrect", got, expected);
  }
}

export class DataInvalidOnAllTries<
  DataType,
  ExpectedType = DataType,
> extends DataNotOk<DataType, ExpectedType> {
  constructor(got: DataType, expected: ExpectedType) {
    super("data-invalid-on-all-tries", got, expected);
  }
}

export class NonEvaluatedData<
  DataType,
  ExpectedType = DataType,
> extends DataNotOk<DataType, ExpectedType> {
  constructor(got: DataType, expected: ExpectedType) {
    super("non-evaluated-data", got, expected);
  }
}

export class NonUsableData<DataType, ExpectedType = DataType> extends DataNotOk<
  DataType,
  ExpectedType
> {
  constructor(got: DataType, expected: ExpectedType) {
    super("non-usable-data", got, expected);
  }
}

export async function combineEvaluations<DataType, ExpectedType = DataType>(
  vs: EvaluationResult<DataType, ExpectedType>[]
): Promise<AggregatedEvaluationResult> {
  const resultTypes = {} as { [key in EvaluationResultType]: number };
  let sum = 0;
  let okSum = 0;
  let okCount = 0;

  for (const v of vs) {
    resultTypes[v.type] = resultTypes[v.type] || 0;
    resultTypes[v.type]++;
    if (v instanceof DataOk) {
      sum += v.percentage;
      okSum += v.percentage;
      okCount++;
    }
  }

  return {
    allDataAvg: sum / vs.length,
    okDataAvg: okSum / okCount,
    resultTypes,
  };
}
