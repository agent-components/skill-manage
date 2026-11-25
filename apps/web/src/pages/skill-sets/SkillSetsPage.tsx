import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppstoreOutlined, PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Button, Dropdown, Input, Pagination, Spin } from "antd";
import { SkillSetAvatar } from "@/components/ui/icons";
import { useTRPC } from "@/services/trpc";
import { CreateSkillSetFloat } from "@/components/skill-set/CreateSkillSetFloat";
import { DeleteSkillSetFloat } from "@/components/skill-set/DeleteSkillSetFloat";
import { EditSkillSetFloat } from "@/components/skill-set/EditSkillSetFloat";
import { SkillSetSkillsFloat } from "@/components/skill-set/SkillSetSkillsFloat";
import type { SkillSetRow } from "@/types/skill-sets";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

type FloatKey = "create" | "edit" | "skills" | "delete" | null;
type ManageKey = "skills" | "edit" | "delete";

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

function SkillSetManageMenu({
  row,
  onAction,
}: {
  row: SkillSetRow;
  onAction: (key: ManageKey, row: SkillSetRow) => void;
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
          { key: "skills", label: "关联技能" },
          { key: "edit", label: "编辑" },
          { key: "delete", label: "删除", danger: true },
        ],
        onClick: ({ key, domEvent }) => {
          domEvent.stopPropagation();
          setOpen(false);
          onAction(key as ManageKey, row);
        },
      }}
    >
      <Button type="link" onClick={(event) => event.stopPropagation()}>
        管理
      </Button>
    </Dropdown>
  );
}

export function SkillSetsPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [view, setView] = useState<"list" | "card">("list");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [float, setFloat] = useState<FloatKey>(null);
  const [record, setRecord] = useState<SkillSetRow | undefined>();

  const { data, isFetching, refetch } = useQuery(
    trpc.skillSet.list.queryOptions({
      current: page,
      pageSize,
      name: query || undefined,
    })
  );

  const list: SkillSetRow[] = data?.list ?? [];
  const total = data?.total ?? 0;

  const open = (key: FloatKey, row?: SkillSetRow) => {
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
        <h1>技能集</h1>
        <p>把技能组合成完整工作流 · 共 {total} 个技能集</p>
      </div>

      <div className="pack-toolbar">
        <Button className="pack-create" icon={<PlusOutlined />} onClick={() => open("create")}>
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

      <Spin spinning={isFetching}>
        {list.length === 0 ? (
          <div className="pack-empty">还没有技能集</div>
        ) : view === "list" ? (
          <div className="pack-list">
            {list.map((row) => (
              <ClickableRow
                key={row.id}
                className="pack-row"
                onClick={() => navigate(`/skill-sets/${row.id}`)}
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
                  <SkillSetManageMenu row={row} onAction={open} />
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
                onClick={() => navigate(`/skill-sets/${row.id}`)}
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
                  <SkillSetManageMenu row={row} onAction={open} />
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

      <CreateSkillSetFloat visible={float === "create"} onClose={close} />
      <EditSkillSetFloat record={record} visible={float === "edit"} onClose={close} />
      <SkillSetSkillsFloat record={record} visible={float === "skills"} onClose={close} />
      <DeleteSkillSetFloat record={record} visible={float === "delete"} onClose={close} />
    </div>
  );
}
