/** 当前页面是否被其它窗口用 iframe 嵌入。跨域读不到 top 时也视为嵌入。 */
export function isEmbeddedFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
