import logger from "../lib/logger";
import { claude3opus, commandRPlus, gpt4turbo } from "../lib/models";
import { ExpVarMatrix, dsValuesExactMatches } from "../lib/experiments";
import rg65 from "../lib/dataset-adapters/rg65_table1";
import { getVarIds } from "src/lib/experiments/experiment/aux";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const valuesExactMatch = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsValuesExactMatches.performMulti(vars, trials);

  if (res.usage) {
    logger.info(`Usage estimate: ${JSON.stringify(res.usage)}`);
  }

  for (const r of res.experiments) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${JSON.stringify(getVarIds(vars))} ${
        r.results.aggregated?.avg
      }`
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: [rg65],
  model: [claude3opus, commandRPlus, gpt4turbo],
};

valuesExactMatch(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
