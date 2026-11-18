"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Form,
  Input,
  Modal,
  Spin,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LeftOutlined,
  RightOutlined,
  RollbackOutlined,
  UpOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { SkillIcon } from "@/components/icons";
import { authFetch } from "@/lib/auth-client";
import { ZipUpload } from "@/components/skill/ZipUpload";
import { MarkdownRenderer } from "@/components/skill/MarkdownRenderer";
import {
  buildSkillFileTree,
  type SkillFileMeta,
  type SkillTreeNode,
} from "@/components/skill/files-to-tree";
import { extractVersionFromFilename } from "@/lib/skill-version";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

type SkillDetail = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
  icon?: string | null;
  latestVersion: string | null;
  updatedAt?: string;
  metadata: Record<string, unknown> | null;
  versions: {
    id: string;
    version: string;
    fileCount: number;
    totalSize: string;
    changelog: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }[];
};

type PreviewState = {
  path: string;
  content: string | null;
  binary?: boolean;
  tooLarge?: boolean;
  contentType?: string | null;
  fileSize?: string;
};

type TabKey = "overview" | "files" | "history";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "概述" },
  { key: "files", label: "文件" },
  { key: "history", label: "版本历史" },
];

function formatFileSize(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function versionLabel(version: string) {
  return /^v\d/i.test(version) ? version : `v${version}`;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(", ");
  return "";
}

function versionNote(item: {
  version: string;
  changelog: string | null;
  metadata: Record<string, unknown> | null;
}): string {
  const changelog = item.changelog?.trim();
  if (changelog) return changelog;
  const meta = item.metadata;
  if (!meta) return "";
  const fromMeta = asText(meta.changelog);
  if (fromMeta) return fromMeta;

  const license = asText(meta.license);
  const category =
    asText(meta.category) || asText(meta.categories) || asText(meta.tags);
  const bits: string[] = [];
  if (license) {
    bits.push(license.toLowerCase().includes("license") ? license : `${license} license`);
  }
  if (category) bits.push(`分类: ${category}`);
  if (!bits.length) return "";
  return `${versionLabel(item.version)} - ${bits.join(", ")}`;
}

export default function SkillDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [version, setVersion] = useState<string>("");
  const [tab, setTab] = useState<TabKey>("overview");
  const [files, setFiles] = useState<SkillFileMeta[]>([]);
  const [filesReady, setFilesReady] = useState(false);
  const [openedFile, setOpenedFile] = useState<string | null>(null);
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form] = Form.useForm();
  const [collapsedNotes, setCollapsedNotes] = useState<Record<string, boolean>>({});

  const fileTree = useMemo(() => buildSkillFileTree(files), [files]);

  /** 概述：优先 README.md，否则 SKILL.md */
  const overviewDocPath = useMemo(() => {
    const byName = (name: string) =>
      files.find((f) => f.filePath === name)?.filePath ||
      files.find((f) => f.filePath.toLowerCase() === name.toLowerCase())
        ?.filePath;
    return byName("README.md") || byName("SKILL.md") || "";
  }, [files]);

  const previewPath =
    tab === "overview"
      ? overviewDocPath
      : tab === "files"
        ? openedFile || ""
        : "";

  const loadSkill = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/skills/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "加载失败");
      setSkill(data);
      const ver = data.latestVersion || data.versions?.[0]?.version || "";
      setVersion(ver);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSkill();
  }, [loadSkill]);

  const loadFiles = useCallback(
    async (ver: string) => {
      if (!ver) return;
      setFilesReady(false);
      setOpenedFile(null);
      try {
        const res = await authFetch(`/api/skills/${id}/versions/${ver}/files`);
        const data = await res.json();
        if (!res.ok) {
          message.error(data.message || "加载文件失败");
          return;
        }
        const list = ((data.files || []) as SkillFileMeta[]).filter(
          (f) =>
            f.filePath !== "_meta.json" &&
            !f.filePath.endsWith("/_meta.json"),
        );
        setFiles(list);
        if (list.length === 0) setPreview(null);
      } finally {
        setFilesReady(true);
      }
    },
    [id],
  );

  useEffect(() => {
    if (version) void loadFiles(version);
  }, [version, loadFiles]);

  useEffect(() => {
    if (!previewPath || !version) return;
    let cancelled = false;
    setPreviewLoading(true);
    authFetch(
      `/api/skills/${id}/versions/${version}/files/content?path=${encodeURIComponent(previewPath)}`,
    )
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.message || "预览失败");
        setPreview({
          path: data.path,
          content: data.content,
          binary: data.binary,
          tooLarge: data.tooLarge,
          contentType: data.contentType,
          fileSize: data.fileSize,
        });
      })
      .catch((e) => {
        if (!cancelled) {
          message.error(e instanceof Error ? e.message : "预览失败");
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, version, previewPath]);

  const onDownload = async (targetVersion?: string) => {
    const ver = targetVersion || version;
    if (!ver || !skill) return;
    try {
      const res = await authFetch(
        `/api/skills/${id}/versions/${ver}/download`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "下载失败");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${skill.slug}-${ver}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "下载失败");
    }
  };

  const onUploadVersion = async () => {
    if (!file) {
      message.warning("请先选择 ZIP 文件");
      return;
    }
    const values = await form.validateFields().catch(() => ({} as { version?: string }));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("skillId", id);
      if (values?.version) fd.append("version", values.version);
      const res = await authFetch("/api/skills/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "上传失败");
      message.success(`已上传版本 ${data.version}`);
      setUploadOpen(false);
      setFile(null);
      form.resetFields();
      await loadSkill();
      setVersion(data.version);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!skill) {
    return <Typography.Text type="danger">技能不存在</Typography.Text>;
  }

  const isMd =
    previewPath.toLowerCase().endsWith(".md") ||
    previewPath.toLowerCase() === "skill.md";
  const previewReady = preview?.path === previewPath;
  const updatedLabel = skill.updatedAt
    ? `${dayjs(skill.updatedAt).fromNow()}更新`
    : "";

  const renderPreview = () => {
    if (!filesReady || previewLoading || !previewReady) {
      return (
        <div className="skill-preview-empty">
          <Spin />
        </div>
      );
    }
    if (!preview) {
      return <div className="skill-preview-empty">无预览内容</div>;
    }
    if (preview.binary) {
      return (
        <div className="skill-preview-empty">
          二进制文件（{preview.fileSize} bytes），请下载 ZIP 查看
        </div>
      );
    }
    if (preview.tooLarge) {
      return (
        <div className="skill-preview-empty">
          文件过大无法在线预览（{preview.fileSize} bytes），请下载 ZIP
        </div>
      );
    }
    if (isMd) {
      return <MarkdownRenderer content={preview.content || ""} />;
    }
    return <pre className="skill-preview-code">{preview.content}</pre>;
  };

  const renderFileNodes = (nodes: SkillTreeNode[], depth: number) =>
    nodes.map((node) => {
      if (node.kind === "dir") {
        const open = !collapsedDirs[node.path];
        return (
          <div key={node.path}>
            <button
              type="button"
              className={`skill-file-row is-dir${open ? " is-open" : ""}`}
              style={{ paddingLeft: 12 + depth * 22 }}
              onClick={() =>
                setCollapsedDirs((prev) => ({
                  ...prev,
                  [node.path]: open,
                }))
              }
            >
              <span className="skill-file-chevron">
                {open ? <DownOutlined /> : <RightOutlined />}
              </span>
              {open ? (
                <FolderOpenOutlined className="skill-file-icon-folder" />
              ) : (
                <FolderOutlined className="skill-file-icon-folder" />
              )}
              <span className="skill-file-name">{node.name}</span>
            </button>
            {open ? renderFileNodes(node.children, depth + 1) : null}
          </div>
        );
      }
      return (
        <button
          key={node.path}
          type="button"
          className="skill-file-row is-file"
          style={{ paddingLeft: 36 + depth * 22 }}
          onClick={() => setOpenedFile(node.path)}
        >
          <FileTextOutlined className="skill-file-icon-file" />
          <span className="skill-file-name">{node.name}</span>
          <span className="skill-file-size">{formatFileSize(node.fileSize)}</span>
        </button>
      );
    });

  return (
    <div className="skill-page">
      <button
        type="button"
        className="skill-crumb"
        onClick={() => router.push("/skills")}
      >
        <RollbackOutlined />
        <span>技能 / {skill.slug}</span>
      </button>

      <div className="skill-hero">
        <div className="skill-hero-title-row">
          <div className="pack-identity">
            <SkillIcon icon={skill.icon} />
            <h1 className="skill-hero-title">{skill.displayName}</h1>
          </div>
          <div className="skill-hero-actions">
            <Button icon={<DownloadOutlined />} onClick={() => void onDownload()}>
              下载 ZIP
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadOpen(true)}
            >
              上传新版本
            </Button>
          </div>
        </div>
        <div className="skill-hero-slug">{skill.slug}</div>
        <p className="skill-hero-summary">{skill.summary || "暂无描述"}</p>
        <div className="skill-chips">
          {updatedLabel ? <span className="skill-chip">{updatedLabel}</span> : null}
          {version ? <span className="skill-chip">{versionLabel(version)}</span> : null}
        </div>
      </div>

      <div className="skill-tabbar" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? "is-active" : undefined}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="skill-tab-panel">
        {tab === "overview" ? (
          <div className="skill-overview">
            {filesReady && !overviewDocPath ? (
              <div className="skill-preview-empty">
                这个版本没有 README.md 或 SKILL.md
              </div>
            ) : (
              renderPreview()
            )}
          </div>
        ) : null}

        {tab === "files" ? (
          openedFile ? (
            <div className="skill-file-view">
              <div className="skill-file-view-bar">
                <button
                  type="button"
                  className="skill-file-back"
                  onClick={() => setOpenedFile(null)}
                >
                  <LeftOutlined />
                  返回文件树
                </button>
                <span className="skill-file-view-name">
                  {openedFile.split("/").pop()}
                </span>
                <span className="skill-file-view-size">
                  {formatFileSize(
                    files.find((item) => item.filePath === openedFile)?.fileSize || "",
                  )}
                </span>
              </div>
              <div className={`skill-file-view-body${isMd ? " is-doc" : ""}`}>
                {renderPreview()}
              </div>
            </div>
          ) : (
            <div className="skill-file-browser">
              <div className="skill-file-browser-head">共 {files.length} 个文件</div>
              <div className="skill-file-browser-list">
                {!filesReady ? (
                  <div className="skill-preview-empty">
                    <Spin />
                  </div>
                ) : fileTree.length === 0 ? (
                  <div className="skill-preview-empty">这个版本没有文件</div>
                ) : (
                  renderFileNodes(fileTree, 0)
                )}
              </div>
            </div>
          )
        ) : null}

        {tab === "history" ? (
          <div>
            <ol className="skill-timeline">
              {skill.versions.map((item) => {
                const note = versionNote(item);
                const expanded = !collapsedNotes[item.id];
                const isLatest = item.version === skill.latestVersion;
                return (
                  <li
                    key={item.id}
                    className={`skill-timeline-item${isLatest ? " is-latest" : ""}`}
                  >
                    <div className="skill-timeline-rail">
                      <span className="skill-timeline-dot" />
                    </div>
                    <div className="skill-timeline-main">
                      <div className="skill-timeline-head">
                        <div className="skill-timeline-title">
                          <span>{versionLabel(item.version)}</span>
                          {isLatest ? <span className="skill-latest-badge">最新</span> : null}
                        </div>
                        <div className="skill-timeline-side">
                          <time dateTime={item.createdAt}>
                            {dayjs(item.createdAt).format("YYYY/MM/DD")}
                          </time>
                          {note ? (
                            <button
                              type="button"
                              aria-label={expanded ? "收起说明" : "展开说明"}
                              onClick={() =>
                                setCollapsedNotes((prev) => ({
                                  ...prev,
                                  [item.id]: expanded,
                                }))
                              }
                            >
                              {expanded ? <UpOutlined /> : <DownOutlined />}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            aria-label={`下载 ${versionLabel(item.version)}`}
                            onClick={() => void onDownload(item.version)}
                          >
                            <DownloadOutlined />
                          </button>
                        </div>
                      </div>
                      {note && expanded ? <p className="skill-timeline-note">{note}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </div>

      <Modal
        title="上传新版本"
        open={uploadOpen}
        onCancel={() => {
          if (!uploading) {
            setUploadOpen(false);
            setFile(null);
          }
        }}
        onOk={onUploadVersion}
        confirmLoading={uploading}
        okText="上传"
        destroyOnHidden
      >
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
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="version"
            label="版本"
            extra="可从文件名识别（如 agent-browser-0.1.0.zip）；不可与已有版本重复"
          >
            <Input placeholder="如 0.1.0" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
