import { useDatabase } from "nitro/database";
import { migrations } from "../database/migrations";

// db0 is only a transitive dependency of nitro, so its types are not resolvable here
type Database = ReturnType<typeof useDatabase>;

let ready: Promise<Database> | undefined;

// Migrates on first use. Memoized as a promise so concurrent first requests share one run.
export function useDb(): Promise<Database> {
  ready ??= migrate(useDatabase()).catch((error) => {
    ready = undefined;
    throw error;
  });
  return ready;
}

async function migrate(db: Database): Promise<Database> {
  await db.exec("PRAGMA journal_mode = WAL");
  await db.exec("PRAGMA foreign_keys = ON");

  // db0's sql template only returns rows for SELECT, so PRAGMA goes through prepare()
  const row = (await db.prepare("PRAGMA user_version").get()) as
    | { user_version: number }
    | undefined;
  const current = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= current) continue;
    await db.exec("BEGIN");
    try {
      for (const statement of migration.sql) await db.exec(statement);
      await db.exec(`PRAGMA user_version = ${migration.version}`);
      await db.exec("COMMIT");
    } catch (error) {
      await db.exec("ROLLBACK");
      throw new Error(`Migration ${migration.version} (${migration.name}) failed`, {
        cause: error,
      });
    }
  }

  return db;
}
