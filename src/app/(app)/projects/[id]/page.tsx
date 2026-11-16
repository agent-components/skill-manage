"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, LinkOutlined } from "@ant-design/icons";
import { authFetch } from "@/lib/auth-client";

type ProjectDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  skills: {
    id: string;
    slug: string;
    displayName: string;
    summary: string | null;
    latestVersion: string | null;
    versionCount: number;
  }[];
};

type SkillOption = { id: string; displayName: string; slug: string };

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allSkills, setAllSkills] = useState<SkillOption[]>([]);
  const [form] = Form.useForm();
  const [linkForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/projects/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "加载失败");
      setProject(data);
      form.setFieldsValue({
        name: data.name,
        slug: data.slug,
        description: data.description,
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    void load();
  }, [load]);

  const openLink = async () => {
    const res = await authFetch("/api/skills?pageSize=100");
    const data = await res.json();
    if (res.ok) {
      setAllSkills(
        (data.list || []).map(
          (s: { id: string; displayName: string; slug: string }) => ({
            id: s.id,
            displayName: s.displayName,
            slug: s.slug,
          }),
        ),
      );
    }
    setLinkOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await authFetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "保存失败");
      message.success("已保存");
      setEditOpen(false);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const onLink = async () => {
    const values = await linkForm.validateFields();
    setSaving(true);
    try {
      const res = await authFetch(`/api/projects/${id}/skills`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add: values.skillIds || [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "关联失败");
      message.success("已关联技能");
      setLinkOpen(false);
      linkForm.resetFields();
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "关联失败");
    } finally {
      setSaving(false);
    }
  };

  const onUnlink = (skillId: string) => {
    Modal.confirm({
      title: "从项目中移除该技能？",
      content: "不会删除技能本身，仅解除关联。",
      onOk: async () => {
        const res = await authFetch(`/api/projects/${id}/skills`, {
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

  const onDelete = () => {
    Modal.confirm({
      title: "删除项目？",
      content: "将解除技能关联并撤销该项目下的令牌。技能本身会保留。",
      okType: "danger",
      onOk: async () => {
        const res = await authFetch(`/api/projects/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          message.error(data.message || "删除失败");
          return;
        }
        message.success("已删除");
        router.push("/projects");
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

  if (!project) {
    return <Typography.Text type="danger">项目不存在</Typography.Text>;
  }

  const linkedIds = new Set(project.skills.map((s) => s.id));

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/projects")}
        >
          返回
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {project.name}
        </Typography.Title>
        <Typography.Text type="secondary">{project.slug}</Typography.Text>
      </Space>

      <Card
        size="small"
        title="基本信息"
        extra={
          <Space>
            <Button onClick={() => setEditOpen(true)}>编辑</Button>
            <Button danger onClick={onDelete}>
              删除
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Typography.Paragraph>
          {project.description || "无描述"}
        </Typography.Paragraph>
      </Card>

      <Card
        size="small"
        title="已挂载技能"
        extra={
          <Button type="primary" icon={<LinkOutlined />} onClick={openLink}>
            关联技能
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={project.skills}
          pagination={false}
          columns={[
            {
              title: "名称",
              dataIndex: "displayName",
              render: (v: string, row) => (
                <a onClick={() => router.push(`/skills/${row.id}`)}>{v}</a>
              ),
            },
            { title: "Slug", dataIndex: "slug", width: 160 },
            {
              title: "最新版本",
              dataIndex: "latestVersion",
              width: 120,
              render: (v: string | null) => v || "-",
            },
            {
              title: "操作",
              width: 160,
              render: (_: unknown, row) => (
                <Space>
                  <a onClick={() => router.push(`/skills/${row.id}`)}>查看</a>
                  <a onClick={() => onUnlink(row.id)}>移除</a>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="编辑项目"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="关联技能"
        open={linkOpen}
        onCancel={() => setLinkOpen(false)}
        onOk={onLink}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={linkForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="skillIds"
            label="技能"
            rules={[{ required: true, message: "请选择技能" }]}
          >
            <Select
              mode="multiple"
              placeholder="选择要关联的技能"
              options={allSkills
                .filter((s) => !linkedIds.has(s.id))
                .map((s) => ({
                  value: s.id,
                  label: `${s.displayName} (${s.slug})`,
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
