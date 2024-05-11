import {
  claude3opus,
  claude3haiku,
  commandR,
  mistralSmall,
  openMixtral8x7B,
  openMixtral8x22B,
  Model,
  gpt35turbo,
  openMistral7B,
  mistralLarge,
  commandRPlus,
  claude3sonnet,
  gpt4turbo,
  gpt4,
  gemini10pro,
  gemini15pro,
} from ".";

export * from "./model";
export * from "./openai";
export * from "./anthropic";
export * from "./cohere";
export * from "./mistral";
export * from "./google";

export type ModelId =
  // openai
  | "gpt-3.5-turbo-0125"
  | "gpt-4"
  | "gpt-4-turbo-2024-04-09"

  // anthropic
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307"

  // cohere
  | "command-r-plus"
  | "command-r"

  // mistral
  | "mistral-large-latest"
  | "mistral-small-latest"
  | "open-mistral-7b"
  | "open-mixtral-8x7b"
  | "open-mixtral-8x22b"

  // google;
  | "gemini-1.0-pro"
  | "gemini-1.5-pro-latest";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "cohere"
  | "mistral"
  | "google";

const modelsById: { [key in ModelId]: Model } = {
  // openai
  "gpt-3.5-turbo-0125": gpt35turbo,
  "gpt-4": gpt4,
  "gpt-4-turbo-2024-04-09": gpt4turbo,

  // anthropic
  "claude-3-opus-20240229": claude3opus,
  "claude-3-sonnet-20240229": claude3sonnet,
  "claude-3-haiku-20240307": claude3haiku,

  // cohere
  "command-r-plus": commandRPlus,
  "command-r": commandR,

  // mistral
  "mistral-large-latest": mistralLarge,
  "mistral-small-latest": mistralSmall,
  "open-mistral-7b": openMistral7B,
  "open-mixtral-8x7b": openMixtral8x7B,
  "open-mixtral-8x22b": openMixtral8x22B,

  // google
  "gemini-1.0-pro": gemini10pro,
  "gemini-1.5-pro-latest": gemini15pro,
};

export function getModelById(id: ModelId): Model {
  return modelsById[id];
}
