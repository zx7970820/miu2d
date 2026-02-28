/**
 * 掉落等级编辑器组件
 * MoneyTiersEditor, DrugTiersEditor, BossLevelBonusEditor
 */

import type { BossLevelBonus, DrugDropTier, MoneyDropTier } from "@miu2d/types";
import { NumberInput } from "@miu2d/ui";
import { FormCard, WarnAlert } from "./FormComponents";

export function MoneyTiersEditor({
  tiers,
  onChange,
}: {
  tiers: MoneyDropTier[];
  onChange: (t: MoneyDropTier[]) => void;
}) {
  const update = (i: number, field: keyof MoneyDropTier, value: number | null) => {
    const t = [...tiers];
    t[i] = { ...t[i], [field]: value ?? 0 };
    onChange(t);
  };
  return (
    <FormCard>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[#858585] text-xs uppercase tracking-wider">
            <th className="pb-3 pr-4 font-medium">等级</th>
            <th className="pb-3 pr-4 font-medium">最小金额</th>
            <th className="pb-3 pr-4 font-medium">最大金额</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, i) => (
            <tr
              key={tier.tier}
              className="border-t border-panel-border group hover:bg-[#2a2a2a] transition-colors"
            >
              <td className="py-3 pr-4">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#0098ff]/10 text-[#0098ff] text-sm font-medium">
                  {tier.tier}
                </span>
              </td>
              <td className="py-3 pr-4">
                <NumberInput
                  value={tier.minAmount}
                  onChange={(v) => update(i, "minAmount", v)}
                  min={0}
                  className="w-32"
                />
              </td>
              <td className="py-3 pr-4">
                <NumberInput
                  value={tier.maxAmount}
                  onChange={(v) => update(i, "maxAmount", v)}
                  min={0}
                  className="w-32"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </FormCard>
  );
}

export function DrugTiersEditor({
  tiers,
  onChange,
}: {
  tiers: DrugDropTier[];
  onChange: (t: DrugDropTier[]) => void;
}) {
  const update = (i: number, field: keyof DrugDropTier, value: string | number | null) => {
    const t = [...tiers];
    t[i] = { ...t[i], [field]: value ?? 0 };
    onChange(t);
  };
  const smallInput =
    "w-32 px-2.5 py-1.5 bg-[#3c3c3c] border border-widget-border rounded-lg text-white text-sm focus:outline-none focus:border-focus-border transition-colors";
  return (
    <FormCard>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[#858585] text-xs uppercase tracking-wider">
            <th className="pb-3 pr-4 font-medium">名称</th>
            <th className="pb-3 pr-4 font-medium">NPC 最高等级</th>
            <th className="pb-3 pr-4 font-medium">关联商店 Key</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, i) => (
            <tr
              key={i}
              className="border-t border-panel-border group hover:bg-[#2a2a2a] transition-colors"
            >
              <td className="py-3 pr-4">
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  className={smallInput}
                />
              </td>
              <td className="py-3 pr-4">
                <NumberInput
                  value={tier.maxLevel}
                  onChange={(v) => update(i, "maxLevel", v)}
                  min={0}
                  className="w-32"
                />
              </td>
              <td className="py-3 pr-4">
                <input
                  type="text"
                  value={tier.shopKey}
                  onChange={(e) => update(i, "shopKey", e.target.value)}
                  className={`${smallInput} w-44`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 pt-3 border-t border-panel-border">
        <button
          type="button"
          onClick={() => onChange([...tiers, { name: "", maxLevel: 999, shopKey: "" }])}
          className="px-3 py-1.5 text-xs bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded-lg transition-colors text-[#cccccc]"
        >
          + 添加等级
        </button>
      </div>
    </FormCard>
  );
}

export function BossLevelBonusEditor({
  bonuses,
  onChange,
}: {
  bonuses: BossLevelBonus[];
  onChange: (b: BossLevelBonus[]) => void;
}) {
  const update = (i: number, field: keyof BossLevelBonus, value: number | null) => {
    const b = [...bonuses];
    b[i] = { ...b[i], [field]: value ?? 0 };
    onChange(b);
  };
  const total = bonuses.reduce((s, b) => s + b.chance, 0);
  return (
    <FormCard>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[#858585] text-xs uppercase tracking-wider">
            <th className="pb-3 pr-4 font-medium">概率 (%)</th>
            <th className="pb-3 pr-4 font-medium">额外等级加成</th>
            <th className="pb-3 pr-4 font-medium" />
          </tr>
        </thead>
        <tbody>
          {bonuses.map((b, i) => (
            <tr
              key={i}
              className="border-t border-panel-border group hover:bg-[#2a2a2a] transition-colors"
            >
              <td className="py-3 pr-4">
                <NumberInput
                  value={b.chance}
                  onChange={(v) => update(i, "chance", v)}
                  min={0}
                  max={100}
                  className="w-28"
                />
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[#858585]">+</span>
                  <NumberInput
                    value={b.bonus}
                    onChange={(v) => update(i, "bonus", v)}
                    min={0}
                    className="w-28"
                  />
                </div>
              </td>
              <td className="py-3 pr-4">
                {bonuses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange(bonuses.filter((_, j) => j !== i))}
                    className="text-[#555] hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                  >
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 pt-3 border-t border-panel-border flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange([...bonuses, { chance: 0, bonus: 0 }])}
          className="px-3 py-1.5 text-xs bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded-lg transition-colors text-[#cccccc]"
        >
          + 添加档位
        </button>
        {total !== 100 && <WarnAlert>概率总和为 {total}%，建议设为 100%</WarnAlert>}
      </div>
    </FormCard>
  );
}
