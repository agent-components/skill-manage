import { Suspense, lazy, ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import { AppShell } from "@/app";
import { AuthGuard } from "@/app";

// Lazy load page components
const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const SkillsPage = lazy(() =>
  import("@/pages/skills/SkillsPage").then((m) => ({ default: m.SkillsPage }))
);
const SkillDetailPage = lazy(() =>
  import("@/pages/skills/SkillDetailPage").then((m) => ({ default: m.SkillDetailPage }))
);
const SkillSetsPage = lazy(() =>
  import("@/pages/skill-sets/SkillSetsPage").then((m) => ({ default: m.SkillSetsPage }))
);
const SkillSetDetailPage = lazy(() =>
  import("@/pages/skill-sets/SkillSetDetailPage").then((m) => ({ default: m.SkillSetDetailPage }))
);
const SkillSquarePage = lazy(() =>
  import("@/pages/skill-square/SkillSquarePage").then((m) => ({ default: m.SkillSquarePage }))
);
const SkillSquareDetailPage = lazy(() =>
  import("@/pages/skill-square/SkillSquareDetailPage").then((m) => ({
    default: m.SkillSquareDetailPage,
  }))
);

function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        minHeight: "200px",
      }}
    >
      <Spin size="large" />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <AppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/skills" replace />} />
                <Route
                  path="/skills"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SkillsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/skills/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SkillDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/skill-sets"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SkillSetsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/skill-sets/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SkillSetDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/skill-square"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SkillSquarePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/skill-square/:slug"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SkillSquareDetailPage />
                    </Suspense>
                  }
                />
                <Route path="*" element={<Navigate to="/skills" replace />} />
              </Routes>
            </AppShell>
          </AuthGuard>
        }
      />
    </Routes>
  );
}
