export interface SinglePairScore {
  words: [string, string];
  score: number;
}
export type PairScoreList = SinglePairScore[];

export interface ScoreDict {
  [key: string]: { [key: string]: number };
}
