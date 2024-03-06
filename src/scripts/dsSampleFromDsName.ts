import { DatasetProfile } from "punuy-datasets/lib/types";
import { dsSampleFromDsName } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { rg65 } from "punuy-datasets";
import logger from "../lib/logger";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const sampleFromName = async (ds: DatasetProfile) => {
  logger.info("Starting");
  const timestamp = Date.now();
  const gpt35turbo_res = await dsSampleFromDsName.perform(
    trials,
    ds,
    gpt35turbo,
    timestamp
  );
  const gpt4_res = await dsSampleFromDsName.perform(
    trials,
    ds,
    gpt4,
    timestamp
  );
  const gpt4turbo_res = await dsSampleFromDsName.perform(
    trials,
    ds,
    gpt4turbo,
    timestamp
  );

  logger.info(
    { ...gpt35turbo_res.results.aggregated.resultTypes },
    `gpt35turbo_res ${gpt35turbo_res.results.aggregated.avg}`
  );
  logger.info(
    { ...gpt4_res.results.aggregated.resultTypes },
    `gpt4_res ${gpt4_res.results.aggregated.avg}`
  );
  logger.info(
    { ...gpt4turbo_res.results.aggregated.resultTypes },
    `gpt4turbo_res ${gpt4turbo_res.results.aggregated.avg}`
  );
};

sampleFromName(rg65).then(() => {
  logger.info("Done");
  process.exit(0);
});
