import { ExpVarMatrix } from "../lib/experiments";
import path from "path";
import {
  gemini15flash_002,
  gemini15pro_002,
  gpt4omini_20240718,
} from "../lib/models";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
// prompts are the same as batch-vs-single-pair
import prompts from "src/lib/experiments/batch-vs-single-pair/prompts";
import predictionCorrelation from "src/lib/experiments/prediction-correlation";
import ws353Rel_rel from "src/lib/dataset-partitions/ws353Rel_rel";
import ws353Sim_sim from "src/lib/dataset-partitions/ws353Sim_sim";
import yp130_verbpairs from "src/lib/dataset-partitions/yp130_verbpairs";
import mt287_mturk from "src/lib/dataset-partitions/mt287_mturk";
import pt65_main from "src/lib/dataset-partitions/pt65_main";
import pap900_rel from "src/lib/dataset-partitions/pap900_rel";
import pap900_sim from "src/lib/dataset-partitions/pap900_sim";
import lxrw2034_main from "src/lib/dataset-partitions/lxrw2034_main";
import lxsimlex999_main from "src/lib/dataset-partitions/lxsimlex999_main";
import lxws353_main from "src/lib/dataset-partitions/lxws353_main";
import srw2034_rw from "src/lib/dataset-partitions/srw2034_rw";
import rg65_table1 from "src/lib/dataset-partitions/rg65_table1";
import simlex999_main from "src/lib/dataset-partitions/simlex999_main";

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
  jobType: [{ id: "allPairs" }],
  dpart: [
    // en rel
    ws353Rel_rel,
    //mt287_mturk,
    //rg65_table1,
    //// en sim
    //ws353Sim_sim,
    //yp130_verbpairs,
    //srw2034_rw,
    //simlex999_main,
    //// pt rel
    //pap900_rel,
    //pt65_main,
    //lxws353_main,
    //// pt sim
    //pap900_sim,
    //lxrw2034_main,
    //lxsimlex999_main,
  ],
  prompt: prompts,
  model: [
    //gpt35turbo,
    //gpt4,
    //gpt4omini_20240718,
    //gpt4turbo_20240409,
    //gpt4o_20240806,
    //claude3sonnet,
    //claude3opus,
    //gemini10pro,
    //gemini15pro_002,
    gemini15flash_002,
    //mistralLarge_2407,
    //openMixtral8x22B,
  ],
};

predCorr(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
