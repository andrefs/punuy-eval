import fs from "fs/promises";
import path from "path";
import oldFs from "fs";
import Experiment, {
  ExpVarMatrix,
  ExpVars,
  ExperimentData,
  GenericExpTypes,
  PairScoreList,
  Usage,
  Usages,
} from ".";
import logger from "../../logger";
import { ModelId, getModelById } from "src/lib/models";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import { normalizeScale, pairsToHash } from "../aux";
import { PartitionData, PartitionScale } from "punuy-datasets/src/lib/types";

export function calcUsageCost(usage: Usages | undefined) {
  if (!usage) {
    return;
  }
  for (const [modelId, us] of Object.entries(usage)) {
    const pricing = getModelById(modelId as ModelId)!.pricing;
    if (!pricing) {
      continue;
    }
    usage[modelId as ModelId]!.cost =
      us.inputTokens * pricing.input + us.outputTokens * pricing.output;
  }
}

export function addUsage(usages: Usages, newUs?: Usage | Usages) {
  if (!newUs) {
    return;
  }

  const _newUs = "modelId" in newUs ? { [newUs.modelId]: newUs } : newUs;
  for (const [modelId, nus] of Object.entries(_newUs)) {
    if (modelId in usages) {
      const ous = usages[modelId as ModelId]!;
      usages[modelId as ModelId] = {
        modelId: ous.modelId,
        totalTokens: ous.totalTokens + nus.totalTokens,
        inputTokens: ous.inputTokens + nus.inputTokens,
        outputTokens: ous.outputTokens + nus.outputTokens,
      };
    } else {
      usages[modelId as ModelId] = nus;
    }
  }
  calcUsageCost(usages);
}

export async function sanityCheck<T extends GenericExpTypes>(
  this: Experiment<T>,
  folder: string
) {
  if (!oldFs.existsSync(path.join(folder, "experiment.json"))) {
    return;
  }
  const oldExpData = JSON.parse(
    await fs.readFile(path.join(folder, "experiment.json"), "utf-8")
  ) as {
    experiment: ExperimentData<T>[];
    usage: Usages;
  }[];

  if (oldExpData?.[0].experiment[0].meta.name !== this.name) {
    throw new Error(
      `Experiment name mismatch in folder ${folder}: ${oldExpData?.[0].experiment[0].meta.name} !== ${this.name}`
    );
  }
}

export async function saveExperimentsData<T extends GenericExpTypes>(
  expName: string,
  data: ExperimentData<T>[],
  usage: Usages,
  folder: string
) {
  let newData = [];
  const filename = path.join(folder, "experiment.json");
  // read existing data
  // if it exists, merge the new data with the old one
  if (oldFs.existsSync(filename)) {
    const oldData = JSON.parse(await fs.readFile(filename, "utf-8"));
    newData = oldData;
  }
  newData.push({ experiment: data, usage });

  const json = JSON.stringify(newData, null, 2);

  logger.info(`💾 Saving all data from experiment ${expName} to ${filename}.`);
  logger.info(
    `🥇 It ran successfully with ${data.length} variable combinations.`
  );

  if (!oldFs.existsSync(folder)) {
    await fs.mkdir(folder, { recursive: true });
  }

  await fs.writeFile(filename, json);
}

export async function saveExpVarCombData<T extends GenericExpTypes>(
  data: ExperimentData<T>,
  folder: string
) {
  const traceId = data.meta.traceId;
  const dpartId = data.variables.dpart.id;
  const promptId = data.variables.prompt.id;
  const expName = data.meta.name;
  const modelId = data.variables.model.id;
  const filename = path.join(
    folder,
    `expVC_${traceId}_${expName}_${promptId}_${dpartId}_${modelId}.json`
  );
  const json = JSON.stringify(data, null, 2);
  const name = data.meta.name;

  logger.info(
    `💾 Saving experiment ${name} with traceId ${traceId} to ${filename}.`
  );
  logger.info(
    `🥇 It ran successfully ${data.results.raw.length}/${data.meta.trials
    } times with variables ${JSON.stringify(getVarIds(data.variables))}.`
  );

  if (!oldFs.existsSync(folder)) {
    await fs.mkdir(folder, { recursive: true });
  }

  await fs.writeFile(filename, json);
}

export function getVarIds(vars: ExpVars | ExpVarMatrix) {
  const res = {} as { [key: string]: string | string[] };
  for (const [k, v] of Object.entries(vars)) {
    if (Array.isArray(v)) {
      res[k] = v.map(v => v.id || v) as (keyof ExpVars | keyof ExpVarMatrix)[];
      continue;
    }
    res[k] = v.id || v;
  }
  return res;
}

