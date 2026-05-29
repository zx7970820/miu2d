import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regression test for tight-bbox MSF frame stretching bug (6fc6cc5).
 *
 * After the tight-bbox optimization (b7461a8), MSF frames are decoded as
 * cropped bitmaps with canvasOffsetX/Y offsets. UI rendering paths
 * (useAsfImage, AsfAnimatedSprite) previously fed the small cropped canvas
 * directly into elements sized to the full AsfData.width × AsfData.height,
 * which caused visible stretching.
 *
 * getCompositeFrameCanvas() fixes this by compositing the tight-bbox frame
 * back onto a full-size canvas at the correct offset.
 */

// ── DOM mocks (vitest env = node, no real canvas) ──────────────────────

interface MockCanvas {
  width: number;
  height: number;
  getContext: ReturnType<typeof vi.fn>;
  toDataURL: ReturnType<typeof vi.fn>;
  _ctx: MockContext;
}

interface MockContext {
  putImageData: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
}

function createMockCanvas(): MockCanvas {
  const ctx: MockContext = {
    putImageData: vi.fn(),
    drawImage: vi.fn(),
  };
  return {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(ctx),
    toDataURL: vi.fn().mockReturnValue("data:image/png;base64,MOCK"),
    _ctx: ctx,
  };
}

let canvasInstances: MockCanvas[];

beforeEach(() => {
  canvasInstances = [];

  vi.stubGlobal("document", {
    createElement: vi.fn((tag: string) => {
      if (tag === "canvas") {
        const c = createMockCanvas();
        canvasInstances.push(c);
        return c;
      }
      return {};
    }),
  });
});

// ── Helpers ────────────────────────────────────────────────────────────

import type { AsfData, AsfFrame } from "../../src/resource/format/asf";

function makeFrame(
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
): AsfFrame {
  return {
    width: w,
    height: h,
    imageData: { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) } as unknown as ImageData,
    canvas: null,
    canvasOffsetX: offsetX,
    canvasOffsetY: offsetY,
  };
}

function makeAsf(
  canvasW: number,
  canvasH: number,
  frames: AsfFrame[],
): AsfData {
  return {
    width: canvasW,
    height: canvasH,
    frameCount: frames.length,
    directions: 1,
    colorCount: 256,
    interval: 100,
    left: 0,
    bottom: 0,
    framesPerDirection: frames.length,
    frames,
    isLoaded: true,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("getCompositeFrameCanvas – tight-bbox regression", () => {
  // Lazy-import so the DOM stub is already in place.
  async function importAsf() {
    return import("../../src/resource/format/asf");
  }

  it("returns full canvas dimensions for a tight-bbox frame", async () => {
    const { getCompositeFrameCanvas } = await importAsf();

    const frame = makeFrame(20, 15, 5, 10);
    const asf = makeAsf(64, 48, [frame]);

    const result = getCompositeFrameCanvas(asf, 0);

    // The composite canvas must be the full ASF size, NOT the cropped size.
    expect(result.width).toBe(64);
    expect(result.height).toBe(48);
  });

  it("drawImage is called at the correct offset for a tight-bbox frame", async () => {
    const { getCompositeFrameCanvas } = await importAsf();

    const frame = makeFrame(20, 15, 5, 10);
    const asf = makeAsf(64, 48, [frame]);

    const compositeCanvas = getCompositeFrameCanvas(asf, 0) as unknown as MockCanvas;

    // The first canvas created is for getFrameCanvas (tight), the second for composite.
    // drawImage must place the tight canvas at (canvasOffsetX, canvasOffsetY).
    const compositeCtx = compositeCanvas._ctx;
    expect(compositeCtx.drawImage).toHaveBeenCalledTimes(1);
    const [src, dx, dy] = compositeCtx.drawImage.mock.calls[0];
    expect(dx).toBe(5);
    expect(dy).toBe(10);
    // Source should be the tight-bbox canvas (frame-size, not full-size)
    expect(src.width).toBe(20);
    expect(src.height).toBe(15);
  });

  it("skips compositing when frame already matches canvas size", async () => {
    const { getCompositeFrameCanvas } = await importAsf();

    const frame = makeFrame(64, 48, 0, 0);
    const asf = makeAsf(64, 48, [frame]);

    const canvasBefore = canvasInstances.length;
    const result = getCompositeFrameCanvas(asf, 0);

    // Only one canvas should be created (the tight-bbox canvas itself),
    // no second composite canvas is needed.
    const newCanvases = canvasInstances.length - canvasBefore;
    expect(newCanvases).toBe(1);
    // Returned canvas matches frame dimensions (== canvas dimensions)
    expect(result.width).toBe(64);
    expect(result.height).toBe(48);
  });

  it("getFrameCanvas returns the cropped size (old buggy path for UI)", async () => {
    const { getFrameCanvas } = await importAsf();

    const frame = makeFrame(20, 15, 5, 10);
    const canvas = getFrameCanvas(frame);

    // getFrameCanvas only knows about the frame's own tight-bbox dimensions.
    // Using this directly for UI rendering would stretch 20×15 into 64×48.
    expect(canvas.width).toBe(20);
    expect(canvas.height).toBe(15);
  });

  it("returns a 1×1 fallback for an out-of-range frame index", async () => {
    const { getCompositeFrameCanvas } = await importAsf();

    const asf = makeAsf(64, 48, []);
    const result = getCompositeFrameCanvas(asf, 0);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it("handles multiple frames with different tight bboxes", async () => {
    const { getCompositeFrameCanvas } = await importAsf();

    const frame0 = makeFrame(30, 20, 2, 3);
    const frame1 = makeFrame(10, 8, 40, 30);
    const asf = makeAsf(64, 48, [frame0, frame1]);

    const c0 = getCompositeFrameCanvas(asf, 0);
    expect(c0.width).toBe(64);
    expect(c0.height).toBe(48);

    const c1 = getCompositeFrameCanvas(asf, 1);
    expect(c1.width).toBe(64);
    expect(c1.height).toBe(48);

    // Verify second frame is drawn at its own offset
    const c1Canvas = c1 as unknown as MockCanvas;
    const [, dx, dy] = c1Canvas._ctx.drawImage.mock.calls[0];
    expect(dx).toBe(40);
    expect(dy).toBe(30);
  });
});
