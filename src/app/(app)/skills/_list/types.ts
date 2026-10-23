export type SkillRow = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
  tags: string[];
  latestVersion: string | null;
  versionCount: number;
  projects: { id: string; name: string; slug: string }[];
};

export type SkillFilter = { name?: string; projectId?: string };
