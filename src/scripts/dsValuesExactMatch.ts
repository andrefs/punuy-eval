import { DatasetProfile } from "punuy-datasets/lib/types";
import logger from "../lib/logger";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { dsValuesExactMatches } from "../lib/experiments";
import rg65 from "punuy-datasets/datasets/rg65";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const valuesExactMatch = async (ds: DatasetProfile) => {
  logger.info("Starting");
  const timestamp = Date.now();
  const gpt35turbo_res = await dsValuesExactMatches.perform(
    trials,
    ds,
    gpt35turbo,
    timestamp
  );
  const gpt4_res = await dsValuesExactMatches.perform(
    trials,
    ds,
    gpt4,
    timestamp
  );
  const gpt4turbo_res = await dsValuesExactMatches.perform(
    trials,
    ds,
    gpt4turbo,
    timestamp
  );

  logger.info(
    { ...gpt35turbo_res.combinedResult.resultTypes },
    `gpt35turbo_res: ${gpt35turbo_res.combinedResult.avg.toFixed(2)}%`
  );
  logger.info(
    { ...gpt4_res.combinedResult.resultTypes },
    `gpt4_res: ${gpt4_res.combinedResult.avg.toFixed(2)}%`
  );
  logger.info(
    { ...gpt4turbo_res.combinedResult.resultTypes },
    `gpt4turbo_res: ${gpt4turbo_res.combinedResult.avg.toFixed(2)}%`
  );
};

valuesExactMatch(rg65).then(() => {
  logger.info("Done");
  process.exit(0);
});
