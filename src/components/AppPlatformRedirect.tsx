"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBackendToken } from "@/lib/backend-client";
import { isEmbeddedAppBrowser, toAppHref } from "@/lib/runtime";

export default function AppPlatformRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isEmbeddedAppBrowser()) {
      return;
    }

    router.replace(toAppHref(getBackendToken() ? "/chat" : "/login"));
  }, [router]);

  return null;
}
