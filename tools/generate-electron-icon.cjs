const fs = require("fs");
const path = require("path");
const pngToIco = require("png-to-ico");

async function main() {
  const source = path.resolve(__dirname, "..", "src", "app", "icon.png");
  const buildDir = path.resolve(__dirname, "..", "electron", "build");
  const target = path.join(buildDir, "icon.ico");
  const pngTarget = path.join(buildDir, "icon.png");

  if (!fs.existsSync(source)) {
    throw new Error(`Icon source not found: ${source}`);
  }

  fs.mkdirSync(buildDir, { recursive: true });
  fs.copyFileSync(source, pngTarget);

  const buffer = await pngToIco(source);
  fs.writeFileSync(target, buffer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
