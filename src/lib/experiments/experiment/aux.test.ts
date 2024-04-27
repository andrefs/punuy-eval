import { describe, expect, it } from "vitest";
import { ExpVars, Prompt } from "../experiment";
import { Model } from "../../models";
import { genValueCombinations, getVarIds } from "./aux";
import { DsPartition } from "../../dataset-partitions/DsPartition";

describe("experiment", () => {
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
});
