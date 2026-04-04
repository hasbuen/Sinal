const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "out");
const nestedDir = path.join(outDir, "Sinal");
const textExtensions = new Set([
  ".html",
  ".txt",
  ".js",
  ".css",
  ".json",
  ".map",
]);

function walk(directoryPath) {
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const targetPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (targetPath === nestedDir) {
        continue;
      }

      walk(targetPath);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(extension)) {
      continue;
    }

    const original = fs.readFileSync(targetPath, "utf8");
    const normalized = original
      .replace(/\/Sinal\//g, "/")
      .replace(/"\/Sinal"/g, '"/"')
      .replace(/'\/Sinal'/g, "'/'");

    if (normalized !== original) {
      fs.writeFileSync(targetPath, normalized, "utf8");
    }
  }
}

if (!fs.existsSync(outDir)) {
  console.error("Diretorio out nao encontrado. Rode o build web antes.");
  process.exit(1);
}

fs.rmSync(nestedDir, { recursive: true, force: true });
walk(outDir);

console.log("[native-webdir] Base path removido dos assets exportados.");
console.log("[native-webdir] Root index mantido no fluxo App Router para navegacao nativa.");
