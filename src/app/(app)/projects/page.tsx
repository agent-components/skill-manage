"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Modal, Space, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ListPage, type ListPageRequest } from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  skillCount: number;
  updatedAt: string;
};

type ProjectFilter = { name?: string };

export default function ProjectsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const refreshRef = useRef<(() => void) | null>(null);

  const request: ListPageRequest<ProjectFilter> = async (
    pageParams,
    filterValues,
  ) => {
    const qs = new URLSearchParams();
    if (filterValues?.name) qs.set("name", filterValues.name);
    qs.set("page", String(pageParams.current || 1));
    qs.set("pageSize", String(pageParams.pageSize || 20));
    const res = await authFetch(`/api/projects?${qs}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "加载失败");
    }
    const data = await res.json();
    return { list: data.list as ProjectRow[], total: data.total as number };
  };

  const onCreate = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await authFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "创建失败");
      message.success("已创建项目");
      setOpen(false);
      form.resetFields();
      refreshRef.current?.();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPage<ProjectRow, ProjectFilter>
        title="项目管理"
        filter={{
          items: [
            {
              name: "name",
              label: "名称",
              component: <Input allowClear placeholder="项目名称" />,
            },
          ],
        }}
        table={{
          rowKey: "id",
          title: "项目列表",
          extra: (ctx) => {
            refreshRef.current = ctx.refreshTable;
            return (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setOpen(true)}
              >
                新建项目
              </Button>
            );
          },
          columns: [
            { title: "名称", dataIndex: "name", width: 200 },
            { title: "Slug", dataIndex: "slug", width: 160 },
            { title: "描述", dataIndex: "description" },
            { title: "技能数", dataIndex: "skillCount", width: 90 },
            {
              title: "操作",
              width: 100,
              render: (_: unknown, row: ProjectRow) => (
                <Space>
                  <a onClick={() => router.push(`/projects/${row.id}`)}>详情</a>
                </Space>
              ),
            },
          ],
        }}
        request={request}
      />

      <Modal
        title="新建项目"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onCreate}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input placeholder="项目名称" />
          </Form.Item>
          <Form.Item name="slug" label="Slug" extra="留空则根据名称自动生成">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
