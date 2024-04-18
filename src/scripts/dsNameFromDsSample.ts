import logger from "../lib/logger";
import { ExpVarMatrix, dsNameFromDsSample } from "../lib/experiments";
import { claude3opus, commandRPlus, gpt4turbo } from "../lib/models";
import rg65 from "../lib/dataset-adapters/rg65_table1";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const nameFromSample = async (vars: ExpVarMatrix) => {
  logger.info("Starting");

  const res = await dsNameFromDsSample.performMulti(vars, trials);

  if (res.usage) {
    logger.info(`Usage estimate: ${JSON.stringify(res.usage)}`);
  }

  for (const r of res.experiments) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${r.variables.model.id} ${r.results.aggregated?.avg}`
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: [rg65],
  model: [claude3opus, commandRPlus, gpt4turbo],
};

nameFromSample(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
