export class ValidationResult {
  type: string;
  ok: boolean;
  data?: any;

  constructor(type: string, ok: boolean, data?: any) {
    this.type = type;
    this.ok = ok;
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
    super('no-data', false);
  }
}


export class DataCorrect extends ValidationResult {
  constructor(data?: any) {
    super('data-correct', true, data);
  }
}


