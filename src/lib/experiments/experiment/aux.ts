import fs from "fs/promises";
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

export function calcUsageCost(usage: Usage, pricing: ModelPricing): number {
  return (
    (usage.cost || 0) +
    usage.input_tokens * pricing.input +
    usage.output_tokens * pricing.output
  );
}

export function sumUsage(accUs?: Usage, newUs?: Usage): Usage | undefined {
  if (!newUs && !accUs) {
    return undefined;
  }
  if (!newUs) {
    return accUs;
  }
  if (!accUs) {
    return newUs;
  }
  return {
    total_tokens: accUs.total_tokens + newUs.total_tokens,
    input_tokens: accUs.input_tokens + newUs.input_tokens,
    output_tokens: accUs.output_tokens + newUs.output_tokens,
    cost:
      typeof accUs.cost === "number" && typeof newUs.cost === "number"
        ? accUs.cost! + newUs.cost!
        : undefined,
  };
}

export async function saveExperimentData<T extends GenericExpTypes>(
  data: ExperimentData<T>
) {
  const ts = data.meta.traceId;
  const dpartId = data.variables.dpart.id;
  const promptId = data.variables.prompt.id;
  const expName = data.meta.name;
  const modelId = data.variables.model.id;
  const rootFolder = "./results";
  const filename = `${rootFolder}/${ts}_${expName}_${promptId}_${dpartId}_${modelId}.json`;
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
