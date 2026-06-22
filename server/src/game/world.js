import { v4 as uuid } from 'uuid';
import {
  LOCATIONS,
  DUNGEONS,
  MOBS,
  ITEMS,
  SPELLS,
  MERCHANT_STOCK,
  STATS,
  MAX_LEVEL,
  xpForLevel,
  calcMaxHp,
  calcMaxMana,
  calcInventoryLimit,
  getEffectiveStats,
  deriveStats,
  armorReduction,
  totalStatPoints,
  spentStatPoints,
  availableStatPoints,
  statUpgradeCost,
  spellSlotCount,
  mobCombat,
} from '../data/gameData.js';

const TURN_DURATION_MS = 10000;
const TRAVEL_MIN_MS = 7000;
const TRAVEL_MAX_MS = 10000;
const ITEM_EXCLUSIVE_MS = 120000;
const ITEM_PUBLIC_MS = 180000;
const MOB_RESPAWN_MS = 300000;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollLoot(lootTable) {
  const drops = [];
  for (const entry of lootTable) {
    if (Math.random() <= entry.chance) {
      drops.push(entry.itemId);
    }
  }
  return drops;
}

export class GameWorld {
  constructor() {
    this.players = new Map();
    this.sessions = new Map();
    this.locationState = {};
    this.battles = new Map();
    this.chatMessages = [];
    this.dungeonGroups = new Map();
    this.travelTimers = new Map();
    this.persistence = null;
    this._persistCounter = 0;

    this.initLocations();
    setInterval(() => this.tick(), 1000);
  }

  // Регистрирует функцию сохранения игрока (см. server/src/db). Опционально.
  setPersistence(saveFn) {
    this.persistence = saveFn;
  }

  persistPlayer(player) {
    if (this.persistence && player) {
      Promise.resolve(this.persistence(player)).catch((e) =>
        console.error('Ошибка сохранения игрока:', e.message)
      );
    }
  }

  // Загружает сохранённого игрока в память (при старте сервера).
  hydratePlayer(data) {
    if (!data?.id) return;
    const player = { ...data, ws: null };
    if (!player.stats) player.stats = Object.fromEntries(STATS.map((s) => [s, 0]));
    this.normalizeSpellSlots(player);
    this.players.set(player.id, player);
  }

  initLocations() {
    for (const loc of Object.values(LOCATIONS)) {
      this.locationState[loc.id] = {
        mobInstances: loc.mobs.map((mobId, i) => ({
          instanceId: `${loc.id}_${mobId}_${i}`,
          mobId,
          alive: true,
          respawnAt: null,
        })),
        groundItems: [],
        activeBattles: [],
      };
    }
  }

  tick() {
    const now = Date.now();
    for (const state of Object.values(this.locationState)) {
      state.mobInstances.forEach((m) => {
        if (!m.alive && m.respawnAt && now >= m.respawnAt) {
          m.alive = true;
          m.respawnAt = null;
        }
      });
      state.groundItems = state.groundItems.filter((gi) => now < gi.expiresAt);
    }

    for (const player of this.players.values()) {
      if (player.training && now >= player.training.endsAt) {
        player.training = null;
        if (player.ws) this.send(player, { type: 'player_update', data: this.serializePlayer(player) });
      }
      if (!player.inBattle && player.hp < calcMaxHp(player)) {
        player.hp = Math.min(calcMaxHp(player), player.hp + 1);
      }
      if (!player.inBattle && player.mana < calcMaxMana(player)) {
        const regen = 1 + Math.floor(getEffectiveStats(player).spirit / 5);
        player.mana = Math.min(calcMaxMana(player), player.mana + regen);
      }
    }

    for (const battle of this.battles.values()) {
      if (battle.status !== 'active') continue;
      this.processBattleTurn(battle, now);
    }

    // Периодическое автосохранение игроков в БД (раз в ~15 секунд).
    if (this.persistence && ++this._persistCounter >= 15) {
      this._persistCounter = 0;
      for (const player of this.players.values()) this.persistPlayer(player);
    }
  }

  createPlayer(name, extra = {}) {
    const id = extra.id || uuid();
    const player = {
      id,
      name,
      level: 1,
      xp: 0,
      stats: Object.fromEntries(STATS.map((s) => [s, 0])),
      training: null,
      lastTrainingAt: 0,
      hp: 100,
      mana: 50,
      gold: 50,
      locationId: 'haven',
      inventory: [
        { itemId: 'health_potion', count: 3 },
        { itemId: 'mana_potion', count: 2 },
        { itemId: 'dungeon_pass', count: 1 },
      ],
      equipment: { head: null, body: null, rightHand: null, leftHand: null, boots: null },
      stash: [],
      stashLimit: 200,
      learnedSpells: ['fireball'],
      spellSlots: ['fireball', null],
      inBattle: null,
      traveling: null,
      inDungeon: null,
      dungeonGroupId: null,
      ws: null,
      ...extra,
    };
    this.normalizeSpellSlots(player);
    player.hp = calcMaxHp(player);
    player.mana = calcMaxMana(player);
    this.players.set(id, player);
    return player;
  }

  // Длина массива слотов = доступному по уровню числу слотов.
  normalizeSpellSlots(player) {
    const count = spellSlotCount(player.level);
    const slots = Array.isArray(player.spellSlots) ? player.spellSlots.slice(0, count) : [];
    while (slots.length < count) slots.push(null);
    // Сбрасываем слоты с незаизученными заклинаниями.
    player.spellSlots = slots.map((id) => (id && player.learnedSpells.includes(id) ? id : null));
  }

  login(name, extra = {}) {
    const existing = [...this.players.values()].find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;
    const player = this.createPlayer(name, extra);
    this.persistPlayer(player);
    return player;
  }

  loginWithGoogle({ googleId, email, name }) {
    let player = [...this.players.values()].find((p) => p.googleId === googleId);
    if (!player) {
      const base = (name || (email ? email.split('@')[0] : 'Игрок')).trim();
      let unique = base;
      let i = 1;
      while ([...this.players.values()].some((p) => p.name.toLowerCase() === unique.toLowerCase())) {
        unique = `${base}${i++}`;
      }
      player = this.createPlayer(unique, { googleId, email });
      this.persistPlayer(player);
    }
    return player;
  }

