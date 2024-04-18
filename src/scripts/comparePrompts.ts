import { ExpVarMatrix, comparePrompts } from "../lib/experiments";
import { claude3opus, commandRPlus, gpt4turbo } from "../lib/models";
import logger from "../lib/logger";

import pt65 from "../lib/dataset-adapters/pt65_main";
import lxsimlex999 from "../lib/dataset-adapters/lxsimlex999_main";
import lxws353 from "../lib/dataset-adapters/lxws353_main";
import lxrw2034 from "../lib/dataset-adapters/lxrw2034_main";
import ws353Sim from "../lib/dataset-adapters/ws353Sim_sim";
import ws353Rel from "../lib/dataset-adapters/ws353Rel_rel";
import mturk287 from "../lib/dataset-adapters/mturk287_mturk";
import yp130 from "../lib/dataset-adapters/yp130_verbpairs";

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
  model: [gpt4turbo, claude3opus, commandRPlus],
};

comparePromptsMain(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
