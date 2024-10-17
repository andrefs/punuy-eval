import { ExpVarMatrix } from "../lib/experiments";
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
import wp300_wp from "src/lib/dataset-partitions/wp300_wp";
import word19k_train from "src/lib/dataset-partitions/word19k_train";
import gtrd_main from "src/lib/dataset-partitions/gtrd_main";
import semeval17_main from "src/lib/dataset-partitions/semeval17_main";
import simverb3500_dev from "src/lib/dataset-partitions/simverb3500_dev";
import tr9856_main from "src/lib/dataset-partitions/tr9856_main";
import men3000_dev from "src/lib/dataset-partitions/men3000_dev";

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
    ws353Rel_rel,
    mt287_mturk,
    rg65_table1,
    word19k_train, // is this the right partition?
    gtrd_main,
    tr9856_main,
    men3000_dev, // is this the right partition?
    //// en sim
    ws353Sim_sim,
    yp130_verbpairs,
    srw2034_rw,
    simlex999_main,
    wp300_wp,
    semeval17_main,
    simverb3500_dev,
    //// pt rel
    pap900_rel,
    pt65_main,
    lxws353_main,
    //// pt sim
    pap900_sim,
    lxrw2034_main,
    lxsimlex999_main,
  ],
  prompt: prompts,
  model: [
    // super cheap
    //gemini15flash_002,
    //gpt4omini_20240718,
    //openMistralNemo_2407,
    //ministral8b_2410,
    //ministral3b_2410,
    //mistralSmall_2409,
    //openMistral7B,

    // low cost
    claude3haiku,
    gpt35turbo_0125,
    openMixtral8x7B,
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
