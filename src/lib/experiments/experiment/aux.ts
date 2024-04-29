import fs from "fs/promises";
import path from "path";
import oldFs from "fs";
import {
  ExpVarMatrix,
  ExpVars,
  ExperimentData,
  GenericExpTypes,
  Usage,
} from ".";
import logger from "../../logger";
import { ModelPricing } from "src/lib/models";

// TODO handle currency
export function calcUsageCost(usage: Usage, pricing: ModelPricing): number {
  return (
    (usage.cost || 0) +
    usage.input_tokens * pricing.input +
    usage.output_tokens * pricing.output
  );
}

export function sumUsage(
  accUs?: Usage,
  newUs?: Usage,
  pricing?: ModelPricing
): Usage | undefined {
  if (!newUs && !accUs) {
    return undefined;
  }
  if (!newUs) {
    return pricing
      ? { ...accUs!, cost: calcUsageCost(accUs!, pricing) }
      : accUs;
  }
  if (!accUs) {
    return pricing ? { ...newUs, cost: calcUsageCost(newUs, pricing) } : newUs;
  }
  const res: Usage = {
    total_tokens: accUs.total_tokens + newUs.total_tokens,
    input_tokens: accUs.input_tokens + newUs.input_tokens,
    output_tokens: accUs.output_tokens + newUs.output_tokens,
  };
  res.cost = pricing
    ? calcUsageCost(res, pricing)
    : (accUs.cost || 0) + (newUs.cost || 0);

  return res;
}

export async function saveExperimentsData<T extends GenericExpTypes>(
  expName: string,
  data: ExperimentData<T>[],
  usage: Usage,
  folder: string
) {
  const filename = path.join(folder, "experiment.json");
  const json = JSON.stringify({ experiment: data, usage }, null, 2);

  logger.info(`Saving all data from experiment ${expName} to ${filename}.`);
  logger.info(`It ran successfully with ${data.length} variable combinations.`);

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

  logger.info(
    `Saving experiment ${data.meta.name} with traceId ${
      data.meta.traceId
    } to ${filename}. It ran successfully ${data.results.raw.length}/${
      data.meta.trials
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
      [v2: string]: number;
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
