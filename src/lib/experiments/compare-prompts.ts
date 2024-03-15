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
import {
  DatasetProfile,
  MeasureType,
  PartitionData,
  PartitionScale,
} from "../types";
import pcorrtest from "@stdlib/stats-pcorrtest";
import { RawResult, Scores, normalizeScale, rawResultsToAvg } from "./common";
const name = "compare-prompts";
const description = "Compare the results obtained with different prompts";

const prompts: PromptGenerator[] = [
  //{
  //  id: "sim-simplest",
  //  types: ["similarity"] as MeasureType[],
  //  text: "Indicate how strongly the words in each pair are similar in meaning using integers from 1 to 5, where 1 means very little similarity and 5 means very similar.",
  //},
  //{
  //  id: "sim-simpleScale",
  //  types: ["similarity"] as MeasureType[],
  //  text: "Indicate how strongly the words in each pair are similar in meaning using integers from 1 to 5, where the scale means: 1 - not at all similar, 2 - vaguely similar, 3 - indirectly similar, 4 - strongly similar, 5 - inseparably similar.",
  //},
  //{
  //  id: "sim-adaptedWs353",
  //  types: ["similarity"] as MeasureType[],
  //  text: 'Hello, we kindly ask you to assist us in a psycholinguistic experiment, aimed at estimating the semantic similarity of various words in the English language. The purpose of this experiment is to assign semantic similarity scores to pairs of words, so that machine learning algorithms can be subsequently trained and adjusted using human-assigned scores. Below is a list of pairs of words. For each pair, please assign a numerical similarity score between 1 and 5 (1 = words are totally dissimilar, 5 = words are VERY closely similar). By definition, the similarity of the word to itself should be 5. You may assign fractional scores (for example, 3.5). When estimating similarity of antonyms, consider them "dissimilar" rather than "similar". Thank you for your assistance!',
  //},
  //{
  //  id: "rel-simplest",
  //  types: ["relatedness"] as MeasureType[],
  //  text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where 1 means very unrelated and 5 means very related.",
  //},
  //{
  //  id: "rel-simpleScale",
  //  types: ["relatedness"] as MeasureType[],
  //  text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where the scale means: 1 - not at all related, 2 - vaguely related, 3 - indirectly related, 4 - strongly related, 5 - inseparably related.",
  //},
  //{
  //  id: "rel-adaptedWs353",
  //  types: ["relatedness"] as MeasureType[],
  //  text: 'Hello, we kindly ask you to assist us in a psycholinguistic experiment, aimed at estimating the semantic relatedness of various words in the English language. The purpose of this experiment is to assign semantic relatedness scores to pairs of words, so that machine learning algorithms can be subsequently trained and adjusted using human-assigned scores. Below is a list of pairs of words. For each pair, please assign a numerical relatedness score between 1 and 5 (1 = words are totally unrelated, 5 = words are VERY closely related). By definition, the relatedness of the word to itself should be 5. You may assign fractional scores (for example, 3.5).  When estimating relatedness of antonyms, consider them "related" (i.e., belonging to the same domain or representing features of the same concept), rather than "unrelated". Thank you for your assistance!',
  //},
  {
    id: "sim-simlex999",
    types: ["similarity"] as MeasureType[],
    text: "Two words are synonyms if they have very similar meanings. Synonyms represent the same type or category of thing. Here are some examples of synonym pairs: cup/mug, glasses/spectacles, envy/jealousy. In practice, word pairs that are not exactly synonymous may still be very similar. Here are some very similar pairs - we could say they are nearly synonyms: alligator/crocodile, love / affection, frog/toad. In contrast, although the following word pairs are related, they are not very similar. The words represent entirely different types of thing:car/tyre, car/motorway, car/crash. In this survey, you are asked to compare word pairs and to rate how similar they are by assigning a numeric value between 1 (very dissimilar) and 5 (very similar). Remember, things that are related are not necessarily similar. If you are ever unsure, think back to the examples of synonymous pairs (glasses/spectacles), and consider how close the words are (or are not) to being synonymous. There is no right answer to these questions. It is perfectly reasonable to use your intuition or gut feeling as a native English speaker, especially when you are asked to rate word pairs that you think are not similar at all.",
  },
].map(p => ({
  id: p.id,
  types: p.types,
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
        "\n\nPairs of words:\n" +
        pairs.map(([term1, term2]) => `${term1}, ${term2}`).join("\n"),
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
  const varCombs = genValueCombinations(variables).filter(vc => {
    const partMT = vc.dataset.partitions[0].measureType;
    if (!vc.prompt.types?.includes(partMT)) {
      logger.info(
        `Skipping variable combination ${JSON.stringify(
          getVarIds(vc)
        )} because the dataset type ${partMT} is not supported by the prompt ${vc.prompt.types}.`
      );
      return false;
    }
    return true;
  });
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

const parseToRawResults = (raw: string[]) => {
  const failed = [];
  const objs = [] as (RawResult[] | null)[];
  for (const [i, r] of raw.entries()) {
    try {
      const obj = JSON.parse(r).scores as RawResult[];
      objs.push(obj);
    } catch (e) {
      failed.push(i + 1);
      objs.push(null);
    }
  }
  return { parsed: objs, failed };
};

function valueFromEntry(
  entry: PartitionData,
  sourceScale: PartitionScale,
  targetScale: { min: number; max: number }
) {
  let value;
  if ("value" in entry && typeof entry.value === "number") {
    value = normalizeScale(entry.value, sourceScale.value, targetScale);
  } else {
    const values = entry.values!.filter(x => typeof x === "number") as number[];
    value = values!.reduce((a, b) => a! + b!, 0) / values.length;
  }
  return value;
}

function evalScores(
  pairs: [string, string][],
  ds: DatasetProfile,
  raw: RawResult[][]
) {
  const got = rawResultsToAvg(raw.filter(x => x !== null) as RawResult[][]);
  const pairsHash = pairsToHash(pairs);

  const targetScale = { min: 1, max: 5 };

  const expected = {} as Scores;
  for (const entry of ds.partitions[0].data) {
    const value = valueFromEntry(entry, ds.partitions[0].scale, targetScale);
    const w1 = entry.term1.toLowerCase();
    const w2 = entry.term2.toLowerCase();
    if (got[w1] && got[w1][w2] && pairsHash[w1] && pairsHash[w1][w2]) {
      expected[w1] = expected[w1] || {};
      expected[w1][w2] = value;
    }
  }

  const gotArr = [] as number[];
  const expArr = [] as number[];
  for (const w1 in expected) {
    for (const w2 in expected[w1]) {
      if (w1 in got && w2 in got[w1]) {
        gotArr.push(Number(got[w1][w2]));
        expArr.push(Number(expected[w1][w2]));
      }
    }
  }

  return pcorrtest(gotArr, expArr);
}

async function validate(exps: ExperimentData[]) {
  const res = [];
  for (const exp of exps) {
    const { parsed, failed } = parseToRawResults(exp.results.raw);
    if (failed.length > parsed.length / 2) {
      logger.error(
        `Failed to parse the results of more than half of the trials for experiment ${exp.meta.traceId}.`
      );
      continue;
    }
    if (failed.length > 0) {
      logger.warn(
        `Failed to parse results of ${failed.length}/${exp.results.raw.length} (${failed}) results for experiment ${exp.meta.traceId}.`
      );
    }

    const corr = evalScores(
      (exp.variables as ExpVarsFixedPrompt).prompt.pairs!,
      exp.variables.dataset,
      parsed.filter(x => x !== null) as RawResult[][]
    );
    res.push({
      variables: exp.variables,
      corr,
    });
  }

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
        [key: string]: { [key: string]: string };
      };
      const fixedValues = {} as { [key: string]: string };
      for (let k = 0; k < res.length; k++) {
        const r = res[k];
        if (k === 0) {
          for (const f of fixed) {
            fixedValues[f] = r.variables[f].id;
          }
          compV1V2[r.variables[v1].id] = {};
          compV1V2[r.variables[v1].id][r.variables[v2].id] =
            r.corr.pcorr.toFixed(3);
          continue;
        }
        if (fixed.some(f => r.variables[f].id !== fixedValues[f])) {
          continue;
        }
        compV1V2[r.variables[v1].id] = compV1V2[r.variables[v1].id] || {};
        compV1V2[r.variables[v1].id][r.variables[v2].id] =
          r.corr.pcorr.toFixed(3);
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
    const table = {} as { [key: string]: { [key: string]: string } };

    for (const v1Val in comp.data) {
      table[v1Val] = comp.data[v1Val];
    }
    console.table(table);
  }
}

function pairsToHash(pairs: [string, string][]) {
  const res = {} as {
    [key: string]: { [key: string]: boolean };
  };
  for (const [w1, w2] of pairs) {
    res[w1] = res[w1] || {};
    res[w1][w2] = true;
  }
  return res;
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
