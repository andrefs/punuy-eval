import { AggregatedValidationResult } from "../experiments";

export type ValidationType = 'json-syntax-error' | 'json-schema-error' | 'data-incomplete' | 'data-partially-incorrect' | 'data-incorrect' | 'no-data' | 'data-correct';

export class ValidationResult {
  type: ValidationType;
  ok: boolean;
  rawData: string;
  data?: any;

  constructor(type: ValidationType, ok: boolean, rawdata: string, data?: any) {
    this.type = type;
    this.ok = ok;
    this.rawData = rawdata;
    if (data) {
      this.data = data;
    }
  }
}


export class JsonSyntaxError extends ValidationResult {
  constructor(data?: any) {
    super('json-syntax-error', false, data);
  }
}

export class JsonSchemaError extends ValidationResult {
  constructor(data?: any) {
    super('json-schema-error', false, data);
  }
}

export class DataIncomplete extends ValidationResult {
  percentage: number;

  constructor(percentage: number, data?: any) {
    super('data-incomplete', false, data);
    this.percentage = percentage;
  }
}

export class DataPartiallyIncorrect extends ValidationResult {
  percentage: number;

  constructor(percentage: number, data?: any) {
    super('data-partially-incorrect', false, data);
    this.percentage = percentage;
  }
}

export class DataIncorrect extends ValidationResult {
  constructor(data?: any) {
    super('data-incorrect', false, data);
  }
}

export class NoData extends ValidationResult {
  constructor() {
    super('no-data', false, '');
  }
}


export class DataCorrect extends ValidationResult {
  constructor(data?: any) {
    super('data-correct', true, data);
  }
}


export async function combineValidations(vs: ValidationResult[]): Promise<AggregatedValidationResult> {
  let sum = 0;
  const resultTypes = {} as { [key in ValidationType]: number };

  for (const v of vs) {
    resultTypes[v.type] = resultTypes[v.type] || 0;
    resultTypes[v.type]++;
    if (v.type === 'data-correct') {
      sum += 1;
    }
    if ('percentage' in v && typeof v.percentage === 'number') {
      sum += v.percentage;
    }
  }

  return { avg: sum / vs.length, resultTypes };
}
