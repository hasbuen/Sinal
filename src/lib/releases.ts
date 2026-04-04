const OWNER = "hasbuen";
const REPO = "Sinal";

export type LatestReleaseInfo = {
  version: string;
  tagName: string;
  htmlUrl: string;
  browserUrl: string;
  desktopUrl: string;
  androidUrl: string;
  publishedAt?: string;
};

type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type GithubReleaseResponse = {
  tag_name: string;
  html_url: string;
  published_at?: string;
  assets?: GithubReleaseAsset[];
};

export function normalizeVersion(value: string) {
  return value.trim().replace(/^v/i, "");
}

export function compareVersions(current: string, next: string) {
  const currentParts = normalizeVersion(current).split(".").map(Number);
  const nextParts = normalizeVersion(next).split(".").map(Number);
  const length = Math.max(currentParts.length, nextParts.length);

  for (let index = 0; index < length; index += 1) {
    const currentValue = currentParts[index] || 0;
    const nextValue = nextParts[index] || 0;

    if (nextValue > currentValue) return 1;
    if (nextValue < currentValue) return -1;
  }

  return 0;
}

export async function fetchLatestReleaseInfo(): Promise<LatestReleaseInfo> {
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Nao foi possivel consultar a release mais recente.");
  }

  const payload = (await response.json()) as GithubReleaseResponse;
  const assets = payload.assets || [];
  const desktopAsset = assets.find((asset) => asset.name === "Sinal-Setup.exe");
  const androidAsset = assets.find((asset) => asset.name === "sinal-android.apk");
  const tagName = payload.tag_name || "";

  return {
    version: normalizeVersion(tagName),
    tagName,
    htmlUrl: payload.html_url,
    browserUrl: `https://hasbuen.github.io/Sinal/login/`,
    desktopUrl:
      desktopAsset?.browser_download_url ||
      `https://github.com/${OWNER}/${REPO}/releases/latest/download/Sinal-Setup.exe`,
    androidUrl:
      androidAsset?.browser_download_url ||
      `https://github.com/${OWNER}/${REPO}/releases/latest/download/sinal-android.apk`,
    publishedAt: payload.published_at,
  };
}
