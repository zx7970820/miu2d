/**
 * FogOfWarMap - 战争迷雾风格地图 HUD
 *
 * - 固定显示在屏幕左上角，无交互
 * - 绿色轮廓显示障碍物（只画边缘）
 * - 根据玩家坐标逐步揭示地图（迷雾效果）
 * - 玩家=青色圆点，NPC=黄色，敌人=红色
 * - 每张地图的探索进度保存在内存中
 * - Tab 键切换显示/隐藏
 */

import { TILE_HEIGHT, TILE_WIDTH } from "@miu2d/engine/core/constants";
import type { Vector2 } from "@miu2d/engine/core/types";
import { BarrierType, type MiuMapData } from "@miu2d/engine/map/types";
import type React from "react";
import { useEffect, useRef } from "react";

import type { CharacterMarker } from "./LittleMapGui";

// ============= 迷雾探索数据结构 =============

/** 每张地图的探索数据 */
interface MapExplorationData {
  /** 地图列数 */
  columns: number;
  /** 地图行数 */
  rows: number;
  /** 已揭示的 tile 位图：1 = 已揭示，0 = 未揭示 */
  revealed: Uint8Array;
}

/** 全局探索进度存储，key = mapName */
const explorationStore = new Map<string, MapExplorationData>();

/** 获取或创建地图探索数据 */
function getExplorationData(mapName: string, columns: number, rows: number): MapExplorationData {
  const existing = explorationStore.get(mapName);
  if (existing && existing.columns === columns && existing.rows === rows) {
    return existing;
  }
  const data: MapExplorationData = {
    columns,
    rows,
    revealed: new Uint8Array(columns * rows),
  };
  explorationStore.set(mapName, data);
  return data;
}

/** 以玩家 tile 位置为中心揭示周围区域（圆形） */
function revealAroundPlayer(
  data: MapExplorationData,
  playerTileX: number,
  playerTileY: number,
  radius: number,
): void {
  const { columns, rows, revealed } = data;
  const minCol = Math.max(0, playerTileX - radius);
  const maxCol = Math.min(columns - 1, playerTileX + radius);
  const minRow = Math.max(0, playerTileY - radius);
  const maxRow = Math.min(rows - 1, playerTileY + radius);
  const r2 = radius * radius;

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const dx = col - playerTileX;
      const dy = row - playerTileY;
      if (dx * dx + dy * dy <= r2) {
        revealed[col + row * columns] = 1;
      }
    }
  }
}

/** 检查障碍 tile 是否在轮廓边缘（与非障碍/未揭示 tile 相邻） */
function isEdgeObstacle(
  barriers: Uint8Array,
  revealed: Uint8Array,
  col: number,
  row: number,
  columns: number,
  rows: number,
): boolean {
  const neighbors = [
    [col - 1, row],
    [col + 1, row],
    [col, row - 1],
    [col, row + 1],
  ] as const;

  for (const [nc, nr] of neighbors) {
    if (nc < 0 || nc >= columns || nr < 0 || nr >= rows) return true;
    const nIdx = nc + nr * columns;
    if (revealed[nIdx] !== 1) return true;
    const nb = barriers[nIdx];
    if (nb === BarrierType.None || nb === BarrierType.CanOver) return true;
  }
  return false;
}

// ============= 渲染常量 =============

/** 玩家周围揭示半径（tile 数） */
const REVEAL_RADIUS = 15;

/** 每个 tile 对应的 CSS 像素数（固定，不随地图大小变化） */
const CELL_PX = 2;

/** HUD 距屏幕左上角的偏移 */
const HUD_LEFT = 10;
const HUD_TOP = 10;

// ============= 组件 =============

interface FogOfWarMapProps {
  mapData: MiuMapData | null;
  mapName: string;
  playerPosition: Vector2;
  characters: CharacterMarker[];
}

export const FogOfWarMap: React.FC<FogOfWarMapProps> = ({
  mapData,
  mapName,
  playerPosition,
  characters,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mapColumns = mapData?.mapColumnCounts ?? 0;
  const mapRows = mapData?.mapRowCounts ?? 0;

  // 玩家 tile 坐标
  const playerTileX = Math.floor(playerPosition.x / TILE_WIDTH);
  const playerTileY = Math.floor(playerPosition.y / TILE_HEIGHT);

  // 绘制：1px = 1 tile，全部整数坐标，不会有亚像素模糊
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData || mapColumns === 0 || mapRows === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const exploration = getExplorationData(mapName, mapColumns, mapRows);
    revealAroundPlayer(exploration, playerTileX, playerTileY, REVEAL_RADIUS);

    const { barriers } = mapData;
    const { revealed } = exploration;

    ctx.clearRect(0, 0, mapColumns, mapRows);

    // 障碍轮廓（绿色），每个 tile 恰好 1px
    ctx.fillStyle = "#00ff00";
    for (let row = 0; row < mapRows; row++) {
      for (let col = 0; col < mapColumns; col++) {
        const idx = col + row * mapColumns;
        if (revealed[idx] !== 1) continue;
        const b = barriers[idx];
        if (
          b === BarrierType.Obstacle ||
          b === BarrierType.CanOverObstacle ||
          b === BarrierType.Trans ||
          b === BarrierType.CanOverTrans
        ) {
          if (isEdgeObstacle(barriers, revealed, col, row, mapColumns, mapRows)) {
            ctx.fillRect(col, row, 1, 1);
          }
        }
      }
    }

    // NPC / 敌人（2×2 px 方块）
    for (const char of characters) {
      const tileX = Math.floor(char.x / TILE_WIDTH);
      const tileY = Math.floor(char.y / TILE_HEIGHT);
      if (tileX < 0 || tileX >= mapColumns || tileY < 0 || tileY >= mapRows) continue;
      if (revealed[tileX + tileY * mapColumns] !== 1) continue;

      switch (char.type) {
        case "enemy":
          ctx.fillStyle = "#ff2222";
          break;
        case "partner":
          ctx.fillStyle = "#00ffff";
          break;
        default:
          ctx.fillStyle = "#ffff00";
          break;
      }
      ctx.fillRect(tileX, tileY, 2, 2);
    }

    // 玩家（青色 3×3 px 方块）
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(playerTileX - 1, playerTileY - 1, 3, 3);
  }, [mapData, mapName, mapColumns, mapRows, playerTileX, playerTileY, characters]);

  if (!mapData || mapColumns === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={mapColumns}
      height={mapRows}
      style={{
        position: "absolute",
        left: HUD_LEFT,
        top: HUD_TOP,
        width: mapColumns * CELL_PX,
        height: mapRows * CELL_PX,
        imageRendering: "pixelated",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    />
  );
};

