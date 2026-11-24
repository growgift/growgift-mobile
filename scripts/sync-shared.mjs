// Keeps the business-logic files shared with the website identical.
//   node scripts/sync-shared.mjs --check [path-to-growgift-core]   exit 1 if any file differs
//   node scripts/sync-shared.mjs --pull  [path-to-growgift-core]   copy the website's version over ours
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const [mode, argPath] = process.argv.slice(2);
const core = resolve(argPath ?? process.env.CORE_PATH ?? "../growgift-core");
if (!["--check", "--pull"].includes(mode)) {
  console.error("usage: sync-shared.mjs --check|--pull [path-to-growgift-core]");
  process.exit(2);
}
if (!existsSync(core)) {
  console.error(`growgift-core not found at ${core}. Pass its path or set CORE_PATH.`);
  process.exit(2);
}
const { files } = JSON.parse(readFileSync("shared.manifest.json", "utf8"));
const norm = (s) => s.replace(/\r\n/g, "\n");
let drift = 0;
for (const f of files) {
  const web = resolve(core, f.web);
  if (!existsSync(web)) { console.error(`MISSING in website: ${f.web}`); drift++; continue; }
  const a = norm(readFileSync(web, "utf8"));
  const b = existsSync(f.mobile) ? norm(readFileSync(f.mobile, "utf8")) : null;
  if (a === b) { console.log(`ok      ${f.mobile}`); continue; }
  if (mode === "--pull") { writeFileSync(f.mobile, a); console.log(`updated ${f.mobile}`); }
  else { console.error(`DRIFT   ${f.mobile} differs from ${f.web}`); drift++; }
}
if (drift) { console.error(`\n${drift} shared file(s) out of sync. Change the website copy, then run: npm run sync:pull`); process.exit(1); }
