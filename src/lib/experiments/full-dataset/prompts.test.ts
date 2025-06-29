import { ExpVars } from "../experiment";
import prompts from "./prompts";
import { describe, expect, it } from "vitest";
import rg65_table1 from "src/lib/dataset-partitions/rg65_table1";
import men3000_full from "src/lib/dataset-partitions/men3000_full";
import { Model } from "src/lib/models";

describe("prompts", () => {
  it("should generate a prompt for MEN3000 full dataset", () => {
    const pg = prompts.filter(
      p => p.language === "en" && p.relationType === "similarity"
    )[0];

    const vars: Omit<ExpVars, "prompt"> = {
      language: { id: "en" },
      relationType: { id: "similarity" },
      model: { id: "test" } as Model,
      dpart: men3000_full,
    };
    const prompt = pg.generate(vars);
    const pairs = prompt.pairs as [string, string][][];
    expect(pairs).toHaveLength(100); // 3000 / 30
    expect(pairs[0]).toHaveLength(30);
  });

  it("should generate a prompt for RG65 Table1 dataset", () => {
    const pg = prompts.filter(
      p => p.language === "en" && p.relationType === "similarity"
    )[0];

    const vars: Omit<ExpVars, "prompt"> = {
      language: { id: "en" },
      relationType: { id: "similarity" },
      model: { id: "test" } as Model,
      dpart: rg65_table1,
    };
    const prompt = pg.generate(vars);
    const pairs = prompt.pairs as [string, string][][];
    expect(pairs).toHaveLength(3); // 65 / 30
    expect(pairs[0]).toHaveLength(30);
    expect(pairs[2]).toHaveLength(5); // last pair has only 5 items
  });

  it("should generate prompts with different pair order each time", () => {
    const pg = prompts.filter(
      p => p.language === "en" && p.relationType === "similarity"
    )[0];

    const vars: Omit<ExpVars, "prompt"> = {
      language: { id: "en" },
      relationType: { id: "similarity" },
      model: { id: "test" } as Model,
      dpart: rg65_table1,
    };
    const prompt1 = pg.generate(vars);
    const prompt2 = pg.generate(vars);
    const pairs1 = prompt1.pairs as [string, string][][];
    const pairs2 = prompt2.pairs as [string, string][][];
    console.log(pairs1);
    console.log(pairs2);
    expect(pairs1).not.toEqual(pairs2); // should be different due to randomization
  });
});
