import { ExpVarMatrix } from "../lib/experiments";
import path from "path";
import {
  claude35sonnet_20240620,
  claude3sonnet_20240229,
  gemini15pro_002,
  gpt4o_20240806,
  gpt4turbo_20240409,
} from "../lib/models";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
// prompts are the same as batch-vs-single-pair
import prompts from "src/lib/experiments/full-dataset/prompts";
import fullDataset from "src/lib/experiments/full-dataset";
import datasets from "../lib/dataset-partitions";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const fullDs = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await fullDataset.performMulti(vars, trials, folder);

  for (const exp of res.experiments) {
    logger.info(
      { ...exp.results.aggregated?.resultTypes },
      `${exp.meta.name} ${JSON.stringify(getVarIds(exp.variables))} ${
        exp.results.aggregated?.okDataAvg
      }`
    );
    logger.debug(
      exp.results.raw
        .map(r =>
          r.turns.flatMap(({ data }) =>
            data.scores.map(s => `[${s.words[0]}, ${s.words[1]}]`)
          )
        )
        .join("\n")
    );
  }
};

const evm: ExpVarMatrix = {
  jobType: [{ id: "allPairs" }],
  dpart: [
    datasets.rg65_table1,
    datasets.simlex999_main,
    datasets.men3000_full,
    datasets.ws353_combined,
  ],
  prompt: prompts,
  model: [
    gemini15pro_002,
    claude3sonnet_20240229,
    claude35sonnet_20240620,
    gpt4o_20240806,
    gpt4turbo_20240409,
  ],
};

fullDs(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
