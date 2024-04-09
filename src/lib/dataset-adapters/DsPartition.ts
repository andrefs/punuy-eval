import {
  DatasetProfile,
  MeasureType,
  Partition,
  PartitionData,
  PartitionMetrics,
  PartitionScale,
} from "../types";

export class DsPartition implements Partition {
  datasetId: string;
  partitionId: string;
  id: string;
  measureType: MeasureType;
  scale: PartitionScale;
  data: PartitionData[];
  metrics: PartitionMetrics;

  static fromDataset(ds: DatasetProfile, partId: string) {
    const part = ds.partitions.find(p => p.id === partId);
    if (!part) {
      throw `Partition '${partId}' not found in dataset '${ds.id}'.`;
    }
    return new DsPartition(
      ds.id,
      part.id,
      part.measureType,
      part.scale,
      part.data,
      part.metrics
    );
  }

  constructor(
    datasetId: string,
    partitionId: string,
    measureType: MeasureType,
    scale: PartitionScale,
    data: PartitionData[],
    metrics: PartitionMetrics
  ) {
    this.id = `${datasetId}#${partitionId}`;
    this.datasetId = datasetId;
    this.partitionId = partitionId;
    this.measureType = measureType;
    this.scale = scale;
    this.data = data;
    this.metrics = metrics;
  }
}
