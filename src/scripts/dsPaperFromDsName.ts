import { ExpVarMatrix, dsPaperFromDsName } from "../lib/experiments";
import {
  claude3opus,
  commandRPlus_042024,
  gpt4turbo_20240409,
} from "../lib/models";
import logger from "../lib/logger";
import rg65 from "../lib/dataset-partitions/rg65_table1";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import path from "path";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const paperFromName = async (vars: ExpVarMatrix) => {
  logger.info("🚀 Starting");
  const res = await dsPaperFromDsName.performMulti(vars, trials, folder);

  dsPaperFromDsName.printUsage(res.usage);

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

paperFromName(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
