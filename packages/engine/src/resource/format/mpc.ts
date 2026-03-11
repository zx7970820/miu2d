/**
 * MPC file parser - matches Engine/Mpc.cs implementation
 *
 * MPC files can optionally have associated SHD (shadow) files.
 * When SHD is present, shadow data is used as the base layer,
 * and MPC color pixels are drawn on top.
 *
 * Uses WASM decoder for high performance.
 * 注意：使用前需在应用启动时调用 await initWasm()
 */

import { logger } from "../../core/logger";
import type { Mpc } from "../../map/types";
import { decodeMpcOffThread } from "../../wasm/wasm-decode-service";
import { resourceLoader } from "../resource-loader";
import { loadShd, type Shd } from "./shd";

/**
 * Rewrite .mpc URL to .msf (MSF format after conversion)
 */
function rewriteMpcToMsf(url: string): string {
  return url.replace(/\.mpc$/i, ".msf");
}

/**
 * Load an MPC file from a URL
 * Automatically uses MSF format if available (.mpc → .msf rewrite)
 */
export async function loadMpc(url: string): Promise<Mpc | null> {
  const msfUrl = rewriteMpcToMsf(url);
  return resourceLoader.loadParsedBinaryAsync<Mpc>(msfUrl, decodeMpcOffThread, "mpc");
}

/**
 * Load an MPC file with optional SHD shadow file
 * (string path, string shdFileName) constructor
 *
 * When SHD is provided, shadow data serves as the base layer
 * and MPC color pixels are drawn on top (preserving shadow under transparent areas)
 *
 * @param mpcUrl - URL to the MPC file
 * @param shdUrl - Optional URL to the SHD shadow file
 */
export async function loadMpcWithShadow(mpcUrl: string, shdUrl?: string): Promise<Mpc | null> {
  // Load SHD first if provided
  let shd: Shd | null = null;
  if (shdUrl) {
    shd = await loadShd(shdUrl);
    if (!shd) {
      logger.warn(`[MPC] SHD file not found: ${shdUrl}, loading MPC without shadow`);
    }
  }

  // Load MPC (auto-rewrite to MSF)
  const msfUrl = rewriteMpcToMsf(mpcUrl);
  const buffer = await resourceLoader.loadBinary(msfUrl);
  if (!buffer) {
    logger.error(`[MPC] Failed to load: ${msfUrl}`);
    return null;
  }

  // SHD shadow data is now baked into MSF RGBA frames during the convert-sword2 pipeline.
  // No runtime merging needed: shadows appear as [0,0,0,153] pixels in transparent areas,
  // and sprite pixels (alpha=255) are drawn on top. The shd parameter is kept for API
  // compatibility but is no longer used.
  if (shd) {
    logger.debug(`[MPC] SHD shadow is already merged in MSF RGBA (no runtime action needed)`);
  }

  return decodeMpcOffThread(buffer);
}

/**
 * Clear the MPC cache (delegates to resourceLoader)
 */
export function clearMpcCache(): void {
  resourceLoader.clearCache("mpc");
}
