import { DatasetProfile } from "grillo-datasets/src/lib/types";
import logger from "../lib/logger";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { dsSampleFromDsSample } from "../lib/experiments";
import { rg65 } from "grillo-datasets";

const sampleFromSample = async (ds: DatasetProfile) => {
  logger.info('Starting')
  const timestamp = Date.now();
  const gpt35turbo_res = await dsSampleFromDsSample.perform(1, ds, gpt35turbo, timestamp);
  const gpt4_res = await dsSampleFromDsSample.perform(1, ds, gpt4, timestamp);
  const gpt4turbo_res = await dsSampleFromDsSample.perform(1, ds, gpt4turbo, timestamp);

  logger.info({ ...gpt35turbo_res.combinedResult.resultTypes }, `gpt35turbo_res ${gpt35turbo_res.combinedResult.avg}`);
  logger.info({ ...gpt4_res.combinedResult.resultTypes }, `gpt4_res ${gpt4_res.combinedResult.avg}`);
  logger.info({ ...gpt4turbo_res.combinedResult.resultTypes }, `gpt4turbo_res ${gpt4turbo_res.combinedResult.avg}`);
}

sampleFromSample(rg65).then(() => {
  logger.info('Done');
  process.exit(0);
});

