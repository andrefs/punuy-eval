import logger from "../lib/logger";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { ExpVarMatrix, dsSampleFromDsSample } from "../lib/experiments";
import rg65 from "../lib/dataset-adapters/rg65_table1";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const sampleFromSample = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsSampleFromDsSample.performMulti(vars, trials);

  if (res.usage) {
    logger.info(`Usage estimate: ${JSON.stringify(res.usage)}`);
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
  model: [gpt35turbo, gpt4, gpt4turbo],
};

sampleFromSample(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
