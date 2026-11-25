import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { AuthGuard } from "@/app/AuthGuard";
import { LoginPage } from "@/features/auth/LoginPage";
import { SkillSetDetailPage } from "@/features/skill-sets/SkillSetDetailPage";
import { SkillSetsPage } from "@/features/skill-sets/SkillSetsPage";
import { SkillSquareDetailPage } from "@/features/skill-square/SkillSquareDetailPage";
import { SkillSquarePage } from "@/features/skill-square/SkillSquarePage";
import { SkillDetailPage } from "@/features/skills/SkillDetailPage";
import { SkillsPage } from "@/features/skills/SkillsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <AppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/skills" replace />} />
                <Route path="/skills" element={<SkillsPage />} />
                <Route path="/skills/:id" element={<SkillDetailPage />} />
                <Route path="/skill-sets" element={<SkillSetsPage />} />
                <Route
                  path="/skill-sets/:id"
                  element={<SkillSetDetailPage />}
                />
                <Route path="/skill-square" element={<SkillSquarePage />} />
                <Route
                  path="/skill-square/:slug"
                  element={<SkillSquareDetailPage />}
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
