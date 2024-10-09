import { ExpVarMatrix, dsSampleFromDsName } from "../lib/experiments";
import path from "path";
import { gpt4omini_20240718 } from "../lib/models";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import prompts from "src/lib/experiments/prediction-correlation/prompts";
import predictionCorrelation from "src/lib/experiments/prediction-correlation";
import pap900_rel from "src/lib/dataset-partitions/pap900_rel";
import pap900_sim from "src/lib/dataset-partitions/pap900_sim";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const predCorr = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await predictionCorrelation.performMulti(vars, trials, folder);

  dsSampleFromDsName.printUsage(res.usage);

  for (const exp of res.experiments) {
    logger.info(
      { ...exp.results.aggregated?.resultTypes },
      `${exp.meta.name} ${JSON.stringify(getVarIds(exp.variables))} ${exp.results.aggregated?.allDataAvg
      }`
    );
    logger.debug(
      exp.results.raw
        .map(r => r.data.scores.map(s => `[${s.words[0]}, ${s.words[1]}]`))
        .join("\n")
    );
  }
};

const evm: ExpVarMatrix = {
  //dpart: Object.values(dsParts),
  dpart: [
    // en rel
    //ws353Rel,
    //mturk287,
    // en sim
    //ws353Sim,
    //yp130,
    //srw2034,
    pap900_rel,
    pap900_sim,
  ],
  prompt: prompts,
  model: [
    //gpt35turbo,
    //gpt4,
    gpt4omini_20240718,
    //gpt4turbo_20240409,
    //gpt4o_20240806,
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
