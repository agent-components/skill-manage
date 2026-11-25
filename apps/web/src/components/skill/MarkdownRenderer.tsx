"use client";

import matter from "gray-matter";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@/styles/skill-ui.css";
function stripFrontmatter(content: string): { matter: string; body: string } {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { matter: "", body: content };
  }
  const firstNl = trimmed.indexOf("\n");
  if (firstNl < 0) return { matter: "", body: content };
  const second = trimmed.indexOf("\n---", firstNl + 1);
  if (second < 0) return { matter: "", body: content };
  const matterBlock = trimmed.slice(firstNl + 1, second);
  const body = trimmed.slice(second + "\n---".length).replace(/^\r?\n/, "");
  return { matter: matterBlock, body };
}

function formatFmValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isComplex(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function Frontmatter({ data, raw }: { data: Record<string, unknown>; raw: string }) {
  const entries = Object.entries(data).filter(([, value]) => value != null && value !== "");
  if (!entries.length && !raw.trim()) return null;

  return (
    <details className="skill-fm">
      <summary>
        <span>Frontmatter</span>
        {entries.length ? <em>{entries.length}</em> : null}
      </summary>
      {entries.length ? (
        <dl className="skill-fm-list">
          {entries.map(([key, value]) => (
            <div key={key} className={isComplex(value) ? "is-complex" : undefined}>
              <dt>{key}</dt>
              <dd>{isComplex(value) ? <pre>{formatFmValue(value)}</pre> : formatFmValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <pre className="skill-fm-raw">{raw}</pre>
      )}
    </details>
  );
}

const mdComponents: Components = {
  a: ({ href, children, node: _node, ...props }) => {
    const external = !!href && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        {...props}
        {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      >
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="skill-md-table-wrap">
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => <pre className="skill-md-pre">{children}</pre>,
  code: ({ className, children, node: _node, ...props }) => {
    const lang = /language-([\w+-]+)/.exec(className || "")?.[1];
    if (className) {
      return (
        <code className={className} data-lang={lang} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="skill-md-inline" {...props}>
        {children}
      </code>
    );
  },
  img: ({ src, alt }) => (
    // SKILL.md 里的图是任意地址，不走 next/image
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src || ""} alt={alt || ""} />
  ),
};

/** Markdown preview; frontmatter via gray-matter (falls back if YAML is invalid). */
export function MarkdownRenderer({ content }: { content: string }) {
  let matterText = "";
  let body = content;
  let hasFm = false;
  let data: Record<string, unknown> = {};

  try {
    const parsed = matter(content);
    matterText = parsed.matter.trim();
    body = parsed.content;
    data = (parsed.data || {}) as Record<string, unknown>;
    hasFm = Object.keys(data).length > 0 || Boolean(matterText);
  } catch {
    const fallback = stripFrontmatter(content);
    matterText = fallback.matter.trim();
    body = fallback.body;
    hasFm = Boolean(matterText);
  }

  return (
    <article className="skill-doc">
      {hasFm ? <Frontmatter data={data} raw={matterText} /> : null}
      <div className="skill-md-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {body}
        </ReactMarkdown>
      </div>
    </article>
  );
}
