export const STATS = ['strength', 'agility', 'endurance', 'intellect', 'spirit', 'will', 'luck'];

export const STAT_LABELS = {
  strength: 'Сила',
  agility: 'Ловкость',
  endurance: 'Выносливость',
  intellect: 'Интеллект',
  spirit: 'Дух',
  will: 'Воля',
  luck: 'Удача',
};

export const STAT_DESCRIPTIONS = {
  strength: 'Физический урон и вместимость личного инвентаря.',
  agility: 'Шанс уклонения от атак.',
  endurance: 'Здоровье, физическая защита и небольшая сопротивляемость дебаффам.',
  intellect: 'Магический урон и немного магической защиты.',
  spirit: 'Мана, сильная магическая защита, сила и длительность накладываемых дебаффов.',
  will: 'Сопротивляемость дебаффам, ясность рассудка (защита от безумия) и эффективность тренировок.',
  luck: 'Шанс крит. удара, защита от критов и небольшая сопротивляемость дебаффам.',
};

// ---- Прогрессия уровней и очков характеристик ----
export const MAX_LEVEL = 150;
export const BASE_STAT_POINTS = 10; // на 1 уровне
export const STAT_POINTS_PER_LEVEL = 2; // за каждый уровень

// Бюджет очков характеристик у персонажа/моба данного уровня.
export function totalStatPoints(level) {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, level || 1));
  return BASE_STAT_POINTS + STAT_POINTS_PER_LEVEL * (lvl - 1);
}

// Стоимость поднятия характеристики на +1 при текущем значении value.
// До 10 — 1 очко, 10..19 — 2 очка, 20..29 — 3 очка и т.д.
export function statUpgradeCost(currentValue) {
  return 1 + Math.floor((currentValue || 0) / 10);
}

// Сколько очков уже вложено в набор характеристик.
export function spentStatPoints(stats) {
  let total = 0;
  for (const s of STATS) {
    const v = Math.max(0, Math.floor(stats?.[s] || 0));
    for (let i = 0; i < v; i++) total += 1 + Math.floor(i / 10);
  }
  return total;
}

export function availableStatPoints(unit) {
  return totalStatPoints(unit.level) - spentStatPoints(unit.stats);
}

export const ITEMS = {
  health_potion: {
    id: 'health_potion',
    name: 'Зелье здоровья',
    type: 'potion',
    sellPrice: 15,
    buyPrice: 30,
    effect: { hp: 50 },
    icon: 'science',
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'Зелье маны',
    type: 'potion',
    sellPrice: 20,
    buyPrice: 40,
    effect: { mana: 40 },
    icon: 'opacity',
  },
  rusty_sword: {
    id: 'rusty_sword',
    name: 'Ржавый меч',
    type: 'weapon',
    slot: 'rightHand',
    sellPrice: 25,
    buyPrice: 60,
    bonuses: { strength: 2 },
    icon: 'sports-martial-arts',
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'Кожаная броня',
    type: 'armor',
    slot: 'body',
    sellPrice: 30,
    buyPrice: 75,
    bonuses: { endurance: 2 },
    icon: 'security',
  },
  leather_cap: {
    id: 'leather_cap',
    name: 'Кожаный шлем',
    type: 'armor',
    slot: 'head',
    sellPrice: 20,
    buyPrice: 50,
    bonuses: { endurance: 1 },
    icon: 'security',
  },
  dungeon_pass: {
    id: 'dungeon_pass',
    name: 'Пропуск в подземелье',
    type: 'pass',
    sellPrice: 0,
    buyPrice: 100,
    icon: 'vpn-key',
  },
};

