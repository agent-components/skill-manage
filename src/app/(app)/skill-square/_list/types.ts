export type SquareSkill = {
  slug: string;
  displayName: string;
  summary: string | null;
  version: string | null;
  icon: string | null;
  category: string | null;
  tags: string[];
  downloads: number;
  stars: number;
  updatedAt: string | null;
  publisher: string | null;
  requiresApiKey: boolean;
  paid: boolean;
};

export type SquareCategory = {
  key: string;
  name: string;
};
