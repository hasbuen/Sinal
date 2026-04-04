const { spawnSync } = require("node:child_process");

const target = process.argv[2] === "native" ? "native" : "web";

const env = {
  ...process.env,
  NEXT_PUBLIC_RUNTIME_TARGET: target,
};

if (target === "native") {
  env.NEXT_PUBLIC_BASE_PATH = "";
  env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL || "http://localhost";
} else {
  env.NEXT_PUBLIC_BASE_PATH = env.NEXT_PUBLIC_BASE_PATH || "/Sinal";
  env.NEXT_PUBLIC_SITE_URL =
    env.NEXT_PUBLIC_SITE_URL || "https://hasbuen.github.io/Sinal";
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "build"],
  {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
