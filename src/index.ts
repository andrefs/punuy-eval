import OpenAI from "openai";
import 'dotenv/config';
import loadDataset from "./lib/load-dataset";
import { DatasetProfile } from "./lib/types";
import { DataCorrect, DataIncomplete, DataIncorrect, DataPartiallyIncorrect, JsonSyntaxError } from "./lib/validation";

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




const validate = (ds: DatasetProfile, result: OpenAI.Chat.Completions.ChatCompletion) => {
  try {
    const got = JSON.parse(result.choices[0].message.function_call?.arguments || '');
    const expected: { [word: string]: { [word: string]: boolean } } = {};

    for (let { word1, word2 } of ds.partitions[0].data) {
      const w1 = word1.toLowerCase();
      const w2 = word2.toLowerCase();

      expected[w1] = expected[w1] || {};
      expected[w1][w2] = true;
      expected[w2] = expected[w2] || {};
      expected[w2][w1] = true;
    }
    let i = 0;
    let dataIncorrect = false;
    for (let { word1, word2 } of got.entries) {
      const w1 = word1.toLowerCase();
      const w2 = word2.toLowerCase();

      if (expected[w1]?.[w2] || expected[w2]?.[w1]) {
        i++;
        expected[w1][w2] = false;
        expected[w2][w1] = false;
      } else {
        dataIncorrect = true;
      }
    }

    if (i === 0) {
      return new DataIncorrect();
    }
    if (dataIncorrect) {
      return new DataPartiallyIncorrect(i / 5);
    }
    if (i < 5) {
      return new DataIncomplete(i / 5);
    }
    return new DataCorrect();

  } catch (e) {
    return new JsonSyntaxError();
  }

}

const run = async () => {
  const ds = await loadDataset(dsId);
  const prompt = genPrompt(ds);
  console.log(prompt);
  await expDatasetAwaremess(prompt);

  const { gpt35_turbo1106, gpt4_0613, gpt4_1106preview } = await expDatasetAwaremess(genPrompt(ds));

  console.log('GPT-3.5 Turbo 1106');
  let res = validate(ds, gpt35_turbo1106);
  console.log(res);

  console.log('GPT-4 0613');
  res = validate(ds, gpt4_0613);
  console.log(res);

  console.log('GPT-4 1106 Preview');
  res = validate(ds, gpt4_1106preview);
  console.log(res);
}

run().then(() => {
  console.log('Done');
});
