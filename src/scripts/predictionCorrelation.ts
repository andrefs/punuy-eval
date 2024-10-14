import { ExpVarMatrix } from "../lib/experiments";
import path from "path";
import { gpt4omini_20240718 } from "../lib/models";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import prompts from "src/lib/experiments/prediction-correlation/prompts";
import predictionCorrelation from "src/lib/experiments/prediction-correlation";
import ws353Rel_rel from "src/lib/dataset-partitions/ws353Rel_rel";
import ws353Sim_sim from "src/lib/dataset-partitions/ws353Sim_sim";
import yp130_verbpairs from "src/lib/dataset-partitions/yp130_verbpairs";
import mt287_mturk from "src/lib/dataset-partitions/mt287_mturk";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const predCorr = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await predictionCorrelation.performMulti(vars, trials, folder);

  predictionCorrelation.printUsage(res.usage);

  for (const exp of res.experiments) {
    logger.info(
      { ...exp.results.aggregated?.resultTypes },
      `${exp.meta.name} ${JSON.stringify(getVarIds(exp.variables))} ${exp.results.aggregated?.allDataAvg
      }`
    );
    logger.debug(
      exp.results.raw
        .map(r =>
          r.turns.flatMap(({ data }) =>
            data.scores.map(s => `[${s.words[0]}, ${s.words[1]}]`)
          )
        )
        .join("\n")
    );
  }
};

const evm: ExpVarMatrix = {
  //dpart: Object.values(dsParts),
  dpart: [
    // en rel
    ws353Rel_rel,
    mt287_mturk,
    // en sim
    ws353Sim_sim,
    yp130_verbpairs,
    //srw2034,
    //pap900_rel,
    //pap900_sim,
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
    //mistralLarge_2407,
    //openMixtral8x22B,
  ],
};

predCorr(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
