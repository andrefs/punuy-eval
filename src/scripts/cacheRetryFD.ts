import { ExpVarMatrix } from "../lib/experiments";
import path from "path";
import {
  claude35sonnet_20240620,
  claude3sonnet_20240229,
  gemini15flash_002,
  gemini15pro_002,
  gpt4o_20240806,
  gpt4turbo_20240409,
  ministral3b_2410,
} from "../lib/models";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
// prompts are the same as batch-vs-single-pair
import prompts from "src/lib/experiments/full-dataset/prompts";
import cacheRetry from "src/lib/experiments/cache-retry-fd";
import datasets from "../lib/dataset-partitions";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import simlex999_main from "src/lib/dataset-partitions/simlex999_main";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const traceId = parseInt(process.argv[3]) || Date.now();
const folder = process.argv[4] || path.join(".", "results", `exp_${traceId}`);

const cacheRetryFD = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await cacheRetry(traceId, folder).performMulti(vars, trials, {
    maxTrialAttempts: 2,
  });

  //for (const exp of res.experiments) {
  //  logger.info(
  //    { ...exp.results.aggregated?.resultTypes },
  //    `${exp.meta.name} ${JSON.stringify(getVarIds(exp.variables))} ${exp.results.aggregated?.okDataAvg
  //    }`
  //  );
  //  logger.debug(
  //    exp.results.raw
  //      .map(r =>
  //        r.turns.flatMap(({ data }) =>
  //          data.scores.map(s => `[${s.words[0]}, ${s.words[1]}]`)
  //        )
  //      )
  //      .join("\n")
  //  );
  //}
};

// slSample is a sample of the full simlex999 dataset
const slSample: DsPartition = {
  ...simlex999_main,
  id: simlex999_main.dataset.id + "#sample",
  partitionId: "sample",
  data: simlex999_main.data.slice(0, 50), // taking the first 50 pairs as a sample
};

const evm: ExpVarMatrix = {
  jobType: [{ id: "allPairs" }],
  dpart: [
    //datasets.gtrd_main,
    //datasets.baker143_main,
    //datasets.pap900_rel,
    //datasets.pap900_sim,
    //datasets.tr9856_main,
    datasets.simlex999_main,
    //slSample,
  ],
  prompt: prompts,
  model: [
    //gemini15flash_002,
    //claude3sonnet_20240229,
    //claude35sonnet_20240620,
    //gpt4o_20240806,
    gpt4turbo_20240409,
    //ministral3b_2410,
  ],
};

cacheRetryFD(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
