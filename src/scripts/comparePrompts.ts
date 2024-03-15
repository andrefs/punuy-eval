import { ExpVarMatrix, comparePrompts } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import logger from "../lib/logger";
import ws353 from "punuy-datasets/datasets/ws353";
import simlex999 from "punuy-datasets/datasets/simlex999";
import atlasify240 from "punuy-datasets/datasets/atlasify240";
import rel122 from "punuy-datasets/datasets/rel122";
import pt65 from "punuy-datasets/datasets/pt65";
import lxsimlex999 from "punuy-datasets/datasets/lxsimlex999";

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
  dataset: [ws353, simlex999, pt65, lxsimlex999],
  model: [gpt4turbo],
};

comparePromptsMain(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
