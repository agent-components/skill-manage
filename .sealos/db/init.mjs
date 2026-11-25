// 应用启动脚本：public schema 下的业务表不存在时执行 init.sql 建表，并播种管理员。
// 幂等——表已存在时只补管理员；多副本并发时用 advisory lock 串行化。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const LOCK_ID = 7391201;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("init: DATABASE_URL 未设置，跳过建表");
    return;
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  let locked = false;
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    locked = true;

    // 统一建在默认 schema（public），不单独建 schema
    const existing = await client.query("SELECT to_regclass('public.users') AS t");
    if (!existing.rows[0]?.t) {
      const sql = readFileSync(join(here, "init.sql"), "utf8");
      await client.query(sql);
      console.log("init: 数据表已创建");
    } else {
      console.log("init: 数据表已存在，跳过建表");
    }

    const account = process.env.ADMIN_ACCOUNT?.trim() || "admin";
    const password = process.env.ADMIN_PASSWORD ?? "123456";
    const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || "Admin";

    const seeded = await client.query(
      `INSERT INTO public.users (id, account, password, "displayName", role, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'ADMIN', 'ACTIVE', now(), now())
       ON CONFLICT (account) DO NOTHING
       RETURNING id`,
      [randomUUID(), account, password, displayName]
    );
    console.log(
      seeded.rowCount ? `init: 已创建管理员 ${account}` : `init: 管理员 ${account} 已存在`
    );
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error("init: 初始化失败", error);
  process.exit(1);
});
