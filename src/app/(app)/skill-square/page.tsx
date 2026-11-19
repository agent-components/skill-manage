"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Button, Input, Pagination, Select, Spin, message } from "antd";
import { SkillIcon } from "@/components/icons";
import { SkillSetOptionsProvider } from "@/components/skill-set-options";
import { authFetch } from "@/lib/auth-client";
import { ImportSkillFloat } from "./_list/import-float";
import type { SquareCategory, SquareSkill } from "./_list/types";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

function formatCount(value: number) {
  if (value >= 10000) {
    const wan = value / 10000;
    const text = wan >= 100 ? String(Math.round(wan)) : wan.toFixed(1).replace(/\.0$/, "");
    return `${text}万`;
  }
  return String(value);
}

function badges(row: SquareSkill) {
  return [
    row.version ? `v${row.version}` : null,
    ...row.tags.slice(0, 2),
    row.paid ? "付费" : null,
    row.requiresApiKey ? "需要密钥" : null,
  ].filter((item): item is string => Boolean(item));
}

function sideText(row: SquareSkill) {
  const parts = [row.publisher, `${formatCount(row.downloads)}次下载`].filter(Boolean);
  return parts.join(" · ");
}

function SquareBoard() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "card">("list");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [categories, setCategories] = useState<SquareCategory[]>([]);
  const [sortBy, setSortBy] = useState("score");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [list, setList] = useState<SquareSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<SquareSkill | undefined>();
  const requestSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    authFetch("/api/openapi/skill-square/categories")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "分类加载失败");
        return data;
      })
      .then((data) => {
        if (alive) setCategories((data.list ?? []) as SquareCategory[]);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        current: String(page),
        pageSize: String(pageSize),
        sortBy,
      });
      if (query) qs.set("name", query);
      if (category) qs.set("category", category);
      const res = await authFetch(`/api/openapi/skill-square?${qs}`);
      const data = await res.json().catch(() => ({}));
      if (seq !== requestSeq.current) return;
      if (!res.ok) throw new Error(data.message || "加载失败");
      setList((data.list ?? []) as SquareSkill[]);
      setTotal(data.total ?? 0);
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setList([]);
      setTotal(0);
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [page, pageSize, query, category, sortBy]);

  useEffect(() => {
    void load();
  }, [load]);

  const renderBadges = (row: SquareSkill) =>
    badges(row).map((tag) => (
      <span key={tag} className="pack-role">
        {tag}
      </span>
    ));

  return (
    <div className="skill-page pack-page">
      <div className="pack-head">
        <h1>技能广场</h1>
        <p>公开技能来自 SkillHub，可导入到自己的技能里 · 共 {total} 个</p>
      </div>

      <div className="pack-toolbar">
        <Select
          allowClear
          placeholder="全部分类"
          value={category}
          options={categories.map((item) => ({ value: item.key, label: item.name }))}
          onChange={(value) => {
            setPage(1);
            setCategory(value);
          }}
          style={{ width: 160 }}
        />
        <Select
          value={sortBy}
          options={[
            { value: "score", label: "综合" },
            { value: "downloads", label: "下载量" },
            { value: "updated_at", label: "最近更新" },
          ]}
          onChange={(value) => {
            setPage(1);
            setSortBy(value);
          }}
          style={{ width: 140 }}
        />
        <Input
          allowClear
          placeholder="搜索技能"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setPage(1);
            setQuery(e.target.value.trim());
          }}
        />
        <div className="pack-view">
          <button
            type="button"
            className={view === "list" ? "is-on" : ""}
            aria-label="列表"
            onClick={() => setView("list")}
          >
            <UnorderedListOutlined />
          </button>
          <button
            type="button"
            className={view === "card" ? "is-on" : ""}
            aria-label="卡片"
            onClick={() => setView("card")}
          >
            <AppstoreOutlined />
          </button>
        </div>
      </div>

      <Spin spinning={loading}>
        {list.length === 0 ? (
          <div className="pack-empty">{loading ? " " : "没有找到技能"}</div>
        ) : view === "list" ? (
          <div className="pack-list">
            {list.map((row) => (
              <button
                key={row.slug}
                type="button"
                className="pack-row"
                onClick={() => router.push(`/skill-square/${row.slug}`)}
              >
                <SkillIcon icon={row.icon} className="pack-module-icon pack-skill-icon" />
                <span className="pack-main">
                  <span className="pack-title-line">
                    <strong>{row.displayName}</strong>
                    {renderBadges(row)}
                  </span>
                  <span className="pack-desc">{row.summary || "暂无描述"}</span>
                </span>
                <span className="pack-side">
                  <span className="pack-skill-sets">{sideText(row)}</span>
                  <Button
                    type="link"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRecord(row);
                    }}
                  >
                    导入
                  </Button>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="pack-grid">
            {list.map((row) => (
              <button
                key={row.slug}
                type="button"
                className="pack-card"
                onClick={() => router.push(`/skill-square/${row.slug}`)}
              >
                <span className="pack-title-line">
                  <SkillIcon icon={row.icon} className="pack-module-icon pack-skill-icon" />
                  <span>
                    <strong style={{ display: "block" }}>{row.displayName}</strong>
                    {badges(row).length ? (
                      <span className="pack-title-line">{renderBadges(row)}</span>
                    ) : null}
                  </span>
                </span>
                <span className="pack-desc">{row.summary || "暂无描述"}</span>
                <span className="pack-card-foot">
                  <span className="pack-skill-sets">{sideText(row)}</span>
                  <Button
                    type="link"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRecord(row);
                    }}
                  >
                    导入
                  </Button>
                </span>
              </button>
            ))}
          </div>
        )}
      </Spin>

      {total > pageSize ? (
        <div className="pack-pager">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            onChange={(next, size) => {
              setPage(next);
              setPageSize(size);
            }}
          />
        </div>
      ) : null}

      <ImportSkillFloat
        record={record}
        visible={Boolean(record)}
        onClose={() => setRecord(undefined)}
      />
    </div>
  );
}

export default function SkillSquarePage() {
  return (
    <SkillSetOptionsProvider>
      <SquareBoard />
    </SkillSetOptionsProvider>
  );
}
