import { ExpVarMatrix, comparePrompts, getVarIds } from "../lib/experiments";
import { gpt4turbo } from "../lib/models";
import logger from "../lib/logger";

import pt65 from "punuy-datasets/datasets/pt65";
import lxsimlex999 from "punuy-datasets/datasets/lxsimlex999";
import lxws353 from "punuy-datasets/datasets/lxws353";
import lxrw2034 from "punuy-datasets/datasets/lxrw2034";
import ws353Sim from "punuy-datasets/datasets/ws353Sim";
import ws353Rel from "punuy-datasets/datasets/ws353Rel";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const comparePromptsMain = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await comparePrompts.performMulti(vars, trials);
  await comparePrompts.validate(res);
  //console.log(res);
};

const evm: ExpVarMatrix = {
  //dataset: [ws353, simlex999, atlasify240, rel122],
  //model: [gpt35turbo, gpt4, gpt4turbo],
  //dataset: [pt65, lxsimlex999, ws353Sim, ws353Rel],
  //dataset: [pt65, lxsimlex999, lxws353, lxrw2034, ws353Rel, ws353Sim],
  dataset: [pt65, lxsimlex999, lxws353, lxrw2034],
  model: [gpt4turbo],
};

comparePromptsMain(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
