import { AggregatedEvaluationResult } from "../experiments";

export type EvaluationType =
  | "json-syntax-error"
  | "json-schema-error"
  | "data-incomplete"
  | "data-partially-incorrect"
  | "data-incorrect"
  | "no-data"
  | "non-evaluated-data"
  | "data-correct";

export class EvaluationResult {
  type: EvaluationType;
  ok: boolean;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(type: EvaluationType, ok: boolean, data: any) {
    this.type = type;
    this.ok = ok;
    this.data = data;
  }
}

export class JsonSyntaxError extends EvaluationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("json-syntax-error", false, data);
  }
}

export class JsonSchemaError extends EvaluationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data?: any) {
    super("json-schema-error", false, data);
  }
}

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

export class NoData extends EvaluationResult {
  constructor() {
    super("no-data", false, "");
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
  const resultTypes = {} as { [key in EvaluationType]: number };

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
