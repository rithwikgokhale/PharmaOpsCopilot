/**
 * Verifies data/generated (read by the API) and public/data/generated (read by
 * the browser) are identical. The server and frontend read different copies,
 * so silent drift here would mean the dashboard and copilot disagree.
 * Run in CI and locally via `npm run check-data-sync`.
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const serverDir = join(root, "data", "generated");
const publicDir = join(root, "public", "data", "generated");

for (const dir of [serverDir, publicDir]) {
  if (!existsSync(dir)) {
    console.error(`Missing ${dir}. Run: npm run generate-data`);
    process.exit(1);
  }
}

const serverFiles = readdirSync(serverDir).sort();
const publicFiles = readdirSync(publicDir).sort();

const problems = [];

for (const f of serverFiles) {
  if (!publicFiles.includes(f)) {
    problems.push(`public/data/generated is missing ${f}`);
  } else if (
    !readFileSync(join(serverDir, f)).equals(readFileSync(join(publicDir, f)))
  ) {
    problems.push(`${f} differs between data/generated and public/data/generated`);
  }
}
for (const f of publicFiles) {
  if (!serverFiles.includes(f)) {
    problems.push(`data/generated is missing ${f} (present only in public copy)`);
  }
}

if (problems.length) {
  console.error("Data copies are OUT OF SYNC:\n  " + problems.join("\n  "));
  console.error("\nFix with: npm run generate-data");
  process.exit(1);
}

console.log(`Data in sync: ${serverFiles.length} files identical in both copies.`);
