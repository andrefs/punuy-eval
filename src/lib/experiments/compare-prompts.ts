import fs from "fs/promises";
import oldFs from "fs";
import logger from "../logger";
import { shuffle } from "fast-shuffle";
import {
  ExpVarMatrix,
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  Prompt,
  PromptGenerator,
  TrialsResult,
  genValueCombinations,
  getVarIds,
} from ".";
import { DatasetProfile, MeasureType } from "../types";
import pcorrTest from "@stdlib/stats-pcorrtest";
const name = "compare-prompts";
const description = "Compare the results obtained with different prompts";

const prompts: PromptGenerator[] = [
  {
    id: "simplest",
    types: ["relatedness"] as MeasureType[],
    text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where 1 means very unrelated and 5 means very related.",
  },
  {
    id: "simpleScale",
    types: ["relatedness"] as MeasureType[],
    text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where the scale means: 1 - not at all related, 2 - vaguely related, 3 - indirectly related, 4 - strongly related, 5 - inseparably related.",
  },
  {
    id: "adaptedWs353",
    types: ["relatedness"] as MeasureType[],
    text: 'Hello, we kindly ask you to assist us in a psycholinguistic experiment, aimed at estimating the semantic relatedness of various words in the English language. The purpose of this experiment is to assign semantic relatedness scores to pairs of words, so that machine learning algorithms can be subsequently trained and adjusted using human-assigned scores. Below is a list of pairs of words. For each pair, please assign a numerical relatedness score between 1 and 5 (1 = words are totally unrelated, 5 = words are VERY closely related). By definition, the relatedness of the word to itself should be 5. You may assign fractional scores (for example, 3.5).  When estimating relatedness of antonyms, consider them "related" (i.e., belonging to the same domain or representing features of the same concept), rather than "unrelated". Thank you for your assistance!',
  },
  {
    id: "simlex999",
    types: ["similarity"] as MeasureType[],
    text: "Two words are synonyms if they have very similar meanings. Synonyms represent the same type or category of thing. Here are some examples of synonym pairs: cup/mug, glasses/spectacles, envy/jealousy. In practice, word pairs that are not exactly synonymous may still be very similar. Here are some very similar pairs - we could say they are nearly synonyms: alligator/crocodile, love / affection, frog/toad. In contrast, although the following word pairs are related, they are not very similar. The words represent entirely different types of thing:car/tyre, car/motorway, car/crash, In this survey, you are asked to compare word pairs and to rate how similar they are by moving a slider. Remember, things that are related are not necessarily similar. If you are ever unsure, think back to the examples of synonymous pairs (glasses/spectacles), and consider how close the words are (or are not) to being synonymous. There is no right answer to these questions. It is perfectly reasonable to use your intuition or gut feeling as a native English speaker, especially when you are asked to rate word pairs that you think are not similar at all.",
  },
].map(p => ({
  id: p.id,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const pairs = shuffle(vars.dataset.partitions[0].data)
      .slice(0, 100)
      .map(({ term1, term2 }) => [term1, term2] as [string, string]);

    return {
      id: `${name}-${p.id}`,
      types: p.types,
      pairs,
      text:
        p.text +
        "\n" +
        pairs.map(([term1, term2]) => `${term1},${term2}`).join("\n"),
    };
  },
}));

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

async function runTrial(vars: ExpVarsFixedPrompt) {
  const f = {
    name: "evaluate_scores",
    description: "Evaluate the word similarity or relatedness scores",
    parameters: resultSchema,
  };
  const res = await vars.model.makeRequest(vars.prompt.text, { function: f });
  return res;
}

async function runTrials(
  vars: ExpVarsFixedPrompt,
  trials: number
): Promise<TrialsResult> {
  logger.info(
    `Running experiment ${name} ${trials} times on model ${vars.model.id}.`
  );
  logger.debug(`Prompt (${vars.prompt.id}): ${vars.prompt.text}`);

  const results: string[] = [];
  for (let i = 0; i < trials; i++) {
    logger.info(`    trial #${i + 1} of ${trials}`);
    const res = await runTrial(vars);
    results.push(
      res.type === "openai"
        ? res.data.choices[0].message.tool_calls?.[0].function.arguments || ""
        : ""
    );
  }
  return {
    variables: vars,
    data: results,
  };
}

async function perform(vars: ExpVars, trials: number, traceId?: number) {
  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  const varsFixedPrompt = { ...vars, prompt } as ExpVarsFixedPrompt;
  const trialsRes = await runTrials(varsFixedPrompt, trials);

  const expData: ExperimentData = {
    meta: {
      name,
      traceId: traceId ?? Date.now(),
      schema: resultSchema,
    },
    variables: varsFixedPrompt,
    results: {
      raw: trialsRes.data,
    },
  };

  await saveExperimentData(expData);
  return expData;
}
async function performMulti(variables: ExpVarMatrix, trials: number) {
  if (!variables?.prompt?.length) {
    variables.prompt = prompts;
  }
  const varCombs = genValueCombinations(variables);
  logger.info(
    `Preparing to run experiment ${name}, ${trials} times on each variable combination:\n${varCombs
      .map(vc => "\t" + JSON.stringify(getVarIds(vc)))
      .join(",\n")}.`
  );
  const res = [] as ExperimentData[];
  for (const vc of varCombs) {
    res.push(await perform(vc, trials, Date.now()));
  }
  return res;
}

