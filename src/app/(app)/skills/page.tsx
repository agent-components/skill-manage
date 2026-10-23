"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { ListPage, type ListPageRequest } from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";
import { ZipUpload } from "@/components/skill/ZipUpload";
import { extractVersionFromFilename } from "@/lib/skill-version";

type SkillRow = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
  tags: string[];
  latestVersion: string | null;
  versionCount: number;
  projects: { id: string; name: string; slug: string }[];
};

type SkillFilter = { name?: string; projectId?: string };

type ProjectOption = { id: string; name: string };

export default function SkillsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [editing, setEditing] = useState<SkillRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
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

  const request: ListPageRequest<SkillFilter> = async (
    pageParams,
    filterValues,
  ) => {
    const qs = new URLSearchParams();
    if (filterValues?.name) qs.set("name", filterValues.name);
    if (filterValues?.projectId) qs.set("projectId", filterValues.projectId);
    qs.set("page", String(pageParams.current || 1));
    qs.set("pageSize", String(pageParams.pageSize || 20));
    const res = await authFetch(`/api/skills?${qs}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "加载失败");
    }
    const data = await res.json();
    return { list: data.list as SkillRow[], total: data.total as number };
  };

  const onDelete = (row: SkillRow) => {
    Modal.confirm({
      title: "删除技能？",
      content: `将删除「${row.displayName}」的所有版本与对象存储中的文件，不可恢复。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        const res = await authFetch(`/api/skills/${row.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          message.error(data.message || "删除失败");
          throw new Error(data.message || "删除失败");
        }
        message.success("已删除");
        refreshRef.current?.();
      },
    });
  };

  const onSave = async () => {
    if (!editing) return;
    const values = await editForm.validateFields();
    setSaving(true);
    try {
      const res = await authFetch(`/api/skills/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: values.displayName,
          summary: values.summary ?? "",
          tags: values.tags ?? [],
          projectIds: values.projectIds ?? [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "保存失败");
      message.success("已保存");
      setEditing(null);
      refreshRef.current?.();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async () => {
    if (!file) {
      message.warning("请先选择 ZIP 文件");
      return;
    }
    const values = await form.validateFields().catch(() => null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (values?.version) fd.append("version", values.version);
      for (const id of values?.projectIds || []) {
        fd.append("projectIds", id);
      }
      const res = await authFetch("/api/skills/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "上传失败");
      message.success(`已上传 ${data.displayName} @ ${data.version}`);
      setOpen(false);
      setFile(null);
      form.resetFields();
      refreshRef.current?.();
      router.push(`/skills/${data.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <ListPage<SkillRow, SkillFilter>
        title="技能管理"
        filter={{
          items: [
            {
              name: "name",
              label: "名称",
              component: <Input allowClear placeholder="技能名称" />,
            },
            {
              name: "projectId",
              label: "项目",
              component: (
                <Select
                  allowClear
                  placeholder="全部项目"
                  options={projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                />
              ),
            },
          ],
        }}
        table={{
          rowKey: "id",
          title: "技能列表",
          extra: (ctx) => {
            refreshRef.current = ctx.refreshTable;
            return (
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setOpen(true)}
              >
                上传技能包
              </Button>
            );
          },
          columns: [
            {
              title: "名称",
              dataIndex: "displayName",
              width: 200,
              render: (v: string, row: SkillRow) => (
                <a onClick={() => router.push(`/skills/${row.id}`)}>{v}</a>
              ),
            },
            { title: "Slug", dataIndex: "slug", width: 160 },
            { title: "描述", dataIndex: "summary", valueType: 'text' },
            {
              title: "标签",
              dataIndex: "tags",
              width: 200,
              render: (tags: string[] | undefined) =>
                tags?.length
                  ? tags.map((tag) => (
                    <Tag key={tag} style={{ marginBottom: 2 }}>
                      {tag}
                    </Tag>
                  ))
                  : "-",
            },
            {
              title: "最新版本",
              dataIndex: "latestVersion",
              width: 120,
              render: (v: string | null) => v || "-",
            },
            {
              title: "项目",
              dataIndex: "projects",
              width: 200,
              render: (ps: SkillRow["projects"]) =>
                ps?.length
                  ? ps.map((p) => (
                    <Tag key={p.id} style={{ marginBottom: 2 }}>
                      {p.name}
                    </Tag>
                  ))
                  : "-",
            },
            {
              title: "操作",
              width: 180,
              render: (_: unknown, row: SkillRow) => (
                <Space>
                  <a onClick={() => router.push(`/skills/${row.id}`)}>详情</a>
                  <a onClick={() => setEditing(row)}>编辑</a>
                  <a onClick={() => onDelete(row)} style={{ color: "#ff4d4f" }}>
                    删除
                  </a>
                </Space>
              ),
            },
          ],
        }}
        request={request}
      />

      <Modal
        title="上传技能包"
        open={open}
        onCancel={() => {
          if (!uploading) {
            setOpen(false);
            setFile(null);
          }
        }}
        onOk={onUpload}
        confirmLoading={uploading}
        okText="上传"
        width={560}
        destroyOnHidden
      >
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <ZipUpload
            file={file}
            disabled={uploading}
            onFileSelect={(f) => {
              setFile(f);
              if (f) {
                const fromName = extractVersionFromFilename(f.name);
                if (fromName) form.setFieldsValue({ version: fromName });
                message.info(`已选择 ${f.name}`);
              }
            }}
          />
        </div>
        <Form form={form} layout="vertical">
          <Form.Item
            name="version"
            label="版本"
            extra="可从文件名识别（如 agent-browser-0.1.0.zip）；也可在 SKILL.md 或此处填写"
          >
            <Input placeholder="如 0.1.0" />
          </Form.Item>
          <Form.Item name="projectIds" label="归属项目">
            <Select
              mode="multiple"
              allowClear
              placeholder="可选，可多选"
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑技能"
        open={!!editing}
        onCancel={() => {
          if (!saving) setEditing(null);
        }}
        onOk={onSave}
        confirmLoading={saving}
        okText="保存"
        destroyOnHidden
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          key={editing?.id}
          initialValues={{
            displayName: editing?.displayName,
            summary: editing?.summary ?? "",
            tags: editing?.tags ?? [],
            projectIds: editing?.projects.map((p) => p.id) ?? [],
          }}
        >
          <Form.Item
            name="displayName"
            label="名称"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input placeholder="技能名称" />
          </Form.Item>
          <Form.Item name="summary" label="描述">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              allowClear
              placeholder="输入后回车添加"
              tokenSeparators={[",", "，"]}
            />
          </Form.Item>
          <Form.Item name="projectIds" label="归属项目">
            <Select
              mode="multiple"
              allowClear
              placeholder="可选，可多选"
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
