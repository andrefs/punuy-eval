
export interface DatasetProfile {
  /**
   * An identifier for the dataset
   */
  id: string,

  /**
   * Metadata for the dataset
   */
  metadata: Metadata,

  /**
   * The original instructions given to the annotators
   */
  originalInstructions?: string,

  /**
   * The partitions containing the dataset data
   */
  partitions: Partition[],
}

interface Metadata {
  /**
   * The name of the dataset
   */
  name: string;

  /**
   * Web sites containing information about the dataset
   *
   * @items {"type": "string", "format": "uri"}
   */
  urls: string[],

  /**
   * Information about the scientific papers describing the dataset
   */
  papers: Paper[],

  /**
   * The date the dataset was published
   *
   * @TJS-pattern ^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$
   */
  date: string,

  /**
   * A description of the dataset
   */
  description: string,

  /**
   * URL(s) to download the dataset files
   *
   * @items {"type": "string", "format": "uri"} 
   */
  downloadUrls: string[],

  /**
   * Which type of measures are used to compare the words
   */
  measureTypes: ('similarity' | 'relatedness')[],
}


export interface Paper {
  /**
   * The title of the paper
   */
  title: string,

  /**
   * The URL where the paper can be found
   *
   * @format uri
   */
  url?: string,
}

interface Partition {
  /**
   * An identifier for the partition
   */
  id: string,

  /**
   * Which type of measure is used to compare the words
   */
  measureType: 'similarity' | 'relatedness',
  /**
   * The data for the partition
   */
  data: PartitionData[]
}

type PartitionData = {
  /**
   * The first word in the pair
   */
  word1: string,

  /**
   * The second word in the pair
   */
  word2: string,
} & (
    {
      /**
       * The averaged numeric value of the semantic measure for the pair
       */
      value: number
    } |
    {

      /**
       * The individual numeric values of the semantic measure for the pair
       *
       * @items {"type": "number"}
       */
      values: number[]
    }
  )