  attachSession(playerId, ws) {
    const player = this.players.get(playerId);
    if (player?.ws) {
      try {
        player.ws.close();
      } catch {}
    }
    if (player) player.ws = ws;
    this.sessions.set(ws, playerId);
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getLocationForPlayer(player) {
    if (player.inDungeon) {
      const dungeon = DUNGEONS[player.inDungeon.dungeonId];
      return dungeon.locations[player.inDungeon.locationId];
    }
    return LOCATIONS[player.locationId];
  }

  getLocationState(locationId) {
    return this.locationState[locationId];
  }

  getInventoryCount(player) {
    return player.inventory.reduce((sum, i) => sum + i.count, 0);
  }

  addToInventory(player, itemId, count = 1) {
    const existing = player.inventory.find((i) => i.itemId === itemId);
    if (existing) existing.count += count;
    else player.inventory.push({ itemId, count });
  }

  removeFromInventory(player, itemId, count = 1) {
    const idx = player.inventory.findIndex((i) => i.itemId === itemId);
    if (idx === -1) return false;
    if (player.inventory[idx].count < count) return false;
    player.inventory[idx].count -= count;
    if (player.inventory[idx].count <= 0) player.inventory.splice(idx, 1);
    return true;
  }

  serializePlayer(player) {
    const loc = this.getLocationForPlayer(player);
    const locId = player.inDungeon ? player.inDungeon.locationId : player.locationId;
    const state = this.getLocationState(locId);
    const eff = getEffectiveStats(player);
    const derived = deriveStats(player.level, eff);
    return {
      id: player.id,
      name: player.name,
      level: player.level,
      maxLevel: MAX_LEVEL,
      xp: player.xp,
      xpToNext: xpForLevel(player.level),
      statPoints: availableStatPoints(player),
      totalStatPoints: totalStatPoints(player.level),
      spentStatPoints: spentStatPoints(player.stats),
      stats: player.stats,
      effectiveStats: eff,
      derived,
      training: player.training,
      lastTrainingAt: player.lastTrainingAt,
      hp: player.hp,
      maxHp: derived.maxHp,
      mana: player.mana,
      maxMana: derived.maxMana,
      gold: player.gold,
      locationId: locId,
      location: loc,
      inventory: player.inventory,
      inventoryCount: this.getInventoryCount(player),
      inventoryLimit: derived.inventoryCapacity,
      equipment: player.equipment,
      stash: player.stash,
      learnedSpells: player.learnedSpells,
      spellSlots: player.spellSlots,
      spellSlotCount: spellSlotCount(player.level),
      inBattle: player.inBattle,
      traveling: player.traveling,
      inDungeon: player.inDungeon,
      dungeonGroupId: player.dungeonGroupId,
      activeDebuffs: this.getActiveDebuffsFor(player.id),
      locationView: state ? this.serializeLocation(locId, player.id) : null,
    };
  }

  getActiveDebuffsFor(unitId) {
    const battle = this.battles.get(this.players.get(unitId)?.inBattle);
    if (!battle) return [];
    const c = battle.combatants?.[unitId];
    return c?.debuffs ?? [];
  }

  serializeLocation(locationId, viewerId) {
    const loc = LOCATIONS[locationId] || Object.values(DUNGEONS).flatMap((d) => Object.values(d.locations)).find((l) => l.id === locationId);
    const state = this.locationState[locationId];
    if (!state) return null;

    const now = Date.now();
    return {
      ...loc,
      mobs: state.mobInstances
        .filter((m) => m.alive)
        .map((m) => this.serializeMob(m.instanceId, m.mobId)),
      groundItems: state.groundItems.map((gi) => ({
        id: gi.id,
        itemId: gi.itemId,
        count: gi.count,
        canPickup: this.canPickupItem(gi, viewerId, now),
        expiresIn: Math.max(0, Math.floor((gi.expiresAt - now) / 1000)),
      })),
      activeFights: state.activeBattles
        .map((bid) => this.battles.get(bid))
        .filter(Boolean)
        .filter((b) => b.status === 'active')
        .map((b) => ({
          id: b.id,
          mobName: b.mobName,
          participants: b.participants.map((pid) => this.players.get(pid)?.name).filter(Boolean),
        })),
    };
  }

  serializeMob(instanceId, mobId) {
    const mob = MOBS[mobId];
    if (!mob) return { instanceId, id: mobId, name: mobId, level: 1, stats: {}, derived: {} };
    const { effectiveStats, derived } = mobCombat(mob);
    return {
      instanceId,
      id: mob.id,
      name: mob.name,
      description: mob.description,
      icon: mob.icon,
      level: mob.level,
      xp: mob.xp,
      stats: mob.stats,
      effectiveStats,
      derived,
      hp: derived.maxHp,
      maxHp: derived.maxHp,
    };
  }

  canPickupItem(groundItem, playerId, now) {
    if (now >= groundItem.expiresAt) return false;
    if (now < groundItem.exclusiveUntil) return groundItem.killerId === playerId;
    return true;
  }

  broadcastLocation(locationId) {
    for (const player of this.players.values()) {
      const pid = player.inDungeon ? player.inDungeon.locationId : player.locationId;
      if (pid === locationId && player.ws) {
        this.send(player, { type: 'location_update', data: this.serializeLocation(locationId, player.id) });
      }
    }
  }

  send(player, message) {
    if (player?.ws?.readyState === 1) {
      player.ws.send(JSON.stringify(message));
    }
  }

  sendToBattle(battle, message) {
    for (const pid of battle.participants) {
      const p = this.players.get(pid);
      this.send(p, message);
    }
  }

  clearTravelTimer(playerId) {
    const timer = this.travelTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.travelTimers.delete(playerId);
    }
  }

  travelDurationMs(loc, targetLocationId) {
    const sec = loc?.travel?.[targetLocationId];
    if (Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000);
    return randomInt(TRAVEL_MIN_MS, TRAVEL_MAX_MS);
  }

