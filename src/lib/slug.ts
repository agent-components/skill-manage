import slugifyLib from "slugify";

/** Project / skill slug helper backed by community `slugify`. */
export function slugify(input: string, maxLen = 64): string {
  const s = slugifyLib(input.trim(), {
    lower: true,
    strict: true,
    trim: true,
  }).slice(0, maxLen);
  return s || `item-${Date.now()}`;
}