// Заклинания изучаются по достижении requiredLevel (вехи уровней).
export const SPELLS = {
  fireball: {
    id: 'fireball',
    name: 'Огненный шар',
    manaCost: 12,
    consumesTurn: true,
    effect: { damage: 16, type: 'magic' },
    requiredLevel: 1,
    icon: 'whatshot',
    description: 'Базовый магический снаряд. Урон зависит от Интеллекта.',
  },
  quick_strike: {
    id: 'quick_strike',
    name: 'Быстрый удар',
    manaCost: 8,
    consumesTurn: true,
    effect: { damage: 10, type: 'physical' },
    requiredLevel: 5,
    icon: 'bolt',
    description: 'Стремительный физический выпад.',
  },
  frost_bolt: {
    id: 'frost_bolt',
    name: 'Ледяная стрела',
    manaCost: 18,
    consumesTurn: true,
    effect: { damage: 24, type: 'magic', debuff: { type: 'weaken', stat: 'agility', amount: 4, durationTurns: 2 } },
    requiredLevel: 10,
    icon: 'ac-unit',
    description: 'Урон + замедление: снижает Ловкость цели.',
  },
  heal: {
    id: 'heal',
    name: 'Исцеление',
    manaCost: 20,
    consumesTurn: true,
    effect: { heal: 30 },
    requiredLevel: 20,
    icon: 'favorite',
    description: 'Восстанавливает здоровье. Сила лечения зависит от Духа.',
  },
  weaken: {
    id: 'weaken',
    name: 'Ослабление',
    manaCost: 22,
    consumesTurn: true,
    effect: { debuff: { type: 'weaken', stat: 'strength', amount: 6, durationTurns: 3 } },
    requiredLevel: 30,
    icon: 'trending-down',
    description: 'Дебафф: снижает Силу цели. Шанс и длительность зависят от Духа.',
  },
  purge: {
    id: 'purge',
    name: 'Очищение',
    manaCost: 25,
    consumesTurn: true,
    effect: { cleanse: true },
    requiredLevel: 40,
    icon: 'cleaning-services',
    description: 'Снимает все дебаффы с заклинателя.',
  },
  confusion: {
    id: 'confusion',
    name: 'Помрачение',
    manaCost: 35,
    consumesTurn: true,
    effect: { debuff: { type: 'madness', durationTurns: 2 } },
    requiredLevel: 50,
    icon: 'psychology',
    description: 'Дебафф безумия: цель может потерять контроль и действовать случайно.',
  },
  greater_heal: {
    id: 'greater_heal',
    name: 'Большое исцеление',
    manaCost: 45,
    consumesTurn: true,
    effect: { heal: 70 },
    requiredLevel: 75,
    icon: 'healing',
    description: 'Мощное исцеление. Сила зависит от Духа.',
  },
  meteor: {
    id: 'meteor',
    name: 'Метеор',
    manaCost: 70,
    consumesTurn: true,
    effect: { damage: 80, type: 'magic' },
    requiredLevel: 100,
    icon: 'flare',
    description: 'Разрушительный магический удар по цели.',
  },
};

// Прогрессия слотов заклинаний: 2 на 1 ур. → 7 на 100 ур. Больше 7 не бывает.
export const SPELL_SLOT_THRESHOLDS = [1, 15, 30, 50, 75, 100];
export function spellSlotCount(level) {
  let count = 1; // первый слот всегда
  for (const t of SPELL_SLOT_THRESHOLDS) if (level >= t) count++;
  return Math.min(7, count);
}

