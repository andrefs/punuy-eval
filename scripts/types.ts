
interface Dataset {
  id: string,
  metadata: Metadata,
  originalInstructions?: string,
  partitions: Partition[],
}

interface Metadata {
  urls: string[],
  papers: Paper[],
  date: string,
  description: string,
  downloadUrls: string[],
  measureType: 'similarity' | 'relatedness',
}


interface Paper {
  title: string,
  url: string,
}

interface Partition {
  id: string,
  data: PartitionData
}

type PartitionData = {
  word1: string,
  word2: string,
} & (
    { value: number } |
    { values: number[], }
  )
