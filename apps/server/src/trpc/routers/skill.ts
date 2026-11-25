import { z } from "zod";
import { SkillError } from "../../shared/errors.js";
import {
  deleteSkill,
  downloadSkillVersion,
  getSkillDetail,
  listSkillIcons,
  listSkillVersionFiles,
  listSkills,
  readSkillFile,
  readSkillVersionFile,
  updateSkill,
  uploadSkillPackage,
  zipBufferFromBase64,
} from "../../modules/skills/skill.service.js";
import { protectedProcedure, router } from "../trpc.js";

export const skillRouter = router({
  /** 列出当前账号的技能 */
  list: protectedProcedure
    .input(
      z.object({
        current: z.number().optional(),
        pageSize: z.number().optional(),
        name: z.string().optional(),
        skillSetSlugs: z.array(z.string()).optional(),
      })
    )
    .query(({ ctx, input }) => listSkills(ctx.user.id, input, input.skillSetSlugs ?? [])),

  /** 批量取图标 */
  icons: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(({ ctx, input }) => listSkillIcons(ctx.user.id, input.ids)),

  /** 技能详情 */
  detail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getSkillDetail(ctx.user.id, input.id)),

  /** 修改技能 */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        displayName: z.string().optional(),
        summary: z.string().optional(),
        tags: z.array(z.string()).optional(),
        icon: z.string().nullable().optional(),
        skillSetIds: z.array(z.string()).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { id, ...body } = input;
      return updateSkill(ctx.user.id, id, body);
    }),

  /** 删除技能 */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSkill(ctx.user.id, input.id);
      return { ok: true };
    }),

  /** 上传技能包（base64） */
  uploadBase64: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        zipBase64: z.string(),
        skillSetIds: z.array(z.string()).optional(),
        skillId: z.string().optional(),
        fallbackVersion: z.string().optional(),
        matchFilename: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const zipBuffer = zipBufferFromBase64(input.zipBase64);
      if (!zipBuffer) throw new SkillError("无效的 zipBase64");
      return uploadSkillPackage(ctx.user.id, {
        zipBuffer,
        filename: input.filename,
        skillSetIds: input.skillSetIds ?? [],
        skillId: input.skillId,
        fallbackVersion: input.fallbackVersion,
        matchFilename: input.matchFilename ?? false,
      });
    }),

  /** 下载技能包（base64） */
  downloadVersion: protectedProcedure
    .input(z.object({ id: z.string(), version: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const file = await downloadSkillVersion(ctx.user.id, input.id, input.version ?? null);
      return {
        filename: file.filename,
        zipBase64: file.buffer.toString("base64"),
      };
    }),

  /** 列出技能包内文件 */
  versionFiles: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => listSkillVersionFiles(ctx.user.id, input.id)),

  /** 读取技能包内文件内容 */
  versionFileContent: protectedProcedure
    .input(z.object({ id: z.string(), path: z.string().optional() }))
    .query(({ ctx, input }) => readSkillVersionFile(ctx.user.id, input.id, input.path ?? null)),

  /** 阅读技能正文（默认 SKILL.md） */
  read: protectedProcedure
    .input(z.object({ id: z.string(), path: z.string().optional() }))
    .query(({ ctx, input }) => readSkillFile(ctx.user.id, input.id, input.path ?? null)),
});
