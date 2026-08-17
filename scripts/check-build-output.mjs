import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const projectRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(projectRoot, "dist");
const assetsDir = resolve(distDir, "assets");
const indexPath = resolve(distDir, "index.html");
const VITE_DEFAULT_CHUNK_LIMIT_BYTES = 500_000;

if (!existsSync(indexPath) || !existsSync(assetsDir)) {
  console.error("Build output non trovato. Esegui prima `npm run build`.");
  process.exit(1);
}

const indexHtml = readFileSync(indexPath, "utf8");
const initialScripts = new Set(
  [...indexHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/g)].map((match) =>
    basename(match[1])
  )
);

const javascriptChunks = readdirSync(assetsDir)
  .filter((fileName) => fileName.endsWith(".js"))
  .map((fileName) => {
    const filePath = resolve(assetsDir, fileName);
    const bytes = statSync(filePath).size;
    const gzipBytes = gzipSync(readFileSync(filePath)).length;

    return {
      fileName,
      bytes,
      gzipBytes,
      initial: initialScripts.has(fileName)
    };
  })
  .sort((left, right) => right.bytes - left.bytes);

if (javascriptChunks.length === 0) {
  console.error("Nessun chunk JavaScript trovato in dist/assets.");
  process.exit(1);
}

if (initialScripts.size === 0) {
  console.error("Nessun entry script JavaScript trovato in dist/index.html.");
  process.exit(1);
}

console.log("\nJavaScript build topology:");

for (const chunk of javascriptChunks) {
  const sizeKb = (chunk.bytes / 1000).toFixed(2);
  const gzipKb = (chunk.gzipBytes / 1000).toFixed(2);
  const role = chunk.initial ? "initial" : "lazy/shared";

  console.log(`- ${chunk.fileName}: ${sizeKb} kB | gzip ${gzipKb} kB | ${role}`);
}

const oversizedChunks = javascriptChunks.filter(
  (chunk) => chunk.bytes > VITE_DEFAULT_CHUNK_LIMIT_BYTES
);

if (javascriptChunks.length < 2) {
  console.error("\nIl build contiene un solo chunk JavaScript: il code splitting non è attivo.");
  process.exit(1);
}

if (oversizedChunks.length > 0) {
  console.error(
    `\nChunk oltre il limite predefinito Vite di 500 kB: ${oversizedChunks
      .map((chunk) => chunk.fileName)
      .join(", ")}`
  );
  process.exit(1);
}

const initialChunks = javascriptChunks.filter((chunk) => chunk.initial);
const initialBytes = initialChunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
const initialGzipBytes = initialChunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);

console.log(
  `\nInitial entry payload: ${(initialBytes / 1000).toFixed(2)} kB | gzip ${(initialGzipBytes / 1000).toFixed(2)} kB`
);
console.log(`JavaScript chunks: ${javascriptChunks.length}`);
console.log("Bundle gate: PASS\n");
