import { promises as fs } from "fs";
import {
  AggregatedEvaluationResult,
  ExpResults,
  ExperimentData,
} from "src/lib/experiments";
import { ExpTypes } from "src/lib/experiments/prior-knowledge/dsSampleFromDsSample";
import dsSampleFromDsSample from "src/lib/experiments/prior-knowledge/dsSampleFromDsSample";
import path from "path";
import { EvaluationResult } from "src/lib/evaluation";

// punuy-results/exp_1714515804402_ds-sample-from-ds-sample_all

const DIR_PATH = process.argv[2];
if (!DIR_PATH) {
  throw new Error("No directory path provided");
}

// get all json files names in the directory
async function getFileNames(path: string) {
  const files = await fs.readdir(path);
  return files.filter(file => file.endsWith(".json"));
}

async function createFileBackupCopy(fileName: string) {
  await fs.copyFile(fileName, `${fileName}.bak`);
}

async function readFile(fileName: string) {
  const json = await fs.readFile(fileName, "utf8");
  const obj = JSON.parse(json) as ExperimentData<ExpTypes>;
  return obj;
}

async function reEvalExperiment(
  exp: ExperimentData<ExpTypes>
): Promise<ExperimentData<ExpTypes>> {
  const { aggregated, evaluation } = await dsSampleFromDsSample.evaluate(exp);
  const results: ExpResults<ExpTypes["Data"], ExpTypes["Evaluation"]> = {
    ...exp.results,
    aggregated,
    evaluation,
  };
  return {
    ...exp,
    results,
  };
}

async function printEvalComparison(
  file: string,
  oldEval: ExpResults<ExpTypes["Data"], ExpTypes["Evaluation"]>,
  newEval: ExpResults<ExpTypes["Data"], ExpTypes["Evaluation"]>
) {
  console.log("\n\n\n____________________\n", file);
  console.log(
    `\n\n\n### Old evaluation: ${JSON.stringify(oldEval.aggregated)}\n` +
      oldEval.evaluation
        ?.map(e => `${e.type} ${e?.percentage || ""}`)
        .join("\n")
  );
  console.log(
    `\n\n\n### New evaluation: ${JSON.stringify(newEval.aggregated)}\n` +
      newEval.evaluation
        ?.map(e => `${e.type} ${e?.percentage || ""}`)
        .join("\n")
  );
}

async function main(dirPath: string) {
  const files = await getFileNames(dirPath);
  for (const file of files.map(f => path.join(dirPath, f))) {
    console.warn(`Re-evaluating ${file}`);
    await createFileBackupCopy(file);
    const exp = await readFile(file);
    const newExp = await reEvalExperiment(exp);
    //printEvalComparison(file, exp.results, newExp.results);
    await fs.writeFile(file, JSON.stringify(newExp, null, 2));
  }
}

main(DIR_PATH)
  .then(() => console.log("All files re-evaluated"))
  .catch(console.error);
