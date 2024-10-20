import { ExpVarMatrix } from "../experiments";
import path from "path";
import {
  claude35sonnet_20240620,
  claude3haiku,
  claude3opus,
  commandR_082024,
  commandRPlus_082024,
  gemini15flash_002,
  gemini15pro_002,
  gpt35turbo_0125,
  gpt4o_20240806,
  gpt4omini_20240718,
  gpt4turbo_20240409,
  ministral3b_2410,
  ministral8b_2410,
  mistralLarge_2407,
  mistralSmall_2409,
  openMistral7B,
  openMistralNemo_2407,
  openMixtral8x22B,
  openMixtral8x7B,
} from "../models";
import logger from "../logger";
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
import wp300_wp from "src/lib/dataset-partitions/wp300_wp";
import word19k_train from "src/lib/dataset-partitions/word19k_train";
import gtrd_main from "src/lib/dataset-partitions/gtrd_main";
import semeval17_main from "src/lib/dataset-partitions/semeval17_main";
import simverb3500_dev from "src/lib/dataset-partitions/simverb3500_dev";
import tr9856_main from "src/lib/dataset-partitions/tr9856_main";
import men3000_full from "src/lib/dataset-partitions/men3000_full";
import atlasify240_main from "src/lib/dataset-partitions/atlasify240_main";
import baker143_main from "src/lib/dataset-partitions/baker143_main";
import bg100k_all from "src/lib/dataset-partitions/bg100k_all";
import geresid50_rel from "src/lib/dataset-partitions/geresid50_rel";
import geresid50_sim from "src/lib/dataset-partitions/geresid50_sim";
import gm30_main from "src/lib/dataset-partitions/gm30_main";
import ma28_main from "src/lib/dataset-partitions/ma28_main";
import mayoSRS_mean from "src/lib/dataset-partitions/mayoSRS_mean";
import mc30_table1 from "src/lib/dataset-partitions/mc30_table1";
import mesh2_main from "src/lib/dataset-partitions/mesh2_main";
import minimayoSRS_coders from "src/lib/dataset-partitions/minimayoSRS_coders";
import minimayoSRS_physicians from "src/lib/dataset-partitions/minimayoSRS_physicians";
import mturk771_mturk from "src/lib/dataset-partitions/mturk771_mturk";
import ps65_main from "src/lib/dataset-partitions/ps65_main";
import rel122_main from "src/lib/dataset-partitions/rel122_main";
import reword26_g26 from "src/lib/dataset-partitions/reword26_g26";
import scws2003_main from "src/lib/dataset-partitions/scws2003_main";
import sl7576_main from "src/lib/dataset-partitions/sl7576_main";
import umnsrs_rel from "src/lib/dataset-partitions/umnsrs_rel";
import umnsrsMod_rel from "src/lib/dataset-partitions/umnsrsMod_rel";
import umnsrsMod_sim from "src/lib/dataset-partitions/umnsrsMod_sim";
import umnsrs_sim from "src/lib/dataset-partitions/umnsrs_sim";
import word19k_test from "./word19k_test";
import ws353_combined from "./ws353_combined";
import zie55_B0 from "./zie55_B0";
import zie55_B1 from "./zie55_B1";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const predCorr = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await predictionCorrelation.performMulti(vars, trials, folder);

  predictionCorrelation.printUsage(res.usage, true);

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
    atlasify240_main,
    geresid50_rel,
    gm30_main,
    gtrd_main,
    mayoSRS_mean,
    men3000_full,
    minimayoSRS_coders,
    minimayoSRS_physicians,
    mt287_mturk,
    mturk771_mturk,
    rel122_main,
    reword26_g26,
    scws2003_main,
    tr9856_main,
    umnsrsMod_rel,
    umnsrs_rel,
    word19k_train,
    word19k_test,
    ws353Rel_rel,
    zie55_B0,
    zie55_B1,

    //// en sim
    baker143_main,
    bg100k_all,
    geresid50_sim,
    ma28_main,
    mc30_table1,
    mesh2_main,
    ps65_main,
    rg65_table1,
    semeval17_main,
    simlex999_main,
    simverb3500_dev,
    sl7576_main,
    srw2034_rw,
    umnsrsMod_sim,
    umnsrs_sim,
    wp300_wp,
    ws353Sim_sim,
    ws353_combined,
    yp130_verbpairs,

    //// pt rel
    lxws353_main,
    pap900_rel,
    pt65_main,

    //// pt sim
    lxrw2034_main,
    lxsimlex999_main,
    pap900_sim,
  ],
  prompt: prompts,
  model: [
    // super cheap
    gemini15flash_002,
    gpt4omini_20240718,
    openMistralNemo_2407,
    ministral8b_2410,
    ministral3b_2410,
    mistralSmall_2409,
    openMistral7B, // legacy

    // low cost
    //claude3haiku,
    //gpt35turbo_0125,
    //openMixtral8x7B, // legacy
    ////commandR_082024, // disabled because it doesn't generate JSON correctly

    // medium cost
    //gemini15pro_002,

    // expensive
    //commandRPlus_082024,
    //mistralLarge_2407,
    //claude35sonnet_20240620,
    //gpt4o_20240806,

    // super expensive
    //gpt4turbo_20240409,

    // crazy
    //claude3opus,
  ],
};

predCorr(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
