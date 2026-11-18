"use client";

import { useEffect, useState } from "react";
import {
  resolveProThemeId,
  useProTheme,
  type UseProThemeOptions,
  type UseProThemeResult,
} from "listpage-components";

export const PRO_THEME_STORAGE_KEY = "pro-theme-id";

function readStoredThemeId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(PRO_THEME_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStoredThemeId(id: string) {
  try {
    localStorage.setItem(PRO_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * useProTheme 本身不落盘；此包装在挂载后从 localStorage 恢复，
 * 并在 themeId 变化时写回。
 */
export function usePersistedProTheme(
  options?: UseProThemeOptions,
): UseProThemeResult {
  const result = useProTheme({
    defaultThemeId: "macos",
    ...options,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredThemeId();
    if (stored) {
      result.setThemeId(resolveProThemeId(result.themes, stored));
    }
    setReady(true);
    // 仅首屏恢复
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeStoredThemeId(result.themeId);
  }, [ready, result.themeId]);

  return result;
}
