import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Button, Input, Pagination, Select, Spin } from "antd";
import { SkillIcon } from "@/components/icons";
import { SkillSetOptionsProvider } from "@/components/skill-set-options";
import { useTRPC } from "@/lib/trpc";
import { ImportSkillFloat } from "@/features/skill-square/floats/ImportSkillFloat";
import type { SquareSkill } from "@/features/skill-square/types";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

function formatCount(value: number) {
  if (value >= 10000) {
    const wan = value / 10000;
    const text =
      wan >= 100 ? String(Math.round(wan)) : wan.toFixed(1).replace(/\.0$/, "");
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
  const parts = [row.publisher, `${formatCount(row.downloads)}次下载`].filter(
    Boolean,
  );
  return parts.join(" · ");
}

function SquareBoard() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [view, setView] = useState<"list" | "card">("list");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState("score");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [record, setRecord] = useState<SquareSkill | undefined>();

  const categoriesQuery = useQuery(trpc.skillSquare.categories.queryOptions());
  const categories = categoriesQuery.data?.list ?? [];

  const { data, isFetching } = useQuery(
    trpc.skillSquare.list.queryOptions({
      current: page,
      pageSize,
      sortBy,
      name: query || undefined,
      category,
    }),
  );

  const list: SquareSkill[] = data?.list ?? [];
  const total = data?.total ?? 0;

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
          options={categories.map((item) => ({
            value: item.key,
            label: item.name,
          }))}
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

      <Spin spinning={isFetching}>
        {list.length === 0 ? (
          <div className="pack-empty">{isFetching ? " " : "没有找到技能"}</div>
        ) : view === "list" ? (
          <div className="pack-list">
            {list.map((row) => (
              <button
                key={row.slug}
                type="button"
                className="pack-row"
                onClick={() => navigate(`/skill-square/${row.slug}`)}
              >
                <SkillIcon
                  icon={row.icon}
                  className="pack-module-icon pack-skill-icon"
                />
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
                onClick={() => navigate(`/skill-square/${row.slug}`)}
              >
                <span className="pack-title-line">
                  <SkillIcon
                    icon={row.icon}
                    className="pack-module-icon pack-skill-icon"
                  />
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

export function SkillSquarePage() {
  return (
    <SkillSetOptionsProvider>
      <SquareBoard />
    </SkillSetOptionsProvider>
  );
}
