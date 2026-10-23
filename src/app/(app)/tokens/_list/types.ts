export type TokenRow = {
  id: string;
  name: string;
  displayToken: string;
  project: { id: string; name: string; slug: string };
  lastUsedAt: string | null;
  createdAt: string;
};

export type TokenFilter = { name?: string; projectId?: string };
