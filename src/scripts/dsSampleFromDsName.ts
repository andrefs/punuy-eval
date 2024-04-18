import { ExpVarMatrix, dsSampleFromDsName } from "../lib/experiments";
import { claude3opus, commandRPlus, gpt4turbo } from "../lib/models";
import rg65 from "../lib/dataset-adapters/rg65_table1";
import logger from "../lib/logger";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const sampleFromName = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsSampleFromDsName.performMulti(vars, trials);

  if (res.usage) {
    logger.info(`Usage: ${JSON.stringify(res.usage)}`);
  }

  for (const r of res.experiments) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${r.results.aggregated?.avg}`
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: [rg65],
  model: [gpt4turbo, claude3opus, commandRPlus],
};

sampleFromName(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
