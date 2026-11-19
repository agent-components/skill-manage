"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Modal, Spin, message } from "antd";
import { SkillIcon, SkillSetAvatar } from "@/components/icons";
import { authFetch } from "@/lib/auth-client";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

type SkillSetDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  skills: {
    id: string;
    slug: string;
    displayName: string;
    summary: string | null;
    icon?: string | null;
    latestVersion: string | null;
    versionCount: number;
  }[];
};

export default function SkillSetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [skillSet, setSkillSet] = useState<SkillSetDetail | null>(null);
  const [tab, setTab] = useState<"overview" | "skills">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/openapi/skill-sets/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "加载失败");
      setSkillSet(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUnlink = (skillId: string) => {
    Modal.confirm({
      title: "删除该技能？",
      content: "只会从当前技能集中移除，技能本身会保留。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        const res = await authFetch(`/api/openapi/skill-sets/${id}/skills`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remove: [skillId] }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          message.error(data.message || "移除失败");
          return;
        }
        message.success("已移除");
        await load();
      },
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!skillSet) {
    return <p className="pack-empty">技能集不存在</p>;
  }

  return (
    <div className="skill-page pack-page">
      <button
        type="button"
        className="skill-crumb"
        onClick={() => router.push("/skill-sets")}
      >
        技能集 / {skillSet.name}
      </button>

      <div className="pack-detail">
        <div className="pack-detail-main">
          <div className="pack-identity">
            <SkillSetAvatar name={skillSet.name} icon={skillSet.icon} />
            <div>
              <h1 className="skill-hero-title">{skillSet.name}</h1>
              <div className="pack-title-line" style={{ marginTop: 8 }}>
                <span className="pack-role">{skillSet.slug}</span>
              </div>
            </div>
          </div>

          <p className="skill-hero-summary">
            {skillSet.description || "暂无描述"}
          </p>

          <div className="skill-chips">
            <span className="skill-chip">{skillSet.skills.length} 个技能</span>
            <span className="skill-chip">技能集</span>
          </div>

          <div className="skill-tabbar">
            <button
              type="button"
              className={tab === "overview" ? "is-active" : ""}
              onClick={() => setTab("overview")}
            >
              概述
            </button>
            <button
              type="button"
              className={tab === "skills" ? "is-active" : ""}
              onClick={() => setTab("skills")}
            >
              技能
            </button>
          </div>

          <div className="skill-tab-panel" style={{ overflow: "auto" }}>
            {tab === "overview" ? (
              <div>
                <h2 style={{ margin: "8px 0 12px", fontSize: 22 }}>
                  {skillSet.name}
                </h2>
                <p className="skill-hero-summary" style={{ marginTop: 0 }}>
                  {skillSet.description || "这个技能集还没有概述。"}
                </p>
              </div>
            ) : (
              <div>
                <div className="pack-skills-head">
                  <div>
                    <h2>包含的技能</h2>
                    <div className="pack-skills-note">
                      点击查看技能详情。
                    </div>
                  </div>
                  <span>{skillSet.skills.length} 个</span>
                </div>
                {skillSet.skills.length === 0 ? (
                  <div className="pack-empty">还没有关联技能</div>
                ) : (
                  <div className="pack-module-grid">
                    {skillSet.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="pack-module"
                        onClick={() => router.push(`/skills/${skill.id}`)}
                      >
                        <SkillIcon icon={skill.icon} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="pack-module-top">
                            <h3>{skill.displayName}</h3>
                            <span className="pack-module-actions">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/skills/${skill.id}`);
                                }}
                              >
                                查看
                              </button>
                              <button
                                type="button"
                                className="is-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnlink(skill.id);
                                }}
                              >
                                删除
                              </button>
                            </span>
                          </div>
                          <p>{skill.summary || skill.slug}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
