/**
 * 同步 MinIO 文件到数据库
 * 扫描 MinIO 中的文件，为每个文件创建数据库记录
 */

import { db } from '../packages/server/src/db/client';
import * as s3 from '../packages/server/src/storage/s3';

const GAME_SLUG = 'enozheng123-gmail-com';
const BUCKET = 'miu2d';

async function syncFiles() {
  // 1. 获取游戏 ID
  const game = await db.game.findFirst({ where: { slug: GAME_SLUG } });
  if (!game) {
    console.error(`Game ${GAME_SLUG} not found`);
    process.exit(1);
  }

  console.log(`Syncing files for game: ${game.name} (${game.id})`);

  // 2. 列出 MinIO 中的所有文件
  const prefix = `game/${GAME_SLUG}/resources/`;
  const files = await s3.listFiles(prefix);

  console.log(`Found ${files.length} files in MinIO`);

  // 3. 为每个文件创建数据库记录
  let created = 0;
  let skipped = 0;

  for (const file of files) {
    // 提取相对路径
    const relativePath = file.key.substring(prefix.length);
    const pathSegments = relativePath.split('/').filter(Boolean);
    
    if (pathSegments.length === 0) continue;

    const fileName = pathSegments[pathSegments.length - 1];
    const parentPath = pathSegments.slice(0, -1);

    // 确保父目录存在
    let parentId: string | null = null;
    for (let i = 0; i < parentPath.length; i++) {
      const folderName = parentPath[i];
      const folderPath = parentPath.slice(0, i + 1).join('/');

      let folder = await db.file.findFirst({
        where: {
          gameId: game.id,
          path: folderPath,
          name: folderName,
          type: 'folder',
        },
      });

      if (!folder) {
        folder = await db.file.create({
          data: {
            gameId: game.id,
            name: folderName,
            path: folderPath,
            type: 'folder',
            parentId,
          },
        });
        console.log(`Created folder: ${folderPath}`);
      }

      parentId = folder.id;
    }

    // 检查文件是否已存在
    const existing = await db.file.findFirst({
      where: {
        gameId: game.id,
        path: relativePath,
        name: fileName,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // 创建文件记录
    await db.file.create({
      data: {
        gameId: game.id,
        name: fileName,
        path: relativePath,
        type: 'file',
        parentId,
        storageKey: file.key,
        size: file.size,
        mimeType: getMimeType(fileName),
      },
    });

    created++;
    if (created % 100 === 0) {
      console.log(`Progress: ${created} files created`);
    }
  }

  console.log(`\nSync complete:`);
  console.log(`- Created: ${created} files`);
  console.log(`- Skipped: ${skipped} files (already exist)`);
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    msf: 'application/octet-stream',
    mmf: 'application/octet-stream',
    txt: 'text/plain',
    ini: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

syncFiles()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
