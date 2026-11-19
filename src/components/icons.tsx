"use client";

import { useEffect, useRef, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { formatIconSize } from "@/lib/icon";

const MAX_ICON_BYTES = 200 * 1024;

export function SkillSetMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.35 14.25 4.7v6.6L8 14.65 1.75 11.3V4.7L8 1.35Zm0 1.55L3.35 5.35 8 7.85l4.65-2.5L8 2.9ZM3.15 6.55v4.15L7.25 13V8.85L3.15 6.55Zm9.7 0L8.75 8.85V13l4.1-2.3V6.55Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  );
}

export function SkillSquareMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.25 2.25h4.7v4.7h-4.7v-4.7Zm6.8 0h4.7v4.7h-4.7v-4.7Zm-6.8 6.8h4.7v4.7h-4.7v-4.7Zm6.8 0h4.7v4.7h-4.7v-4.7Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  );
}

export function SkillMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8.045 1.337a2.16 2.16 0 0 0-1.863 1.975v.366H4.352a1.69 1.69 0 0 0-1.68 1.686v2.226c0 .283.23.513.513.513h.876a1.07 1.07 0 0 1 0 2.14h-.877a.768.768 0 0 0-.768.768v2.227a1.685 1.685 0 0 0 1.685 1.685h2.227a.513.513 0 0 0 .513-.513v-.879a1.07 1.07 0 0 1 2.14 0v.878c0 .284.23.514.513.514h2.227a1.685 1.685 0 0 0 1.685-1.686V11.15h.366a2.16 2.16 0 0 0 1.978-1.863l-.003-.116a2.16 2.16 0 0 0-1.978-1.977h-.366V5.363a1.685 1.685 0 0 0-1.685-1.685H10.14v-.366A2.16 2.16 0 0 0 8.045 1.337Zm.116 1.022c.526 0 .953.427.953.953v.879c0 .284.23.513.514.513h2.344c.364 0 .659.294.659.659v2.344c0 .283.23.513.513.513h.879c.526 0 .953.427.953.952s-.427.953-.953.953h-.879a.513.513 0 0 0-.513.513v2.344a.66.66 0 0 1-.659.66h-1.714v-.367a2.14 2.14 0 0 0-4.191 0v.366H4.352a.66.66 0 0 1-.659-.66V11.27h.365a2.14 2.14 0 0 0 0-4.192h-.365V5.363c0-.365.294-.659.659-.659h2.345a.513.513 0 0 0 .513-.513v-.879c0-.526.426-.953.952-.953Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  );
}

export function SkillIcon({
  icon,
  className = "pack-module-icon",
}: {
  icon?: string | null;
  className?: string;
}) {
  return (
    <span className={className} aria-hidden>
      {icon ? <img src={icon} alt="" /> : <SkillMark />}
    </span>
  );
}

export function SkillSetAvatar({
  name,
  icon,
  className = "pack-avatar",
}: {
  name: string;
  icon?: string | null;
  className?: string;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "集";
  return (
    <span className={className}>
      {icon ? <img src={icon} alt="" /> : initial}
    </span>
  );
}

export function SkillSetIconInput({
  value,
  onChange,
  fallback = "plus",
}: {
  value?: string | null;
  onChange?: (value: string | null) => void;
  fallback?: "plus" | "skill";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const onFile = (file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError("请使用 PNG、JPEG、WebP 或 GIF");
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      setError(`收到的图片为 ${formatIconSize(file.size)}，不能超过 200KB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setError("");
      onChange?.(result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const root = rootRef.current;
      if (!root || root.getClientRects().length === 0) return;
      const item = [...(event.clipboardData?.items ?? [])].find((entry) =>
        entry.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      onFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <div
      ref={rootRef}
      className="pack-icon-field"
      tabIndex={0}
      onPaste={(event) => {
        const item = [...event.clipboardData.items].find((entry) =>
          entry.type.startsWith("image/"),
        );
        const file = item?.getAsFile();
        if (!file) return;
        event.preventDefault();
        onFile(file);
      }}
    >
      <button
        type="button"
        className="pack-icon-hit"
        onClick={() => fileRef.current?.click()}
      >
        {value ? <img src={value} alt="" /> : fallback === "skill" ? <SkillMark /> : <PlusOutlined />}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-hidden
        tabIndex={-1}
        style={{ display: "none" }}
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {value ? (
        <button type="button" className="pack-icon-clear" onClick={() => onChange?.(null)}>
          移除图标
        </button>
      ) : null}
      {error ? <div className="pack-icon-error">{error}</div> : null}
    </div>
  );
}
