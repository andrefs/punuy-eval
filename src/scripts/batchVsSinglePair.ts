import { ExpVarMatrix } from "../lib/experiments";
import path from "path";
import {
  claude35sonnet_20240620,
  claude3haiku,
  claude3opus,
  claude3sonnet_20240229,
  gemini15flash_002,
  gemini15pro_002,
  gpt35turbo_0125,
  gpt4_0613,
  gpt4o_20240806,
  gpt4omini_20240718,
  gpt4turbo_20240409,
  ministral8b_2410,
  mistralLarge_2407,
  openMixtral8x22B,
} from "../lib/models";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import prompts from "src/lib/experiments/batch-vs-single-pair/prompts";
import batchVsSinglePair from "src/lib/experiments/batch-vs-single-pair";
import datasets from "../lib/dataset-partitions";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const bvsp = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await batchVsSinglePair.performMulti(vars, trials, folder);

  for (const exp of res.experiments) {
    logger.info(
      { ...exp.results.aggregated?.resultTypes },
      `${exp.meta.name} ${JSON.stringify(getVarIds(exp.variables))} ${exp.results.aggregated?.allDataAvg
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
  dpart: Object.values(datasets),
  jobType: [{ id: "singlePair" }, { id: "batches" }, { id: "allPairs" }],
  prompt: prompts,
  model: [
    gpt35turbo_0125,
    gpt4_0613,
    gpt4omini_20240718,
    gpt4turbo_20240409,
    gpt4o_20240806,
    claude3sonnet_20240229,
    claude3opus,
    gemini15flash_002,
    claude35sonnet_20240620,
    gemini15pro_002,
    ministral8b_2410,
    claude3haiku,
    mistralLarge_2407,
    openMixtral8x22B,
  ],
};

bvsp(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