  startTravel(player, targetLocationId) {
    if (!player) return { error: 'Игрок не найден' };
    if (player.inBattle) return { error: 'Нельзя идти во время боя' };
    const loc = this.getLocationForPlayer(player);
    if (!loc.exits.includes(targetLocationId)) return { error: 'Нет перехода' };
    // Already heading to the same place — ignore.
    if (player.traveling?.to === targetLocationId) return { player: this.serializePlayer(player) };

    // Changing destination mid-travel: cancel the previous timer first.
    this.clearTravelTimer(player.id);

    const duration = this.travelDurationMs(loc, targetLocationId);
    const startedAt = Date.now();
    player.traveling = {
      to: targetLocationId,
      from: player.inDungeon ? player.inDungeon.locationId : player.locationId,
      startedAt,
      endsAt: startedAt + duration,
      durationMs: duration,
    };
    const timer = setTimeout(() => this.completeTravel(player.id), duration);
    this.travelTimers.set(player.id, timer);
    return { player: this.serializePlayer(player) };
  }

  cancelTravel(playerId) {
    const player = this.players.get(playerId);
    if (!player) return { error: 'Игрок не найден' };
    if (!player.traveling) return { error: 'Вы никуда не идёте' };
    this.clearTravelTimer(playerId);
    player.traveling = null;
    return { player: this.serializePlayer(player) };
  }

  completeTravel(playerId) {
    const player = this.players.get(playerId);
    this.travelTimers.delete(playerId);
    if (!player?.traveling) return;
    const target = player.traveling.to;
    player.traveling = null;
    if (player.inDungeon) {
      player.inDungeon.locationId = target;
    } else {
      player.locationId = target;
    }
    this.send(player, { type: 'travel_complete', data: this.serializePlayer(player) });
    this.broadcastLocation(target);
  }

  /**
   * Re-applies edited content (locations/mobs) to the running world without
   * dropping connected players. Rebuilds mob instances for overworld locations,
   * preserving alive/respawn state of mobs that still exist, then notifies
   * everyone whose current location changed.
   */
  reloadContent() {
    const previous = this.locationState;
    this.locationState = {};
    for (const loc of Object.values(LOCATIONS)) {
      const old = previous[loc.id];
      this.locationState[loc.id] = {
        mobInstances: (loc.mobs || []).map((mobId, i) => {
          const instanceId = `${loc.id}_${mobId}_${i}`;
          const prevInst = old?.mobInstances.find((m) => m.instanceId === instanceId);
          return {
            instanceId,
            mobId,
            alive: prevInst ? prevInst.alive : true,
            respawnAt: prevInst ? prevInst.respawnAt : null,
          };
        }),
        groundItems: old?.groundItems ?? [],
        activeBattles: old?.activeBattles ?? [],
      };
    }
    // Move any player whose location was deleted back to a safe default.
    const fallback = LOCATIONS.haven ? 'haven' : Object.keys(LOCATIONS)[0];
    for (const player of this.players.values()) {
      if (!player.inDungeon && !LOCATIONS[player.locationId] && fallback) {
        player.locationId = fallback;
        this.clearTravelTimer(player.id);
        player.traveling = null;
        this.send(player, { type: 'player_update', data: this.serializePlayer(player) });
      } else if (player.ws) {
        this.send(player, { type: 'player_update', data: this.serializePlayer(player) });
      }
    }
  }

  startBattle(playerId, mobInstanceId) {
    const player = this.players.get(playerId);
    if (!player || player.inBattle) return { error: 'Уже в бою' };

    const locId = player.inDungeon ? player.inDungeon.locationId : player.locationId;
    const state = this.locationState[locId];
    const mobInst = state?.mobInstances.find((m) => m.instanceId === mobInstanceId && m.alive);
    if (!mobInst) return { error: 'Моб не найден' };

    const existing = [...this.battles.values()].find(
      (b) => b.locationId === locId && b.mobInstanceId === mobInstanceId && b.status === 'active'
    );
    if (existing) return this.joinBattle(playerId, existing.id);

    const mobTemplate = MOBS[mobInst.mobId];
    const mobDerived = mobCombat(mobTemplate).derived;
    const battle = {
      id: uuid(),
      locationId: locId,
      mobInstanceId,
      mobId: mobInst.mobId,
      mobName: mobTemplate.name,
      mobHp: mobDerived.maxHp,
      mobMaxHp: mobDerived.maxHp,
      mobLevel: mobTemplate.level,
      status: 'active',
      participants: [playerId],
      log: [`Бой начался! ${player.name} против ${mobTemplate.name}.`],
      turnStartedAt: Date.now(),
      turnEndsAt: Date.now() + TURN_DURATION_MS,
      playerActions: {},
      mobActedThisTurn: false,
      mobActScheduled: false,
      combatants: { [playerId]: { debuffs: [] }, mob: { debuffs: [] } },
    };

    this.battles.set(battle.id, battle);
    state.activeBattles.push(battle.id);
    player.inBattle = battle.id;
    this.scheduleMobAction(battle);
    this.sendToBattle(battle, { type: 'battle_start', data: this.serializeBattle(battle) });
    this.broadcastLocation(locId);
    return { battleId: battle.id };
  }

  joinBattle(playerId, battleId) {
    const player = this.players.get(playerId);
    const battle = this.battles.get(battleId);
    if (!player || !battle || battle.status !== 'active') return { error: 'Бой недоступен' };
    if (battle.participants.includes(playerId)) return { battleId };
    if (player.inBattle) return { error: 'Уже в бою' };

    battle.participants.push(playerId);
    if (!battle.combatants[playerId]) battle.combatants[playerId] = { debuffs: [] };
    battle.log.push(`${player.name} присоединился к бою!`);
    player.inBattle = battle.id;
    this.sendToBattle(battle, { type: 'battle_update', data: this.serializeBattle(battle) });
    return { battleId };
  }

  scheduleMobAction(battle) {
    if (battle.mobActScheduled || battle.status !== 'active') return;
    battle.mobActScheduled = true;
    const delay = randomInt(2000, TURN_DURATION_MS - 1000);
    setTimeout(() => {
      if (battle.status === 'active' && !battle.mobActedThisTurn) {
        this.mobAttack(battle);
      }
    }, delay);
  }

