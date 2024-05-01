import { ExperimentData, dsSampleFromDsSample } from "src/lib/experiments";
import { promises as fs } from "fs";
import { ExpTypes } from "src/lib/experiments/prior-knowledge/dsSampleFromDsSample";
import path from "path";

const DIR_PATH = process.argv[2];
if (!DIR_PATH) {
  throw new Error("No directory path provided");
}

// get all json files names in the directory
async function getFileNames(path: string) {
  const files = await fs.readdir(path);
  return files.filter(file => file.endsWith(".json"));
}

async function readFile(fileName: string) {
  const json = await fs.readFile(fileName, "utf8");
  const obj = JSON.parse(json) as ExperimentData<ExpTypes>;
  return obj;
}

async function main(dirPath: string) {
  const files = await getFileNames(dirPath);
  const exps = await Promise.all(
    files.map(file => readFile(path.join(dirPath, file)))
  );
  dsSampleFromDsSample.printExpResTable(exps);
}

main(DIR_PATH)
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
