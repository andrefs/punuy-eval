import { promises as fs } from "fs";
import path from "path";
import { ExperimentData, comparePrompts } from "src/lib/experiments";
import { CPExpTypes } from "src/lib/experiments/compare-prompts";

const DIR_PATH = process.argv[2];
if (!DIR_PATH) {
  throw new Error("No directory path provided");
}

// get all json files names in the directory
async function getFileNames(path: string) {
  const files = await fs.readdir(path);
  return files.filter(
    file => file.startsWith("expVC_") && file.endsWith(".json")
  );
}

async function readFile(fileName: string) {
  const json = await fs.readFile(fileName, "utf8");
  const obj = JSON.parse(json) as ExperimentData<CPExpTypes>;
  return obj;
}

async function main(dirPath: string) {
  const files = await getFileNames(dirPath);
  const exps = await Promise.all(
    files.map(file => readFile(path.join(dirPath, file)))
  );
  await comparePrompts.evaluate(exps);
}

main(DIR_PATH)
  .then(() => console.log("All files re-evaluated"))
  .catch(console.error);
