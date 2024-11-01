import {
  DatasetProfile,
  Language,
  RelationType,
  Metadata,
  Partition,
  PartitionData,
  PartitionMetrics,
  PartitionScale,
} from "punuy-datasets/src/lib/types";

export type DsPartitionMetadata = Omit<Metadata, "languages" | "relationTypes">;

export class DsPartition implements Partition {
  dataset: {
    id: string;
    metadata: DsPartitionMetadata;
  };
  partitionId: string;
  id: string;
  language: Language;
  relationType: RelationType;
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
      ds.metadata,
      part.id,
      ds.metadata.languages[0], // TODO handle multiple languages
      part.relationType,
      part.scale,
      part.data,
      part.metrics
    );
  }

  constructor(
    dsId: string,
    dsMetadata: Metadata | DsPartitionMetadata,
    partitionId: string,
    language: "en" | "pt",
    relationType: RelationType,
    scale: PartitionScale,
    data: PartitionData[],
    metrics: PartitionMetrics
  ) {
    this.id = `${dsId}#${partitionId}`;
    this.dataset = {
      id: dsId,
      metadata: dsMetadata,
    };
    this.partitionId = partitionId;
    this.language = language;
    this.relationType = relationType;
    this.scale = scale;
    this.data = data;
    this.metrics = metrics;
  }
}
