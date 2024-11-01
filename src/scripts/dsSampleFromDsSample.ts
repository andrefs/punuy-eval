import logger from "../lib/logger";
import {
  claude3opus,
  claude3sonnet_20240229,
  gemini15flash_002,
  gemini15pro_002,
  gpt35turbo_0125,
  gpt4_0613,
  gpt4omini_20240718,
  gpt4turbo_20240409,
  mistralLarge_2407,
  openMixtral8x22B,
} from "../lib/models";
import { ExpVarMatrix, dsSampleFromDsSample } from "../lib/experiments";
import dsParts from "../lib/dataset-partitions";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import path from "path";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const sampleFromSample = async (vars: ExpVarMatrix) => {
  logger.info("🚀 Starting");
  const res = await dsSampleFromDsSample.performMulti(vars, trials, folder);

  for (const r of res.experiments) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${JSON.stringify(getVarIds(r.variables))} ${
        r.results.aggregated?.okDataAvg
      }`
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: Object.values(dsParts),
  model: [
    gpt35turbo_0125,
    gpt4_0613,
    gpt4turbo_20240409,
    gpt4omini_20240718,
    claude3sonnet_20240229,
    claude3opus,
    gemini15pro_002,
    gemini15flash_002,
    mistralLarge_2407,
    openMixtral8x22B,
  ],
};

sampleFromSample(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
