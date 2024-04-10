import ws353Rel from "punuy-datasets/src/datasets/ws353Rel";
import { DsPartition } from "./DsPartition";

export default DsPartition.fromDataset(
  ws353Rel,
  "wordsim_relatedness_goldstandard.txt"
);