  processBattleTurn(battle, now) {
    if (now < battle.turnEndsAt) return;
    battle.log.push('Ход завершён по таймеру.');
    this.endTurn(battle);
  }

  tickDebuffs(battle) {
    for (const [unitId, c] of Object.entries(battle.combatants)) {
      if (!c.debuffs?.length) continue;
      const name = this.unitName(battle, unitId);
      const remaining = [];
      for (const d of c.debuffs) {
        d.turnsLeft -= 1;
        if (d.turnsLeft > 0) remaining.push(d);
        else {
          const label = d.type === 'madness' ? 'Безумие' : 'Ослабление';
          battle.log.push(`${name}: эффект «${label}» закончился.`);
        }
      }
      c.debuffs = remaining;
    }
  }

  // Безумные игроки в начале хода действуют случайно и автоматически.
  processMadness(battle) {
    for (const pid of [...battle.participants]) {
      if (battle.status !== 'active') break;
      if (battle.playerActions[pid]) continue;
      if (!this.isMad(battle, pid)) continue;
      const action = this.randomMadAction(battle, pid);
      battle.log.push(`${this.unitName(battle, pid)} обезумел и действует неосознанно...`);
      this.performAction(battle, pid, action);
      battle.playerActions[pid] = action;
      if (battle.mobHp <= 0) {
        this.endBattle(battle, true);
        return;
      }
    }
  }

  endTurn(battle) {
    if (battle.status !== 'active') return;
    this.tickDebuffs(battle);
    battle.playerActions = {};
    battle.mobActedThisTurn = false;
    battle.mobActScheduled = false;
    battle.turnStartedAt = Date.now();
    battle.turnEndsAt = Date.now() + TURN_DURATION_MS;
    this.processMadness(battle);
    if (battle.status !== 'active') return;
    this.scheduleMobAction(battle);
    this.sendToBattle(battle, { type: 'battle_update', data: this.serializeBattle(battle) });
  }

  // Эффективные характеристики бойца с учётом активных дебаффов ослабления.
  combatEffStats(battle, unitId) {
    let eff;
    let level;
    if (unitId === 'mob') {
      const mob = MOBS[battle.mobId];
      eff = { ...mobCombat(mob).effectiveStats };
      level = battle.mobLevel;
    } else {
      const player = this.players.get(unitId);
      eff = { ...getEffectiveStats(player) };
      level = player.level;
    }
    const debuffs = battle.combatants[unitId]?.debuffs ?? [];
    for (const d of debuffs) {
      if (d.type === 'weaken' && d.stat) {
        eff[d.stat] = Math.max(0, (eff[d.stat] || 0) - d.amount);
      }
    }
    return { eff, level, derived: deriveStats(level, eff) };
  }

  // Базовый расчёт урона: уклонение, броня, крит.
  resolveDamage(attacker, defender, rawDamage, kind) {
    if (Math.random() < defender.derived.dodgeChance) {
      return { dodged: true, damage: 0 };
    }
    const armor = kind === 'magic' ? defender.derived.magArmor : defender.derived.physArmor;
    const reduced = rawDamage * (1 - armorReduction(armor, attacker.level));
    let crit = false;
    let dmg = reduced;
    if (Math.random() < attacker.derived.critChance) {
      crit = true;
      const bonus = (attacker.derived.critMultiplier - 1) * (1 - defender.derived.critDamageTakenReduction);
      dmg = reduced * (1 + bonus);
    }
    return { dodged: false, crit, damage: Math.max(1, Math.round(dmg)) };
  }

  tryApplyDebuff(battle, attackerId, targetId, debuff) {
    const attacker = this.combatEffStats(battle, attackerId);
    const target = this.combatEffStats(battle, targetId);
    const chance = attacker.derived.debuffApplyChance * (1 - target.derived.debuffResist);
    if (Math.random() > chance) return false;
    const turns = Math.max(1, Math.round((debuff.durationTurns || 2) * attacker.derived.debuffDurationMult));
    const list = battle.combatants[targetId].debuffs;
    const existing = list.find((d) => d.type === debuff.type && d.stat === debuff.stat);
    if (existing) existing.turnsLeft = Math.max(existing.turnsLeft, turns);
    else list.push({ type: debuff.type, stat: debuff.stat, amount: debuff.amount || 0, turnsLeft: turns });
    return true;
  }

  unitName(battle, unitId) {
    return unitId === 'mob' ? battle.mobName : this.players.get(unitId)?.name ?? 'Боец';
  }

  // Выполнить действие конкретного бойца. Возвращает true, если действие засчитано.
  performAction(battle, actorId, action) {
    const actorName = this.unitName(battle, actorId);

    if (action.type === 'attack') {
      const attacker = this.combatEffStats(battle, actorId);
      const defender = this.combatEffStats(battle, 'mob');
      const res = this.resolveDamage(attacker, defender, attacker.derived.physDamage, 'physical');
      if (res.dodged) {
        battle.log.push(`${battle.mobName} уклонился от атаки ${actorName}.`);
      } else {
        battle.mobHp -= res.damage;
        battle.log.push(`${actorName} атакует и наносит ${res.damage}${res.crit ? ' (крит!)' : ''} урона.`);
      }
    } else if (action.type === 'spell') {
      const player = this.players.get(actorId);
      const spell = SPELLS[action.spellId];
      if (!spell || !player?.learnedSpells.includes(action.spellId)) return { error: 'Заклинание недоступно' };
      if (player.mana < spell.manaCost) return { error: 'Недостаточно маны' };
      player.mana -= spell.manaCost;
      const attacker = this.combatEffStats(battle, actorId);
      if (spell.effect.damage) {
        const defender = this.combatEffStats(battle, 'mob');
        const res = this.resolveDamage(attacker, defender, spell.effect.damage + attacker.derived.magDamage, spell.effect.type || 'magic');
        if (res.dodged) battle.log.push(`${battle.mobName} увернулся от «${spell.name}».`);
        else {
          battle.mobHp -= res.damage;
          battle.log.push(`${actorName} применяет «${spell.name}»: ${res.damage}${res.crit ? ' (крит!)' : ''} урона.`);
        }
      }
      if (spell.effect.heal) {
        const heal = Math.round(spell.effect.heal + attacker.eff.spirit * 1.5);
        player.hp = Math.min(attacker.derived.maxHp, player.hp + heal);
        battle.log.push(`${actorName} исцеляется на ${heal} HP.`);
      }
      if (spell.effect.cleanse) {
        battle.combatants[actorId].debuffs = [];
        battle.log.push(`${actorName} снимает с себя дебаффы.`);
      }
      if (spell.effect.debuff) {
        const applied = this.tryApplyDebuff(battle, actorId, 'mob', spell.effect.debuff);
        battle.log.push(
          applied
            ? `${actorName} накладывает «${spell.name}» на ${battle.mobName}.`
            : `${battle.mobName} сопротивляется «${spell.name}».`
        );
      }
    } else if (action.type === 'potion') {
      const player = this.players.get(actorId);
      const item = ITEMS[action.itemId];
      if (!item || item.type !== 'potion') return { error: 'Не зелье' };
      if (!this.removeFromInventory(player, action.itemId)) return { error: 'Нет зелья' };
      const derived = this.combatEffStats(battle, actorId).derived;
      if (item.effect.hp) {
        player.hp = Math.min(derived.maxHp, player.hp + item.effect.hp);
        battle.log.push(`${actorName} пьёт ${item.name} (+${item.effect.hp} HP).`);
      }
      if (item.effect.mana) {
        player.mana = Math.min(derived.maxMana, player.mana + item.effect.mana);
        battle.log.push(`${actorName} пьёт ${item.name} (+${item.effect.mana} маны).`);
      }
    } else if (action.type === 'skip') {
      battle.log.push(`${actorName} пропускает ход.`);
    } else {
      return { error: 'Неизвестное действие' };
    }
    return { ok: true };
  }

