import fs from "fs/promises";
import oldFs from "fs";
import { ExpVarMatrix, ExpVars, ExperimentData, GenericExpTypes } from ".";
import logger from "../../logger";
import { ModelResponse } from "src/lib/models";

export function sumUsage(
  accUs: ModelResponse["usage"],
  newUs?: ModelResponse["usage"]
): ModelResponse["usage"] {
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
    prompt_tokens: accUs.prompt_tokens + newUs.prompt_tokens,
    completion_tokens: accUs.completion_tokens + newUs.completion_tokens,
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
