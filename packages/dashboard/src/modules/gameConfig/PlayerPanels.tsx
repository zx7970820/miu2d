/**
 * 玩家相关配置面板
 * PlayerSpeedPanel, PlayerThewPanel, PlayerRestorePanel, PlayerCombatPanel
 */

import type { PlayerCombat, PlayerRestore, PlayerSpeed, PlayerThewCost } from "@miu2d/types";
import { NumberInput } from "@miu2d/ui";
import { Field, FormCard, HelpTip, SectionTitle } from "./FormComponents";

export function PlayerSpeedPanel({
  speed,
  onChange,
}: {
  speed: PlayerSpeed;
  onChange: (s: PlayerSpeed) => void;
}) {
  const up = (field: keyof PlayerSpeed, v: number | null) =>
    onChange({ ...speed, [field]: v ?? 1 });
  return (
    <div className="space-y-4">
      <SectionTitle desc="控制主角在地图上的移动速度。基础速度决定角色每帧前进的像素数，跑步倍数用于计算跑步时的加速效果。" />
      <FormCard>
        <div className="grid grid-cols-3 gap-5">
          <Field label="基础速度" desc="角色每游戏帧移动的像素数。值越大移动越快，建议范围 1~10">
            <NumberInput
              value={speed.baseSpeed}
              onChange={(v) => up("baseSpeed", v)}
              min={1}
              className="w-full"
            />
          </Field>
          <Field
            label="跑步倍数"
            desc="跑步速度 = 基础速度 × 此倍数。例如基础速度 4、倍数 2 则跑步速度为 8 像素/帧"
          >
            <NumberInput
              value={speed.runSpeedFold}
              onChange={(v) => up("runSpeedFold", v)}
              min={1}
              className="w-full"
            />
          </Field>
          <Field
            label="最低减速 %"
            desc="武功/BUFF 能施加的最大减速百分比。-90 表示速度最多降低到原来的 10%"
          >
            <NumberInput
              value={speed.minChangeMoveSpeedPercent}
              onChange={(v) => up("minChangeMoveSpeedPercent", v)}
              min={-100}
              max={0}
              className="w-full"
            />
          </Field>
        </div>
      </FormCard>
    </div>
  );
}

export function PlayerThewPanel({
  thew,
  onChange,
}: {
  thew: PlayerThewCost;
  onChange: (t: PlayerThewCost) => void;
}) {
  const up = (field: keyof PlayerThewCost, v: number | boolean | null) =>
    onChange({ ...thew, [field]: v ?? 0 });
  return (
    <div className="space-y-4">
      <SectionTitle desc="体力（Thew）是角色执行动作的资源。跑步、攻击、跳跃都会消耗体力，体力耗尽后角色无法继续执行对应动作，需要站立等待自然恢复。" />
      <FormCard>
        <div className="grid grid-cols-3 gap-5">
          <Field
            label="跑步消耗 / 帧"
            desc="角色每跑步一帧扣除的体力值。值越高跑步越费体力，设为 0 则跑步不耗体力"
          >
            <NumberInput
              value={thew.runCost}
              onChange={(v) => up("runCost", v)}
              min={0}
              className="w-full"
            />
          </Field>
          <Field label="攻击消耗" desc="每次普通攻击扣除的体力值。体力不足时无法发起攻击">
            <NumberInput
              value={thew.attackCost}
              onChange={(v) => up("attackCost", v)}
              min={0}
              className="w-full"
            />
          </Field>
          <Field label="跳跃消耗" desc="每次跳跃扣除的体力值。体力不足时无法跳跃">
            <NumberInput
              value={thew.jumpCost}
              onChange={(v) => up("jumpCost", v)}
              min={0}
              className="w-full"
            />
          </Field>
        </div>
        <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-panel-border">
          <input
            type="checkbox"
            id="useThewNormalRun"
            checked={thew.useThewWhenNormalRun}
            onChange={(e) => up("useThewWhenNormalRun", e.target.checked)}
            className="accent-[#0098ff] w-4 h-4"
          />
          <label htmlFor="useThewNormalRun" className="text-sm text-[#cccccc] cursor-pointer">
            非战斗跑步时也消耗体力
          </label>
          <HelpTip text="关闭后仅战斗状态下跑步消耗体力，平时在城镇、野外跑步不会扣除体力" />
        </div>
      </FormCard>
    </div>
  );
}

