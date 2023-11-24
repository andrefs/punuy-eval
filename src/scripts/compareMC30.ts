import { compareMc30 } from "../lib/experiments";
import { loadDatasetScores } from "../lib/experiments/compare-mc30";
import logger from "../lib/logger";


const compareMC30 = async () => {
  logger.info('Starting')
  const res = await compareMc30.runTrials(2);

  const humanScores = await loadDatasetScores();

  await compareMc30.validate(res, humanScores);
}

compareMC30().then(() => {
  logger.info('Done');
  process.exit(0);
});
