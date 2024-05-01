import { promises as fs } from "fs";
import oldFs from "fs";
import {
  ExpResults,
  ExperimentData,
  GenericExpTypes,
  dsSampleFromDsName,
  dsValuesExactMatches,
} from "src/lib/experiments";
import dsSampleFromDsSample from "src/lib/experiments/prior-knowledge/dsSampleFromDsSample";
import path from "path";
import Experiment from "src/lib/experiments/experiment";

// punuy-results/exp_1714515804402_ds-sample-from-ds-sample_all

const DIR_PATH = process.argv[2];
if (!DIR_PATH) {
  throw new Error("No directory path provided");
}
const EXP_NAME = process.argv[3];

async function getExpFromName(expName: string) {
  if (expName === dsSampleFromDsSample.name) {
    return dsSampleFromDsSample;
  }
  if (expName === dsSampleFromDsName.name) {
    return dsSampleFromDsName;
  }
  if (expName === dsValuesExactMatches.name) {
    return dsValuesExactMatches;
  }
  throw new Error(`Unknown experiment name: ${expName}`);
}

// get all json files names in the directory
async function getFileNames(path: string) {
  const files = await fs.readdir(path);
  return files.filter(file => file.endsWith(".json"));
}

async function createFileBackupCopy(fileName: string) {
  await fs.copyFile(fileName, `${fileName}.bak`);
}

async function readFile<T extends GenericExpTypes>(fileName: string) {
  const json = await fs.readFile(fileName, "utf8");
  const obj = JSON.parse(json) as ExperimentData<T>;
  return obj;
}

async function reEvalExperiment<T extends GenericExpTypes>(
  expVCData: ExperimentData<T>,
  exp: Experiment<T>
): Promise<ExperimentData<T>> {
  const { aggregated, evaluation } = await exp.evaluate(expVCData);
  const results: ExpResults<T["Data"], T["Evaluation"]> = {
    ...expVCData.results,
    aggregated,
    evaluation,
  };
  return {
    ...expVCData,
    results,
  };
}

//async function printEvalComparison<T extends GenericExpTypes>(
//  file: string,
//  oldEval: ExpResults<T["Data"], T["Evaluation"]>,
//  newEval: ExpResults<T["Data"], T["Evaluation"]>
//) {
//  console.log("\n\n\n____________________\n", file);
//  console.log(
//    `\n\n\n### Old evaluation: ${JSON.stringify(oldEval.aggregated)}\n` +
//      oldEval.evaluation
//        ?.map(e => `${e.type} ${e?.percentage || ""}`)
//        .join("\n")
//  );
//  console.log(
//    `\n\n\n### New evaluation: ${JSON.stringify(newEval.aggregated)}\n` +
//      newEval.evaluation
//        ?.map(e => `${e.type} ${e?.percentage || ""}`)
//        .join("\n")
//  );
//}

async function getExpNameFromDir<T extends GenericExpTypes>(dirPath: string) {
  if (!oldFs.existsSync(path.join(dirPath, "experiment.json"))) {
    return;
  }
  const json = await fs.readFile(path.join(dirPath, "experiment.json"), "utf8");
  const exps = JSON.parse(json) as ExperimentData<T>[];
  const expName = exps?.[0].meta.name;
  return expName;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNumber(n: any): n is number {
  return typeof n === "number" && !isNaN(n);
}

async function main(dirPath: string, expName?: string) {
  if (!expName) {
    expName = await getExpNameFromDir(dirPath);
  }
  if (!expName) {
    throw new Error("experiment.json or expName parameter needed!");
  }
  const exp = await getExpFromName(expName);
  const files = await getFileNames(dirPath);
  const changed: {
    [file: string]: {
      old: number | undefined;
      fixed: number | undefined;
    };
  } = {};
  for (const file of files.map(f => path.join(dirPath, f))) {
    console.warn(`Re-evaluating ${file}`);
    await createFileBackupCopy(file);
    const expVCData = await readFile(file);
    const fixedExpVCData = await reEvalExperiment(expVCData, exp);
    if (
      expVCData.results.aggregated?.avg !==
        fixedExpVCData.results.aggregated?.avg &&
      isNumber(expVCData.results.aggregated?.avg) &&
      isNumber(fixedExpVCData.results.aggregated?.avg)
    ) {
      changed[file] = {
        old: expVCData.results.aggregated?.avg,
        fixed: fixedExpVCData.results.aggregated?.avg,
      };
    }

    // printEvalComparison(file, expVCData.results, fixedExpVCData.results);
    await fs.writeFile(file, JSON.stringify(fixedExpVCData, null, 2));
  }
  if (Object.keys(changed).length > 0) {
    console.warn("Changed files:");
    console.warn(changed);
  } else {
    console.warn("No changes");
  }
}

main(DIR_PATH, EXP_NAME)
  .then(() => console.log("All files re-evaluated"))
  .catch(console.error);
