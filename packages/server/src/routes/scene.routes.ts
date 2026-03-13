/**
 * Scene REST 路由（Hono）
 *
 * GET /game/:gameSlug/api/scenes/:sceneKey/mmf              - 获取 MMF 地图二进制数据
 * GET /game/:gameSlug/api/scenes/:sceneKey/manifest         - 获取场景资源清单
 * GET /game/:gameSlug/api/scenes/npc/:sceneKey/:npcKey   - 获取 NPC JSON 数据
 * GET /game/:gameSlug/api/scenes/obj/:sceneKey/:objKey   - 获取 OBJ JSON 数据
 */
import { createHash } from "node:crypto";
import { Hono } from "hono";
import { sceneService } from "../modules/scene/scene.service";
import { Logger } from "../utils/logger";

const logger = new Logger("SceneRoutes");

export const sceneRoutes = new Hono();

/**
 * 获取场景的 MMF 地图二进制数据
 */
sceneRoutes.get(":gameSlug/api/scenes/:sceneKey/mmf", async (c) => {
  try {
    const gameSlug = c.req.param("gameSlug");
    const sceneKey = c.req.param("sceneKey");
    logger.debug(`[getSceneMmf] gameSlug=${gameSlug}, sceneKey=${sceneKey}`);

    const mmfBuffer = await sceneService.getMmfBinaryBySlug(gameSlug, sceneKey);
    if (!mmfBuffer) {
      return c.json({ error: "Scene or MMF data not found" }, 404);
    }

    c.header("Content-Type", "application/octet-stream");
    c.header("Cache-Control", "no-cache");

    return c.body(new Uint8Array(mmfBuffer));
  } catch (error) {
    logger.error("[getSceneMmf] Error:", error);
    return c.json({ error: "Not found" }, 404);
  }
});

/**
 * 获取场景资源清单（tiles + missing 精灵路径）
 *
 * 短 TTL（30s）：后台修改 NPC/OBJ 后最多延迟 30 秒生效
 */
sceneRoutes.get(":gameSlug/api/scenes/:sceneKey/manifest", async (c) => {
  try {
    const gameSlug = c.req.param("gameSlug");
    const sceneKey = c.req.param("sceneKey");
    logger.debug(`[getSceneManifest] gameSlug=${gameSlug}, sceneKey=${sceneKey}`);

    const manifest = await sceneService.getSceneManifestBySlug(gameSlug, sceneKey);
    if (!manifest) {
      return c.json({ error: "Scene not found" }, 404);
    }

    const body = JSON.stringify(manifest);
    const etag = `"${createHash("sha1").update(body).digest("hex").slice(0, 16)}"`;

    c.header("Cache-Control", "public, max-age=30");
    c.header("ETag", etag);

    if (c.req.header("if-none-match") === etag) {
      return c.body(null, 304);
    }

    return c.text(body, 200, { "Content-Type": "application/json" });
  } catch (error) {
    logger.error("[getSceneManifest] Error:", error);
    return c.json({ error: "Not found" }, 404);
  }
});

/**
 * 获取 NPC 数据（JSON 格式）
 */
sceneRoutes.get(":gameSlug/api/scenes/npc/:sceneKey/:npcKey", async (c) => {
  try {
    const gameSlug = c.req.param("gameSlug");
    const sceneKey = c.req.param("sceneKey");
    const npcKey = c.req.param("npcKey");
    logger.debug(`[getSceneNpc] gameSlug=${gameSlug}, sceneKey=${sceneKey}, npcKey=${npcKey}`);

    const entries = await sceneService.getNpcEntriesBySlug(gameSlug, sceneKey, npcKey);
    if (entries === null) {
      return c.json({ error: "NPC data not found" }, 404);
    }

    c.header("Content-Type", "application/json");
    c.header("Cache-Control", "no-cache");

    return c.json(entries);
  } catch (error) {
    logger.error("[getSceneNpc] Error:", error);
    return c.json({ error: "Not found" }, 404);
  }
});

/**
 * 获取 OBJ 数据（JSON 格式）
 */
sceneRoutes.get(":gameSlug/api/scenes/obj/:sceneKey/:objKey", async (c) => {
  try {
    const gameSlug = c.req.param("gameSlug");
    const sceneKey = c.req.param("sceneKey");
    const objKey = c.req.param("objKey");
    logger.debug(`[getSceneObj] gameSlug=${gameSlug}, sceneKey=${sceneKey}, objKey=${objKey}`);

    const entries = await sceneService.getObjEntriesBySlug(gameSlug, sceneKey, objKey);
    if (entries === null) {
      return c.json({ error: "OBJ data not found" }, 404);
    }

    c.header("Content-Type", "application/json");
    c.header("Cache-Control", "no-cache");

    return c.json(entries);
  } catch (error) {
    logger.error("[getSceneObj] Error:", error);
    return c.json({ error: "Not found" }, 404);
  }
});
