import { initWasm } from "@miu2d/engine/wasm/wasm-manager";
import { useEffect, useState } from "react";

/**
 * 初始化 WASM 模块并返回就绪状态。
 * 内部调用 initWasm()（幂等），多个组件同时使用时只会初始化一次。
 */
export function useWasm(): boolean {
  const [wasmReady, setWasmReady] = useState(false);

  useEffect(() => {
    initWasm()
      .then(() => setWasmReady(true))
      .catch((err) => {
        console.error("[useWasm] Failed to init WASM:", err);
      });
  }, []);

  return wasmReady;
}
