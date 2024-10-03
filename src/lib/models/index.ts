import {
  claude3opus,
  claude3haiku,
  commandR_032024,
  mistralSmall_2409,
  openMixtral8x7B,
  openMixtral8x22B,
  Model,
  gpt35turbo_0125,
  openMistral7B,
  mistralLarge_2407,
  commandRPlus_042024,
  claude3sonnet_20240229,
  gpt4turbo_20240409,
  gpt4_0613,
  gemini10pro_001,
  gemini15pro_002,
  gemini15flash_002,
} from ".";
import { commandRPlus_082024, commandR_082024 } from "./cohere";
import { mistralMedium_2312, openMistralNemo_2407 } from "./mistral";
import { gpt4o_20240513, gpt4o_20240806, gpt4omini_20240718 } from "./openai";

export * from "./model";
export * from "./openai";
export * from "./anthropic";
export * from "./cohere";
export * from "./mistral";
export * from "./google";

export type ModelId =
  // openai
  | "gpt-3.5-turbo-0125"
  | "gpt-4-0613"
  | "gpt-4-turbo-2024-04-09"
  | "o1-preview-2024-09-12"
  | "o1-mini-2024-09-12"
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4o-2024-05-13"
  | "gpt-4o-2024-08-06"

  // anthropic
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-5-sonnet-20240620"
  | "claude-3-haiku-20240307"

  // cohere
  | "command-r-plus-08-2024"
  | "command-r-plus-04-2024"
  | "command-r-08-2024"
  | "command-r-03-2024"

  // mistral
  | "mistral-large-2407"
  | "mistral-medium-2312"
  | "mistral-small-2409"
  | "open-mistral-nemo-2407"
  | "open-mistral-7b"
  | "open-mixtral-8x7b"
  | "open-mixtral-8x22b"

  // google;
  | "gemini-1.0-pro-001"
  | "gemini-1.5-pro-002"
  | "gemini-1.5-flash-002";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "cohere"
  | "mistral"
  | "google";

const modelsById: { [key in ModelId]: Model } = {
  // openai
  "gpt-3.5-turbo-0125": gpt35turbo_0125,
  "gpt-4-0613": gpt4_0613,
  "gpt-4-turbo-2024-04-09": gpt4turbo_20240409,
  "o1-preview-2024-09-12": gpt4turbo_20240409,
  "o1-mini-2024-09-12": gpt4turbo_20240409,
  "gpt-4o-mini-2024-07-18": gpt4omini_20240718,
  "gpt-4o-2024-05-13": gpt4o_20240513,
  "gpt-4o-2024-08-06": gpt4o_20240806,

  // anthropic
  "claude-3-opus-20240229": claude3opus,
  "claude-3-sonnet-20240229": claude3sonnet_20240229,
  "claude-3-5-sonnet-20240620": claude3sonnet_20240229,
  "claude-3-haiku-20240307": claude3haiku,

  // cohere
  "command-r-plus-04-2024": commandRPlus_042024,
  "command-r-plus-08-2024": commandRPlus_082024,
  "command-r-03-2024": commandR_032024,
  "command-r-08-2024": commandR_082024,

  // mistral
  "mistral-large-2407": mistralLarge_2407,
  "mistral-medium-2312": mistralMedium_2312,
  "mistral-small-2409": mistralSmall_2409,
  "open-mistral-nemo-2407": openMistralNemo_2407,
  "open-mistral-7b": openMistral7B,
  "open-mixtral-8x7b": openMixtral8x7B,
  "open-mixtral-8x22b": openMixtral8x22B,

  // google
  "gemini-1.0-pro-001": gemini10pro_001,
  "gemini-1.5-pro-002": gemini15pro_002,
  "gemini-1.5-flash-002": gemini15flash_002,
};

export function getModelById(id: ModelId): Model {
  return modelsById[id];
}
