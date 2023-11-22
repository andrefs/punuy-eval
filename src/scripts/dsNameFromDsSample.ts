import { DatasetProfile } from "grillo-datasets/src/lib/types";
import logger from "../lib/logger";
import { dsNameFromDsSample } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { rg65 } from "grillo-datasets";


const nameFromSample = async (ds: DatasetProfile) => {
  logger.info('Starting')
  console.log('GPT-3.5 Turbo 1106');
  const gpt35turbo_res = await dsNameFromDsSample.perform(1, ds, gpt35turbo);
  const gpt4_res = await dsNameFromDsSample.perform(1, ds, gpt4);
  const gpt4turbo_res = await dsNameFromDsSample.perform(1, ds, gpt4turbo);

  logger.info({ ...gpt35turbo_res.combinedResult.resultTypes }, `gpt35turbo_res ${gpt35turbo_res.combinedResult.avg}`);
  logger.info({ ...gpt4_res.combinedResult.resultTypes }, `gpt4_res ${gpt4_res.combinedResult.avg}`);
  logger.info({ ...gpt4turbo_res.combinedResult.resultTypes }, `gpt4turbo_res ${gpt4turbo_res.combinedResult.avg}`);
}

nameFromSample(rg65).then(() => {
  logger.info('Done');
  process.exit(0);
});



