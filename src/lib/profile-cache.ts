import type { BackendUser } from "./backend-client";

const PROFILE_CACHE_KEY = "sinal-local-profile";

type LocalProfileCache = Record<
  string,
  {
    avatarUrl?: string | null;
    displayName?: string | null;
    bio?: string | null;
    updatedAt: number;
  }
>;

function readCache(): LocalProfileCache {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as LocalProfileCache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: LocalProfileCache) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
}

export function storeLocalProfile(
  userId: string,
  profile: Pick<BackendUser, "avatarUrl" | "displayName" | "bio">,
) {
  const cache = readCache();
  cache[userId] = {
    avatarUrl: profile.avatarUrl ?? cache[userId]?.avatarUrl ?? null,
    displayName: profile.displayName ?? cache[userId]?.displayName ?? null,
    bio: profile.bio ?? cache[userId]?.bio ?? null,
    updatedAt: Date.now(),
  };
  writeCache(cache);
}

export function applyLocalProfile<TUser extends BackendUser | null | undefined>(
  user: TUser,
): TUser {
  if (!user) {
    return user;
  }

  const cached = readCache()[user.id];
  if (!cached) {
    return user;
  }

  return {
    ...user,
    displayName: cached.displayName || user.displayName,
    bio: cached.bio ?? user.bio,
    avatarUrl: cached.avatarUrl || user.avatarUrl,
  } as TUser;
}

export function applyLocalProfiles<TUser extends BackendUser>(users: TUser[]) {
  return users.map((user) => applyLocalProfile(user) as TUser);
}
