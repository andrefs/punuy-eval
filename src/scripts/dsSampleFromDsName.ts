import { ExpVarMatrix, dsSampleFromDsName } from "../lib/experiments";
import {
  claude3sonnet,
  claude3opus,
  gpt35turbo,
  gpt4,
  gpt4turbo,
  mistralLarge,
  openMixtral8x22B,
} from "../lib/models";
import ds from "../lib/dataset-partitions";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const sampleFromName = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsSampleFromDsName.performMulti(vars, trials);

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
    logger.debug(
      r.results.raw.map(r => r.pairs.map(p => `[${p[0]}, ${p[1]}]`)).join("\n")
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: Object.values(ds).slice(-2),
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

sampleFromName(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
