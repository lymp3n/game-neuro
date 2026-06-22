export const STATS = ['strength', 'agility', 'endurance', 'wisdom', 'intuition', 'luck', 'will'];

export const STAT_LABELS = {
  strength: 'Сила',
  agility: 'Ловкость',
  endurance: 'Выносливость',
  wisdom: 'Мудрость',
  intuition: 'Интуиция',
  luck: 'Удача',
  will: 'Воля',
};

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

export const SPELLS = {
  fireball: {
    id: 'fireball',
    name: 'Огненный шар',
    manaCost: 15,
    consumesTurn: true,
    effect: { damage: 25, type: 'magic' },
    requiredLevel: 3,
    skillPointCost: 1,
    icon: 'whatshot',
  },
  heal: {
    id: 'heal',
    name: 'Исцеление',
    manaCost: 20,
    consumesTurn: true,
    effect: { heal: 35 },
    requiredLevel: 5,
    skillPointCost: 2,
    icon: 'favorite',
  },
  quick_strike: {
    id: 'quick_strike',
    name: 'Быстрый удар',
    manaCost: 10,
    consumesTurn: true,
    effect: { damage: 12, type: 'physical' },
    requiredLevel: 7,
    skillPointCost: 2,
    icon: 'bolt',
  },
};

export const MOBS = {
  goblin: {
    id: 'goblin',
    name: 'Гоблин',
    description:
      'Мелкий зеленокожий разбойник с ржавым кинжалом. Поодиночке труслив, но в стае нападает без раздумий.',
    level: 4,
    hp: 60,
    physicalAttack: 8,
    magicAttack: 2,
    armor: 3,
    xp: 25,
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
    hp: 120,
    physicalAttack: 15,
    magicAttack: 5,
    armor: 8,
    xp: 60,
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
    hp: 90,
    physicalAttack: 14,
    magicAttack: 0,
    armor: 5,
    xp: 45,
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
    hp: 40,
    physicalAttack: 6,
    magicAttack: 0,
    armor: 2,
    xp: 15,
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
    mobs: ['goblin', 'goblin', 'dire_wolf'],
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
    mobs: ['goblin_chief', 'goblin'],
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
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function calcMaxHp(player) {
  return 80 + player.stats.endurance * 10 + player.level * 5;
}

export function calcMaxMana(player) {
  return 50 + player.stats.wisdom * 8 + player.level * 3;
}

export function calcPhysicalDamage(player) {
  return 10 + player.stats.strength * 2 + player.level;
}

export function calcMagicDamage(player) {
  return 8 + player.stats.wisdom * 2 + player.level;
}

export function calcArmor(player) {
  return player.stats.endurance + Math.floor(player.stats.agility / 2);
}

export function getItemBonuses(equipment) {
  const bonuses = {};
  for (const itemId of Object.values(equipment)) {
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

export function getEffectiveStats(player) {
  const bonuses = getItemBonuses(player.equipment);
  const stats = {};
  for (const s of STATS) {
    stats[s] = (player.stats[s] || 0) + (bonuses[s] || 0);
  }
  return stats;
}

const MOB_NUMERIC_FIELDS = ['level', 'hp', 'physicalAttack', 'magicAttack', 'armor', 'xp', 'respawnSec'];

function sanitizeMob(id, raw = {}) {
  const mob = {
    id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id,
    description: typeof raw.description === 'string' ? raw.description : '',
    icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : 'smart_toy',
    loot: Array.isArray(raw.loot) ? raw.loot.filter((l) => l && l.itemId) : [],
  };
  for (const field of MOB_NUMERIC_FIELDS) {
    const value = Number(raw[field]);
    mob[field] = Number.isFinite(value) ? value : 0;
  }
  if (!mob.respawnSec) mob.respawnSec = 300;
  return mob;
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
