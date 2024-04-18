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
  | "openMistral8x7B"
  | "openMistral8x22B";
