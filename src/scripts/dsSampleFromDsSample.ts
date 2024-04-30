import logger from "../lib/logger";
import {
  claude3opus,
  claude3sonnet,
  gpt35turbo,
  gpt4,
  gpt4turbo,
  mistralLarge,
  openMixtral8x22B,
} from "../lib/models";
import { ExpVarMatrix, dsSampleFromDsSample } from "../lib/experiments";
import dsParts from "../lib/dataset-partitions";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import path from "path";

const folder =
  process.argv[2] || path.join(".", "results", `exp_${Date.now()}`);
const trials = process.argv[3] ? parseInt(process.argv[3]) : 3;

const sampleFromSample = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsSampleFromDsSample.performMulti(vars, trials, folder);

  dsSampleFromDsSample.printUsage(res.usage);

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
  dpart: Object.values(dsParts),
  model: [
    gpt35turbo,
    gpt4,
    gpt4turbo,
    claude3sonnet,
    claude3opus,
    mistralLarge,
    openMixtral8x22B,
  ],
};

sampleFromSample(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
