import { compareMc30 } from "../lib/experiments";
import { loadDatasetScores } from "../lib/experiments/compare-mc30";
import logger from "../lib/logger";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;

const compareMC30 = async () => {
  logger.info('Starting')
  const res = await compareMc30.runTrials(trials);

  const humanScores = await loadDatasetScores();

  await compareMc30.validate(res, humanScores);
}

compareMC30().then(() => {
  logger.info('Done');
  process.exit(0);
});
