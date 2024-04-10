import ws353Sim from "punuy-datasets/src/datasets/ws353Sim";
import { DsPartition } from "./DsPartition";

export default DsPartition.fromDataset(
  ws353Sim,
  "wordsim_similarity_goldstandard.txt"
);
