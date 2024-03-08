import { ExpVarMatrix, comparePrompts } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import logger from "../lib/logger";
import ws353 from "punuy-datasets/datasets/ws353";
import simlex999 from "punuy-datasets/datasets/simlex999";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 1;

const comparePromptsMain = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await comparePrompts.performMulti(vars, trials);
  console.log(res);
};

const evm: ExpVarMatrix = {
  dataset: [ws353, simlex999],
  model: [gpt35turbo, gpt4, gpt4turbo],
};

comparePromptsMain(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
