"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spin } from "antd";
import {
  clearClientToken,
  fetchCurrentUser,
  getClientToken,
  type ClientUser,
} from "@/lib/auth-client";

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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getClientToken();
      if (!token) {
        onUser?.(null);
        router.replace(
          `/login?from=${encodeURIComponent(pathname || "/skills")}`,
        );
        return;
      }

      try {
        const u = await fetchCurrentUser();
        if (cancelled) return;
        if (!u) {
          clearClientToken();
          onUser?.(null);
          router.replace(
            `/login?from=${encodeURIComponent(pathname || "/skills")}`,
          );
          return;
        }
        onUser?.(u);
        setReady(true);
      } catch {
        if (cancelled) return;
        clearClientToken();
        onUser?.(null);
        router.replace(
          `/login?from=${encodeURIComponent(pathname || "/skills")}`,
        );
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // 故意不把 onUser 放进依赖，避免父组件重渲染导致鉴权重跑闪烁
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

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
