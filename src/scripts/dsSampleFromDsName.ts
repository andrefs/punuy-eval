import { ExpVarMatrix, dsSampleFromDsName } from "../lib/experiments";
import {
  claude3sonnet,
  claude3opus,
  gpt35turbo,
  gpt4,
  gpt4turbo,
  mistralLarge,
  openMixtral8x22B,
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
    part.measureType,
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

const sampleFromName = async (vars: ExpVarMatrix) => {
  logger.info("Starting");
  const res = await dsSampleFromDsName.performMulti(vars, trials);

  if (res.usage) {
    logger.info(`Usage estimate: ${JSON.stringify(res.usage)}`);
  }

  for (const r of res.experiments) {
    logger.info(
      { ...r.results.aggregated?.resultTypes },
      `${r.meta.name} ${JSON.stringify(getVarIds(vars))} ${
        r.results.aggregated?.avg
      }`
    );
    logger.debug(
      r.results.raw.map(r => r.pairs.map(p => `[${p[0]}, ${p[1]}]`)).join("\n")
    );
  }
};

const evm: ExpVarMatrix = {
  //dpart: Object.values(dsParts),
  dpart: [dsParts.geresid50],
  model: [
    //gpt35turbo,
    ////gpt4,
    //gpt4turbo,
    //claude3sonnet,
    //claude3opus,
    //mistralLarge,
    openMixtral8x22B,
  ],
};

sampleFromName(evm).then(() => {
  logger.info("Done");
  process.exit(0);
});