// Мобы заданы как и игроки: уровень + характеристики (бюджет = totalStatPoints(level)).
// Все боевые параметры (HP, урон, защиты) вычисляются из характеристик.
export const MOBS = {
  forest_critter: {
    id: 'forest_critter',
    name: 'Лесной зверёк',
    description: 'Мелкий пугливый зверёк. Кусается, но особой угрозы не представляет — добыча для новичков.',
    level: 1,
    xp: 8,
    stats: { strength: 3, agility: 4, endurance: 1, intellect: 0, spirit: 0, will: 1, luck: 1 },
    respawnSec: 120,
    loot: [{ itemId: 'health_potion', chance: 0.2 }],
    icon: 'pets',
  },
  young_goblin: {
    id: 'young_goblin',
    name: 'Гоблин-молодняк',
    description: 'Юный гоблин, ещё не освоивший хитрости стаи. Неплохая разминка для начинающего искателя приключений.',
    level: 2,
    xp: 14,
    stats: { strength: 4, agility: 3, endurance: 2, intellect: 0, spirit: 1, will: 1, luck: 1 },
    respawnSec: 180,
    loot: [{ itemId: 'health_potion', chance: 0.3 }],
    icon: 'smart_toy',
  },
  goblin: {
    id: 'goblin',
    name: 'Гоблин',
    description:
      'Мелкий зеленокожий разбойник с ржавым кинжалом. Поодиночке труслив, но в стае нападает без раздумий.',
    level: 4,
    xp: 25,
    stats: { strength: 5, agility: 3, endurance: 4, intellect: 0, spirit: 1, will: 1, luck: 2 },
    respawnSec: 300,
    loot: [
      { itemId: 'health_potion', chance: 0.4 },
      { itemId: 'rusty_sword', chance: 0.1 },
    ],
    icon: 'smart_toy',
  },
  goblin_chief: {
    id: 'goblin_chief',
    name: 'Вожак гоблинов',
    description:
      'Матёрый предводитель стаи. Носит трофейную броню и бьёт тяжёлой дубиной. Опытные искатели приключений уважают его силу.',
    level: 7,
    xp: 60,
    stats: { strength: 8, agility: 2, endurance: 6, intellect: 0, spirit: 1, will: 3, luck: 2 },
    respawnSec: 300,
    loot: [
      { itemId: 'health_potion', chance: 0.6 },
      { itemId: 'dungeon_pass', chance: 0.15 },
      { itemId: 'leather_armor', chance: 0.08 },
    ],
    icon: 'smart_toy',
  },
  dire_wolf: {
    id: 'dire_wolf',
    name: 'Лютоволк',
    description:
      'Огромный лесной хищник размером с лошадь. Стремителен и свиреп, его клыки пробивают лёгкую броню.',
    level: 7,
    xp: 45,
    stats: { strength: 6, agility: 7, endurance: 5, intellect: 0, spirit: 1, will: 1, luck: 2 },
    respawnSec: 300,
    loot: [{ itemId: 'mana_potion', chance: 0.3 }],
    icon: 'pets',
  },
  cave_rat: {
    id: 'cave_rat',
    name: 'Пещерная крыса',
    description:
      'Облезлая тварь размером с собаку, обитающая в сырых подземельях. Опасна разве что числом и заразой.',
    level: 3,
    xp: 15,
    stats: { strength: 4, agility: 3, endurance: 4, intellect: 0, spirit: 1, will: 1, luck: 1 },
    respawnSec: 180,
    loot: [{ itemId: 'health_potion', chance: 0.2 }],
    icon: 'pest_control',
  },
};

export const LOCATIONS = {
  haven: {
    id: 'haven',
    name: 'Город Хейвен',
    description: 'Тихий торговый город у края леса. Здесь можно отдохнуть, торговать и хранить вещи в сундуке.',
    type: 'city',
    exits: ['darkwood', 'dungeon_entrance'],
    travel: { darkwood: 8, dungeon_entrance: 6 },
    mobs: [],
    features: ['stash', 'merchant'],
    x: 80,
    y: 240,
  },
  darkwood: {
    id: 'darkwood',
    name: 'Тёмный лес',
    description: 'Сырой лес, где древние сосны скрывают солнце. Слышен вой волков и шорох гоблинов.',
    type: 'normal',
    exits: ['haven', 'darkwood_clearing'],
    travel: { haven: 8, darkwood_clearing: 10 },
    mobs: ['forest_critter', 'forest_critter', 'young_goblin'],
    x: 360,
    y: 120,
  },
  darkwood_clearing: {
    id: 'darkwood_clearing',
    name: 'Лесная поляна',
    description: 'Небольшая поляна посреди леса. Здесь обитает вожак гоблинов.',
    type: 'normal',
    exits: ['darkwood'],
    travel: { darkwood: 10 },
    mobs: ['goblin', 'goblin', 'dire_wolf', 'goblin_chief'],
    x: 640,
    y: 120,
  },
  dungeon_entrance: {
    id: 'dungeon_entrance',
    name: 'Вход в подземелье',
    description: 'Тёмный проход ведёт в глубины земли. Нужен пропуск и группа.',
    type: 'dungeon_entry',
    exits: ['haven'],
    travel: { haven: 6 },
    mobs: [],
    dungeonId: 'shadow_caves',
    x: 360,
    y: 400,
  },
};

