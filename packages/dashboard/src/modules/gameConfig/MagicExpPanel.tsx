/**
 * 武功经验配置面板
 * MagicExpPanel
 */

import type { MagicExpConfig } from "@miu2d/types";
import { createDefaultMagicExpConfig } from "@miu2d/types";
import { NumberInput } from "@miu2d/ui";
import { memo } from "react";

export const MagicExpPanel = memo(function MagicExpPanel({
  magicExp,
  onChange,
}: {
  magicExp: MagicExpConfig;
  onChange: (value: MagicExpConfig) => void;
}) {
  const updateFraction = (
    field: "xiuLianMagicExpFraction" | "useMagicExpFraction",
    value: number | null
  ) => {
    onChange({ ...magicExp, [field]: value ?? 0 });
  };

  const updateExpEntry = (index: number, exp: number | null) => {
    const newEntries = [...magicExp.expByLevel];
    newEntries[index] = { ...newEntries[index], exp: exp ?? 0 };
    onChange({ ...magicExp, expByLevel: newEntries });
  };

  const addEntry = () => {
    const maxLevel =
      magicExp.expByLevel.length > 0 ? Math.max(...magicExp.expByLevel.map((e) => e.level)) + 1 : 0;
    const lastExp =
      magicExp.expByLevel.length > 0 ? magicExp.expByLevel[magicExp.expByLevel.length - 1].exp : 3;
    onChange({
      ...magicExp,
      expByLevel: [...magicExp.expByLevel, { level: maxLevel, exp: lastExp }],
    });
  };

  const removeEntry = (index: number) => {
    const newEntries = magicExp.expByLevel.filter((_, i) => i !== index);
    onChange({ ...magicExp, expByLevel: newEntries });
  };

  const resetToDefault = () => {
    onChange(createDefaultMagicExpConfig());
  };

  return (
    <div className="space-y-6">
      {/* 经验倍率设置 */}
      <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
        <h3 className="text-sm font-medium text-white mb-4">经验倍率</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#999] mb-1 block">修炼武功经验倍率</label>
            <NumberInput
              value={magicExp.xiuLianMagicExpFraction}
              onChange={(v) => updateFraction("xiuLianMagicExpFraction", v)}
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-[#666] mt-1">
              击杀获得经验 × 此倍率 = 修炼武功获得经验（默认 0.2222）
            </p>
          </div>
          <div>
            <label className="text-xs text-[#999] mb-1 block">使用武功经验倍率</label>
            <NumberInput
              value={magicExp.useMagicExpFraction}
              onChange={(v) => updateFraction("useMagicExpFraction", v)}
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-[#666] mt-1">
              击杀获得经验 × 此倍率 = 使用中武功获得经验（默认 0.0333）
            </p>
          </div>
        </div>
      </div>

      {/* 等级经验表 */}
      <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">
            命中经验表
            <span className="text-xs text-[#666] font-normal ml-2">
              （共 {magicExp.expByLevel.length} 个等级）
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetToDefault}
              className="px-2 py-1 text-xs text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded transition-all"
            >
              恢复默认
            </button>
            <button
              type="button"
              onClick={addEntry}
              className="px-2 py-1 text-xs bg-[#0e639c] hover:bg-[#1177bb] text-white rounded transition-all"
            >
              + 添加等级
            </button>
          </div>
        </div>

        <p className="text-xs text-[#666] mb-3">
          敌人等级 → 每次命中获得的武功经验值。等级越高，获得经验越多。
        </p>

        {/* 表头 */}
        <div className="grid grid-cols-[60px_1fr_32px] gap-2 mb-2 px-1">
          <span className="text-xs text-[#666]">等级</span>
          <span className="text-xs text-[#666]">命中经验</span>
          <span />
        </div>

        {/* 经验条目列表 */}
        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {magicExp.expByLevel.map((entry, index) => (
            <div
              key={entry.level}
              className="grid grid-cols-[60px_1fr_32px] gap-2 items-center group"
            >
              <span className="text-xs text-[#ccc] px-1 tabular-nums">Lv.{entry.level}</span>
              <NumberInput value={entry.exp} onChange={(v) => updateExpEntry(index, v)} min={0} />
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="w-6 h-6 flex items-center justify-center text-[#666] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-[#3c3c3c]"
                title="删除"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {magicExp.expByLevel.length === 0 && (
          <div className="text-sm text-[#858585] text-center py-4">
            暂无经验配置，点击「添加等级」或「恢复默认」
          </div>
        )}
      </div>

      <div className="text-xs text-[#666] bg-[#1e1e1e] p-3 rounded">
        <p>
          此配置原为 <code className="text-[#ce9178]">MagicExp.ini</code> 文件。
        </p>
        <p className="mt-1">命中经验：武功命中敌人时，根据敌人等级查表获得对应经验值。</p>
        <p className="mt-1">经验倍率：击杀获得的经验 × 倍率 → 分配给修炼/使用中武功。</p>
      </div>
    </div>
  );
});
