import { STAT_ORDER } from '@/constants/game';

export const MAX_LEVEL = 150;
export const BASE_STAT_POINTS = 10;
export const STAT_POINTS_PER_LEVEL = 2;

// Зеркало server/src/data/formulaConfig.js DEFAULT_FORMULAS (для предпросмотра на клиенте).
const F = {
  hpBase: 60,
  hpPerEndurance: 10,
  hpPerLevel: 5,
  manaBase: 30,
  manaPerSpirit: 8,
  manaPerLevel: 3,
  meleeBase: 6,
  meleePerStrength: 2,
  meleePerAgility: 0.4,
  meleePerLevel: 0.5,
  rangedBase: 5,
  rangedPerAgility: 1.8,
  rangedPerStrength: 0.5,
  rangedPerLevel: 0.5,
  magicBase: 5,
  magicPerIntellect: 2,
  magicPerSpirit: 0.3,
  magicPerLevel: 0.5,
  physArmorPerEndurance: 1.5,
  physArmorPerAgility: 0.3,
  magArmorPerSpirit: 1.8,
  magArmorPerIntellect: 0.5,
  dodgePerAgility: 0.006,
  dodgeMax: 0.35,
  critBase: 0.03,
  critPerLuck: 0.006,
  critMax: 0.45,
  critReductionPerLuck: 0.005,
  critReductionMax: 0.5,
  critMultiplier: 1.5,
  inventoryBase: 30,
  inventoryPerStrength: 2,
  debuffResistPerWill: 0.02,
  debuffResistPerLuck: 0.004,
  debuffResistPerEndurance: 0.004,
  debuffResistMax: 0.85,
  madnessResistPerWill: 0.025,
  madnessResistMax: 0.9,
};

export function totalStatPoints(level: number) {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, level || 1));
  return BASE_STAT_POINTS + STAT_POINTS_PER_LEVEL * (lvl - 1);
}

export function statUpgradeCost(currentValue: number) {
  return 1 + Math.floor((currentValue || 0) / 10);
}

export function spentStatPoints(stats: Record<string, number>) {
  let total = 0;
  for (const s of STAT_ORDER) {
    const v = Math.max(0, Math.floor(stats?.[s] || 0));
    for (let i = 0; i < v; i++) total += 1 + Math.floor(i / 10);
  }
  return total;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function deriveStats(level: number, s: Record<string, number>) {
  const lvl = Math.max(1, level || 1);
  const maxHp = Math.round(F.hpBase + s.endurance * F.hpPerEndurance + lvl * F.hpPerLevel);
  const maxMana = Math.round(F.manaBase + s.spirit * F.manaPerSpirit + lvl * F.manaPerLevel);
  const meleeDamage = Math.round(
    F.meleeBase + s.strength * F.meleePerStrength + s.agility * F.meleePerAgility + lvl * F.meleePerLevel
  );
  const rangedDamage = Math.round(
    F.rangedBase + s.agility * F.rangedPerAgility + s.strength * F.rangedPerStrength + lvl * F.rangedPerLevel
  );
  const magDamage = Math.round(
    F.magicBase + s.intellect * F.magicPerIntellect + s.spirit * F.magicPerSpirit + lvl * F.magicPerLevel
  );
  const physDamage = Math.max(meleeDamage, rangedDamage);
  return {
    maxHp,
    maxMana,
    physDamage,
    meleeDamage,
    rangedDamage,
    magDamage,
    physArmor: Math.round(s.endurance * F.physArmorPerEndurance + s.agility * F.physArmorPerAgility),
    magArmor: Math.round(s.spirit * F.magArmorPerSpirit + s.intellect * F.magArmorPerIntellect),
    dodgeChance: clamp(s.agility * F.dodgePerAgility, 0, F.dodgeMax),
    critChance: clamp(F.critBase + s.luck * F.critPerLuck, 0, F.critMax),
    critDamageTakenReduction: clamp(s.luck * F.critReductionPerLuck, 0, F.critReductionMax),
    critMultiplier: F.critMultiplier,
    inventoryCapacity: Math.round(F.inventoryBase + s.strength * F.inventoryPerStrength),
    debuffResist: clamp(
      s.will * F.debuffResistPerWill + s.luck * F.debuffResistPerLuck + s.endurance * F.debuffResistPerEndurance,
      0,
      F.debuffResistMax
    ),
    madnessResist: clamp(s.will * F.madnessResistPerWill, 0, F.madnessResistMax),
  } as Record<string, number>;
}

export const SPELL_SLOT_THRESHOLDS = [1, 15, 30, 50, 75, 100];
export function spellSlotCount(level: number) {
  let count = 1;
  for (const t of SPELL_SLOT_THRESHOLDS) if (level >= t) count++;
  return Math.min(7, count);
}
