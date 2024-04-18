import mayoSRS from "punuy-datasets/src/datasets/mayoSRS";
import { DsPartition } from "./DsPartition";

export default DsPartition.fromDataset(mayoSRS, "mean");
