"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Spin, Typography, message } from "antd";
import {
  ImportOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LeftOutlined,
  RightOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { SkillIcon } from "@/components/icons";
import { SkillSetOptionsProvider } from "@/components/skill-set-options";
import { authFetch } from "@/lib/auth-client";
import { MarkdownRenderer } from "@/components/skill/MarkdownRenderer";
import {
  buildSkillFileTree,
  type SkillFileMeta,
  type SkillTreeNode,
} from "@/components/skill/files-to-tree";
import { ImportSkillFloat } from "../_list/import-float";
import type { SquareSkill } from "../_list/types";
import "@/styles/skill-ui.css";
import "@/styles/pack-ui.css";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

type PreviewState = {
  path: string;
  content: string | null;
  binary?: boolean;
  tooLarge?: boolean;
  contentType?: string | null;
  fileSize?: string;
};

type TabKey = "overview" | "files";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "概述" },
  { key: "files", label: "文件" },
];

function formatFileSize(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatCount(value: number) {
  if (value >= 10000) {
    const wan = value / 10000;
    const text = wan >= 100 ? String(Math.round(wan)) : wan.toFixed(1).replace(/\.0$/, "");
    return `${text}万`;
  }
  return String(value);
}

function versionLabel(version: string) {
  return /^v\d/i.test(version) ? version : `v${version}`;
}

function SquareDetail() {
  const params = useParams();
  const slug = decodeURIComponent(params.slug as string);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState<SquareSkill | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [files, setFiles] = useState<SkillFileMeta[]>([]);
  const [filesReady, setFilesReady] = useState(false);
  const [openedFile, setOpenedFile] = useState<string | null>(null);
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileTree = useMemo(() => buildSkillFileTree(files), [files]);

  const overviewDocPath = useMemo(() => {
    const byName = (name: string) =>
      files.find((file) => file.filePath === name)?.filePath ||
      files.find((file) => file.filePath.toLowerCase() === name.toLowerCase())?.filePath;
    return byName("README.md") || byName("SKILL.md") || "";
  }, [files]);

  const previewPath = tab === "overview" ? overviewDocPath : openedFile || "";

  const loadSkill = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/openapi/skill-square/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "加载失败");
      setSkill(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadSkill();
  }, [loadSkill]);

  const loadFiles = useCallback(async () => {
    setFilesReady(false);
    setOpenedFile(null);
    try {
      const res = await authFetch(
        `/api/openapi/skill-square/${encodeURIComponent(slug)}/files`,
      );
      const data = await res.json();
      if (!res.ok) {
        message.error(data.message || "加载文件失败");
        return;
      }
      setFiles((data.files || []) as SkillFileMeta[]);
      if (!data.files?.length) setPreview(null);
    } finally {
      setFilesReady(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!skill) return;
    void loadFiles();
  }, [skill, loadFiles]);

  useEffect(() => {
    if (!previewPath || !skill) return;
    let cancelled = false;
    setPreviewLoading(true);
    authFetch(
      `/api/openapi/skill-square/${encodeURIComponent(slug)}/files/content?path=${encodeURIComponent(previewPath)}`,
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
      .catch((error) => {
        if (!cancelled) {
          message.error(error instanceof Error ? error.message : "预览失败");
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, skill, previewPath]);

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

  const isMd = previewPath.toLowerCase().endsWith(".md");
  const previewReady = preview?.path === previewPath;
  const updatedLabel = skill.updatedAt ? `${dayjs(skill.updatedAt).fromNow()}更新` : "";

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
          二进制文件（{preview.fileSize} bytes），请导入后查看
        </div>
      );
    }
    if (preview.tooLarge) {
      return (
        <div className="skill-preview-empty">
          文件过大无法在线预览（{preview.fileSize} bytes），请导入后查看
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
      <button type="button" className="skill-crumb" onClick={() => router.push("/skill-square")}>
        <RollbackOutlined />
        <span>技能广场 / {skill.slug}</span>
      </button>

      <div className="skill-hero">
        <div className="skill-hero-title-row">
          <div className="pack-identity">
            <SkillIcon icon={skill.icon} />
            <h1 className="skill-hero-title">{skill.displayName}</h1>
          </div>
          <div className="skill-hero-actions">
            <Button type="primary" icon={<ImportOutlined />} onClick={() => setImporting(true)}>
              导入
            </Button>
          </div>
        </div>
        <div className="skill-hero-slug">{skill.slug}</div>
        <p className="skill-hero-summary">{skill.summary || "暂无描述"}</p>
        <div className="skill-chips">
          {skill.publisher ? <span className="skill-chip">{skill.publisher}</span> : null}
          {updatedLabel ? <span className="skill-chip">{updatedLabel}</span> : null}
          {skill.version ? <span className="skill-chip">{versionLabel(skill.version)}</span> : null}
          <span className="skill-chip">{formatCount(skill.downloads)}次下载</span>
          {skill.tags.map((tag) => (
            <span key={tag} className="skill-chip">
              {tag}
            </span>
          ))}
          {skill.paid ? <span className="skill-chip">付费</span> : null}
          {skill.requiresApiKey ? <span className="skill-chip">需要密钥</span> : null}
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
              <div className="skill-preview-empty">这个技能没有 README.md 或 SKILL.md</div>
            ) : (
              renderPreview()
            )}
          </div>
        ) : null}

        {tab === "files" ? (
          openedFile ? (
            <div className="skill-file-view">
              <div className="skill-file-view-bar">
                <button type="button" className="skill-file-back" onClick={() => setOpenedFile(null)}>
                  <LeftOutlined />
                  返回文件树
                </button>
                <span className="skill-file-view-name">{openedFile.split("/").pop()}</span>
                <span className="skill-file-view-size">
                  {formatFileSize(files.find((item) => item.filePath === openedFile)?.fileSize || "")}
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
                  <div className="skill-preview-empty">这个技能没有文件</div>
                ) : (
                  renderFileNodes(fileTree, 0)
                )}
              </div>
            </div>
          )
        ) : null}
      </div>

      <ImportSkillFloat
        record={skill}
        visible={importing}
        onClose={() => setImporting(false)}
      />
    </div>
  );
}

export default function SkillSquareDetailPage() {
  return (
    <SkillSetOptionsProvider>
      <SquareDetail />
    </SkillSetOptionsProvider>
  );
}
