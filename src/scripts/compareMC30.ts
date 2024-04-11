import rg65 from "../lib/dataset-adapters/rg65_table1";
import mc30 from "../lib/dataset-adapters/mc30_table1";
import ws353 from "../lib/dataset-adapters/ws353_combined";
import ps65 from "../lib/dataset-adapters/ps65_main";

import { compareMc30 } from "../lib/experiments";
import { loadDatasetScores } from "../lib/experiments/compare-mc30";
import logger from "../lib/logger";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 1;

const compareMC30 = async () => {
  logger.info("Starting");

  const humanScores = await loadDatasetScores({ rg65, mc30, ws353, ps65 });
  const res = await compareMc30.runTrials(trials, humanScores);

  await compareMc30.evaluate(res, humanScores, trials);
};

compareMC30().then(() => {
  logger.info("Done");
  process.exit(0);
});
