import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { createSourcePage } from "../../pages/create-source-page";

interface MappingEntry {
  id: string;
  template: string;
  srcUrl: string;
  edsUrl: string;
}

const mappingPath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "mapping",
  "ustafoundation",
  "NewsArticle.mapping.json"
);

const mapping: MappingEntry[] = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));

const outDir = path.join(__dirname, "..", "..", "..", "testdata", "ustafoundation", "NewsArticle");
fs.mkdirSync(outDir, { recursive: true });

for (const entry of mapping) {
  test(`extract baseline: ${entry.id}`, async ({ page }) => {
    const sourcePage = createSourcePage(entry.template, page);
    await sourcePage.goto(entry.srcUrl);
    const data = await sourcePage.extract();

    const outPath = path.join(outDir, `${entry.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
  });
}