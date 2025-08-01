import path from "node:path";
import { genNextFileIndex, getCurFileIndex } from "./file-index";
import { ExperimentData, GenericExpTypes } from ".";

export async function genNextExpIndex(folder: string) {
  const patterns = [/^(?:\d{3}-)?experiment\.json$/];
  const index = await genNextFileIndex(folder, patterns);
  return index.toString().padStart(3, "0");
}

export async function getCurExpIndex(folder: string) {
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
  const expName = data.meta.name;
  const promptId = data.variables.prompt.id;
  const dpartId = data.variables.dpart.id;
  const modelId = data.variables.model.id;

  return buildExpVCFileName(traceId, expName, promptId, dpartId, modelId);
}

export async function genNextExpVCFileName<T extends GenericExpTypes>(
  data: ExperimentData<T>
) {
  const folder = data.meta.folder;
  const index = await genNextExpIndex(folder);
  const fn = genExpVCFileName(data);
  return path.join(folder, `${index}-${fn}`);
}

export async function getCurExpVCFileName<T extends GenericExpTypes>(
  data: ExperimentData<T>
) {
  const folder = data.meta.folder;
  const index = await getCurExpIndex(folder);
  if (index === null) {
    return null;
  }
  const fn = genExpVCFileName(data);
  return path.join(folder, `${index}-${fn}`);
}
