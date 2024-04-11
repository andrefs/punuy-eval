import { AggregatedEvaluationResult } from "../experiments";
export type EvaluationResultType =
  | "data-incomplete"
  | "data-partially-incorrect"
  | "data-incorrect"
  | "non-evaluated-data"
  | "data-invalid-on-all-tries"
  | "data-correct";

export class EvaluationResult {
  type: EvaluationResultType;
  ok: boolean;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(type: EvaluationResultType, ok: boolean, data: any) {
    this.type = type;
    this.ok = ok;
    this.data = data;
  }
}

/***************
 * Validation *
 **************/

export type ValidationResultType =
  | "json-syntax-error"
  | "json-schema-error"
  | "no-data"
  | "valid-data";

export class ValidationResult {
  type: ValidationResultType;
  ok: boolean;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(type: ValidationResultType, ok: boolean, data: any) {
    this.type = type;
    this.ok = ok;
    this.data = data;
  }
}

export class JsonSyntaxError extends ValidationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("json-syntax-error", false, data);
  }
}

export class JsonSchemaError extends ValidationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("json-schema-error", false, data);
  }
}

export class NoData extends ValidationResult {
  constructor() {
    super("no-data", false, "");
  }
}
export class ValidData extends ValidationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("valid-data", true, data);
  }
}

/**************
 * Evaluation *
 **************/

export class DataIncomplete extends EvaluationResult {
  percentage: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(percentage: number, data?: any) {
    super("data-incomplete", false, data);
    this.percentage = percentage;
  }
}

export class DataPartiallyIncorrect extends EvaluationResult {
  percentage: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(percentage: number, data?: any) {
    super("data-partially-incorrect", false, data);
    this.percentage = percentage;
  }
}

export class DataIncorrect extends EvaluationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("data-incorrect", false, data);
  }
}

export class DataInvalidOnAllTries extends EvaluationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("data-invalid-on-all-tries", false, data);
  }
}

export class DataCorrect extends EvaluationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("data-correct", true, data);
  }
}

export class NonEvaluatedData extends EvaluationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("non-evaluated-data", true, data);
  }
}

export async function combineEvaluations(
  vs: EvaluationResult[]
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
