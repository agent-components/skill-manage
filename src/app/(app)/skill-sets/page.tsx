"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppstoreOutlined, PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Button, Dropdown, Input, Pagination, Spin } from "antd";
import { SkillSetAvatar } from "@/components/icons";
import { CreateSkillSetFloat } from "./_list/create-float";
import { DeleteSkillSetFloat } from "./_list/delete-float";
import { EditSkillSetFloat } from "./_list/edit-float";
import { requestSkillSets } from "./_list/request";
import { SkillSetSkillsFloat } from "./_list/skills-float";
import type { SkillSetRow } from "./_list/types";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

type FloatKey = "create" | "edit" | "skills" | "delete" | null;

export default function SkillSetsPage() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "card">("list");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [list, setList] = useState<SkillSetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [float, setFloat] = useState<FloatKey>(null);
  const [record, setRecord] = useState<SkillSetRow | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestSkillSets(
        { current: page, pageSize },
        { name: query || undefined },
        {},
      );
      setList(data.list as SkillSetRow[]);
      setTotal(data.total);
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (key: FloatKey, row?: SkillSetRow) => {
    setRecord(row);
    setFloat(key);
  };

  const close = (refresh?: unknown) => {
    setFloat(null);
    if (refresh) void load();
  };

  const menu = (row: SkillSetRow) => ({
    items: [
      { key: "skills", label: "关联技能" },
      { key: "edit", label: "编辑" },
      { key: "delete", label: "删除", danger: true },
    ],
    onClick: ({ key, domEvent }: { key: string; domEvent: { stopPropagation: () => void } }) => {
      domEvent.stopPropagation();
      open(key as FloatKey, row);
    },
  });

  return (
    <div className="skill-page pack-page">
      <div className="pack-head">
        <h1>技能集</h1>
        <p>把技能组合成完整工作流 · 共 {total} 个技能集</p>
      </div>

      <div className="pack-toolbar">
        <Button
          className="pack-create"
          icon={<PlusOutlined />}
          onClick={() => open("create")}
        >
          新建技能集
        </Button>
        <Input
          allowClear
          placeholder="搜索技能集"
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
          <div className="pack-empty">还没有技能集</div>
        ) : view === "list" ? (
          <div className="pack-list">
            {list.map((row) => (
              <button
                key={row.id}
                type="button"
                className="pack-row"
                onClick={() => router.push(`/skill-sets/${row.id}`)}
              >
                <SkillSetAvatar name={row.name} icon={row.icon} />
                <span className="pack-main">
                  <span className="pack-title-line">
                    <strong>{row.name}</strong>
                    <span className="pack-role">{row.slug}</span>
                  </span>
                  <span className="pack-desc">{row.description || "暂无描述"}</span>
                </span>
                <span className="pack-side">
                  <span>{row.skillCount} 个技能</span>
                  <Dropdown menu={menu(row)} trigger={["click"]}>
                    <Button
                      type="link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      管理
                    </Button>
                  </Dropdown>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="pack-grid">
            {list.map((row) => (
              <button
                key={row.id}
                type="button"
                className="pack-card"
                onClick={() => router.push(`/skill-sets/${row.id}`)}
              >
                <span className="pack-title-line">
                  <SkillSetAvatar name={row.name} icon={row.icon} />
                  <span>
                    <strong style={{ display: "block" }}>{row.name}</strong>
                    <span className="pack-role">{row.slug}</span>
                  </span>
                </span>
                <span className="pack-desc">{row.description || "暂无描述"}</span>
                <span className="pack-card-foot">
                  <span>{row.skillCount} 个技能</span>
                  <Dropdown menu={menu(row)} trigger={["click"]}>
                    <Button type="link" onClick={(e) => e.stopPropagation()}>
                      管理
                    </Button>
                  </Dropdown>
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

      <CreateSkillSetFloat visible={float === "create"} onClose={close} />
      <EditSkillSetFloat record={record} visible={float === "edit"} onClose={close} />
      <SkillSetSkillsFloat
        record={record}
        visible={float === "skills"}
        onClose={close}
      />
      <DeleteSkillSetFloat
        record={record}
        visible={float === "delete"}
        onClose={close}
      />
    </div>
  );
}
