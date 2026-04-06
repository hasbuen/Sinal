"use client";

import { useEffect, useState } from "react";
import { fetchLatestReleaseInfo } from "@/lib/releases";

let cachedLatestTag: string | null = null;
let latestTagRequest: Promise<string | null> | null = null;

async function loadLatestTag() {
  if (cachedLatestTag) {
    return cachedLatestTag;
  }

  if (!latestTagRequest) {
    latestTagRequest = fetchLatestReleaseInfo()
      .then((release) => {
        cachedLatestTag = release.tagName;
        return cachedLatestTag;
      })
      .catch(() => null)
      .finally(() => {
        latestTagRequest = null;
      });
  }

  return latestTagRequest;
}

type LatestReleaseTagProps = {
  fallback: string;
};

export default function LatestReleaseTag({ fallback }: LatestReleaseTagProps) {
  const [tagName, setTagName] = useState(cachedLatestTag || fallback);

  useEffect(() => {
    let active = true;

    void loadLatestTag().then((value) => {
      if (active && value) {
        setTagName(value);
      }
    });

    return () => {
      active = false;
    };
  }, [fallback]);

  return <>{tagName}</>;
}
