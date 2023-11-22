import OpenAI from "openai";
import { Model } from "../models";
import { DatasetProfile } from "../types";
import { ValidationResult } from "../validation";


class Experiment {
  name: string;
  description: string;
  genPrompt: (ds: DatasetProfile) => string;
  schema: any; // TODO
  run: (this: Experiment, ds: DatasetProfile, model: Model) => Promise<string>;
  validate: (ds: DatasetProfile, data: string) => Promise<ValidationResult>;

  constructor(
    name: string,
    description: string,
    genPrompt: (ds: DatasetProfile) => string,
    schema: any,
    run: (prompt: string, schema: any, ds: DatasetProfile, model: Model) => Promise<ExperimentResult>,
    validate: (ds: DatasetProfile, data: string) => Promise<ValidationResult>,
  ) {
    this.name = name;
    this.description = description;
    this.genPrompt = genPrompt;
    this.schema = schema;
    this.run = async function(this: Experiment, ds: DatasetProfile, model: Model) {
      const prompt = this.genPrompt(ds);
      console.warn(`Running experiment ${this.name} on model (${model.modelId}).`);
      console.warn(`Prompt: ${prompt}`);

      const res = await run(prompt, this.schema, ds, model);
      if (res.type === 'openai') {
        return res.data.choices[0].message.tool_calls?.[0].function.arguments || '';
      }
      return '';
    }
    this.validate = validate;
  }
}

export type ExperimentResult = {
  type: 'openai';
  data: OpenAI.Chat.Completions.ChatCompletion;
}

export default Experiment;


