/**
 * 游戏配置 REST 路由（Hono）
 *
 * GET /game/:gameSlug/api/config - 获取游戏全局配置
 * GET /game/:gameSlug/api/logo - 获取游戏 Logo 图片
 * POST /game/:gameSlug/api/logo - 上传游戏 Logo 图片（需认证）
 * DELETE /game/:gameSlug/api/logo - 删除游戏 Logo（需认证）
 */

import { createDefaultGameConfig, GameConfigDataSchema } from "@miu2d/types";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { db } from "../db/client";
import { gameConfigs, gameMembers, games } from "../db/schema";
import { gameConfigService } from "../modules/gameConfig/gameConfig.service";
import * as s3 from "../storage/s3";
import { Logger } from "../utils/logger";
import { resolveUserId } from "../utils/session";

const logger = new Logger("GameConfigRoutes");

/** Logo 在 S3 中的存储 key */
function logoStorageKey(gameId: string): string {
  return `games/${gameId}/_logo`;
}

export const gameConfigRoutes = new Hono();

/**
 * 获取游戏全局配置
 */
gameConfigRoutes.get(":gameSlug/api/config", async (c) => {
  try {
    const gameSlug = c.req.param("gameSlug");
    logger.debug(`[getConfig] gameSlug=${gameSlug}`);

    const config = await gameConfigService.getPublicBySlug(gameSlug);

    c.header("Cache-Control", "public, max-age=300");
    c.header("Access-Control-Allow-Origin", "*");

    return c.json(config);
  } catch (error) {
    logger.error("[getConfig] Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * 获取游戏 Logo 图片
 */
gameConfigRoutes.get(":gameSlug/api/logo", async (c) => {
  try {
    const gameSlug = c.req.param("gameSlug");

    const [game] = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.slug, gameSlug))
      .limit(1);

    if (!game) {
      return c.json({ error: "Game not found" }, 404);
    }

    const key = logoStorageKey(game.id);
    const { stream: fileStream, contentType, contentLength } = await s3.getFileStream(key);

    c.header("Content-Type", contentType || "image/png");
    if (contentLength) c.header("Content-Length", String(contentLength));
    c.header("Cache-Control", "public, max-age=3600");
    c.header("Access-Control-Allow-Origin", "*");

    return stream(c, async (s) => {
      for await (const chunk of fileStream) {
        await s.write(chunk as Uint8Array);
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") {
      return c.json({ error: "Logo not found" }, 404);
    }
    logger.error("[getLogo] Error:", error);
    return c.json({ error: "Logo not found" }, 404);
  }
});

/**
 * 上传游戏 Logo
 */
gameConfigRoutes.post(":gameSlug/api/logo", async (c) => {
  try {
    const gameSlug = c.req.param("gameSlug");

    // 认证
    const userId = await resolveUserId(c.req.header("cookie") ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // 查找游戏
    const [game] = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.slug, gameSlug))
      .limit(1);

    if (!game) {
      return c.json({ error: "Game not found" }, 404);
    }

    // 检查权限
    const [member] = await db
      .select()
      .from(gameMembers)
      .where(and(eq(gameMembers.gameId, game.id), eq(gameMembers.userId, userId)))
      .limit(1);

    if (!member) {
      return c.json({ error: "No access" }, 403);
    }

    // 读取 body
    const body = Buffer.from(await c.req.arrayBuffer());

    if (body.length === 0) {
      return c.json({ error: "Empty body" }, 400);
    }

    if (body.length > 5 * 1024 * 1024) {
      return c.json({ error: "File too large (max 5MB)" }, 400);
    }

    const contentType = c.req.header("content-type") || "image/png";
    const key = logoStorageKey(game.id);

    // 先上传 S3，再更新 DB。若 DB 更新失败则删除已上传的 S3 对象（补偿），
    // 保证 S3 和 DB 状态最终一致：DB 无 logoUrl 则 S3 也无文件。
    await s3.uploadFile(key, body, contentType);

    const logoUrl = `/game/${gameSlug}/api/logo`;
    try {
      const [existing] = await db
        .select()
        .from(gameConfigs)
        .where(eq(gameConfigs.gameId, game.id))
        .limit(1);

      if (existing) {
        const defaults = createDefaultGameConfig();
        const raw = existing.data as Record<string, unknown>;
        const merged = { ...defaults, ...raw, logoUrl };
        const data = GameConfigDataSchema.parse(merged);
        await db
          .update(gameConfigs)
          .set({ data, updatedAt: new Date() })
          .where(eq(gameConfigs.gameId, game.id));
      } else {
        const data = GameConfigDataSchema.parse({
          ...createDefaultGameConfig(),
          logoUrl,
        });
        await db.insert(gameConfigs).values({ gameId: game.id, data });
      }
    } catch (dbError) {
      // DB 写入失败：回滚 S3 上传，避免产生孤立文件
      logger.error("[uploadLogo] DB update failed, rolling back S3 upload:", dbError);
      try {
        await s3.deleteFile(key);
      } catch (s3Error) {
        logger.error("[uploadLogo] S3 rollback also failed, orphaned key:", key, s3Error);
      }
      throw dbError;
    }

    logger.log(`[uploadLogo] Logo uploaded for game ${gameSlug}`);
    return c.json({ logoUrl });
  } catch (error) {
    logger.error("[uploadLogo] Error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

/**
 * 删除游戏 Logo
 */
gameConfigRoutes.delete(":gameSlug/api/logo", async (c) => {
  try {
    const gameSlug = c.req.param("gameSlug");

    const userId = await resolveUserId(c.req.header("cookie") ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [game] = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.slug, gameSlug))
      .limit(1);

    if (!game) {
      return c.json({ error: "Game not found" }, 404);
    }

    const [member] = await db
      .select()
      .from(gameMembers)
      .where(and(eq(gameMembers.gameId, game.id), eq(gameMembers.userId, userId)))
      .limit(1);

    if (!member) {
      return c.json({ error: "No access" }, 403);
    }

    // 先清除 DB 中的 logoUrl，再删除 S3 文件。
    // 若顺序颠倒（S3 先删），DB 更新失败会导致 DB 仍保存指向已删除文件的 URL（死链）。
    // 当前顺序下即使 S3 删除失败，DB 已无引用，用户也不会看到死链（S3 产生孤立文件，后续可清理）。
    const [existing] = await db
      .select()
      .from(gameConfigs)
      .where(eq(gameConfigs.gameId, game.id))
      .limit(1);

    if (existing) {
      const defaults = createDefaultGameConfig();
      const raw = existing.data as Record<string, unknown>;
      const merged = { ...defaults, ...raw, logoUrl: "" };
      const data = GameConfigDataSchema.parse(merged);
      await db
        .update(gameConfigs)
        .set({ data, updatedAt: new Date() })
        .where(eq(gameConfigs.gameId, game.id));
    }

    // DB 更新成功后，清理 S3（失败只产生孤立对象，不影响一致性）
    try {
      await s3.deleteFile(logoStorageKey(game.id));
    } catch {
      logger.warn(`[deleteLogo] S3 file not found or delete failed for game ${game.id}, orphaned object may exist`);
    }

    logger.log(`[deleteLogo] Logo deleted for game ${gameSlug}`);
    return c.json({ ok: true });
  } catch (error) {
    logger.error("[deleteLogo] Error:", error);
    return c.json({ error: "Delete failed" }, 500);
  }
});
