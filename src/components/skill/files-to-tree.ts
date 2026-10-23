import type { DataNode } from "antd/es/tree";

export type SkillFileMeta = {
  id: string;
  filePath: string;
  fileSize: string;
  contentType: string | null;
};

export type SkillTreeNode =
  | {
      kind: "dir";
      name: string;
      path: string;
      children: SkillTreeNode[];
    }
  | {
      kind: "file";
      name: string;
      path: string;
      fileSize: string;
    };

/** Flat skill files → nested folders and files. Directories come first. */
export function buildSkillFileTree(files: SkillFileMeta[]): SkillTreeNode[] {
  type Dir = { children: Map<string, Dir>; files: SkillTreeNode[] };
  const root: Dir = { children: new Map(), files: [] };

  const sorted = [...files].sort((a, b) => a.filePath.localeCompare(b.filePath));
  for (const file of sorted) {
    const parts = file.filePath.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      let next = cur.children.get(name);
      if (!next) {
        next = { children: new Map(), files: [] };
        cur.children.set(name, next);
      }
      cur = next;
    }
    cur.files.push({
      kind: "file",
      name: parts[parts.length - 1],
      path: file.filePath,
      fileSize: file.fileSize,
    });
  }

  function toNodes(dir: Dir, prefix: string): SkillTreeNode[] {
    const dirs: SkillTreeNode[] = [...dir.children.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, child]) => {
        const path = prefix ? `${prefix}/${name}` : name;
        return {
          kind: "dir" as const,
          name,
          path,
          children: toNodes(child, path),
        };
      });
    const leaves = [...dir.files].sort((a, b) => a.name.localeCompare(b.name));
    return [...dirs, ...leaves];
  }

  return toNodes(root, "");
}

/** Flat skill files → antd Tree `treeData`. */
export function filesToTreeData(files: SkillFileMeta[]): DataNode[] {
  type Dir = { children: Map<string, Dir>; files: DataNode[] };
  const root: Dir = { children: new Map(), files: [] };

  const sorted = [...files].sort((a, b) =>
    a.filePath.localeCompare(b.filePath),
  );

  for (const file of sorted) {
    const parts = file.filePath.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      let next = cur.children.get(name);
      if (!next) {
        next = { children: new Map(), files: [] };
        cur.children.set(name, next);
      }
      cur = next;
    }
    const name = parts[parts.length - 1];
    cur.files.push({
      key: file.filePath,
      title: name,
      isLeaf: true,
    });
  }

  function toNodes(dir: Dir, prefix: string): DataNode[] {
    const dirs: DataNode[] = [...dir.children.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, child]) => {
        const path = prefix ? `${prefix}/${name}` : name;
        return {
          key: `dir:${path}`,
          title: name,
          children: toNodes(child, path),
        };
      });
    const files = [...dir.files].sort((a, b) =>
      String(a.title).localeCompare(String(b.title)),
    );
    return [...dirs, ...files];
  }

  return toNodes(root, "");
}
