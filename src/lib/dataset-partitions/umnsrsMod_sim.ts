import umnsrsMod from "punuy-datasets/src/datasets/umnsrsMod";
import { DsPartition } from "./DsPartition";

export default DsPartition.fromDataset(
  umnsrsMod,
  "UMNSRS_similarity_mod449_word2vec.csv"
);
