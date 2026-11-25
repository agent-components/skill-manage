import slugifyLib from "slugify";

/** 技能集与技能的 slug，基于 slugify。 */
export function slugify(input: string, maxLen = 64): string {
  const s = slugifyLib(input.trim(), {
    lower: true,
    strict: true,
    trim: true,
  }).slice(0, maxLen);
  return s || `item-${Date.now()}`;
}
