
export interface JsonSyntaxError {
  type: 'json-syntax-error',
}

export interface JsonSchemaError {
  type: 'json-schema-error',
}

export interface DataIncomplete {
  type: 'data-incomplete',
  percentage: number,
}

export interface DataPartiallyIncorrect {
  type: 'data-partially-incorrect',
  percentage: number,
}

export interface DataIncorrect {
  type: 'data-incorrect',
}

export interface DataCorrect {
  type: 'data-correct',
}

export type ValidationResult =
  JsonSyntaxError
  | JsonSchemaError
  | DataIncomplete
  | DataPartiallyIncorrect
  | DataIncorrect
  | DataCorrect;
