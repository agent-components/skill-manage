import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Spin, Typography, message } from "antd";
import {
  DownloadOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LeftOutlined,
  RightOutlined,
  RollbackOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { extractVersionFromFilename } from "@skill-manage/shared";
import { SkillIcon } from "@/components/ui/icons";
import { MarkdownRenderer } from "@/components/skill/MarkdownRenderer";
import { ZipUpload } from "@/components/skill/ZipUpload";
import {
  buildSkillFileTree,
  type SkillFileMeta,
  type SkillTreeNode,
} from "@/components/skill/files-to-tree";
import { downloadBase64, fileToBase64 } from "@/utils/file";
import { useTRPC, useTRPCClient } from "@/services/trpc";
import { errorMessage } from "@/utils/error";
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

function versionLabel(version: string) {
  return /^v\d/i.test(version) ? version : `v${version}`;
}

export function SkillDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const client = useTRPCClient();

  const [tab, setTab] = useState<TabKey>("overview");
  const [openedFile, setOpenedFile] = useState<string | null>(null);
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form] = Form.useForm();

  const skillQuery = useQuery(trpc.skill.detail.queryOptions({ id }, { enabled: Boolean(id) }));
  const skill = skillQuery.data;

  const filesQuery = useQuery(
    trpc.skill.versionFiles.queryOptions(
      { id },
      { enabled: Boolean(id) && Boolean(skill?.latestVersion) }
    )
  );

  const files: SkillFileMeta[] = useMemo(
    () =>
      ((filesQuery.data?.files ?? []) as SkillFileMeta[]).filter(
        (f) => f.filePath !== "_meta.json" && !f.filePath.endsWith("/_meta.json")
      ),
    [filesQuery.data]
  );
  const filesReady = filesQuery.isSuccess || filesQuery.isError;

  const fileTree = useMemo(() => buildSkillFileTree(files), [files]);

  /** 概述：优先 README.md，否则 SKILL.md */
  const overviewDocPath = useMemo(() => {
    const byName = (name: string) =>
      files.find((f) => f.filePath === name)?.filePath ||
      files.find((f) => f.filePath.toLowerCase() === name.toLowerCase())?.filePath;
    return byName("README.md") || byName("SKILL.md") || "";
  }, [files]);

  const previewPath =
    tab === "overview" ? overviewDocPath : tab === "files" ? openedFile || "" : "";

  const previewQuery = useQuery(
    trpc.skill.versionFileContent.queryOptions(
      { id, path: previewPath },
      { enabled: Boolean(id && previewPath && skill?.latestVersion) }
    )
  );

  const preview: PreviewState | null = previewQuery.data
    ? {
        path: previewQuery.data.path,
        content: previewQuery.data.content,
        binary: previewQuery.data.binary,
        tooLarge: previewQuery.data.tooLarge,
        contentType: previewQuery.data.contentType,
        fileSize: previewQuery.data.fileSize,
      }
    : null;

  const onDownload = async (targetVersion?: string) => {
    if (!skill?.latestVersion) return;
    const ver = targetVersion || skill.latestVersion;
    try {
      const file = await client.skill.downloadVersion.query({
        id,
        version: ver,
      });
      downloadBase64(file.filename, file.zipBase64);
    } catch (e) {
      message.error(errorMessage(e, "下载失败"));
    }
  };

  const onUploadVersion = async () => {
    if (!file) {
      message.warning("请先选择 ZIP 文件");
      return;
    }
    const values = await form.validateFields().catch(() => ({}) as { version?: string });
    setUploading(true);
    try {
      const zipBase64 = await fileToBase64(file);
      await client.skill.uploadBase64.mutate({
        filename: file.name,
        zipBase64,
        skillId: id,
        fallbackVersion: values?.version,
      });
      message.success(`已上传版本 ${values?.version ?? ""}`);
      setUploadOpen(false);
      setFile(null);
      form.resetFields();
      void skillQuery.refetch();
      void filesQuery.refetch();
    } catch (e) {
      message.error(errorMessage(e, "上传失败"));
    } finally {
      setUploading(false);
    }
  };

  if (skillQuery.isLoading) {
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
    previewPath.toLowerCase().endsWith(".md") || previewPath.toLowerCase() === "skill.md";
  const previewReady = preview?.path === previewPath;
  const updatedLabel = skill.updatedAt ? `${dayjs(skill.updatedAt).fromNow()}更新` : "";

  const renderPreview = () => {
    if (!filesReady || previewQuery.isFetching || !previewReady) {
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
      <button type="button" className="skill-crumb" onClick={() => navigate("/skills")}>
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
            <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
              上传新版本
            </Button>
          </div>
        </div>
        <div className="skill-hero-slug">{skill.slug}</div>
        <p className="skill-hero-summary">{skill.summary || "暂无描述"}</p>
        <div className="skill-chips">
          {updatedLabel ? <span className="skill-chip">{updatedLabel}</span> : null}
          {skill.latestVersion ? (
            <span className="skill-chip">{versionLabel(skill.latestVersion)}</span>
          ) : null}
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
              <div className="skill-preview-empty">这个版本没有 README.md 或 SKILL.md</div>
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
                <span className="skill-file-view-name">{openedFile.split("/").pop()}</span>
                <span className="skill-file-view-size">
                  {formatFileSize(
                    files.find((item) => item.filePath === openedFile)?.fileSize || ""
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
