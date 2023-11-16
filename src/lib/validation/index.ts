export class ValidationResult {
  type: string;
  ok: boolean;

  constructor(type: string, ok: boolean) {
    this.type = type;
    this.ok = ok;
  }
}


export class JsonSyntaxError extends ValidationResult {
  constructor() {
    super('json-syntax-error', false);
  }
}

export class JsonSchemaError extends ValidationResult {
  constructor() {
    super('json-schema-error', false);
  }
}

export class DataIncomplete extends ValidationResult {
  percentage: number;

  constructor(percentage: number) {
    super('data-incomplete', false);
    this.percentage = percentage;
  }
}

export class DataPartiallyIncorrect extends ValidationResult {
  percentage: number;

  constructor(percentage: number) {
    super('data-partially-incorrect', false);
    this.percentage = percentage;
  }
}

export class DataIncorrect extends ValidationResult {
  constructor() {
    super('data-incorrect', false);
  }
}

export class DataCorrect extends ValidationResult {
  constructor() {
    super('data-correct', true);
  }
}


