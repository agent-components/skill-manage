"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppstoreOutlined, FolderOutlined, KeyOutlined } from "@ant-design/icons";
import {
  AppProvider,
  Layout,
  findMenuLeafByPath,
  setupZhCNLocale,
  useLayoutTabs,
  type LayoutMenuNode,
  type LayoutMenuSection,
} from "listpage-components";
import {
  logoutRequest,
  type ClientUser,
} from "@/lib/auth-client";
import { usePersistedProTheme } from "@/lib/use-persisted-pro-theme";
import { AuthGuard } from "@/components/AuthGuard";
import "@/styles/listpage-components.css";

setupZhCNLocale();

const MENU: LayoutMenuNode[] = [
  {
    key: "projects",
    label: "项目管理",
    icon: <FolderOutlined />,
    href: "/projects",
  },
  {
    key: "skills",
    label: "技能管理",
    icon: <AppstoreOutlined />,
    href: "/skills",
  },
  {
    key: "tokens",
    label: "令牌管理",
    icon: <KeyOutlined />,
    href: "/tokens",
  },
];

/** 合并为单一 section，避免 leaf→section 归一化后的 16px 段间距 */
const MENU_SECTIONS: LayoutMenuSection[] = [
  {
    collapsible: false,
    items: MENU.map((node) => ({
      key: node.key,
      label: node.label,
      icon: node.icon,
      href: node.href,
    })),
  },
];

const APP_LOGO = (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/skills-logo.svg"
    alt=""
    width={28}
    height={28}
    style={{ display: "block", borderRadius: 7 }}
  />
);

const TAB_ROUTES = MENU.filter((m) => m.href).map((m) => ({
  key: m.key,
  path: m.href!,
  label: m.label,
  icon: m.icon,
}));

/** 详情页等子路径归一到菜单路由，避免 useLayoutTabs 精确匹配失败后回退到 routes[0] */
function resolveTabPathname(pathname: string): string {
  let best: (typeof TAB_ROUTES)[number] | undefined;
  for (const route of TAB_ROUTES) {
    if (
      pathname === route.path ||
      pathname.startsWith(`${route.path}/`)
    ) {
      if (!best || route.path.length > best.path.length) {
        best = route;
      }
    }
  }
  return best?.path ?? pathname;
}

function ShellInner({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ClientUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { appProviderProps, sidebarTheme, themeUserProfileItem } =
    usePersistedProTheme();

  const tabPathname = useMemo(
    () => resolveTabPathname(pathname),
    [pathname],
  );
  const selected =
    findMenuLeafByPath(MENU, pathname) ??
    findMenuLeafByPath(MENU, tabPathname);
  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const { tabs, activeKey, activateTab, closeTab, reorderTabs, openTab } =
    useLayoutTabs({
      routes: TAB_ROUTES,
      pathname: tabPathname,
      navigate,
      homepageKey: "skills",
    });

  const layoutTabs = useMemo(
    () => ({
      items: tabs.map((t) => ({
        key: t.key,
        label: t.label,
        icon: t.icon,
        pinned: t.pinned,
        closable: !t.pinned,
      })),
      activeKey,
      onChange: (key: string) => activateTab(key),
      onClose: (key: string) => closeTab(key),
      onReorder: (fromKey: string, toIndex: number) =>
        reorderTabs(fromKey, toIndex),
    }),
    [tabs, activeKey, activateTab, closeTab, reorderTabs],
  );

  const onLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      window.location.assign("/login");
    }
  };

  return (
    <AppProvider {...appProviderProps}>
      <Layout
        title="技能管理"
        logo={APP_LOGO}
        menuSections={MENU_SECTIONS}
        selectedMenuKey={selected?.key}
        onMenuChange={(key) => openTab(key)}
        sidebarTheme={sidebarTheme}
        sideNavCollapsible
        contentPadding={16}
        height="fill"
        tabs={layoutTabs}
        userProfile={{
          name: user?.displayName || user?.account || "未登录",
          items: [themeUserProfileItem],
          logout: {
            key: "logout",
            label: "退出登录",
            onClick: () => {
              void onLogout();
            },
          },
        }}
      >
        {children}
      </Layout>
    </AppProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const onUser = useCallback((u: ClientUser | null) => setUser(u), []);

  return (
    <div
      style={{
        height: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AuthGuard onUser={onUser}>
        <ShellInner user={user}>{children}</ShellInner>
      </AuthGuard>
    </div>
  );
}