export function genValueCombinations(vars: ExpVarMatrix): ExpVars[] {
  const combs = genVCHelper(vars);
  return combs as ExpVars[];
}

function genVCHelper(vars: ExpVarMatrix): Partial<ExpVars>[] {
  const key = Object.keys(vars)?.shift();
  if (!key) {
    return [];
  }
  const values = vars[key as keyof ExpVarMatrix]!;
  const rest = { ...vars };
  delete rest[key as keyof ExpVarMatrix];

  const combs = genValueCombinations(rest);
  const res = [] as Partial<ExpVars>[];
  for (const v of values) {
    if (!combs.length) {
      res.push({ [key]: v });
      continue;
    }
    for (const c of combs) {
      res.push({ [key]: v, ...c });
    }
  }
  return res;
}

export function calcVarValues<T extends GenericExpTypes>(
  exps: ExperimentData<T>[]
) {
  const varValues: { [key: string]: Set<string> } = {};
  for (const r of exps) {
    for (const v in r.variables) {
      if (!varValues[v]) {
        varValues[v] = new Set();
      }
      const value = r.variables[v as keyof ExpVars]!;
      varValues[v].add(value.id);
    }
  }
  const varNames = Object.keys(varValues).sort() as (keyof ExpVars)[];
  return { varValues, varNames };
}

export interface ComparisonGroup {
  fixedValueConfig: FixedValueConfig;
  variables: [keyof ExpVars, keyof ExpVars];
  data: {
    [v1: string]: {
      [v2: string]: number | null;
    };
  };
}
export interface FixedValueConfig {
  [varName: string]: string;
}

/**
 * Get a comparison group with the given fixed values, or create a new one if it doesn't exist
 */
export function getFixedValueGroup(
  compGroups: ComparisonGroup[],
  variables: ExpVars,
  fixedNames: (keyof ExpVars)[],
  v1: keyof ExpVars,
  v2: keyof ExpVars
): ComparisonGroup {
  for (const g of compGroups) {
    if (fixedNames.every(f => variables[f]!.id === g.fixedValueConfig[f])) {
      return g;
    }
  }
  const fvc = {} as FixedValueConfig;
  for (const f of fixedNames) {
    fvc[f] = variables[f]!.id;
  }
  const newGroup = {
    fixedValueConfig: fvc,
    data: {},
    variables: [v1, v2] as [keyof ExpVars, keyof ExpVars],
  };
  compGroups.push(newGroup);
  return newGroup;
}

/**
 * Generate the variable combinations but match each prompt's language and measure type with matching datasets
 * @param variables The variables to generate combinations for
 * @returns The variable combinations
 */
export function splitVarCombsMTL(variables: ExpVarMatrix) {
  const varCombs = [];
  const languages = Array.from(
    new Set(variables.prompt?.map(p => p.language) ?? [])
  ).map(l => ({ id: l }));
  for (const l of languages) {
    for (const mt of [
      { id: "similarity" } as const,
      { id: "relatedness" } as const,
    ]) {
      const filtPrompts =
        variables.prompt?.filter(
          p => p.language === l.id && p.type === mt.id
        ) || [];
      const filtDatasets = variables.dpart.filter(
        d => d.language === l.id && d.measureType === mt.id
      );
      if (filtPrompts.length === 0 || filtDatasets.length === 0) {
        logger.warn(
          `No prompts or datasets for language ${l.id} and measure type ${mt.id}. Skipping.`
        );
        continue;
      }
      logger.info(
        `Running experiments for language ${l.id} and measure type ${mt.id}`
      );
      const vm: ExpVarMatrix = {
        ...variables,
        prompt: filtPrompts,
        dpart: filtDatasets,
        language: [l],
        measureType: [mt],
      };
      varCombs.push(...genValueCombinations(vm));
    }
  }
  return varCombs;
}

/**
 * Given a list of pairs and a dataset partition, get the scores for each pair
 * @param pairs - The pairs to get the scores for
 * @param dpart - The dataset partition to get the scores from
 * @returns The scores for each pair as a PairScoreList
 */

export function getPairScoreListFromDPart(
  pairs: [string, string][],
  dpart: DsPartition
) {
  const res = [] as PairScoreList;
  const h = pairsToHash(pairs);
  for (const entry of dpart.data) {
    const w1 = entry.term1.toLowerCase();
    const w2 = entry.term2.toLowerCase();
    if (w1 in h && w2 in h[w1]) {
      // get value or calculate .values average
      const value = valueFromEntry(entry, dpart.scale, { min: 1, max: 5 });
      res.push({ words: [w1, w2], score: value });
    }
  }
  return res;
}

export function valueFromEntry(
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
