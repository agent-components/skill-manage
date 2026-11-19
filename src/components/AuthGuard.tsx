"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spin } from "antd";
import { HarnessOpenNotice } from "@/components/HarnessOpenNotice";
import {
  clearClientToken,
  exchangeHarnessSso,
  fetchCurrentUser,
  getClientToken,
  type ClientUser,
} from "@/lib/auth-client";
import { isEmbeddedFrame } from "@/lib/embed";

function readSsoCode() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("harness_sso")?.trim() || "";
}

function stripSsoCode() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("harness_sso")) return;
  url.searchParams.delete("harness_sso");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

export function AuthGuard({
  children,
  onUser,
}: {
  children: React.ReactNode;
  onUser?: (user: ClientUser | null) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const code = readSsoCode();
      const embedded = isEmbeddedFrame();

      if (code) {
        try {
          const session = await exchangeHarnessSso(code);
          if (cancelled) return;
          stripSsoCode();
          onUser?.(session.user);
          setBlocked(false);
          setReady(true);
          return;
        } catch {
          if (cancelled) return;
          stripSsoCode();
          clearClientToken();
          onUser?.(null);
          setReady(false);
          setBlocked(true);
          return;
        }
      }

      const token = getClientToken();
      if (!token) {
        onUser?.(null);
        if (embedded) {
          setBlocked(true);
          return;
        }
        router.replace(`/login?from=${encodeURIComponent(pathname || "/skills")}`);
        return;
      }

      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;
        if (!user) {
          clearClientToken();
          onUser?.(null);
          if (embedded) {
            setBlocked(true);
            return;
          }
          router.replace(
            `/login?from=${encodeURIComponent(pathname || "/skills")}`,
          );
          return;
        }
        onUser?.(user);
        setBlocked(false);
        setReady(true);
      } catch {
        if (cancelled) return;
        clearClientToken();
        onUser?.(null);
        if (embedded) {
          setBlocked(true);
          return;
        }
        router.replace(`/login?from=${encodeURIComponent(pathname || "/skills")}`);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // 故意不把 onUser 放进依赖，避免父组件重渲染导致鉴权重跑闪烁
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  if (blocked) return <HarnessOpenNotice />;

  if (!ready) {
    return (
      <div
        style={{
          height: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
