import rg65 from "../lib/dataset-partitions/rg65_table1";
import mc30 from "../lib/dataset-partitions/mc30_table1";
import ws353 from "../lib/dataset-partitions/ws353_combined";
import ps65 from "../lib/dataset-partitions/ps65_main";

import { compareMc30 } from "../lib/experiments";
import { loadDatasetScores } from "../lib/experiments/compare-mc30";
import logger from "../lib/logger";
import {
  gpt4turbo,
  claude3opus,
  openMixtral8x22B,
  mistralLarge,
  gpt35turbo,
  gpt4,
  claude3sonnet,
} from "src/lib/models";
import path from "path";

const folder =
  process.argv[2] || path.join(".", "results", `exp_${Date.now()}`);
const trials = process.argv[3] ? parseInt(process.argv[3]) : 1;

const compareMC30 = async () => {
  logger.info("Starting");

  const humanScores = await loadDatasetScores({ rg65, mc30, ws353, ps65 });
  const models = [
    gpt35turbo,
    gpt4,
    gpt4turbo,
    claude3sonnet,
    claude3opus,
    mistralLarge,
    openMixtral8x22B,
  ];
  const res = await compareMc30.performMultiNoEval(models, trials, humanScores);

  if (res.usage) {
    logger.info(
      "Usage estimate:\n" +
        Object.values(res.usage)
          .map(u => `\t${JSON.stringify(u)}`)
          .join("\n")
    );
  }

  await compareMc30.evaluate(res.experiments, humanScores, trials, folder);
};

compareMC30().then(() => {
  logger.info("Done");
  process.exit(0);
});
