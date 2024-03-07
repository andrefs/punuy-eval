import { comparePrompts } from "../lib/experiments";
import logger from "../lib/logger";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 1;

const comparePromptsMain = async () => {
  logger.info("Starting");
  const trialsRes = await comparePrompts.runTrials(trials);

  await comparePrompts.validate(trialsRes);
};

comparePromptsMain().then(() => {
  logger.info("Done");
  process.exit(0);
});
