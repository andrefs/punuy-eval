import fs from "fs/promises";
import path from "path";
import { ExperimentData, GenericExpTypes } from "./types";

export async function genNextFileIndex(
  folder: string,
  patterns: (string | RegExp)[] = []
) {
  const files = await fs.readdir(folder);
  const cacheFiles = files.filter(f => patterns.every(p => f.match(p)));
  return cacheFiles.length;
}

export async function getCurFileIndex(
  folder: string,
  patterns: (string | RegExp)[] = []
) {
  const files = await fs.readdir(folder);
  const cacheFiles = files.filter(f => patterns.every(p => f.match(p)));
  if (cacheFiles.length === 0) {
    return null;
  }
  return cacheFiles.length - 1; // return the last index
}

export async function genExpNextIndex(folder: string) {
  const patterns = [/^(?:\d{3}-)?experiment\.json$/];
  const index = await genNextFileIndex(folder, patterns);
  return index.toString().padStart(3, "0");
}

export async function getExpCurIndex(folder: string) {
  const patterns = [/^(?:\d{3}-)?experiment\.json$/];
  const index = await getCurFileIndex(folder, patterns);
  return index !== null ? index.toString().padStart(3, "0") : null;
}

export function buildExpVCFileName(
  traceId: number,
  expName: string,
  promptId: string,
  dpartId: string,
  modelId: string
) {
  return `expVC_${traceId}_${expName}_${promptId}_${dpartId}_${modelId}.json`;
}

function genExpVCFileName<T extends GenericExpTypes>(data: ExperimentData<T>) {
  const traceId = data.meta.traceId;
  const expName = data.meta.name.replace(/[^a-zA-Z0-9]/g, "_");
  const promptId = data.variables.prompt.id;
  const dpartId = data.variables.dpart.id;
  const modelId = data.variables.model.id;

  return buildExpVCFileName(traceId, expName, promptId, dpartId, modelId);
}

export async function genNextExpVCFileName<T extends GenericExpTypes>(
  data: ExperimentData<T>
) {
  const folder = data.meta.folder;
  const index = await genExpNextIndex(folder);
  const fn = genExpVCFileName(data);
  return path.join(folder, `${index}-${fn}`);
}

export async function getCurExpVCFileName<T extends GenericExpTypes>(
  data: ExperimentData<T>
) {
  const folder = data.meta.folder;
  const index = await getExpCurIndex(folder);
  if (index === null) {
    return null;
  }
  const fn = genExpVCFileName(data);
  return path.join(folder, `${index}-${fn}`);
}
