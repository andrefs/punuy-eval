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
