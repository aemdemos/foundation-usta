import { test, expect } from "@playwright/test";
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

const baselineDir = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "testdata",
  "ustafoundation",
  "NewsArticle"
);

const diffOutDir = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "testdata",
  "ustafoundation",
  "NewsArticle-diffs"
);
fs.mkdirSync(diffOutDir, { recursive: true });

function normalizeText(text: string): string {
  // Strip ALL whitespace (not just collapse it) before comparing, so
  // paragraph-spacing artifacts and word-spacing differences introduced
  // by markup restructuring don't cause false failures. This focuses
  // the check purely on whether the same words/characters appear in
  // the same order, ignoring spacing/formatting entirely.
  return text.replace(/\s+/g, "").toLowerCase();
  //.replace(/viewthispostoninstagram/g, "");
  // Social embeds (like Instagram) render as fallback text before their
  // JS loads, then swap to a cross-origin iframe we can't read into.
  // Depending on extraction timing, one side may briefly see this
  // fallback text and the other won't - not a real content difference.
    
}

for (const entry of mapping) {
  test(`compare baseline: ${entry.id}`, async ({ page }) => {
    const baselinePath = path.join(baselineDir, `${entry.id}.json`);
    if (!fs.existsSync(baselinePath)) {
      throw new Error(
        `No baseline found for "${entry.id}". Run the extract job first.`
      );
    }
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));

    const sourcePage = createSourcePage(entry.template, page);
    await sourcePage.goto(entry.edsUrl);
    const migrated = await sourcePage.extract();

    fs.writeFileSync(
      path.join(diffOutDir, `${entry.id}.migrated.json`),
      JSON.stringify(migrated, null, 2) + "\n"
    );

    expect(normalizeText(migrated.pageTitle), "pageTitle mismatch").toBe(
      normalizeText(baseline.pageTitle)
    );
    expect(normalizeText(migrated.h1), "h1 mismatch").toBe(normalizeText(baseline.h1));
    expect(normalizeText(migrated.bodyText), "bodyText mismatch").toBe(
      normalizeText(baseline.bodyText)
    );
  });
}
