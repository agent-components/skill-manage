export type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  skillCount: number;
  updatedAt: string;
};

export type ProjectFilter = { name?: string };
