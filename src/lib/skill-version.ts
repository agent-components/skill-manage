/** Extract version from zip name, e.g. agent-browser-0.1.0.zip → 0.1.0 */
export function extractVersionFromFilename(filename: string): string | null {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.zip$/i, "").trim();
  if (!base) return null;
  const match = base.match(
    /[-_]v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.]+)?)$/i,
  );
  return match?.[1] ?? null;
}
