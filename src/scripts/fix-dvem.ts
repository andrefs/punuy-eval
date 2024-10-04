import { promises as fs } from "fs";

const FILES = process.argv.slice(2);

async function createFileBackupCopy(fileName: string) {
  await fs.copyFile(fileName, `${fileName}.bak`);
}

async function readFile(fileName: string) {
  const json = await fs.readFile(fileName, "utf8");
  const obj = JSON.parse(json);
  return obj;
}

async function main(files: string[]) {
  for (const file of files) {
    console.warn(`Fixing ${file}`);
    await createFileBackupCopy(file);
    const expVCData = await readFile(file);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expVCData.results.raw = expVCData.results.raw.map((r: any) => ({
      data: r,
      prompt: "",
    }));
    await fs.writeFile(file, JSON.stringify(expVCData, null, 2));
  }
}

main(FILES)
  .then(() => console.log("All files re-evaluated"))
  .catch(console.error);
