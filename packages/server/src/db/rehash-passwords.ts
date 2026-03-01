/**
 * One-off data migration: hash all plaintext passwords with bcrypt.
 *
 * Safe to run multiple times (idempotent):
 *   - Rows whose passwordHash already looks like a bcrypt hash are skipped.
 *
 * Usage (production):
 *   docker exec miu2d-server node dist/db/rehash-passwords.js
 */
import path from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { hashPassword, isBcryptHash } from "../utils/password";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log("==> rehash-passwords: fetching users …");

  const rows: Array<{ id: string; password_hash: string }> = await pool
    .query('SELECT id, password_hash FROM users')
    .then((r) => r.rows as Array<{ id: string; password_hash: string }>);

  const plaintext = rows.filter((u) => !isBcryptHash(u.password_hash));
  console.log(`    total users: ${rows.length}, plaintext passwords: ${plaintext.length}`);

  if (plaintext.length === 0) {
    console.log("==> Nothing to do.");
    await pool.end();
    return;
  }

  let updated = 0;
  for (const user of plaintext) {
    const hashed = await hashPassword(user.password_hash);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, user.id]);
    updated += 1;
    if (updated % 10 === 0) {
      console.log(`    rehashed ${updated}/${plaintext.length} …`);
    }
  }

  console.log(`==> Done — rehashed ${updated} password(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error("rehash-passwords failed:", err);
  process.exit(1);
});
