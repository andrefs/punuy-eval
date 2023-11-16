import OpenAI from "openai";
import 'dotenv/config';
import loadDataset from "./lib/load-dataset";
import { DatasetProfile } from "./lib/types";

const dsId = 'rg65';


const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};


if (!configuration.apiKey) {
  console.error("OpenAI API key not configured, please follow instructions in README.md");
}
const openai = new OpenAI(configuration);


const askCompletion = async (openai: OpenAI, model: string, prompt: string, schema: any) => {
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a helpful recipe assistant." },
      {
        role: 'user',
        content: prompt,

      }
    ],
    functions: [{ name: "choose_intruder", parameters: schema }],
    function_call: { name: "choose_intruder" },
  });

  return completion;
}

const genPrompt = (ds: DatasetProfile) => {
  const year = ds.metadata.date.split('-')[0];
  return `${ds.metadata.name} is a semantic measure gold standard dataset, published in ${year}. It is composed of pairs of concepts and their semantic ${ds.metadata.measureType} score as reported by humans. Please list 5 pairs of words included in this dataset.`
}

const expDatasetAwaremess = async (prompt: string) => {
  const schema = {
    "type": "object",
    "properties": {
      "entries": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "word1": {
              "type": "string",
            },
            "word2": {
              "type": "string",
            }
          }
        }
      }
    }
  }

  const gpt35_turbo1106 = await askCompletion(openai, "gpt-3.5-turbo-1106", prompt, schema);
  const gpt4_0613 = await askCompletion(openai, "gpt-4-0613", prompt, schema);
  const gpt4_1106preview = await askCompletion(openai, "gpt-4-1106-preview", prompt, schema);
  return { gpt35_turbo1106, gpt4_0613, gpt4_1106preview };
}




//const run = async () => {
//  loadDataset(dsName).then((ds) => {
//    console.log(ds);
//  });
//
//}
//
//
//run().then(() => {
//  console.log('Done');
//});

const run = async () => {
  const ds = await loadDataset(dsId);
  const prompt = genPrompt(ds);
  await expDatasetAwaremess(prompt);

  const { gpt35_turbo1106, gpt4_0613, gpt4_1106preview } = await expDatasetAwaremess(genPrompt(ds));
  console.log('XXXXXXXXXXXX', { gpt35_turbo1106, gpt4_0613, gpt4_1106preview })
  console.log('GPT-3.5 Turbo 1106');
  console.log(JSON.parse(gpt35_turbo1106.choices[0].message.function_call?.arguments || ''));
  console.log('GPT-4 0613');
  console.log(JSON.parse(gpt4_0613.choices[0].message.function_call?.arguments || ''));
  console.log('GPT-4 1106 Preview');
  console.log(JSON.parse(gpt4_1106preview.choices[0].message.function_call?.arguments || ''));
}

run().then(() => {
  console.log('Done');
});
