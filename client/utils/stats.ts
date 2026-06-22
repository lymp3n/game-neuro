import { STAT_ORDER } from '@/constants/game';

export const MAX_LEVEL = 150;
export const BASE_STAT_POINTS = 10;
export const STAT_POINTS_PER_LEVEL = 2;

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

// Зеркало server/src/data/gameData.js → deriveStats (для предпросмотра).
export function deriveStats(level: number, s: Record<string, number>) {
  const lvl = Math.max(1, level || 1);
  return {
    maxHp: Math.round(60 + s.endurance * 10 + lvl * 5),
    maxMana: Math.round(30 + s.spirit * 8 + lvl * 3),
    physDamage: Math.round(6 + s.strength * 2 + lvl * 0.5),
    magDamage: Math.round(5 + s.intellect * 2 + lvl * 0.5),
    physArmor: Math.round(s.endurance * 1.5 + s.agility * 0.3),
    magArmor: Math.round(s.spirit * 1.8 + s.intellect * 0.5),
    dodgeChance: clamp(s.agility * 0.006, 0, 0.35),
    critChance: clamp(0.03 + s.luck * 0.006, 0, 0.45),
    critDamageTakenReduction: clamp(s.luck * 0.005, 0, 0.5),
    critMultiplier: 1.5,
    inventoryCapacity: Math.round(30 + s.strength * 2),
    debuffResist: clamp(s.will * 0.02 + s.luck * 0.004 + s.endurance * 0.004, 0, 0.85),
    madnessResist: clamp(s.will * 0.025, 0, 0.9),
  } as Record<string, number>;
}

export const SPELL_SLOT_THRESHOLDS = [1, 15, 30, 50, 75, 100];
export function spellSlotCount(level: number) {
  let count = 1;
  for (const t of SPELL_SLOT_THRESHOLDS) if (level >= t) count++;
  return Math.min(7, count);
}
