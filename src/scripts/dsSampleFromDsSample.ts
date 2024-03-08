import logger from "../lib/logger";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { ExpVarMatrix, dsSampleFromDsSample } from "../lib/experiments";
import rg65 from "punuy-datasets/datasets/rg65";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const sampleFromSample = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsSampleFromDsSample.performMulti(vars, trials);

  for (const r of res) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${r.results.aggregated?.avg}`
    );
  }
};

const evm: ExpVarMatrix = {
  dataset: [rg65],
  model: [gpt35turbo, gpt4, gpt4turbo],
};

sampleFromSample(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
