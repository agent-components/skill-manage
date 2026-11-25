import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Input, Pagination, Spin } from "antd";
import { SkillIcon } from "@/components/icons";
import {
  SkillSetOptionsProvider,
  SkillSetSelect,
} from "@/components/skill-set-options";
import { useTRPC } from "@/lib/trpc";
import { DeleteSkillFloat } from "@/features/skills/floats/DeleteSkillFloat";
import { EditSkillFloat } from "@/features/skills/floats/EditSkillFloat";
import { UploadSkillFloat } from "@/features/skills/floats/UploadSkillFloat";
import type { SkillRow } from "@/features/skills/types";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

type FloatKey = "upload" | "edit" | "delete" | null;

function ClickableRow({
  className,
  onClick,
  children,
}: {
  className: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={className}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onClick();
      }}
    >
      {children}
    </div>
  );
}

function SkillManageMenu({
  row,
  onAction,
}: {
  row: SkillRow;
  onAction: (key: "edit" | "delete", row: SkillRow) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      destroyOnHidden
      open={open}
      trigger={["click"]}
      onOpenChange={setOpen}
      menu={{
        items: [
          { key: "edit", label: "编辑" },
          { key: "delete", label: "删除", danger: true },
        ],
        onClick: ({ key, domEvent }) => {
          // 菜单在 body 上，点击仍会沿 React 树冒泡到整行。
          // stopPropagation 能拦住跳进详情，但 Dropdown 也因此收不到关闭事件。
          domEvent.stopPropagation();
          setOpen(false);
          onAction(key as "edit" | "delete", row);
        },
      }}
    >
      <Button type="link" onClick={(event) => event.stopPropagation()}>
        管理
      </Button>
    </Dropdown>
  );
}

function SkillsBoard() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [view, setView] = useState<"list" | "card">("list");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [skillSetSlugs, setSkillSetSlugs] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [float, setFloat] = useState<FloatKey>(null);
  const [record, setRecord] = useState<SkillRow | undefined>();

  const { data, isFetching, refetch } = useQuery(
    trpc.skill.list.queryOptions({
      current: page,
      pageSize,
      name: query || undefined,
      skillSetSlugs,
    }),
  );

  const list: SkillRow[] = data?.list ?? [];
  const total = data?.total ?? 0;

  const open = (key: FloatKey, row?: SkillRow) => {
    setRecord(row);
    setFloat(key);
  };

  const close = (refresh?: unknown) => {
    setFloat(null);
    if (refresh) void refetch();
  };

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

      <Spin spinning={isFetching}>
        {list.length === 0 ? (
          <div className="pack-empty">还没有技能</div>
        ) : view === "list" ? (
          <div className="pack-list">
            {list.map((row) => (
              <ClickableRow
                key={row.id}
                className="pack-row"
                onClick={() => navigate(`/skills/${row.id}`)}
              >
                <SkillIcon
                  icon={row.icon}
                  className="pack-module-icon pack-skill-icon"
                />
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
                  <SkillManageMenu row={row} onAction={open} />
                </span>
              </ClickableRow>
            ))}
          </div>
        ) : (
          <div className="pack-grid">
            {list.map((row) => (
              <ClickableRow
                key={row.id}
                className="pack-card"
                onClick={() => navigate(`/skills/${row.id}`)}
              >
                <span className="pack-title-line">
                  <SkillIcon
                    icon={row.icon}
                    className="pack-module-icon pack-skill-icon"
                  />
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
                  <SkillManageMenu row={row} onAction={open} />
                </span>
              </ClickableRow>
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
      <DeleteSkillFloat
        record={record}
        visible={float === "delete"}
        onClose={close}
      />
    </div>
  );
}

export function SkillsPage() {
  return (
    <SkillSetOptionsProvider>
      <SkillsBoard />
    </SkillSetOptionsProvider>
  );
}
