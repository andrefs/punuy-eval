import logger from "../lib/logger";
import { gpt35turbo, gpt4, gpt4turbo } from "models";
import { ExpVarMatrix, dsValuesExactMatches } from "experiments";
import rg65 from "dataset-adapters/rg65_table1";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const valuesExactMatch = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsValuesExactMatches.performMulti(vars, trials);

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

valuesExactMatch(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
