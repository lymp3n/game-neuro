/**
 * Настраиваемые формулы баланса. Редактируются через админку и сохраняются в content.json.
 * Все коэффициенты — множители/базовые значения для deriveStats и боя.
 */
export const DEFAULT_FORMULAS = {
  // Базовые значения и множители характеристик
  hpBase: 60,
  hpPerEndurance: 10,
  hpPerLevel: 5,
  manaBase: 30,
  manaPerSpirit: 8,
  manaPerLevel: 3,

  // Урон ближнего боя: Сила — главный, Ловкость — небольшой бонус точности/силы
  meleeBase: 6,
  meleePerStrength: 2,
  meleePerAgility: 0.4,
  meleePerLevel: 0.5,

  // Урон дальнего боя: Ловкость — главный, Сила — подтягивание снаряда/натяжение
  rangedBase: 5,
  rangedPerAgility: 1.8,
  rangedPerStrength: 0.5,
  rangedPerLevel: 0.5,

  // Магический урон: Интеллект + немного Духа
  magicBase: 5,
  magicPerIntellect: 2,
  magicPerSpirit: 0.3,
  magicPerLevel: 0.5,

  // Защиты
  physArmorPerEndurance: 1.5,
  physArmorPerAgility: 0.3,
  magArmorPerSpirit: 1.8,
  magArmorPerIntellect: 0.5,

  // Уклонение, крит, дебаффы
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
  debuffApplyBase: 0.2,
  debuffApplyPerSpirit: 0.01,
  debuffApplyMax: 0.9,
  debuffDurationPerSpirit: 0.03,
  madnessResistPerWill: 0.025,
  madnessResistMax: 0.9,
  trainingPotencyPerWill: 0.04,
  trainingMinutesBase: 30,
  trainingMinutesPerWill: 3,

  // Разброс урона (%): финальный урон = base * random(1-spread, 1+spread)
  meleeDamageSpread: 0.15,
  rangedDamageSpread: 0.12,
  magicDamageSpread: 0.1,

  // Броня: k = armorKBase + level * armorKPerLevel
  armorKBase: 40,
  armorKPerLevel: 3,

  // Поведение мобов
  aggressiveJoinChancePerSec: 0.1,
  aggressiveForceAfterSec: 10,
  collectiveJoinChancePerSec: 0.1,
};

let activeFormulas = { ...DEFAULT_FORMULAS };

export function getFormulas() {
  return activeFormulas;
}

export function applyFormulas(patch = {}) {
  for (const [key, val] of Object.entries(patch)) {
    if (key in DEFAULT_FORMULAS && Number.isFinite(Number(val))) {
      activeFormulas[key] = Number(val);
    }
  }
  return exportFormulas();
}

export function exportFormulas() {
  return JSON.parse(JSON.stringify(activeFormulas));
}

export function resetFormulas() {
  activeFormulas = { ...DEFAULT_FORMULAS };
  return exportFormulas();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Случайный урон в диапазоне ±spread% от базы. */
export function rollDamage(base, spreadPct = 0.15) {
  const spread = Math.max(0, Math.min(0.5, spreadPct || 0));
  const mult = 1 + (Math.random() * 2 - 1) * spread;
  return Math.max(1, Math.round(base * mult));
}

export function armorReduction(armor, attackerLevel, f = activeFormulas) {
  const k = f.armorKBase + (attackerLevel || 1) * f.armorKPerLevel;
  return armor / (armor + k);
}
