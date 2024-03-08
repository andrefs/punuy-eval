import { ExpVarMatrix, dsSampleFromDsName } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { rg65 } from "punuy-datasets";
import logger from "../lib/logger";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const sampleFromName = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsSampleFromDsName.performMulti(vars, trials);

  for (const r of res) {
    logger.info(
      { ...r.results.aggregated.resultTypes },
      `${r.meta.name} ${r.results.aggregated.avg}`
    );
  }
};

const evm: ExpVarMatrix = {
  dataset: [rg65],
  model: [gpt35turbo, gpt4, gpt4turbo],
};

sampleFromName(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
