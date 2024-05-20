import logger from "../lib/logger";
import {
  claude3opus,
  claude3sonnet,
  gemini10pro,
  gemini15flash,
  gemini15pro,
  gpt35turbo,
  gpt4,
  gpt4o,
  gpt4turbo,
  mistralLarge,
  openMixtral8x22B,
} from "../lib/models";
import { ExpVarMatrix, dsValuesExactMatches } from "../lib/experiments";
import dsParts from "../lib/dataset-partitions";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import path from "path";

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const valuesExactMatch = async (vars: ExpVarMatrix) => {
  logger.info("🚀 Starting");
  const res = await dsValuesExactMatches.performMulti(vars, trials, folder);

  dsValuesExactMatches.printUsage(res.usage);

  for (const r of res.experiments) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${JSON.stringify(getVarIds(r.variables))} ${
        r.results.aggregated?.avg
      }`
    );
    logger.debug(
      r.results.raw
        .map(r =>
          r.data.scores.map(s => `[${s.words[0]}, ${s.words[1]}], ${s.score}]`)
        )
        .join("\n")
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: Object.values(dsParts),
  model: [
    gpt35turbo,
    gpt4,
    gpt4turbo,
    gpt4o,
    claude3sonnet,
    claude3opus,
    gemini10pro,
    gemini15pro,
    gemini15flash,
    mistralLarge,
    openMixtral8x22B,
  ],
};

valuesExactMatch(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
