import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function getBasePath() {
  if (!rawBasePath || rawBasePath === "/") {
    return "";
  }

  return rawBasePath.startsWith("/") ? rawBasePath : `/${rawBasePath}`;
}

export function withBasePath(path: string) {
  if (!path.startsWith("/")) {
    return path;
  }

  return `${getBasePath()}${path}`;
}
