import { ExpVarMatrix } from "../lib/experiments";
import path from "path";
import {
  // anthropic
  claude35sonnet_20240620,
  claude3haiku,
  claude3opus,
  claude3sonnet_20240229,

  // google
  gemini10pro_001,
  gemini15flash_002,
  gemini15flash_8b,
  gemini15pro_002,

  // openai
  gpt35turbo_0125,
  gpt4_0613,
  gpt4o_20240806,
  gpt4omini_20240718,
  gpt4turbo_20240409,

  // mistral
  ministral3b_2410,
  ministral8b_2410,
  mistralLarge_2407,
  mistralMedium_2312,
  mistralSmall_2409,
  openMistralNemo_2407,
} from "../lib/models";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
// prompts are the same as batch-vs-single-pair
import prompts from "src/lib/experiments/batch-vs-single-pair/prompts";
import predictionCorrelation from "src/lib/experiments/prediction-correlation";
import datasets from "../lib/dataset-partitions";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const predCorr = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await predictionCorrelation.performMulti(vars, trials, folder);

  for (const exp of res.experiments) {
    logger.info(
      { ...exp.results.aggregated?.resultTypes },
      `${exp.meta.name} ${JSON.stringify(getVarIds(exp.variables))} ${exp.results.aggregated?.okDataAvg
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
  dpart: Object.values(datasets),
  prompt: prompts,
  model: [
    // super cheap
    //mistralSmall_2409,
    //gpt4omini_20240718,
    //openMistralNemo_2407,
    //ministral8b_2410,
    //gemini15flash_002,
    //ministral3b_2410,
    //gemini15flash_8b,
    //// low cost
    //gpt35turbo_0125,
    //claude3haiku,
    //// medium cost
    //mistralLarge_2407,
    //gemini15pro_002,
    //// expensive
    //claude3sonnet_20240229,
    //claude35sonnet_20240620,
    //gpt4o_20240806,
    mistralMedium_2312,
    //// super expensive
    //gpt4turbo_20240409,
    //// crazy
    //gpt4_0613,
    //claude3opus,
  ],
};

predCorr(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
