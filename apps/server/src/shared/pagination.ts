import type { PageInput } from "@skill-manage/shared";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** 归一化分页参数，越界值一律夹回合法区间。 */
export function parsePage(input: PageInput) {
  const currentRaw = Number(input.current ?? 1);
  const pageSizeRaw = Number(input.pageSize ?? DEFAULT_PAGE_SIZE);
  const current = Number.isFinite(currentRaw) ? Math.max(1, Math.floor(currentRaw)) : 1;
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSizeRaw)))
    : DEFAULT_PAGE_SIZE;
  return { current, pageSize };
}

/** Prisma 分页偏移量 */
export function pageOffset(current: number, pageSize: number) {
  return (current - 1) * pageSize;
}