export const DUNGEONS = {
  shadow_caves: {
    id: 'shadow_caves',
    name: 'Пещеры теней',
    requiredSize: 3,
    passItemId: 'dungeon_pass',
    locations: {
      d1_start: {
        id: 'd1_start',
        name: 'Вход в пещеры',
        description: 'Холодный воздух и капающая вода.',
        type: 'dungeon',
        exits: ['d1_hall'],
        mobs: ['cave_rat'],
        linear: true,
      },
      d1_hall: {
        id: 'd1_hall',
        name: 'Главный зал',
        description: 'Широкий зал с колоннами из камня.',
        type: 'dungeon',
        exits: ['d1_start', 'd1_boss'],
        mobs: ['cave_rat', 'cave_rat'],
        linear: false,
      },
      d1_boss: {
        id: 'd1_boss',
        name: 'Логово вожака',
        description: 'Здесь обитает вожак гоблинов.',
        type: 'dungeon',
        exits: ['d1_hall'],
        mobs: ['goblin_chief'],
        linear: true,
      },
    },
    startLocationId: 'd1_start',
  },
};

export const MERCHANT_STOCK = [
  { itemId: 'health_potion', count: 99 },
  { itemId: 'mana_potion', count: 99 },
  { itemId: 'rusty_sword', count: 3 },
  { itemId: 'leather_armor', count: 2 },
  { itemId: 'leather_cap', count: 2 },
  { itemId: 'dungeon_pass', count: 5 },
];

export function xpForLevel(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.floor(100 * Math.pow(1.32, level - 1));
}

export function getItemBonuses(equipment) {
  const bonuses = {};
  for (const itemId of Object.values(equipment || {})) {
    if (!itemId) continue;
    const item = ITEMS[itemId];
    if (item?.bonuses) {
      for (const [stat, val] of Object.entries(item.bonuses)) {
        bonuses[stat] = (bonuses[stat] || 0) + val;
      }
    }
  }
  return bonuses;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Эффективные характеристики = базовые + бонусы экипировки + бонусы тренировки.
export function getEffectiveStats(unit) {
  const bonuses = getItemBonuses(unit.equipment);
  const training = unit.training?.bonuses || {};
  const stats = {};
  for (const s of STATS) {
    stats[s] = (unit.stats?.[s] || 0) + (bonuses[s] || 0) + (training[s] || 0);
  }
  return stats;
}

/**
 * Главный движок: из уровня и эффективных характеристик считает ВСЕ боевые
 * показатели. Используется одинаково для игроков и мобов.
 */
export function deriveStats(level, eff) {
  const lvl = Math.max(1, level || 1);
  const s = eff;
  const maxHp = Math.round(60 + s.endurance * 10 + lvl * 5);
  const maxMana = Math.round(30 + s.spirit * 8 + lvl * 3);
  const physDamage = Math.round(6 + s.strength * 2 + lvl * 0.5);
  const magDamage = Math.round(5 + s.intellect * 2 + lvl * 0.5);
  const physArmor = Math.round(s.endurance * 1.5 + s.agility * 0.3);
  const magArmor = Math.round(s.spirit * 1.8 + s.intellect * 0.5);
  const dodgeChance = clamp(s.agility * 0.006, 0, 0.35);
  const critChance = clamp(0.03 + s.luck * 0.006, 0, 0.45);
  const critDamageTakenReduction = clamp(s.luck * 0.005, 0, 0.5);
  const inventoryCapacity = Math.round(30 + s.strength * 2);
  // Сопротивляемость дебаффам: снижает шанс поймать дебафф и его длительность.
  const debuffResist = clamp(s.will * 0.02 + s.luck * 0.004 + s.endurance * 0.004, 0, 0.85);
  // Сила/длительность дебаффов, которые накладывает сам юнит (Дух).
  const debuffApplyChance = clamp(0.2 + s.spirit * 0.01, 0, 0.9);
  const debuffDurationMult = 1 + s.spirit * 0.03;
  // Ясность рассудка: Воля защищает от безумия.
  const madnessResist = clamp(s.will * 0.025, 0, 0.9);
  // Тренировка в городе (раз в сутки): эффективность и макс. длительность.
  const trainingPotency = 1 + s.will * 0.04;
  const trainingMaxMinutes = Math.round(30 + s.will * 3);
  return {
    maxHp,
    maxMana,
    physDamage,
    magDamage,
    physArmor,
    magArmor,
    dodgeChance,
    critChance,
    critDamageTakenReduction,
    critMultiplier: 1.5,
    inventoryCapacity,
    debuffResist,
    debuffApplyChance,
    debuffDurationMult,
    madnessResist,
    trainingPotency,
    trainingMaxMinutes,
  };
}

// Кривая брони: урон снижается, но никогда не до нуля.
export function armorReduction(armor, attackerLevel) {
  const k = 40 + (attackerLevel || 1) * 3;
  return armor / (armor + k);
}

// Удобные обёртки для совместимости с остальным кодом.
export function calcMaxHp(unit) {
  return deriveStats(unit.level, getEffectiveStats(unit)).maxHp;
}
export function calcMaxMana(unit) {
  return deriveStats(unit.level, getEffectiveStats(unit)).maxMana;
}
export function calcPhysicalDamage(unit) {
  return deriveStats(unit.level, getEffectiveStats(unit)).physDamage;
}
export function calcMagicDamage(unit) {
  return deriveStats(unit.level, getEffectiveStats(unit)).magDamage;
}
export function calcInventoryLimit(unit) {
  return deriveStats(unit.level, getEffectiveStats(unit)).inventoryCapacity;
}

function sanitizeMob(id, raw = {}) {
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.round(Number(raw.level) || 1)));
  const stats = {};
  for (const s of STATS) {
    const v = Math.max(0, Math.round(Number(raw.stats?.[s]) || 0));
    stats[s] = v;
  }
  const xpValue = Number(raw.xp);
  const respawn = Number(raw.respawnSec);
  return {
    id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id,
    description: typeof raw.description === 'string' ? raw.description : '',
    icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : 'smart_toy',
    level,
    xp: Number.isFinite(xpValue) ? Math.max(0, Math.round(xpValue)) : 0,
    stats,
    respawnSec: Number.isFinite(respawn) && respawn > 0 ? Math.round(respawn) : 300,
    loot: Array.isArray(raw.loot) ? raw.loot.filter((l) => l && l.itemId) : [],
  };
}

