import logger from "../lib/logger";
import { ExpVarMatrix, dsNameFromDsSample } from "../lib/experiments";
import {
  claude3opus,
  commandRPlus_042024,
  gpt4turbo_20240409,
} from "../lib/models";
import rg65 from "../lib/dataset-partitions/rg65_table1";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import path from "path";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const nameFromSample = async (vars: ExpVarMatrix) => {
  logger.info("🚀 Starting");

  const res = await dsNameFromDsSample.performMulti(vars, trials, folder);

  dsNameFromDsSample.printUsage(res.usage);

  for (const r of res.experiments) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${JSON.stringify(getVarIds(r.variables))} ${
        r.results.aggregated?.avg
      }`
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: [rg65],
  model: [claude3opus, commandRPlus_042024, gpt4turbo_20240409],
};

nameFromSample(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
