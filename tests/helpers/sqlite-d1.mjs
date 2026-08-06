import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export class SqliteD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    const migrationDirectory = new URL("../../migrations/", import.meta.url);
    for (const name of readdirSync(migrationDirectory)
      .filter((item) => item.endsWith(".up.sql"))
      .sort()) {
      this.database.exec(readFileSync(new URL(name, migrationDirectory), "utf8"));
    }
  }

  prepare(sql) {
    const statement = this.database.prepare(sql);
    const bound = (values = []) => ({
      bind(...nextValues) {
        return bound(nextValues);
      },
      async first() {
        return statement.get(...values) || null;
      },
      async all() {
        return { results: statement.all(...values) };
      },
      async run() {
        return this.__runSync();
      },
      __runSync() {
        const result = statement.run(...values);
        return {
          success: true,
          meta: { changes: Number(result.changes) },
        };
      },
    });
    return bound();
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.__runSync());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}