export function PlayerRestorePanel({
  restore,
  onChange,
}: {
  restore: PlayerRestore;
  onChange: (r: PlayerRestore) => void;
}) {
  const up = (field: keyof PlayerRestore, v: number | null) =>
    onChange({ ...restore, [field]: v ?? 0 });
  return (
    <div className="space-y-4">
      <SectionTitle desc="角色站立不动时会自动恢复生命、体力和内力。每经过一个『恢复间隔』，按最大值的百分比回复。打坐状态下内力恢复使用独立的间隔。" />
      <FormCard>
        <div className="grid grid-cols-3 gap-x-6 gap-y-5">
          <Field
            label="生命恢复比例"
            desc="每个恢复周期回复的生命值 = 生命上限 × 此百分比。例如 5% 且生命上限 1000，则每周期恢复 50 点"
          >
            <div className="flex items-center gap-2">
              <NumberInput
                value={Math.round(restore.lifeRestorePercent * 100)}
                onChange={(v) => up("lifeRestorePercent", (v ?? 0) / 100)}
                min={0}
                max={100}
                className="w-full"
              />
              <span className="text-sm text-[#858585] font-medium">%</span>
            </div>
          </Field>
          <Field label="体力恢复比例" desc="每个恢复周期回复的体力值 = 体力上限 × 此百分比">
            <div className="flex items-center gap-2">
              <NumberInput
                value={Math.round(restore.thewRestorePercent * 100)}
                onChange={(v) => up("thewRestorePercent", (v ?? 0) / 100)}
                min={0}
                max={100}
                className="w-full"
              />
              <span className="text-sm text-[#858585] font-medium">%</span>
            </div>
          </Field>
          <Field label="内力恢复比例" desc="每个恢复周期回复的内力值 = 内力上限 × 此百分比">
            <div className="flex items-center gap-2">
              <NumberInput
                value={Math.round(restore.manaRestorePercent * 100)}
                onChange={(v) => up("manaRestorePercent", (v ?? 0) / 100)}
                min={0}
                max={100}
                className="w-full"
              />
              <span className="text-sm text-[#858585] font-medium">%</span>
            </div>
          </Field>
          <Field
            label="恢复间隔"
            desc="两次自动恢复之间的时间间隔。1000ms = 1 秒，值越小恢复越频繁"
          >
            <div className="flex items-center gap-2">
              <NumberInput
                value={restore.restoreIntervalMs}
                onChange={(v) => up("restoreIntervalMs", v)}
                min={100}
                className="w-full"
              />
              <span className="text-sm text-[#858585] font-medium">ms</span>
            </div>
          </Field>
          <Field
            label="打坐内力转换间隔"
            desc="角色打坐时，将生命转化为内力的时间间隔。值越小内力恢复越快"
          >
            <div className="flex items-center gap-2">
              <NumberInput
                value={restore.sittingManaRestoreInterval}
                onChange={(v) => up("sittingManaRestoreInterval", v)}
                min={50}
                className="w-full"
              />
              <span className="text-sm text-[#858585] font-medium">ms</span>
            </div>
          </Field>
        </div>
      </FormCard>
    </div>
  );
}

export function PlayerCombatPanel({
  combat,
  onChange,
}: {
  combat: PlayerCombat;
  onChange: (c: PlayerCombat) => void;
}) {
  const up = (field: keyof PlayerCombat, v: number | null) =>
    onChange({ ...combat, [field]: v ?? 1 });
  return (
    <div className="space-y-4">
      <SectionTitle desc="控制战斗状态的切换和 NPC 交互的范围。角色受到攻击或发起攻击后进入战斗姿态，经过脱战时间后自动切回普通姿态。" />
      <FormCard>
        <div className="grid grid-cols-3 gap-5">
          <Field
            label="脱战时间"
            desc="最后一次攻击/受击后，经过此时间角色自动退出战斗姿态，恢复正常站立动画"
          >
            <div className="flex items-center gap-2">
              <NumberInput
                value={combat.maxNonFightSeconds}
                onChange={(v) => up("maxNonFightSeconds", v)}
                min={1}
                className="w-full"
              />
              <span className="text-sm text-[#858585] font-medium">秒</span>
            </div>
          </Field>
          <Field
            label="对话交互半径"
            desc="角色与 NPC 距离在此范围内时可以触发对话。1 格 = 1 个地图瓦片的大小"
          >
            <div className="flex items-center gap-2">
              <NumberInput
                value={combat.dialogRadius}
                onChange={(v) => up("dialogRadius", v)}
                min={1}
                className="w-full"
              />
              <span className="text-sm text-[#858585] font-medium">格</span>
            </div>
          </Field>
        </div>
      </FormCard>
    </div>
  );
}
