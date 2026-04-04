const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const sourceApk = path.join(
  repoRoot,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
const outputDir = path.join(repoRoot, "release", "android");
const outputApk = path.join(outputDir, "sinal-android.apk");

if (!fs.existsSync(sourceApk)) {
  console.error(`APK de origem nao encontrado em: ${sourceApk}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(sourceApk, outputApk);

console.log(`APK preparado em: ${outputApk}`);
