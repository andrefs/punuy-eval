import { describe, expect, it } from "vitest";
import { DsPartition } from "./DsPartition";
import fs from "fs/promises";

// skip non-partition files and too-large partition files
const skipFiles = [
  "index.ts",
  "index.test.ts",
  "DsPartition.ts",
  "bg100k_all.ts",
];

describe.sequential("dataset-adapters", async () => {
  const files = (await fs.readdir(__dirname)).filter(
    f => !skipFiles.includes(f)
  );

  for (const file of files) {
    describe(file, () => {
      it("should load correct partition", async () => {
        const dsPart = (await import(`./${file}`)).default as DsPartition;
        const fileDsId = file.replace(/_.*\.ts$/, "");
        const filePartId = file.replace(/^[^_]+_/, "").replace(/\.ts$/, "");
        expect(dsPart.dataset.id).toBe(fileDsId);
        expect([dsPart.partitionId, "rel", "sim"]).toContain(filePartId);
      });
    });
  }
});
