/**
 * 一次性迁移脚本：将存档表中 base64 截图迁移到 S3/MinIO，数据库只保留 key
 *
 * 用法（本地或线上均可）：
 *   cd packages/server && pnpm tsx ../../scripts/migrate-saves-screenshot-to-s3.ts
 *
 * 环境变量（读取 packages/server/.env）：
 *   DATABASE_URL  - PostgreSQL 连接串
 *   S3_ENDPOINT   - MinIO 内部地址（如 http://localhost:9100）
 *   S3_REGION     - 默认 us-east-1
 *   MINIO_ROOT_USER / MINIO_ROOT_PASSWORD
 *   MINIO_BUCKET  - 目标 bucket（默认 miu2d）
 */

import path from "node:path";
import fs from "node:fs";
import { Pool } from "pg";
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// 手动加载 packages/server/.env（避免对 dotenv 的路径依赖）
const envPath = path.resolve(__dirname, "../packages/server/.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ── DB ──────────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── S3 ──────────────────────────────────────────────────────────────────────

const bucket = process.env.MINIO_BUCKET ?? "miu2d";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9100",
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? "minio",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "minio123",
  },
  forcePathStyle: true,
});

function isBase64DataUri(str: string): boolean {
  return str.startsWith("data:image/");
}

async function uploadToS3(userId: string, saveId: string, dataUri: string): Promise<string> {
  const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const key = `saves/${userId}/${saveId}.jpg`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return key;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();

  try {
    // 查找所有包含 base64 截图的存档
    const { rows } = await client.query<{ id: string; user_id: string; screenshot: string }>(
      `SELECT id, user_id, screenshot FROM saves WHERE screenshot IS NOT NULL AND screenshot LIKE 'data:image/%'`
    );

    console.log(`Found ${rows.length} saves with base64 screenshots to migrate.`);

    let success = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const key = await uploadToS3(row.user_id, row.id, row.screenshot);
        await client.query(`UPDATE saves SET screenshot = $1 WHERE id = $2`, [key, row.id]);
        console.log(`  ✓ ${row.id} → ${key}`);
        success++;
      } catch (err) {
        console.error(`  ✗ ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }

    console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
