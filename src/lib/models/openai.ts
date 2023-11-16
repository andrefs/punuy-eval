import OpenAI from "openai";
import { Model } from "./model";

const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};


if (!configuration.apiKey) {
  console.error("OpenAI API key not configured, please follow instructions in README.md");
}
const openai = new OpenAI(configuration);


const buildModel = (openai: OpenAI, modelId: string) => {
  const makeRequest = async function(prompt: string, params: any) {
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: "You are a helpful recipe assistant." },
        {
          role: 'user',
          content: prompt,

        }
      ],
      functions: [{ name: "choose_intruder", parameters: params.schema }],
      function_call: { name: "choose_intruder" },
    });
    return completion;
  };

  return new Model(modelId, makeRequest);
}

export const gpt35turbo = buildModel(openai, "gpt-3.5-turbo-1106");
export const gpt4 = buildModel(openai, "gpt-4-0613");
export const gpt4turbo = buildModel(openai, "gpt-4-1106-preview");
