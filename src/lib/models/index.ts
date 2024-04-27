export * from "./model";
export * from "./openai";
export * from "./anthropic";
export * from "./cohere";
export * from "./mistral";

export type ModelIds =
  // openai
  | "gpt35turbo"
  | "gpt4"
  | "gpt4turbo"

  // anthropic
  | "claude3opus"
  | "claude3sonnet"
  | "claude3haiku"

  // cohere
  | "commandRPlus"
  | "commandR"

  // mistral
  | "mistralLarge"
  | "mistralMedium"
  | "mistralSmall"
  | "openMistral7B"
  | "openMixtral8x7B"
  | "openMixtral8x22B";