function sanitizeLocation(id, raw = {}, knownMobIds) {
  const exits = Array.isArray(raw.exits) ? [...new Set(raw.exits.filter((e) => typeof e === 'string'))] : [];
  const travel = {};
  if (raw.travel && typeof raw.travel === 'object') {
    for (const [to, sec] of Object.entries(raw.travel)) {
      const value = Number(sec);
      if (Number.isFinite(value) && value > 0) travel[to] = value;
    }
  }
  const mobs = Array.isArray(raw.mobs)
    ? raw.mobs.filter((m) => typeof m === 'string' && (!knownMobIds || knownMobIds.has(m)))
    : [];
  const loc = {
    id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id,
    description: typeof raw.description === 'string' ? raw.description : '',
    type: typeof raw.type === 'string' && raw.type ? raw.type : 'normal',
    exits,
    travel,
    mobs,
    x: Number.isFinite(Number(raw.x)) ? Number(raw.x) : 100,
    y: Number.isFinite(Number(raw.y)) ? Number(raw.y) : 100,
  };
  if (Array.isArray(raw.features)) loc.features = raw.features;
  if (typeof raw.dungeonId === 'string') loc.dungeonId = raw.dungeonId;
  return loc;
}

// Боевые показатели моба из его характеристик (у мобов нет экипировки).
export function mobCombat(mob) {
  const eff = {};
  for (const s of STATS) eff[s] = mob.stats?.[s] || 0;
  return { effectiveStats: eff, derived: deriveStats(mob.level, eff) };
}

/**
 * Returns a plain serializable snapshot of all editable content.
 */
export function exportContent() {
  return {
    mobs: JSON.parse(JSON.stringify(MOBS)),
    locations: JSON.parse(JSON.stringify(LOCATIONS)),
  };
}

/**
 * Replaces the in-memory MOBS and LOCATIONS objects in place so existing
 * references (e.g. inside the running world) immediately see the new content.
 * Returns the sanitized content that was applied.
 */
export function applyContent(content = {}) {
  const incomingMobs = content.mobs && typeof content.mobs === 'object' ? content.mobs : {};
  const incomingLocations =
    content.locations && typeof content.locations === 'object' ? content.locations : {};

  for (const key of Object.keys(MOBS)) delete MOBS[key];
  for (const [id, raw] of Object.entries(incomingMobs)) {
    MOBS[id] = sanitizeMob(id, raw);
  }

  const knownMobIds = new Set(Object.keys(MOBS));
  for (const key of Object.keys(LOCATIONS)) delete LOCATIONS[key];
  for (const [id, raw] of Object.entries(incomingLocations)) {
    LOCATIONS[id] = sanitizeLocation(id, raw, knownMobIds);
  }

  return exportContent();
}
