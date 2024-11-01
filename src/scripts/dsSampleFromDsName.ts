import { ExpVarMatrix, dsSampleFromDsName } from "../lib/experiments";
import path from "path";
import {
  claude3sonnet_20240229,
  claude3opus,
  gpt35turbo_0125,
  gpt4_0613,
  gpt4turbo_20240409,
  mistralLarge_2407,
  openMixtral8x22B,
  gemini15pro_002,
  gemini15flash_002,
  gpt4omini_20240718,
} from "../lib/models";
import partitions from "../lib/dataset-partitions";
import logger from "../lib/logger";
import { getVarIds } from "src/lib/experiments/experiment/aux";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";

function mergeParts(parts: DsPartition[], mergedId: string) {
  const data = parts.flatMap(p => p.data);
  const part = parts[0];
  return new DsPartition(
    part.dataset.id,
    part.dataset.metadata,
    mergedId,
    part.language,
    part.relationType,
    part.scale,
    data,
    {
      annotators: {
        total: 0,
        minEachPair: 0,
      },
      interAgreement: {
        spearman: 0,
        pearson: 0,
      },
    }
  );
}

// merge partitions from each dataset
const partsByDs: { [key: string]: DsPartition[] } = {};
for (const dsp of Object.values(partitions)) {
  partsByDs[dsp.dataset.id] = partsByDs[dsp.dataset.id] || [];
  partsByDs[dsp.dataset.id].push(dsp);
}
const dsParts: { [key: string]: DsPartition } = {};
for (const [dsId, parts] of Object.entries(partsByDs)) {
  dsParts[dsId] = parts.length > 1 ? mergeParts(parts, "__merged") : parts[0];
}

const trials = process.argv[2] ? parseInt(process.argv[2]) : 3;
const folder =
  process.argv[3] || path.join(".", "results", `exp_${Date.now()}`);

const sampleFromName = async (vars: ExpVarMatrix) => {
  logger.info("🚀 Starting");
  const res = await dsSampleFromDsName.performMulti(vars, trials, folder);

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
            data.pairs.map(p => `[${p[0]}, ${p[1]}]`)
          )
        )
        .join("\n")
    );
  }
};

const evm: ExpVarMatrix = {
  dpart: Object.values(dsParts),
  model: [
    gpt35turbo_0125,
    gpt4_0613,
    gpt4turbo_20240409,
    gpt4omini_20240718,
    claude3sonnet_20240229,
    claude3opus,
    gemini15pro_002,
    gemini15flash_002,
    mistralLarge_2407,
    openMixtral8x22B,
  ],
};

sampleFromName(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