interface RawResult {
  words: string[];
  score: string;
}

interface Scores {
  [key: string]: { [key: string]: number };
}

function rawResultsToAvg(raw: string[]) {
  const values = {} as { [key: string]: { [key: string]: number[] } };
  for (const r of raw.map(r => JSON.parse(r).scores as RawResult[])) {
    for (const { words, score } of r) {
      values[words[0]] = values[words[0]] || {};
      values[words[0]][words[1]] = values[words[0]][words[1]] || [];
      values[words[0]][words[1]].push(Number(score));
    }
  }
  const res = {} as Scores;
  for (const w1 in values) {
    res[w1] = {};
    for (const w2 in values[w1]) {
      res[w1][w2] =
        values[w1][w2].reduce((a, b) => a + b, 0) / values[w1][w2].length;
    }
  }
  return res;
}

function evalScores(
  pairs: [string, string][],
  ds: DatasetProfile,
  raw: string[]
) {
  const got = rawResultsToAvg(raw);

  const expected = {} as Scores;
  for (const entry of ds.partitions[0].data) {
    let value;
    if ("value" in entry && typeof entry.value === "number") {
      value = entry.value;
    } else {
      const values = entry.values!.filter(
        x => typeof x === "number"
      ) as number[];
      value = values!.reduce((a, b) => a! + b!, 0) / values.length;
    }
    const w1 = entry.term1.toLowerCase();
    const w2 = entry.term2.toLowerCase();
    if (got[w1] && got[w1][w2]) {
      expected[w1] = expected[w1] || {};
      expected[w1][w2] = value;
    }
  }

  const gotArr = [] as number[];
  const expArr = [] as number[];
  for (const w1 in expected) {
    for (const w2 in expected[w1]) {
      if (got[w1] && got[w1][w2]) {
        gotArr.push(got[w1][w2]);
        expArr.push(expected[w1][w2]);
      }
    }
  }

  return pcorrTest(gotArr, expArr);
}

async function validate(exps: ExperimentData[]) {
  const res = exps.map(exp => ({
    variables: exp.variables,
    corr: evalScores(
      (exp.variables as ExpVarsFixedPrompt).prompt.pairs!,
      exp.variables.dataset,
      exp.results.raw
    ),
  }));

  const comparisons = [];

  const varValues: { [key: string]: Set<string> } = {};
  for (const r of res) {
    for (const v in r.variables) {
      if (!varValues[v]) {
        varValues[v] = new Set();
      }
      varValues[v].add(r.variables[v as keyof ExpVars].id);
    }
  }

  const varNames = Object.keys(varValues) as (keyof ExpVars)[];
  for (let i = 0; i < varNames.length; i++) {
    const v1 = varNames[i];
    for (let j = i + 1; j < varNames.length; j++) {
      const v2 = varNames[j];
      if (varValues[v1].size === 1 && varValues[v2].size === 1) {
        continue;
      }
      const fixed = varNames.filter(v => v !== v1 && v !== v2);

      //const compV1V2 = [] as typeof res;
      const compV1V2 = {} as {
        [key: string]: { [key: string]: number };
      };
      const fixedValues = {} as { [key: string]: string };
      for (let k = 0; k < res.length; k++) {
        const r = res[k];
        if (k === 0) {
          for (const f of fixed) {
            fixedValues[f] = r.variables[f].id;
          }
          compV1V2[r.variables[v1].id] = {};
          compV1V2[r.variables[v1].id][r.variables[v2].id] = r.corr.pcorr;
          continue;
        }
        if (fixed.some(f => r.variables[f].id !== fixedValues[f])) {
          continue;
        }
        compV1V2[r.variables[v1].id] = compV1V2[r.variables[v1].id] || {};
        compV1V2[r.variables[v1].id][r.variables[v2].id] = r.corr.pcorr;
      }

      comparisons.push({
        variables: [v1, v2],
        fixed,
        data: compV1V2,
      });
    }
  }

  for (const comp of comparisons) {
    console.log(
      `Comparing ${comp.variables.join(" and ")} with fixed variables ${comp.fixed.join(", ")}`
    );
    const table = [];

    for (const v1Val in comp.data) {
      table[v1Val] = comp.data[v1Val];
    }
    console.table(table);
  }
}

export async function saveExperimentData(data: ExperimentData) {
  const ts = data.meta.traceId;
  const dsId = data.variables.dataset.id;
  const promptId = data.variables.prompt.id;
  const expName = data.meta.name;
  const modelId = data.variables.model.id;
  const rootFolder = "./results";
  const filename = `${rootFolder}/${ts}_${expName}_${promptId}_${dsId}_${modelId}.json`;
  const json = JSON.stringify(data, null, 2);

  logger.info(
    `Saving experiment ${data.meta.name} with traceId ${
      data.meta.traceId
    } to ${filename}. It ran ${
      data.results.raw.length
    } times with variables ${JSON.stringify(getVarIds(data.variables))}.`
  );

  if (!oldFs.existsSync(rootFolder)) {
    await fs.mkdir(rootFolder);
  }

  await fs.writeFile(filename, json);
}

const ComparePromptsExperiment = {
  name,
  description,
  prompts,
  schema: resultSchema,
  performMulti,
  validate,
};

export default ComparePromptsExperiment;
