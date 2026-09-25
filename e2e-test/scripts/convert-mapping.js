// scripts/convert-mapping.js
//
// Converts the client-provided CSV (Page, Source URL, Src Mobile,
// Src Desktop, EDS URL, EDS Mobile, EDS Desktop) into
// mapping/<site>/<family>.mapping.json - the simple URL + template list
// that the extract/compare jobs read from.
//
// Usage:
//   node scripts/convert-mapping.js \
//     --input source/raw-data/ustafoundation/newsArticle.csv \
//     --site ustafoundation \
//     --family NewsArticle

const { parse } = require("csv-parse/sync");
const fs = require("fs");
const path = require("path");

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new Error(`Missing required argument: --${name}`);
  }
  return process.argv[idx + 1];
}

const inputPath = getArg("input");
const site = getArg("site");
const family = getArg("family");

const raw = fs.readFileSync(inputPath, "utf-8");

const records = parse(raw, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

const entries = records.map((row) => {
  const id = row["Page"];
  const srcUrl = row["Source URL"];
  const edsUrl = row["EDS URL"];

  if (!id || !srcUrl || !edsUrl) {
    throw new Error(`Row missing required field(s): ${JSON.stringify(row)}`);
  }

  return { id, template: family, srcUrl, edsUrl };
});

const ids = entries.map((e) => e.id);
const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicateIds.length > 0) {
  throw new Error(`Duplicate ids found: ${[...new Set(duplicateIds)].join(", ")}`);
}

const outDir = path.join("mapping", site);
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${family}.mapping.json`);

fs.writeFileSync(outPath, JSON.stringify(entries, null, 2) + "\n");

console.log(`Converted ${entries.length} rows -> ${outPath}`);