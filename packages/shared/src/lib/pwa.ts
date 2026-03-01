/**
 * isPWA - 检测当前是否以 PWA standalone 模式运行
 *
 * 兼容 Chrome/Edge（display-mode: standalone）和 iOS Safari（navigator.standalone）。
 */
export const isPWA: boolean =
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
