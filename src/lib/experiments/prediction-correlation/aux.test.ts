import { describe, expect, it } from "vitest";
import { rawResultsToAvg, trialEvalScores } from "./aux";
import { PairScoreList } from "../experiment/types";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";

describe("prediction-correlation aux", () => {
  describe("rawResultsToAvg", () => {
    it("should return average of results", () => {
      const rawResults: PairScoreList = [
        { words: ["w1", "w2"], score: 1 },
        { words: ["w1", "w2"], score: 2 },
        { words: ["w1", "w2"], score: 5 },
        { words: ["w3", "w4"], score: 4 },
        { words: ["w3", "w4"], score: 3 },
      ];
      const avg = rawResultsToAvg(rawResults);
      expect(avg).toMatchInlineSnapshot(`
        {
          "w1": {
            "w2": 2.6666666666666665,
          },
          "w3": {
            "w4": 3.5,
          },
        }
      `);
    });

    it("should ignore NaN scores", () => {
      const rawResults: PairScoreList = [
        { words: ["w1", "w2"], score: 1 },
        { words: ["w1", "w2"], score: NaN },
        { words: ["w1", "w2"], score: 5 },
        { words: ["w1", "w4"], score: NaN },
      ];
      const avg = rawResultsToAvg(rawResults);
      expect(avg).toMatchInlineSnapshot(`
        {
          "w1": {
            "w2": 3,
          },
        }
      `);
    });
  });

  describe("trialEvalScores", () => {
    it("should return evaluation result", () => {
      const pairs: [string, string][] = [
        ["alegre", "magoado"],
        ["aliviado", "triste"],
        ["ansioso", "confiante"],
        ["ansioso", "ignorado"],
        ["ansioso", "perfeccionista"],
        ["apavorado", "chateado"],
        ["apavorado", "confiante"],
        ["arrependido", "deslumbrado"],
        ["arrogante", "confiável"],
        ["arrogante", "envergonhado"],
        ["calmo", "deslumbrado"],
        ["chateado", "piedoso"],
        ["confiante", "desgostoso"],
        ["confiante", "irónico"],
        ["contente", "culpado"],
        ["curioso", "resignado"],
        ["desapontado", "medroso"],
        ["desencorajado", "desencorajado"],
        ["desesperado", "orgulhoso"],
        ["deslumbrado", "envergonhado"],
        ["empático", "esgotado"],
        ["esgotado", "indiferente"],
        ["estupefacto", "humilhado"],
        ["excitado", "triste"],
        ["feliz", "humilhado"],
        ["humilhado", "preocupado"],
        ["incluído", "simpático"],
        ["indiferente", "vaidoso"],
        ["interessado", "sarcástico"],
        ["maravilhado", "resignado"],
      ];

      const dpart: Pick<DsPartition, "data" | "scale"> = {
        scale: {
          value: {
            max: 4,
            min: 0,
          },
        },
        data: [
          { term1: "alegre", term2: "magoado", value: 2.35 },
          { term1: "aliviado", term2: "triste", value: 1.8719999999999999 },
          { term1: "ansioso", term2: "confiante", value: 2.275 },
          { term1: "ansioso", term2: "ignorado", value: 2.075 },
          { term1: "ansioso", term2: "perfeccionista", value: 3.25 },
          { term1: "apavorado", term2: "chateado", value: 1.744 },
          { term1: "apavorado", term2: "confiante", value: 2.349 },
          { term1: "arrependido", term2: "deslumbrado", value: 1.6 },
          { term1: "arrogante", term2: "confiável", value: 1.818 },
          {
            term1: "arrogante",
            term2: "envergonhado",
            value: 1.9020000000000001,
          },
          { term1: "calmo", term2: "deslumbrado", value: 1.7890000000000001 },
          { term1: "chateado", term2: "piedoso", value: 1.605 },
          { term1: "confiante", term2: "desgostoso", value: 1.526 },
          { term1: "confiante", term2: "irónico", value: 1.976 },
          { term1: "contente", term2: "culpado", value: 1.395 },
          { term1: "curioso", term2: "resignado", value: 1.5 },
          { term1: "desapontado", term2: "medroso", value: 2.114 },
          { term1: "desencorajado", term2: "desencorajado", value: 5 },
          { term1: "desesperado", term2: "orgulhoso", value: 1.487 },
          { term1: "deslumbrado", term2: "envergonhado", value: 1.541 },
          { term1: "empático", term2: "esgotado", value: 1.545 },
          { term1: "esgotado", term2: "indiferente", value: 2.351 },
          {
            term1: "estupefacto",
            term2: "humilhado",
            value: 1.8719999999999999,
          },
          { term1: "excitado", term2: "triste", value: 1.947 },
          { term1: "feliz", term2: "humilhado", value: 1.459 },
          { term1: "humilhado", term2: "preocupado", value: 2.2 },
          { term1: "incluído", term2: "simpático", value: 2.444 },
          { term1: "indiferente", term2: "vaidoso", value: 1.7429999999999999 },
          { term1: "interessado", term2: "sarcástico", value: 1.615 },
          {
            term1: "maravilhado",
            term2: "resignado",
            value: 1.7570000000000001,
          },
        ],
      };

      const raw: PairScoreList = [
        { words: ["alegre", "magoado"], score: 5 },
        { words: ["aliviado", "triste"], score: 3 },
        { words: ["ansioso", "confiante"], score: 2 },
        { words: ["ansioso", "ignorado"], score: 3 },
        { words: ["ansioso", "perfeccionista"], score: 2 },
        { words: ["apavorado", "chateado"], score: 2 },
        { words: ["apavorado", "confiante"], score: 2 },
        { words: ["arrependido", "deslumbrado"], score: 2 },
        { words: ["arrogante", "confiável"], score: 2 },
        { words: ["arrogante", "envergonhado"], score: 3 },
        { words: ["calmo", "deslumbrado"], score: 2 },
        { words: ["chateado", "piedoso"], score: 2 },
        { words: ["confiante", "desgostoso"], score: 2 },
        { words: ["confiante", "irónico"], score: 2 },
        { words: ["contente", "culpado"], score: 2 },
        { words: ["curioso", "resignado"], score: 2 },
        { words: ["desapontado", "medroso"], score: 2 },
        { words: ["desencorajado", "desencorajado"], score: 5 },
        { words: ["desesperado", "orgulhoso"], score: 2 },
        { words: ["deslumbrado", "envergonhado"], score: 2 },
        { words: ["empático", "esgotado"], score: 3 },
        { words: ["esgotado", "indiferente"], score: 3 },
        { words: ["estupefacto", "humilhado"], score: 2 },
        { words: ["excitado", "triste"], score: 2 },
        { words: ["feliz", "humilhado"], score: 4 },
        { words: ["humilhado", "preocupado"], score: 3 },
        { words: ["incluído", "simpático"], score: 3 },
        { words: ["indiferente", "vaidoso"], score: 1 },
        { words: ["interessado", "sarcástico"], score: 2 },
        { words: ["maravilhado", "resignado"], score: 2 },
      ];

      const res = trialEvalScores(pairs, dpart, raw);
      expect(res).toMatchInlineSnapshot(`
        {
          "corr": {
            "alpha": 0.05,
            "alternative": "two-sided",
            "ci": [
              0.21057913166206244,
              0.7478980200279259,
            ],
            "method": "t-test for Pearson correlation coefficient",
            "nullValue": 0,
            "pValue": 0.002558281430596665,
            "pcorr": 0.5305946923818647,
            "print": [Function],
            "rejected": true,
            "statistic": 3.3123621821108418,
          },
          "gotVsExp": {
            "alegre": {
              "magoado": {
                "exp": 3.35,
                "got": 5,
              },
            },
            "aliviado": {
              "triste": {
                "exp": 2.872,
                "got": 3,
              },
            },
            "ansioso": {
              "confiante": {
                "exp": 3.275,
                "got": 2,
              },
              "ignorado": {
                "exp": 3.075,
                "got": 3,
              },
              "perfeccionista": {
                "exp": 4.25,
                "got": 2,
              },
            },
            "apavorado": {
              "chateado": {
                "exp": 2.7439999999999998,
                "got": 2,
              },
              "confiante": {
                "exp": 3.349,
                "got": 2,
              },
            },
            "arrependido": {
              "deslumbrado": {
                "exp": 2.6,
                "got": 2,
              },
            },
            "arrogante": {
              "confiável": {
                "exp": 2.818,
                "got": 2,
              },
              "envergonhado": {
                "exp": 2.902,
                "got": 3,
              },
            },
            "calmo": {
              "deslumbrado": {
                "exp": 2.789,
                "got": 2,
              },
            },
            "chateado": {
              "piedoso": {
                "exp": 2.605,
                "got": 2,
              },
            },
            "confiante": {
              "desgostoso": {
                "exp": 2.526,
                "got": 2,
              },
              "irónico": {
                "exp": 2.976,
                "got": 2,
              },
            },
            "contente": {
              "culpado": {
                "exp": 2.395,
                "got": 2,
              },
            },
            "curioso": {
              "resignado": {
                "exp": 2.5,
                "got": 2,
              },
            },
            "desapontado": {
              "medroso": {
                "exp": 3.114,
                "got": 2,
              },
            },
            "desencorajado": {
              "desencorajado": {
                "exp": 6,
                "got": 5,
              },
            },
            "desesperado": {
              "orgulhoso": {
                "exp": 2.487,
                "got": 2,
              },
            },
            "deslumbrado": {
              "envergonhado": {
                "exp": 2.541,
                "got": 2,
              },
            },
            "empático": {
              "esgotado": {
                "exp": 2.545,
                "got": 3,
              },
            },
            "esgotado": {
              "indiferente": {
                "exp": 3.351,
                "got": 3,
              },
            },
            "estupefacto": {
              "humilhado": {
                "exp": 2.872,
                "got": 2,
              },
            },
            "excitado": {
              "triste": {
                "exp": 2.947,
                "got": 2,
              },
            },
            "feliz": {
              "humilhado": {
                "exp": 2.459,
                "got": 4,
              },
            },
            "humilhado": {
              "preocupado": {
                "exp": 3.2,
                "got": 3,
              },
            },
            "incluído": {
              "simpático": {
                "exp": 3.444,
                "got": 3,
              },
            },
            "indiferente": {
              "vaidoso": {
                "exp": 2.743,
                "got": 1,
              },
            },
            "interessado": {
              "sarcástico": {
                "exp": 2.615,
                "got": 2,
              },
            },
            "maravilhado": {
              "resignado": {
                "exp": 2.757,
                "got": 2,
              },
            },
          },
        }
      `);
    });
  });
});
