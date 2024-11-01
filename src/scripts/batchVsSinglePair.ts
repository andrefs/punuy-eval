import { ExpVarMatrix } from "../lib/experiments";
import path from "path";
import {
  claude35sonnet_20240620,
  claude3haiku,
  gemini15flash_002,
  gemini15pro_002,
  gpt4omini_20240718,
  ministral8b_2410,
} from "../lib/models";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import prompts from "src/lib/experiments/batch-vs-single-pair/prompts";
import ws353Rel_rel from "src/lib/dataset-partitions/ws353Rel_rel";
import ws353Sim_sim from "src/lib/dataset-partitions/ws353Sim_sim";
import yp130_verbpairs from "src/lib/dataset-partitions/yp130_verbpairs";
import mt287_mturk from "src/lib/dataset-partitions/mt287_mturk";
import batchVsSinglePair from "src/lib/experiments/batch-vs-single-pair";
import srw2034_rw from "src/lib/dataset-partitions/srw2034_rw";
import pap900_rel from "src/lib/dataset-partitions/pap900_rel";
import pap900_sim from "src/lib/dataset-partitions/pap900_sim";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const bvsp = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await batchVsSinglePair.performMulti(vars, trials, folder);

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
  jobType: [
    { id: "singlePair" },
    //{ id: "batches" },
    //{ id: "allPairs" }
  ],
  dpart: [
    // en rel
    ws353Rel_rel,
    mt287_mturk,
    //// en sim
    ws353Sim_sim,
    yp130_verbpairs,
    srw2034_rw,
    //// pt
    pap900_rel,
    pap900_sim,
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
    gemini15flash_002,
    //claude35sonnet_20240620,
    //gemini15pro_002,
    //ministral8b_2410,
    //claude3haiku,
    //mistralLarge_2407,
    //openMixtral8x22B,
  ],
};

bvsp(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
