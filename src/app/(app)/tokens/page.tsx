"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Form, Input, Modal, Select, Space, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ListPage, type ListPageRequest } from "listpage-components/ListPage";
import dayjs from "dayjs";
import { authFetch } from "@/lib/auth-client";

type TokenRow = {
  id: string;
  name: string;
  displayToken: string;
  project: { id: string; name: string; slug: string };
  lastUsedAt: string | null;
  createdAt: string;
};

type TokenFilter = { name?: string; projectId?: string };

type ProjectOption = { id: string; name: string };

function formatTime(value: string | null, empty: string) {
  if (!value) return empty;
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

export default function TokensPage() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copyingMcpId, setCopyingMcpId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [form] = Form.useForm();
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    authFetch("/api/projects?pageSize=100")
      .then((r) => r.json())
      .then((d) =>
        setProjects(
          (d.list || []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          })),
        ),
      )
      .catch(() => undefined);
  }, []);

  const request: ListPageRequest<TokenFilter> = async (
    pageParams,
    filterValues,
  ) => {
    const qs = new URLSearchParams();
    if (filterValues?.name) qs.set("name", filterValues.name);
    if (filterValues?.projectId) qs.set("projectId", filterValues.projectId);
    qs.set("page", String(pageParams.current || 1));
    qs.set("pageSize", String(pageParams.pageSize || 20));
    const res = await authFetch(`/api/tokens?${qs}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "加载失败");
    }
    const data = await res.json();
    return { list: data.list as TokenRow[], total: data.total as number };
  };

  const onCreate = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          projectId: values.projectId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "创建失败");
      message.success("已创建令牌");
      setOpen(false);
      form.resetFields();
      refreshRef.current?.();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  const onCopy = async (row: TokenRow) => {
    setCopyingId(row.id);
    try {
      const res = await authFetch(`/api/tokens/${row.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "复制失败");
      if (!data.token) throw new Error("未获取到令牌");
      await copyText(data.token as string);
      message.success("已复制令牌");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "复制失败");
    } finally {
      setCopyingId(null);
    }
  };

  const onCopyMcp = async (row: TokenRow) => {
    setCopyingMcpId(row.id);
    try {
      const res = await authFetch(`/api/tokens/${row.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "复制失败");
      if (!data.token) throw new Error("未获取到令牌");
      const serverKey = row.project?.slug
        ? `${row.project.slug}-skill`
        : "skill";
      const config = {
        mcpServers: {
          [serverKey]: {
            url: `${window.location.origin}/api/mcp`,
            headers: {
              Authorization: `Bearer ${data.token}`,
            },
          },
        },
      };
      await copyText(JSON.stringify(config, null, 2));
      message.success("已复制 MCP 配置");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "复制失败");
    } finally {
      setCopyingMcpId(null);
    }
  };

  const onRevoke = (row: TokenRow) => {
    Modal.confirm({
      title: "撤销令牌？",
      content: `撤销后「${row.name}」将立即失效，且不可恢复。`,
      okText: "撤销",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        const res = await authFetch(`/api/tokens/${row.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          message.error(data.message || "撤销失败");
          throw new Error(data.message || "撤销失败");
        }
        message.success("已撤销");
        refreshRef.current?.();
      },
    });
  };

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <>
      <ListPage<TokenRow, TokenFilter>
        title="令牌管理"
        filter={{
          items: [
            {
              name: "name",
              label: "名称",
              component: <Input allowClear placeholder="令牌名称" />,
            },
            {
              name: "projectId",
              label: "项目",
              component: (
                <Select
                  allowClear
                  placeholder="全部项目"
                  options={projectOptions}
                />
              ),
            },
          ],
        }}
        table={{
          rowKey: "id",
          title: "令牌列表",
          extra: (ctx) => {
            refreshRef.current = ctx.refreshTable;
            return (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setOpen(true)}
              >
                新建令牌
              </Button>
            );
          },
          columns: [
            { title: "名称", dataIndex: "name", width: 180 },
            {
              title: "项目",
              dataIndex: ["project", "name"],
              width: 160,
              render: (_: unknown, row: TokenRow) => row.project?.name || "-",
            },
            {
              title: "令牌",
              dataIndex: "displayToken",
              width: 280,
              render: (displayToken: string, row: TokenRow) => (
                <Space size={8}>
                  <span
                    style={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {displayToken}
                  </span>
                  <a
                    onClick={() => {
                      if (copyingId !== row.id) void onCopy(row);
                    }}
                  >
                    {copyingId === row.id ? "复制中…" : "复制"}
                  </a>
                </Space>
              ),
            },
            {
              title: "最近使用",
              dataIndex: "lastUsedAt",
              width: 170,
              render: (value: string | null) => formatTime(value, "从未使用"),
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              width: 170,
              render: (value: string) => formatTime(value, "-"),
            },
            {
              title: "操作",
              width: 160,
              render: (_: unknown, row: TokenRow) => (
                <Space>
                  <a
                    onClick={() => {
                      if (copyingMcpId !== row.id) void onCopyMcp(row);
                    }}
                  >
                    {copyingMcpId === row.id ? "复制中…" : "复制 MCP"}
                  </a>
                  <a onClick={() => onRevoke(row)} style={{ color: "#ff4d4f" }}>
                    撤销
                  </a>
                </Space>
              ),
            },
          ],
        }}
        request={request}
      />

      <Modal
        title="新建令牌"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onCreate}
        confirmLoading={saving}
        okText="创建"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入令牌名称" }]}
          >
            <Input placeholder="例如：CI 发布" maxLength={64} />
          </Form.Item>
          <Form.Item
            name="projectId"
            label="绑定项目"
            rules={[{ required: true, message: "请选择绑定项目" }]}
          >
            <Select
              placeholder="请选择项目"
              options={projectOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
