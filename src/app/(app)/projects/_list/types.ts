export type SkillSetRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  skillCount: number;
  updatedAt: string;
};

export type SkillSetFilter = { name?: string };
