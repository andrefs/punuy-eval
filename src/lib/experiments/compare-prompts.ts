import { Model, gpt4, gpt4turbo, gpt35turbo } from "../models";
import logger from "../logger";
import {
  DatasetScores,
  loadDatasetScores,
} from "../dataset-adapters/collection";
import { Prompts, TrialsResult } from ".";
const name = "compare-prompts";
const description = "Compare the results obtained with different prompts";

const prompts: Prompts = {
  simplest: {
    type: "relatedness",
    text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where 1 means very unrelated and 5 means very related.",
  },
  simpleScale: {
    type: "relatedness",
    text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where the scale means: 1 - not at all related, 2 - vaguely related, 3 - indirectly related, 4 - strongly related, 5 - inseparably related.",
  },
  adaptedWs353: {
    type: "relatedness",
    text: 'Hello, we kindly ask you to assist us in a psycholinguistic experiment, aimed at estimating the semantic relatedness of various words in the English language. The purpose of this experiment is to assign semantic relatedness scores to pairs of words, so that machine learning algorithms can be subsequently trained and adjusted using human-assigned scores. Below is a list of pairs of words. For each pair, please assign a numerical relatedness score between 1 and 5 (1 = words are totally unrelated, 5 = words are VERY closely related). By definition, the relatedness of the word to itself should be 5. You may assign fractional scores (for example, 3.5).  When estimating relatedness of antonyms, consider them "related" (i.e., belonging to the same domain or representing features of the same concept), rather than "unrelated". Thank you for your assistance!',
  },
  simlex999: {
    type: "similarity",
    text: "Two words are synonyms if they have very similar meanings. Synonyms represent the same type or category of thing. Here are some examples of synonym pairs: cup/mug, glasses/spectacles, envy/jealousy. In practice, word pairs that are not exactly synonymous may still be very similar. Here are some very similar pairs - we could say they are nearly synonyms: alligator/crocodile, love / affection, frog/toad. In contrast, although the following word pairs are related, they are not very similar. The words represent entirely different types of thing:car/tyre, car/motorway, car/crash, In this survey, you are asked to compare word pairs and to rate how similar they are by moving a slider. Remember, things that are related are not necessarily similar. If you are ever unsure, think back to the examples of synonymous pairs (glasses/spectacles), and consider how close the words are (or are not) to being synonymous. There is no right answer to these questions. It is perfectly reasonable to use your intuition or gut feeling as a native English speaker, especially when you are asked to rate word pairs that you think are not similar at all.",
  },
};

const models = {
  gpt35turbo,
  gpt4,
  gpt4turbo,
};

const resultSchema = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          words: { type: "array", items: { type: "string" } },
          score: { type: "string" },
        },
      },
    },
  },
};

async function runTrialModel(model: Model, dsId: string, promptId: string) {
  const f = {
    name: "evaluate_scores",
    description: "Evaluate the word similarity or relatedness scores",
    parameters: resultSchema,
  };
  const res = await model.makeRequest(prompts[promptId].text, { function: f });
  return res;
}

async function runTrialsModel(
  trials: number,
  model: Model,
  dsId: string,
  promptId: string
) {
  const results = [];
  logger.info(`  model ${model.modelId}.`);
  logger.debug(`Prompt ID: ${promptId}`);

  for (let i = 0; i < trials; i++) {
    logger.info(`    trial #${i + 1} of ${trials}`);
    const res = await runTrialModel(model, dsId, prompts[promptId].text);
    results.push(
      res.type === "openai"
        ? res.data.choices[0].message.tool_calls?.[0].function.arguments || ""
        : ""
    );
  }
  return results;
}

async function runTrials(trials: number): Promise<TrialsResult[]> {
  const datasetIds = ["ws353", "simlex999"];
  const datasets: { [key: string]: DatasetScores } = {};
  for (const dsId of datasetIds) {
    datasets[dsId] = await loadDatasetScores(dsId);
  }

  logger.info(
    `Running experiment ${name} with ${trials} trials on models [gpt35turbo, gpt4, gpt4turbo], datasets ${datasetIds} and prompts ${Object.keys(
      prompts
    )}.`
  );

  const res: TrialsResult[] = [];
  for (const modelId in models) {
    for (const promptId in prompts) {
      for (const dsId in datasets) {
        const trialsRes = await runTrialsModel(
          trials,
          models[modelId as keyof typeof models],
          dsId,
          promptId
        );
        res.push({
          variables: {
            modelId,
            promptId,
            dsId,
          },
          data: trialsRes,
        });
      }
    }
  }
  logger.info(`Results: ${JSON.stringify(res)}`);
  return res;
}

async function validate(trialsRes: TrialsResult[]) {}

const ComparePromptsExperiment = {
  name,
  description,
  prompts,
  schema: resultSchema,
  runTrials,
  validate,
};

export default ComparePromptsExperiment;
