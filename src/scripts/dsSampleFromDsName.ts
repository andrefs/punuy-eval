import { DatasetProfile } from "grillo-datasets/src/lib/types";
import { dsSampleFromDsName, saveExperimentData } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { rg65 } from "grillo-datasets";
import logger from "../lib/logger";

const sampleFromName = async (ds: DatasetProfile) => {

  logger.info('Starting')
  const timestamp = Date.now();
  const gpt35turbo_res = await dsSampleFromDsName.perform(10, ds, gpt35turbo, timestamp);
  const gpt4_res = await dsSampleFromDsName.perform(10, ds, gpt4, timestamp);
  const gpt4turbo_res = await dsSampleFromDsName.perform(10, ds, gpt4turbo, timestamp);

  logger.info({ ...gpt35turbo_res.combinedResult.resultTypes }, `gpt35turbo_res ${gpt35turbo_res.combinedResult.avg}`);
  logger.info({ ...gpt4_res.combinedResult.resultTypes }, `gpt4_res ${gpt4_res.combinedResult.avg}`);
  logger.info({ ...gpt4turbo_res.combinedResult.resultTypes }, `gpt4turbo_res ${gpt4turbo_res.combinedResult.avg}`);
}


sampleFromName(rg65).then(() => {
  logger.info('Done');
  process.exit(0);
});
