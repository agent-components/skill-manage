import { z } from "zod";
import {
  getSquareSkill,
  importSquareSkill,
  listSquareCategories,
  listSquareFiles,
  listSquareSkills,
  readSquareFile,
} from "../../modules/skill-square/skill-square.service.js";
import { SkillHubError } from "../../shared/errors.js";
import { protectedProcedure, router } from "../trpc.js";

export const skillSquareRouter = router({
  /** 广场技能列表 */
  list: protectedProcedure
    .input(
      z.object({
        current: z.number().optional(),
        pageSize: z.number().optional(),
        name: z.string().optional(),
        category: z.string().optional(),
        sortBy: z.string().optional(),
      }),
    )
    .query(({ ctx, input }) => listSquareSkills(input, ctx.user.id)),

  /** 广场分类 */
  categories: protectedProcedure.query(({ ctx }) =>
    listSquareCategories(ctx.user.id),
  ),

  /** 广场技能详情 */
  detail: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => getSquareSkill(input.slug, ctx.user.id)),

  /** 广场技能的文件列表 */
  files: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => listSquareFiles(input.slug, ctx.user.id)),

  /** 广场技能的文件内容 */
  fileContent: protectedProcedure
    .input(z.object({ slug: z.string(), path: z.string() }))
    .query(({ ctx, input }) =>
      readSquareFile(input.slug, input.path, ctx.user.id),
    ),

  /** 把广场技能导入自己的技能库 */
  import: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        skillSetIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await importSquareSkill(
          ctx.user.id,
          input.slug,
          input.skillSetIds ?? [],
        );
      } catch (error) {
        if (error instanceof SkillHubError) throw error;
        throw error;
      }
    }),
});
