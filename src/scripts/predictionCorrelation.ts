import { ExpVarMatrix, dsSampleFromDsName } from "../lib/experiments";
import path from "path";
import { gpt4turbo, gpt4o } from "../lib/models";
import dsParts from "../lib/dataset-partitions";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import prompts from "src/lib/experiments/prediction-correlation/prompts";
import predictionCorrelation from "src/lib/experiments/prediction-correlation";
import ws353Rel from "src/lib/dataset-partitions/ws353Rel_rel";
import ws353Sim from "src/lib/dataset-partitions/ws353Sim_sim";
import yp130 from "src/lib/dataset-partitions/yp130_verbpairs";
import mturk287 from "src/lib/dataset-partitions/mt287_mturk";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const predCorr = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await predictionCorrelation.performMulti(vars, trials, folder);

  dsSampleFromDsName.printUsage(res.usage);

  for (const r of res.experiments) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${JSON.stringify(getVarIds(vars))} ${r.results.aggregated?.avg
      }`
    );
    logger.debug(
      r.results.raw
        .map(r => r.data.scores.map(s => `[${s.words[0]}, ${s.words[1]}]`))
        .join("\n")
    );
  }
};

const evm: ExpVarMatrix = {
  //dpart: Object.values(dsParts),
  dpart: [
    // en rel
    ws353Rel,
    mturk287,
    // en sim
    ws353Sim,
    yp130,
  ],
  prompt: prompts,
  model: [
    //gpt35turbo,
    //gpt4,
    gpt4turbo,
    gpt4o,
    //claude3sonnet,
    //claude3opus,
    //gemini10pro,
    //gemini15pro,
    //gemini15flash,
    //mistralLarge,
    //openMixtral8x22B,
  ],
};

predCorr(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
