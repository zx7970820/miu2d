/**
 * 掉落相关配置面板
 * DropProbabilityPanel, DropEquipPanel, DropMoneyPanel, DropDrugPanel, DropBossPanel
 */

import type { GameConfigDataFull } from "@miu2d/types";
import { NumberInput } from "@miu2d/ui";
import { Field, FormCard, SectionTitle } from "./FormComponents";
import { BossLevelBonusEditor, DrugTiersEditor, MoneyTiersEditor } from "./TierEditors";

export function DropProbabilityPanel({
  config,
  updateProbability,
}: {
  config: GameConfigDataFull;
  updateProbability: <K extends keyof GameConfigDataFull["drop"]["probability"]>(
    k: K,
    v: number | null
  ) => void;
}) {
  const prob = config.drop.probability;
  return (
    <div className="space-y-4">
      <SectionTitle desc="击杀普通敌人后，每种物品独立进行一次掉落判定。概率为 1/N：N=5 表示 20% 概率掉落，N=10 表示 10%。每种物品的判定互不影响，理论上可以同时掉落多种物品。" />
      <FormCard>
        <div className="grid grid-cols-4 gap-5">
          <Field
            label="武器"
            desc={`概率 = 1/${prob.weaponChance}，约 ${(100 / prob.weaponChance).toFixed(1)}%`}
          >
            <NumberInput
              value={prob.weaponChance}
              onChange={(v) => updateProbability("weaponChance", v)}
              min={1}
              className="w-full"
            />
          </Field>
          <Field
            label="防具"
            desc={`概率 = 1/${prob.armorChance}，约 ${(100 / prob.armorChance).toFixed(1)}%`}
          >
            <NumberInput
              value={prob.armorChance}
              onChange={(v) => updateProbability("armorChance", v)}
              min={1}
              className="w-full"
            />
          </Field>
          <Field
            label="金钱"
            desc={`概率 = 1/${prob.moneyChance}，约 ${(100 / prob.moneyChance).toFixed(1)}%`}
          >
            <NumberInput
              value={prob.moneyChance}
              onChange={(v) => updateProbability("moneyChance", v)}
              min={1}
              className="w-full"
            />
          </Field>
          <Field
            label="药品"
            desc={`概率 = 1/${prob.drugChance}，约 ${(100 / prob.drugChance).toFixed(1)}%`}
          >
            <NumberInput
              value={prob.drugChance}
              onChange={(v) => updateProbability("drugChance", v)}
              min={1}
              className="w-full"
            />
          </Field>
        </div>
      </FormCard>
    </div>
  );
}

export function DropEquipPanel({
  config,
  updateEquipTier,
}: {
  config: GameConfigDataFull;
  updateEquipTier: <K extends keyof GameConfigDataFull["drop"]["equipTier"]>(
    k: K,
    v: number | null
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle
        desc={`将 NPC 等级映射为掉落物品的等级档位。公式：掉落等级 = floor(NPC等级 / 除数) + 1。例如除数为 5、NPC 等级为 12，则掉落等级 = floor(12/5)+1 = 3。武器、防具、金钱、药品共用此公式。`}
      />
      <FormCard>
        <div className="grid grid-cols-3 gap-5">
          <Field
            label="等级除数"
            desc={`NPC 等级除以此值后取整再 +1 得到掉落等级。值越大等级跨度越大，例如除数 ${config.drop.equipTier.divisor} 表示每 ${config.drop.equipTier.divisor} 级敌人共用一个掉落池`}
          >
            <NumberInput
              value={config.drop.equipTier.divisor}
              onChange={(v) => updateEquipTier("divisor", v)}
              min={1}
              className="w-full"
            />
          </Field>
          <Field
            label="最大等级"
            desc={`掉落等级的上限。无论 NPC 多高等级，掉落物品最高为 ${config.drop.equipTier.maxTier} 级`}
          >
            <NumberInput
              value={config.drop.equipTier.maxTier}
              onChange={(v) => updateEquipTier("maxTier", v)}
              min={1}
              className="w-full"
            />
          </Field>
        </div>
      </FormCard>
    </div>
  );
}

export function DropMoneyPanel({
  config,
  updateDrop,
}: {
  config: GameConfigDataFull;
  updateDrop: <K extends keyof GameConfigDataFull["drop"]>(
    k: K,
    v: GameConfigDataFull["drop"][K]
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle desc="当敌人掉落金钱时，根据掉落等级（由装备等级映射公式计算）在对应档位的范围内随机一个金额。第 1 档对应掉落等级 1，第 2 档对应等级 2，以此类推。" />
      <MoneyTiersEditor
        tiers={config.drop.moneyTiers}
        onChange={(t) => updateDrop("moneyTiers", t)}
      />
    </div>
  );
}

export function DropDrugPanel({
  config,
  updateDrop,
}: {
  config: GameConfigDataFull;
  updateDrop: <K extends keyof GameConfigDataFull["drop"]>(
    k: K,
    v: GameConfigDataFull["drop"][K]
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle desc="按 NPC 等级区间决定掉落哪个药品池。每一档定义一个 NPC 最低等级的阈值，NPC 等级 ≥ 阈值时使用该档位的药品列表。最后一条为兜底规则，匹配所有未被前面规则覆盖的等级。" />
      <DrugTiersEditor tiers={config.drop.drugTiers} onChange={(t) => updateDrop("drugTiers", t)} />
    </div>
  );
}

export function DropBossPanel({
  config,
  updateDrop,
}: {
  config: GameConfigDataFull;
  updateDrop: <K extends keyof GameConfigDataFull["drop"]>(
    k: K,
    v: GameConfigDataFull["drop"][K]
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle desc="Boss 级敌人（ExpBonus > 0 的 NPC）击杀后必定掉落武器或防具。掉落时会在各档位中按概率抽取一个额外等级加成，最终掉落等级 = 基础掉落等级 + 抽中的加成值。概率总和建议为 100%。" />
      <BossLevelBonusEditor
        bonuses={config.drop.bossLevelBonuses}
        onChange={(b) => updateDrop("bossLevelBonuses", b)}
      />
    </div>
  );
}
