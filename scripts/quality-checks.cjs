const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const androidBuild = read("android/app/build.gradle");
const backendSchema = read("backend/prisma/schema.prisma");
const messagesService = read("backend/src/modules/messages/messages.service.ts");
const backendClient = read("src/lib/backend-client.ts");
const appModule = read("backend/src/app.module.ts");
const updateProfileInput = read("backend/src/modules/users/dto/update-profile.input.ts");
const settingsPage = read("src/app/configuracoes/page.tsx");

const appVersion = packageJson.version;

assert(
  packageLock.version === appVersion &&
    packageLock.packages[""].version === appVersion,
  "package.json e package-lock.json precisam estar com a mesma versao.",
);

const versionName = androidBuild.match(/versionName\s+"([^"]+)"/)?.[1];
assert(
  versionName === appVersion,
  `android versionName (${versionName}) precisa acompanhar package.json (${appVersion}).`,
);

const expectedVersionCode = Number(appVersion.split(".").at(-1));
const versionCode = Number(androidBuild.match(/versionCode\s+(\d+)/)?.[1]);
assert(
  versionCode === expectedVersionCode,
  `android versionCode (${versionCode}) precisa acompanhar patch version (${expectedVersionCode}).`,
);

assert(
  !messagesService.includes("Date.now() + 60 * 60 * 1000"),
  "Mensagens nao podem expirar em 1 hora por padrao.",
);

assert(
  backendSchema.includes("model StatusUpdate") &&
    backendSchema.includes("enum StatusKind"),
  "Contrato de Status/Stories precisa existir no Prisma.",
);

assert(
  backendSchema.includes("model PushDevice") &&
    backendSchema.includes("enum PushPlatform"),
  "Contrato de dispositivos push precisa existir no Prisma.",
);

assert(
  appModule.includes("StatusModule") && appModule.includes("PushModule"),
  "StatusModule e PushModule precisam estar carregados no AppModule.",
);

assert(
  /\^\(https\?:\|data:\|blob:\)/.test(backendClient),
  "resolveBackendAssetUrl precisa aceitar data: e blob: para avatar/anexos locais.",
);

assert(
  updateProfileInput.includes("data:image") && !updateProfileInput.includes("@IsUrl()"),
  "UpdateProfileInput precisa aceitar avatar data:image gerado no fallback web/APK/desktop.",
);

assert(
  settingsPage.includes("setAvatarUrl(me.avatarUrl ? resolveBackendAssetUrl(me.avatarUrl) : \"\")") &&
    settingsPage.includes("src={resolveBackendAssetUrl(avatarUrl)}"),
  "Configuracoes precisa normalizar avatar antes de exibir em web/APK/desktop.",
);

console.log("Quality checks passed.");
