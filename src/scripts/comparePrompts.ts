import { ExpVarMatrix, comparePrompts } from "../lib/experiments";
import { gpt4turbo } from "../lib/models";
import logger from "../lib/logger";

import pt65 from "punuy-datasets/datasets/pt65";
import lxsimlex999 from "punuy-datasets/datasets/lxsimlex999";
import lxws353 from "punuy-datasets/datasets/lxws353";
import lxrw2034 from "punuy-datasets/datasets/lxrw2034";
import ws353Sim from "punuy-datasets/datasets/ws353Sim";
import ws353Rel from "punuy-datasets/datasets/ws353Rel";
import mturk287 from "punuy-datasets/datasets/mturk287";
import yp130 from "punuy-datasets/datasets/yp130";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const comparePromptsMain = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await comparePrompts.performMulti(vars, trials);
  await comparePrompts.validate(res);
  //console.log(res);
};

const evm: ExpVarMatrix = {
  dataset: [
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
