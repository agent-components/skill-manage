import { z } from "zod";
import {
  changeSkillSetSkills,
  createSkillSet,
  deleteSkillSet,
  getSkillSetDetail,
  listSkillSetIcons,
  listSkillSets,
  updateSkillSet,
} from "../../modules/skill-sets/skill-set.service.js";
import { protectedProcedure, router } from "../trpc.js";

export const skillSetRouter = router({
  /** 列出当前账号的技能集 */
  list: protectedProcedure
    .input(
      z.object({
        current: z.number().optional(),
        pageSize: z.number().optional(),
        name: z.string().optional(),
      }),
    )
    .query(({ ctx, input }) => listSkillSets(ctx.user.id, input)),

  /** 批量取图标 */
  icons: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(({ ctx, input }) => listSkillSetIcons(ctx.user.id, input.ids)),

  /** 技能集详情（含关联技能） */
  detail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getSkillSetDetail(ctx.user.id, input.id)),

  /** 新建技能集 */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => createSkillSet(ctx.user.id, input)),

  /** 修改技能集 */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().nullable().optional(),
        skillIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...body } = input;
      return updateSkillSet(ctx.user.id, id, body);
    }),

  /** 删除技能集 */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSkillSet(ctx.user.id, input.id);
      return { ok: true };
    }),

  /** 调整技能集包含的技能（增量增删） */
  changeSkills: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        add: z.array(z.string()).optional(),
        remove: z.array(z.string()).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      changeSkillSetSkills(ctx.user.id, input.id, {
        add: input.add,
        remove: input.remove,
      }),
    ),
});
