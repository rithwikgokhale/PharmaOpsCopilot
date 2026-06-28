import { cpSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "data", "generated");
const dest = join(root, "public", "data", "generated");

if (!existsSync(src)) {
  console.error("No data/generated found. Run: npm run generate-data");
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  cpSync(join(src, file), join(dest, file));
}
console.log(`Copied ${readdirSync(src).length} files to public/data/generated/`);
