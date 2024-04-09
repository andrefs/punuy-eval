import { ExpVarMatrix, comparePrompts } from "experiments";
import { gpt4turbo } from "models";
import logger from "../lib/logger";

import pt65 from "dataset-adapters/pt65_main";
import lxsimlex999 from "dataset-adapters/lxsimlex999_main";
import lxws353 from "dataset-adapters/lxws353_main";
import lxrw2034 from "dataset-adapters/lxrw2034_main";
import ws353Sim from "dataset-adapters/ws353Sim_wordsim_similarity_goldstandard.txt";
import ws353Rel from "dataset-adapters/ws353Rel_wordsim_relatedness_goldstandard.txt";
import mturk287 from "dataset-adapters/mturk287_mturk";
import yp130 from "dataset-adapters/yp130_verbpairs";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const comparePromptsMain = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await comparePrompts.performMulti(vars, trials);
  await comparePrompts.evaluate(res);
  //console.log(res);
};

const evm: ExpVarMatrix = {
  dpart: [
    // pt rel
    pt65,
    lxws353,
    // pt sim
    lxsimlex999,
    lxrw2034,
    // en rel
    ws353Rel,
    mturk287,
    // en sim
    ws353Sim,
    yp130,
  ],
  model: [gpt4turbo],
};

comparePromptsMain(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
