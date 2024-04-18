import umnsrsMod from "punuy-datasets/src/datasets/umnsrsMod";
import { DsPartition } from "./DsPartition";

export default DsPartition.fromDataset(
  umnsrsMod,
  "UMNSRS_relatedness_mod458_word2vec.csv"
);
