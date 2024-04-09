import logger from "../lib/logger";
import { ExpVarMatrix, dsNameFromDsSample } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import rg65 from "../lib/dataset-adapters/rg65_table1";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const nameFromSample = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsNameFromDsSample.performMulti(vars, trials);

  for (const r of res) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${r.results.aggregated?.avg}`
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: [rg65],
  model: [gpt35turbo, gpt4, gpt4turbo],
};

nameFromSample(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
