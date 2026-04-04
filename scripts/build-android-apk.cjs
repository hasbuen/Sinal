const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const androidDir = path.join(repoRoot, "android");
const platform = process.platform;
const variant = process.argv[2] === "release" ? "release" : "debug";
const gradleTask = variant === "release" ? "assembleRelease" : "assembleDebug";

function exists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseJavaMajor(versionText) {
  const match =
    versionText.match(/JAVA_VERSION="([^"]+)"/) ??
    versionText.match(/version "([^"]+)"/);

  if (!match) {
    return 0;
  }

  const version = match[1];
  if (version.startsWith("1.")) {
    return Number(version.split(".")[1] || 0);
  }

  return Number(version.split(/[._-]/)[0] || 0);
}

function readJavaMajor(javaHome) {
  const releaseFile = path.join(javaHome, "release");
  if (exists(releaseFile)) {
    return parseJavaMajor(fs.readFileSync(releaseFile, "utf8"));
  }

  const javaBinary = path.join(
    javaHome,
    "bin",
    platform === "win32" ? "java.exe" : "java",
  );

  if (!exists(javaBinary)) {
    return 0;
  }

  const result = spawnSync(javaBinary, ["-version"], {
    encoding: "utf8",
    shell: false,
  });

  return parseJavaMajor(`${result.stdout}\n${result.stderr}`);
}

function getChildDirectories(directoryPath) {
  if (!exists(directoryPath)) {
    return [];
  }

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directoryPath, entry.name))
    .sort((left, right) => right.localeCompare(left));
}

function findJavaHome() {
  const envCandidates = [process.env.JAVA_HOME, process.env.JDK_HOME];
  const discovered = [];

  if (platform === "win32") {
    const roots = [
      "C:\\Program Files\\Android\\Android Studio\\jbr",
      "C:\\Program Files\\Android\\Android Studio\\jre",
      "C:\\Program Files\\Android\\jdk",
      "C:\\Program Files\\Java",
      "C:\\Program Files\\ojdkbuild",
      "C:\\Program Files (x86)\\Android\\openjdk",
      "D:\\Android\\Android Studio\\jbr",
      path.join(repoRoot, "tools", "jdk-21"),
    ];

    for (const root of roots) {
      if (exists(path.join(root, "bin", "java.exe"))) {
        discovered.push(root);
        continue;
      }

      discovered.push(...getChildDirectories(root));
    }
  } else {
    discovered.push(
      "/usr/lib/jvm/default-java",
      "/usr/lib/jvm/java-17-openjdk-amd64",
      "/usr/lib/jvm/java-21-openjdk-amd64",
      "/Library/Java/JavaVirtualMachines",
    );
  }

  const candidates = unique([...envCandidates, ...discovered])
    .filter((candidate) => exists(candidate))
    .map((candidate) => ({ home: candidate, major: readJavaMajor(candidate) }))
    .filter((candidate) => candidate.major >= 11)
    .sort(
      (left, right) =>
        right.major - left.major || right.home.localeCompare(left.home),
    );

  return candidates[0]?.home ?? null;
}

function findAndroidSdk() {
  const homeDirectory = os.homedir();
  const candidates = unique([
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk")
      : null,
    path.join(homeDirectory, "AppData", "Local", "Android", "Sdk"),
    path.join(homeDirectory, "Android", "Sdk"),
  ]);

  return (
    candidates.find(
      (candidate) =>
        exists(candidate) &&
        exists(path.join(candidate, "platform-tools")) &&
        exists(path.join(candidate, "platforms")),
    ) ?? null
  );
}

function runCommand(command, args, cwd, env) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: platform === "win32" && /\.(cmd|bat)$/i.test(command),
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function commandName(baseName) {
  return platform === "win32" ? `${baseName}.cmd` : baseName;
}

function gradleExecutable() {
  return platform === "win32" ? "gradlew.bat" : "./gradlew";
}

const javaHome = findJavaHome();
if (!javaHome) {
  console.error(
    "Nenhum JDK 11+ foi encontrado. Configure JAVA_HOME ou instale um JDK compativel.",
  );
  process.exit(1);
}

const androidSdk = findAndroidSdk();
if (!androidSdk) {
  console.error(
    "Android SDK nao encontrado. Configure ANDROID_HOME/ANDROID_SDK_ROOT ou instale o SDK em um local padrao.",
  );
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidSdk,
  ANDROID_SDK_ROOT: androidSdk,
  PATH: [
    path.join(javaHome, "bin"),
    path.join(androidSdk, "platform-tools"),
    process.env.PATH,
  ]
    .filter(Boolean)
    .join(path.delimiter),
};

console.log(`[android] JAVA_HOME=${javaHome}`);
console.log(`[android] ANDROID_HOME=${androidSdk}`);
console.log(`[android] Build variant=${variant}`);

runCommand(commandName("npm"), ["run", "build"], repoRoot, env);
runCommand(commandName("npx"), ["cap", "sync", "android"], repoRoot, env);
runCommand(gradleExecutable(), [gradleTask], androidDir, env);

const apkCandidates = [
  path.join(
    androidDir,
    "app",
    "build",
    "outputs",
    "apk",
    variant,
    `app-${variant}.apk`,
  ),
  path.join(
    androidDir,
    "app",
    "build",
    "outputs",
    "apk",
    variant,
    `app-${variant}-unsigned.apk`,
  ),
];

const apkPath = apkCandidates.find((candidate) => exists(candidate));
if (apkPath) {
  console.log(`[android] APK gerado em: ${apkPath}`);
}
