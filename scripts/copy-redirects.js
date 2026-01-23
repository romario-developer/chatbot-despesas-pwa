import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(__dirname, "..", "public", "_redirects");
const targetPath = join(__dirname, "..", "dist", "_redirects");

if (!existsSync(sourcePath)) {
  console.warn("[copy-redirects] public/_redirects not found; skipping.");
  process.exit(0);
}

copyFileSync(sourcePath, targetPath);
console.log("[copy-redirects] copied _redirects to dist");