  // Случайное действие при безумии.
  randomMadAction(battle, actorId) {
    const player = this.players.get(actorId);
    const choices = ['attack', 'skip'];
    const castable = (player?.spellSlots || []).filter((id) => id && player.mana >= SPELLS[id]?.manaCost);
    if (castable.length) choices.push('spell');
    const pick = choices[Math.floor(Math.random() * choices.length)];
    if (pick === 'spell') {
      const spellId = castable[Math.floor(Math.random() * castable.length)];
      return { type: 'spell', spellId };
    }
    return { type: pick };
  }

  battleAction(playerId, action) {
    const player = this.players.get(playerId);
    const battle = this.battles.get(player?.inBattle);
    if (!battle || battle.status !== 'active') return { error: 'Нет активного боя' };
    if (battle.playerActions[playerId]) return { error: 'Ход уже сделан' };
    if (this.isMad(battle, playerId)) return { error: 'Вы обезумели и не можете управлять собой' };

    const result = this.performAction(battle, playerId, action);
    if (result?.error) return result;

    battle.playerActions[playerId] = action;

    if (battle.mobHp <= 0) {
      this.endBattle(battle, true);
      return { success: true, battle: this.serializeBattle(battle) };
    }

    this.sendToBattle(battle, { type: 'battle_update', data: this.serializeBattle(battle) });
    return { success: true, battle: this.serializeBattle(battle), player: this.serializePlayer(player) };
  }

  isMad(battle, unitId) {
    return (battle.combatants[unitId]?.debuffs ?? []).some((d) => d.type === 'madness');
  }

  mobAttack(battle) {
    if (battle.mobActedThisTurn || battle.status !== 'active') return;
    battle.mobActedThisTurn = true;
    if (battle.participants.length === 0) return;
    const targetId = battle.participants[Math.floor(Math.random() * battle.participants.length)];
    const target = this.players.get(targetId);
    if (!target) return;

    // Безумный моб может потерять ход.
    if (this.isMad(battle, 'mob') && Math.random() < 0.5) {
      battle.log.push(`${battle.mobName} обезумел и теряет ход.`);
      this.sendToBattle(battle, { type: 'battle_update', data: this.serializeBattle(battle) });
      return;
    }

    const attacker = this.combatEffStats(battle, 'mob');
    const defender = this.combatEffStats(battle, targetId);
    const res = this.resolveDamage(attacker, defender, attacker.derived.physDamage, 'physical');
    if (res.dodged) {
      battle.log.push(`${target.name} уклоняется от атаки ${battle.mobName}.`);
      this.sendToBattle(battle, { type: 'battle_update', data: this.serializeBattle(battle) });
      return;
    }
    const dmg = res.damage;
    target.hp -= dmg;
    battle.log.push(`${battle.mobName} атакует ${target.name}: ${dmg}${res.crit ? ' (крит!)' : ''} урона.`);

    if (target.hp <= 0) {
      battle.log.push(`${target.name} повержен!`);
      target.inBattle = null;
      battle.participants = battle.participants.filter((id) => id !== targetId);
      this.send(target, {
        type: 'battle_defeat',
        data: {
          battle: this.serializeBattle(battle),
          player: this.serializePlayer(target),
          result: 'defeat',
        },
      });
    }

    if (battle.participants.length === 0) {
      this.endBattle(battle, false);
    } else {
      this.sendToBattle(battle, { type: 'battle_update', data: this.serializeBattle(battle) });
    }
  }

  endBattle(battle, victory) {
    battle.status = victory ? 'won' : 'lost';
    const state = this.locationState[battle.locationId];
    const mobInst = state?.mobInstances.find((m) => m.instanceId === battle.mobInstanceId);
    const rewards = { xp: 0, loot: [] };

    if (victory && mobInst) {
      mobInst.alive = false;
      mobInst.respawnAt = Date.now() + MOB_RESPAWN_MS;
      const mobTemplate = MOBS[battle.mobId];
      const xpEach = Math.floor(mobTemplate.xp / battle.participants.length);
      const loot = rollLoot(mobTemplate.loot);
      rewards.xp = xpEach;
      rewards.loot = loot;

      for (const pid of battle.participants) {
        const p = this.players.get(pid);
        if (!p) continue;
        p.xp += xpEach;
        let leveled = false;
        while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) {
          p.xp -= xpForLevel(p.level);
          p.level++;
          leveled = true;
          this.normalizeSpellSlots(p);
          p.hp = calcMaxHp(p);
          p.mana = calcMaxMana(p);
        }
        if (p.level >= MAX_LEVEL) p.xp = 0;
        battle.log.push(`${p.name} получает ${xpEach} опыта.`);
        if (leveled) battle.log.push(`${p.name} достигает ${p.level} уровня!`);

        for (const itemId of loot) {
          const gi = {
            id: uuid(),
            itemId,
            count: 1,
            killerId: pid,
            droppedAt: Date.now(),
            exclusiveUntil: Date.now() + ITEM_EXCLUSIVE_MS,
            expiresAt: Date.now() + ITEM_PUBLIC_MS,
          };
          state.groundItems.push(gi);
        }
      }
      battle.log.push(`${battle.mobName} повержен!`);
    }

