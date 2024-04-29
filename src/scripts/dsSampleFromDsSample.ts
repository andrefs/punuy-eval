import logger from "../lib/logger";
import { claude3opus, commandRPlus, gpt4turbo } from "../lib/models";
import { ExpVarMatrix, dsSampleFromDsSample } from "../lib/experiments";
import rg65 from "../lib/dataset-partitions/rg65_table1";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import path from "path";

const folder =
  process.argv[2] || path.join(".", "results", `exp_${Date.now()}`);
const trials = process.argv[3] ? parseInt(process.argv[3]) : 3;

const sampleFromSample = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsSampleFromDsSample.performMulti(vars, trials, folder);

  if (res.usage) {
    logger.info(
      "Usage estimate:\n" +
        Object.values(res.usage)
          .map(u => `\t${JSON.stringify(u)}`)
          .join("\n")
    );
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

sampleFromSample(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
