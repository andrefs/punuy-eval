import { describe, expect, it } from "vitest";
import { ExpVarMatrix, ExpVars, Prompt } from "../experiment";
import { Model } from "../../models";
import {
  calcVarValues,
  genValueCombinations,
  getPairScoreListFromDPart,
  getVarIds,
  splitVarCombsMTL,
} from "./aux";
import { DsPartition } from "../../dataset-partitions/DsPartition";
import { createMockDsPart } from "../prior-knowledge/mocks";

describe("experiment aux", () => {
  describe("calcVarValues", () => {
    it("should return the values of the variables", () => {
      const exps = [
        {
          variables: {
            dpart: { id: "d1" } as DsPartition,
            model: { id: "m1" } as Model,
          } as ExpVars,
        },
        {
          variables: {
            dpart: { id: "d1" } as DsPartition,
            model: { id: "m2" } as Model,
            language: { id: "en" },
          } as ExpVars,
        },
        {
          variables: {
            language: { id: "pt" },
          } as ExpVars,
        },
      ];

      const res = calcVarValues(exps);
      expect(res).toMatchInlineSnapshot(`
        {
          "varNames": [
            "dpart",
            "language",
            "model",
          ],
          "varValues": {
            "dpart": Set {
              "d1",
            },
            "language": Set {
              "en",
              "pt",
            },
            "model": Set {
              "m1",
              "m2",
            },
          },
        }
      `);
    });
  });
  describe("getPairScoreListFromDPart", () => {
    it("should return a list of pair scores", () => {
      const dpart = createMockDsPart();

      const pairs = [
        ["testWord1", "testWord2"],
        ["testWord3", "testWord4"],
      ] as [string, string][];
      const result = getPairScoreListFromDPart(pairs, dpart);
      expect(result).toMatchInlineSnapshot(`
        [
          {
            "score": 3,
            "words": [
              "testword1",
              "testword2",
            ],
          },
          {
            "score": 1.8,
            "words": [
              "testword3",
              "testword4",
            ],
          },
        ]
      `);
    });
  });

  describe("getVarIds", () => {
    it("should return the ids of an ExpVars", () => {
      const vars: ExpVars = {
        dpart: { id: "d1" } as DsPartition,
        model: { id: "m1" } as Model,
        language: { id: "pt" as const },
        measureType: { id: "similarity" as const },
        prompt: { id: "p1" } as Prompt,
      };

      const ids = getVarIds(vars);
      expect(ids).toMatchInlineSnapshot(`
        {
          "dpart": "d1",
          "language": "pt",
          "measureType": "similarity",
          "model": "m1",
          "prompt": "p1",
        }
      `);
    });

    it("should return the ids of an ExpVarMatrix", () => {
      const vm = {
        model: [{ id: "m1" }, { id: "m2" }] as Model[],
        dpart: [{ id: "d1" }, { id: "d2" }] as DsPartition[],
        language: [{ id: "en" as const }, { id: "pt" as const }],
        measureType: [
          { id: "similarity" as const },
          { id: "relatedness" as const },
        ],
        prompt: [{ id: "p1" }, { id: "p2" }] as Prompt[],
      };

      const ids = getVarIds(vm);
      expect(ids).toMatchInlineSnapshot(`
        {
          "dpart": [
            "d1",
            "d2",
          ],
          "language": [
            "en",
            "pt",
          ],
          "measureType": [
            "similarity",
            "relatedness",
          ],
          "model": [
            "m1",
            "m2",
          ],
          "prompt": [
            "p1",
            "p2",
          ],
        }
      `);
    });
  });

  describe("genValueCombinations", () => {
    it("should generate all combinations of values", () => {
      const vm = {
        model: [{ id: "m1" }, { id: "m2" }] as Model[],
        dpart: [{ id: "d1" }, { id: "d2" }] as DsPartition[],
        language: [{ id: "en" as const }, { id: "pt" as const }],
        measureType: [
          { id: "similarity" as const },
          { id: "relatedness" as const },
        ],
        prompt: [{ id: "p1" }, { id: "p2" }] as Prompt[],
      };

      const vcs = genValueCombinations(vm);
      expect(vcs.length).toBe(32);
      expect(vcs).toMatchInlineSnapshot(`
        [
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d1",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p2",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
            },
          },
          {
            "dpart": {
              "id": "d2",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p2",
            },
          },
        ]
      `);
    });
  });

  describe("splitVarCombsMTL", () => {
    it("ignores prompt if there's no dataset partition with matching measure type", () => {
      const variables: ExpVarMatrix = {
        model: [{ id: "m1" }] as Model[],
        jobType: [{ id: "allPairs" as const }],
        dpart: [
          { id: "d1", language: "en", measureType: "similarity" },
        ] as DsPartition[],
        prompt: [
          { id: "p1", language: "en", measureType: "similarity" },
          { id: "p2", language: "en", measureType: "relatedness" },
        ] as Prompt[],
      };

      const varCombs = splitVarCombsMTL(variables);
      expect(varCombs).toHaveLength(1);
      expect(varCombs[0].prompt.id).toBe("p1");
      expect(varCombs[0].dpart.id).toBe("d1");
      expect(varCombs[0].measureType?.id).toBe("similarity");
      expect(varCombs[0].language?.id).toBe("en");
    });

    it("ignores prompt if there's no dataset partition with matching language", () => {
      const variables: ExpVarMatrix = {
        model: [{ id: "m1" }] as Model[],
        jobType: [{ id: "allPairs" as const }],
        dpart: [
          { id: "d1", language: "pt", measureType: "similarity" },
        ] as DsPartition[],
        prompt: [
          { id: "p1", language: "en", measureType: "similarity" },
          { id: "p2", language: "pt", measureType: "similarity" },
        ] as Prompt[],
      };

      const varCombs = splitVarCombsMTL(variables);
      expect(varCombs).toHaveLength(1);
      expect(varCombs[0].prompt.id).toBe("p2");
      expect(varCombs[0].dpart.id).toBe("d1");
      expect(varCombs[0].measureType?.id).toBe("similarity");
      expect(varCombs[0].language?.id).toBe("pt");
    });

    it("return empty array if there are no matching prompts and datasets", () => {
      const variables: ExpVarMatrix = {
        model: [{ id: "m1" }] as Model[],
        dpart: [
          { id: "d1", language: "pt", measureType: "relatedness" },
        ] as DsPartition[],
        prompt: [
          { id: "p1", language: "en", measureType: "similarity" },
          { id: "p2", language: "pt", measureType: "similarity" },
        ] as Prompt[],
      };

      const varCombs = splitVarCombsMTL(variables);
      expect(varCombs).toHaveLength(0);
    });

    it("should split variable combinations by language and measure type", () => {
      const variables: ExpVarMatrix = {
        model: [{ id: "m1" }, { id: "m2" }] as Model[],
        jobType: [{ id: "allPairs" as const }],
        dpart: [
          { id: "d1", language: "en", measureType: "similarity" },
          { id: "d2", language: "pt", measureType: "relatedness" },
        ] as DsPartition[],
        prompt: [
          { id: "p1", language: "en", measureType: "similarity" },
          { id: "p2", language: "en", measureType: "relatedness" },
          { id: "p3", language: "pt", measureType: "similarity" },
          { id: "p4", language: "pt", measureType: "relatedness" },
        ] as Prompt[],
      };
      const res = splitVarCombsMTL(variables);
      expect(res).toHaveLength(4);

      expect(res).toMatchInlineSnapshot(`
        [
          {
            "dpart": {
              "id": "d1",
              "language": "en",
              "measureType": "similarity",
            },
            "jobType": {
              "id": "allPairs",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p1",
              "language": "en",
              "measureType": "similarity",
            },
          },
          {
            "dpart": {
              "id": "d1",
              "language": "en",
              "measureType": "similarity",
            },
            "jobType": {
              "id": "allPairs",
            },
            "language": {
              "id": "en",
            },
            "measureType": {
              "id": "similarity",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p1",
              "language": "en",
              "measureType": "similarity",
            },
          },
          {
            "dpart": {
              "id": "d2",
              "language": "pt",
              "measureType": "relatedness",
            },
            "jobType": {
              "id": "allPairs",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m1",
            },
            "prompt": {
              "id": "p4",
              "language": "pt",
              "measureType": "relatedness",
            },
          },
          {
            "dpart": {
              "id": "d2",
              "language": "pt",
              "measureType": "relatedness",
            },
            "jobType": {
              "id": "allPairs",
            },
            "language": {
              "id": "pt",
            },
            "measureType": {
              "id": "relatedness",
            },
            "model": {
              "id": "m2",
            },
            "prompt": {
              "id": "p4",
              "language": "pt",
              "measureType": "relatedness",
            },
          },
        ]
      `);
    });
  });
});