    battle.rewards = rewards;

    for (const pid of [...battle.participants]) {
      const p = this.players.get(pid);
      if (p) {
        p.inBattle = null;
        const serialized = this.serializeBattle(battle);
        this.send(p, {
          type: victory ? 'battle_victory' : 'battle_end',
          data: { battle: serialized, player: this.serializePlayer(p), result: victory ? 'victory' : 'defeat' },
        });
      }
    }

    if (state) {
      state.activeBattles = state.activeBattles.filter((id) => id !== battle.id);
    }
    this.broadcastLocation(battle.locationId);
  }

  serializeBattle(battle) {
    const mob = MOBS[battle.mobId];
    const mobInfo = mob ? this.serializeMob(battle.mobInstanceId, battle.mobId) : null;
    return {
      id: battle.id,
      mobName: battle.mobName,
      mobHp: battle.mobHp,
      mobMaxHp: battle.mobMaxHp,
      mobLevel: battle.mobLevel,
      mobInfo: mobInfo
        ? { ...mobInfo, debuffs: battle.combatants?.mob?.debuffs ?? [] }
        : null,
      status: battle.status,
      log: battle.log,
      turnStartedAt: battle.turnStartedAt,
      turnEndsAt: battle.turnEndsAt,
      actedPlayerIds: Object.keys(battle.playerActions ?? {}),
      rewards: battle.rewards ?? null,
      participants: battle.participants.map((pid) => {
        const p = this.players.get(pid);
        if (!p) return null;
        const eff = getEffectiveStats(p);
        const derived = deriveStats(p.level, eff);
        return {
          id: p.id,
          name: p.name,
          level: p.level,
          hp: p.hp,
          maxHp: derived.maxHp,
          mana: p.mana,
          maxMana: derived.maxMana,
          stats: p.stats,
          effectiveStats: eff,
          derived,
          debuffs: battle.combatants?.[pid]?.debuffs ?? [],
          acted: !!battle.playerActions[pid],
        };
      }).filter(Boolean),
    };
  }

  pickupItem(playerId, groundItemId) {
    const player = this.players.get(playerId);
    const locId = player.inDungeon ? player.inDungeon.locationId : player.locationId;
    const state = this.locationState[locId];
    const idx = state.groundItems.findIndex((g) => g.id === groundItemId);
    if (idx === -1) return { error: 'Предмет не найден' };
    const gi = state.groundItems[idx];
    if (!this.canPickupItem(gi, playerId, Date.now())) return { error: 'Предмет недоступен' };
    if (this.getInventoryCount(player) + gi.count > calcInventoryLimit(player)) return { error: 'Инвентарь полон' };

    this.addToInventory(player, gi.itemId, gi.count);
    state.groundItems.splice(idx, 1);
    this.broadcastLocation(locId);
    return { success: true, player: this.serializePlayer(player) };
  }

  allocateStat(playerId, stat) {
    const player = this.players.get(playerId);
    if (!player || !STATS.includes(stat)) return { error: 'Нельзя' };
    const cost = statUpgradeCost(player.stats[stat]);
    if (availableStatPoints(player) < cost) return { error: 'Недостаточно очков характеристик' };
    player.stats[stat]++;
    player.hp = Math.min(player.hp, calcMaxHp(player));
    player.mana = Math.min(player.mana, calcMaxMana(player));
    return { success: true, player: this.serializePlayer(player) };
  }

  // Применение распределения характеристик после предпросмотра.
  setStats(playerId, targetStats) {
    const player = this.players.get(playerId);
    if (!player) return { error: 'Игрок не найден' };
    const next = {};
    for (const s of STATS) {
      const v = Math.max(0, Math.floor(targetStats?.[s] ?? player.stats[s]));
      if (v < player.stats[s]) return { error: 'Нельзя снизить уже вложенные очки' };
      next[s] = v;
    }
    if (spentStatPoints(next) > totalStatPoints(player.level)) {
      return { error: 'Недостаточно очков характеристик' };
    }
    player.stats = next;
    player.hp = Math.min(player.hp, calcMaxHp(player));
    player.mana = Math.min(player.mana, calcMaxMana(player));
    return { success: true, player: this.serializePlayer(player) };
  }

  learnSpell(playerId, spellId) {
    const player = this.players.get(playerId);
    const spell = SPELLS[spellId];
    if (!player || !spell) return { error: 'Не найдено' };
    if (player.learnedSpells.includes(spellId)) return { error: 'Уже изучено' };
    if (player.level < spell.requiredLevel) return { error: `Требуется ${spell.requiredLevel} уровень` };
    player.learnedSpells.push(spellId);
    return { success: true, player: this.serializePlayer(player) };
  }

  // Тренировка в городе: раз в сутки временно поднимает характеристики.
  trainStat(playerId, stat) {
    const player = this.players.get(playerId);
    if (!player || !STATS.includes(stat)) return { error: 'Нельзя' };
    const loc = this.getLocationForPlayer(player);
    if (loc.type !== 'city') return { error: 'Тренироваться можно только в городе' };
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    if (player.lastTrainingAt && now - player.lastTrainingAt < DAY) {
      const hoursLeft = Math.ceil((DAY - (now - player.lastTrainingAt)) / 3600000);
      return { error: `Тренировка будет доступна через ${hoursLeft} ч` };
    }
    const derived = deriveStats(player.level, getEffectiveStats(player));
    const amount = Math.max(1, Math.round(2 * derived.trainingPotency));
    const durationMs = derived.trainingMaxMinutes * 60 * 1000;
    player.training = { bonuses: { [stat]: amount }, endsAt: now + durationMs };
    player.lastTrainingAt = now;
    return { success: true, player: this.serializePlayer(player) };
  }

  assignSpellSlot(playerId, spellId, slotIndex) {
    const player = this.players.get(playerId);
    if (!player) return { error: 'Игрок не найден' };
    if (slotIndex < 0 || slotIndex >= player.spellSlots.length) return { error: 'Неверный слот' };
    if (spellId && !player.learnedSpells.includes(spellId)) return { error: 'Не изучено' };
    player.spellSlots[slotIndex] = spellId;
    return { success: true, player: this.serializePlayer(player) };
  }

  clearSpellSlot(playerId, slotIndex) {
    const player = this.players.get(playerId);
    if (!player) return { error: 'Игрок не найден' };
    player.spellSlots[slotIndex] = null;
    return { success: true, player: this.serializePlayer(player) };
  }

  equipItem(playerId, itemId) {
    const player = this.players.get(playerId);
    const item = ITEMS[itemId];
    if (!player || !item?.slot) return { error: 'Нельзя экипировать' };
    if (!player.inventory.find((i) => i.itemId === itemId)) return { error: 'Нет предмета' };
    const old = player.equipment[item.slot];
    if (old) this.addToInventory(player, old);
    this.removeFromInventory(player, itemId);
    player.equipment[item.slot] = itemId;
    return { success: true, player: this.serializePlayer(player) };
  }

  unequipItem(playerId, slot) {
    const player = this.players.get(playerId);
    if (!player || !player.equipment[slot]) return { error: 'Слот пуст' };
    const itemId = player.equipment[slot];
    if (this.getInventoryCount(player) >= calcInventoryLimit(player)) return { error: 'Инвентарь полон' };
    player.equipment[slot] = null;
    this.addToInventory(player, itemId);
    return { success: true, player: this.serializePlayer(player) };
  }

  useItem(playerId, itemId) {
    const player = this.players.get(playerId);
    const item = ITEMS[itemId];
    if (!player || item?.type !== 'potion') return { error: 'Нельзя использовать' };
    if (!this.removeFromInventory(player, itemId)) return { error: 'Нет предмета' };
    if (item.effect.hp) player.hp = Math.min(calcMaxHp(player), player.hp + item.effect.hp);
    if (item.effect.mana) player.mana = Math.min(calcMaxMana(player), player.mana + item.effect.mana);
    return { success: true, player: this.serializePlayer(player) };
  }

  sellItem(playerId, itemId, count = 1) {
    const player = this.players.get(playerId);
    const loc = this.getLocationForPlayer(player);
    if (loc.type !== 'city') return { error: 'Только в городе' };
    const item = ITEMS[itemId];
    if (!item) return { error: 'Предмет не найден' };
    if (!this.removeFromInventory(player, itemId, count)) return { error: 'Нет предмета' };
    player.gold += item.sellPrice * count;
    return { success: true, player: this.serializePlayer(player) };
  }

  buyItem(playerId, itemId) {
    const player = this.players.get(playerId);
    const loc = this.getLocationForPlayer(player);
    if (loc.type !== 'city') return { error: 'Только в городе' };
    const item = ITEMS[itemId];
    if (!item) return { error: 'Предмет не найден' };
    if (player.gold < item.buyPrice) return { error: 'Недостаточно золота' };
    if (this.getInventoryCount(player) >= calcInventoryLimit(player)) return { error: 'Инвентарь полон' };
    player.gold -= item.buyPrice;
    this.addToInventory(player, itemId);
    return { success: true, player: this.serializePlayer(player) };
  }

  stashDeposit(playerId, itemId, count = 1) {
    const player = this.players.get(playerId);
    if (!this.removeFromInventory(player, itemId, count)) return { error: 'Нет предмета' };
    const existing = player.stash.find((i) => i.itemId === itemId);
    if (existing) existing.count += count;
    else player.stash.push({ itemId, count });
    return { success: true, player: this.serializePlayer(player) };
  }

  stashWithdraw(playerId, itemId, count = 1) {
    const player = this.players.get(playerId);
    const idx = player.stash.findIndex((i) => i.itemId === itemId);
    if (idx === -1 || player.stash[idx].count < count) return { error: 'Нет в сундуке' };
    if (this.getInventoryCount(player) + count > calcInventoryLimit(player)) return { error: 'Инвентарь полон' };
    player.stash[idx].count -= count;
    if (player.stash[idx].count <= 0) player.stash.splice(idx, 1);
    this.addToInventory(player, itemId, count);
    return { success: true, player: this.serializePlayer(player) };
  }

  addChatMessage(playerId, text) {
    const player = this.players.get(playerId);
    if (!player || !text?.trim()) return;
    const msg = { id: uuid(), playerId, playerName: player.name, text: text.trim(), time: Date.now() };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 100) this.chatMessages.shift();
    for (const p of this.players.values()) {
      this.send(p, { type: 'chat', data: msg });
    }
  }

  getChatHistory() {
    return this.chatMessages.slice(-20);
  }

  getMerchantStock() {
    return MERCHANT_STOCK.map((s) => ({ ...s, ...ITEMS[s.itemId] }));
  }

  mapDungeonGroups(dungeonId, playerId) {
    return this.getDungeonGroups(dungeonId).map((g) => ({
      id: g.id,
      leaderId: g.leaderId,
      leaderName: this.getPlayer(g.leaderId)?.name ?? '???',
      memberCount: g.members.length,
      requiredSize: DUNGEONS[g.dungeonId]?.requiredSize ?? 3,
      dungeonId: g.dungeonId,
      isLeader: g.leaderId === playerId,
      isMember: g.members.includes(playerId),
    }));
  }

  createDungeonGroup(playerId, dungeonId) {
    const player = this.players.get(playerId);
    const dungeon = DUNGEONS[dungeonId];
    if (!player || !dungeon) return { error: 'Ошибка' };
    if (player.dungeonGroupId) return { error: 'Вы уже в группе' };
    if (player.inDungeon) return { error: 'Уже в подземелье' };

    const groupId = uuid();
    const group = {
      id: groupId,
      dungeonId,
      leaderId: playerId,
      members: [playerId],
      status: 'waiting',
    };
    this.dungeonGroups.set(groupId, group);
    player.dungeonGroupId = groupId;
    return {
      success: true,
      group,
      player: this.serializePlayer(player),
      groups: this.mapDungeonGroups(dungeonId, playerId),
    };
  }

  joinDungeonGroup(playerId, groupId) {
    const player = this.players.get(playerId);
    const group = this.dungeonGroups.get(groupId);
    const dungeon = group ? DUNGEONS[group.dungeonId] : null;
    if (!player || !group || group.status !== 'waiting') return { error: 'Группа недоступна' };
    if (group.members.length >= dungeon.requiredSize) return { error: 'Группа полна' };
    if (group.members.includes(playerId)) return { error: 'Уже в группе' };
    if (player.dungeonGroupId) return { error: 'Вы уже в группе' };
    group.members.push(playerId);
    player.dungeonGroupId = groupId;
    return {
      success: true,
      group,
      player: this.serializePlayer(player),
      groups: this.mapDungeonGroups(group.dungeonId, playerId),
    };
  }

  leaveDungeonGroup(playerId) {
    const player = this.players.get(playerId);
    const group = this.dungeonGroups.get(player?.dungeonGroupId);
    if (!group) return { error: 'Не в группе' };
    const dungeonId = group.dungeonId;
    group.members = group.members.filter((id) => id !== playerId);
    player.dungeonGroupId = null;
    if (group.members.length === 0) this.dungeonGroups.delete(group.id);
    else if (group.leaderId === playerId) group.leaderId = group.members[0];
    return {
      success: true,
      player: this.serializePlayer(player),
      groups: this.mapDungeonGroups(dungeonId, playerId),
    };
  }

  launchDungeon(playerId) {
    const player = this.players.get(playerId);
    const group = this.dungeonGroups.get(player?.dungeonGroupId);
    if (!group || group.leaderId !== playerId) return { error: 'Вы не лидер' };
    const dungeon = DUNGEONS[group.dungeonId];
    if (group.members.length < dungeon.requiredSize) return { error: 'Нужно больше игроков' };
    if (!this.removeFromInventory(player, dungeon.passItemId)) {
      return { error: 'Лидеру нужен пропуск в подземелье' };
    }

    group.status = 'running';
    for (const loc of Object.values(dungeon.locations)) {
      if (!this.locationState[loc.id]) {
        this.locationState[loc.id] = {
          mobInstances: (loc.mobs || []).map((mobId, i) => ({
            instanceId: `${loc.id}_${mobId}_${i}`,
            mobId,
            alive: true,
            respawnAt: null,
          })),
          groundItems: [],
          activeBattles: [],
        };
      }
    }

    for (const mid of group.members) {
      const m = this.players.get(mid);
      if (m) {
        m.inDungeon = { dungeonId: group.dungeonId, locationId: dungeon.startLocationId };
        m.dungeonGroupId = group.id;
        this.send(m, { type: 'dungeon_start', data: this.serializePlayer(m) });
      }
    }
    return { success: true };
  }

  exitDungeon(playerId) {
    const player = this.players.get(playerId);
    if (!player?.inDungeon) return { error: 'Не в подземелье' };
    player.inDungeon = null;
    this.leaveDungeonGroup(playerId);
    return { success: true, player: this.serializePlayer(player) };
  }

  getDungeonGroups(dungeonId) {
    return [...this.dungeonGroups.values()].filter((g) => g.dungeonId === dungeonId && g.status === 'waiting');
  }

  handleMessage(playerId, msg) {
    const { type, payload } = msg;
    switch (type) {
      case 'travel':
        return this.startTravel(this.getPlayer(playerId), payload.targetLocationId);
      case 'cancel_travel':
        return this.cancelTravel(playerId);
      case 'start_battle':
        return this.startBattle(playerId, payload.mobInstanceId);
      case 'join_battle':
        return this.joinBattle(playerId, payload.battleId);
      case 'battle_action':
        return this.battleAction(playerId, payload);
      case 'pickup':
        return this.pickupItem(playerId, payload.groundItemId);
      case 'allocate_stat':
        return this.allocateStat(playerId, payload.stat);
      case 'set_stats':
        return this.setStats(playerId, payload.stats);
      case 'train':
        return this.trainStat(playerId, payload.stat);
      case 'learn_spell':
        return this.learnSpell(playerId, payload.spellId);
      case 'assign_spell':
        return this.assignSpellSlot(playerId, payload.spellId, payload.slotIndex);
      case 'clear_spell':
        return this.clearSpellSlot(playerId, payload.slotIndex);
      case 'equip':
        return this.equipItem(playerId, payload.itemId);
      case 'unequip':
        return this.unequipItem(playerId, payload.slot);
      case 'use_item':
        return this.useItem(playerId, payload.itemId);
      case 'sell':
        return this.sellItem(playerId, payload.itemId, payload.count);
      case 'buy':
        return this.buyItem(playerId, payload.itemId);
      case 'stash_deposit':
        return this.stashDeposit(playerId, payload.itemId, payload.count);
      case 'stash_withdraw':
        return this.stashWithdraw(playerId, payload.itemId, payload.count);
      case 'chat':
        return this.addChatMessage(playerId, payload.text);
      case 'create_dungeon_group':
        return this.createDungeonGroup(playerId, payload.dungeonId);
      case 'join_dungeon_group':
        return this.joinDungeonGroup(playerId, payload.groupId);
      case 'leave_dungeon_group':
        return this.leaveDungeonGroup(playerId);
      case 'launch_dungeon':
        return this.launchDungeon(playerId);
      case 'exit_dungeon':
        return this.exitDungeon(playerId);
      case 'get_dungeon_groups':
        return { groups: this.mapDungeonGroups(payload.dungeonId, playerId) };
      default:
        return { error: 'Unknown action' };
    }
  }
}

export const world = new GameWorld();

export { ITEMS, SPELLS, MOBS, LOCATIONS, DUNGEONS, STAT_LABELS } from '../data/gameData.js';
