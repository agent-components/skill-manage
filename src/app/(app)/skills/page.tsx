"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppstoreOutlined, UnorderedListOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Dropdown, Input, Pagination, Spin } from "antd";
import { SkillIcon } from "@/components/icons";
import { SkillSetOptionsProvider, SkillSetSelect } from "@/components/skill-set-options";
import { DeleteSkillFloat } from "./_list/delete-float";
import { EditSkillFloat } from "./_list/edit-float";
import { requestSkills } from "./_list/request";
import type { SkillRow } from "./_list/types";
import { UploadSkillFloat } from "./_list/upload-float";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

type FloatKey = "upload" | "edit" | "delete" | null;

function SkillsBoard() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "card">("list");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [skillSetSlugs, setSkillSetSlugs] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [list, setList] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [float, setFloat] = useState<FloatKey>(null);
  const [record, setRecord] = useState<SkillRow | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestSkills(
        { current: page, pageSize },
        { name: query || undefined, skillSetId: skillSetSlugs },
        {},
      );
      setList(data.list as SkillRow[]);
      setTotal(data.total);
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query, skillSetSlugs]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (key: FloatKey, row?: SkillRow) => {
    setRecord(row);
    setFloat(key);
  };

  const close = (refresh?: unknown) => {
    setFloat(null);
    if (refresh) void load();
  };

  const menu = (row: SkillRow) => ({
    items: [
      { key: "edit", label: "编辑" },
      { key: "delete", label: "删除", danger: true },
    ],
    onClick: ({
      key,
      domEvent,
    }: {
      key: string;
      domEvent: { stopPropagation: () => void };
    }) => {
      domEvent.stopPropagation();
      open(key as FloatKey, row);
    },
  });

  return (
    <div className="skill-page pack-page">
      <div className="pack-head">
        <h1>技能</h1>
        <p>可单独使用，也可挂到技能集里 · 共 {total} 个技能</p>
      </div>

      <div className="pack-toolbar">
        <Button
          className="pack-create"
          icon={<UploadOutlined />}
          onClick={() => open("upload")}
        >
          上传技能
        </Button>
        <SkillSetSelect
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          placeholder="全部技能集"
          valueKey="slug"
          value={skillSetSlugs}
          onChange={(value) => {
            setPage(1);
            setSkillSetSlugs(Array.isArray(value) ? value : []);
          }}
          style={{ width: 260 }}
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
          <div className="pack-empty">还没有技能</div>
        ) : view === "list" ? (
          <div className="pack-list">
            {list.map((row) => (
              <button
                key={row.id}
                type="button"
                className="pack-row"
                onClick={() => router.push(`/skills/${row.id}`)}
              >
                <SkillIcon icon={row.icon} className="pack-module-icon pack-skill-icon" />
                <span className="pack-main">
                  <span className="pack-title-line">
                    <strong>{row.displayName}</strong>
                    {row.tags?.map((tag) => (
                      <span key={tag} className="pack-role">
                        {tag}
                      </span>
                    ))}
                  </span>
                  <span className="pack-desc">{row.summary || "暂无描述"}</span>
                </span>
                <span className="pack-side">
                  <span className="pack-skill-sets">
                    {row.skillSets?.length
                      ? row.skillSets.map((item) => item.name).join("、")
                      : "未归属技能集"}
                  </span>
                  <Dropdown menu={menu(row)} trigger={["click"]}>
                    <Button type="link" onClick={(e) => e.stopPropagation()}>
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
                onClick={() => router.push(`/skills/${row.id}`)}
              >
                <span className="pack-title-line">
                  <SkillIcon icon={row.icon} className="pack-module-icon pack-skill-icon" />
                  <span>
                    <strong style={{ display: "block" }}>{row.displayName}</strong>
                    {row.tags?.length ? (
                      <span className="pack-title-line">
                        {row.tags.map((tag) => (
                          <span key={tag} className="pack-role">
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="pack-desc">{row.summary || "暂无描述"}</span>
                <span className="pack-card-foot">
                  <span className="pack-skill-sets">
                    {row.skillSets?.length
                      ? row.skillSets.map((item) => item.name).join("、")
                      : "未归属技能集"}
                  </span>
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

      <UploadSkillFloat visible={float === "upload"} onClose={close} />
      <EditSkillFloat record={record} visible={float === "edit"} onClose={close} />
      <DeleteSkillFloat record={record} visible={float === "delete"} onClose={close} />
    </div>
  );
}

export default function SkillsPage() {
  return (
    <SkillSetOptionsProvider>
      <SkillsBoard />
    </SkillSetOptionsProvider>
  );
}
