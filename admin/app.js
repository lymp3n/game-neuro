(() => {
  'use strict';

  const NODE_W = 190;
  const DEFAULT_TRAVEL = 8;

  const state = {
    content: { mobs: {}, locations: {}, dungeons: {}, formulas: {} },
    activeTab: 'world',
    token: localStorage.getItem('adminToken') || '',
    dirty: false,
    editingLocId: null,
    editingMobId: null,
    connectingFrom: null,
    edgePair: null,
  };

  const $ = (id) => document.getElementById(id);
  const nodesEl = $('nodes');
  const edgesEl = $('edges');
  const canvasEl = $('canvas');

  // ---------- API ----------
  async function api(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['x-admin-token'] = state.token;
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      showTokenGate('Неверный токен');
      throw new Error('unauthorized');
    }
    return res;
  }

  function setStatus(text, cls) {
    const el = $('status');
    el.textContent = text;
    el.className = 'status' + (cls ? ' ' + cls : '');
  }

  function markDirty() {
    state.dirty = true;
    setStatus('Есть несохранённые изменения', 'dirty');
  }

  // ---------- helpers ----------
  function slugify(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
  }

  function uniqueId(base, existing) {
    let id = slugify(base) || 'item';
    if (!existing[id]) return id;
    let i = 2;
    while (existing[`${id}_${i}`]) i++;
    return `${id}_${i}`;
  }

  function typeLabel(type) {
    if (type === 'city') return 'Город';
    if (type === 'dungeon_entry') return 'Вход в подземелье';
    if (type === 'dungeon') return 'Подземелье';
    return 'Локация';
  }

  // ---------- load / save ----------
  async function bootstrap() {
    try {
      const authRes = await fetch('/api/admin/auth-required');
      const auth = await authRes.json();
      if (auth.required && !state.token) {
        showTokenGate('');
        return;
      }
    } catch (_) {}
    await loadContent();
  }

  async function loadContent() {
    try {
      const res = await api('GET', '/api/admin/content');
      if (!res.ok) throw new Error('load failed');
      state.content = await res.json();
      if (!state.content.mobs) state.content.mobs = {};
      if (!state.content.locations) state.content.locations = {};
      if (!state.content.dungeons) state.content.dungeons = {};
      if (!state.content.formulas) state.content.formulas = {};
      state.dirty = false;
      hideTokenGate();
      renderAll();
      setStatus('Загружено', 'saved');
    } catch (err) {
      if (err.message !== 'unauthorized') setStatus('Ошибка загрузки', 'dirty');
    }
  }

  async function save() {
    setStatus('Сохранение…');
    try {
      const res = await api('PUT', '/api/admin/content', state.content);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      state.content = data.content;
      state.dirty = false;
      renderAll();
      setStatus('Сохранено и применено в игре', 'saved');
    } catch (err) {
      if (err.message !== 'unauthorized') setStatus('Ошибка: ' + err.message, 'dirty');
    }
  }

  // ---------- render ----------
  function renderAll() {
    renderMobList();
    renderNodes();
    renderEdges();
    renderFormulas();
    renderDungeons();
  }

  const FORMULA_META = {
    hpBase: 'База HP',
    hpPerEndurance: 'HP × Выносливость',
    hpPerLevel: 'HP × уровень',
    manaBase: 'База маны',
    manaPerSpirit: 'Мана × Дух',
    manaPerLevel: 'Мана × уровень',
    meleeBase: 'База ближнего урона',
    meleePerStrength: 'Ближний × Сила',
    meleePerAgility: 'Ближний × Ловкость',
    meleePerLevel: 'Ближний × уровень',
    rangedBase: 'База дальнего урона',
    rangedPerAgility: 'Дальний × Ловкость',
    rangedPerStrength: 'Дальний × Сила',
    rangedPerLevel: 'Дальний × уровень',
    magicBase: 'База маг. урона',
    magicPerIntellect: 'Маг × Интеллект',
    magicPerSpirit: 'Маг × Дух',
    magicPerLevel: 'Маг × уровень',
    meleeDamageSpread: 'Разброс ближнего (0.15 = ±15%)',
    rangedDamageSpread: 'Разброс дальнего',
    magicDamageSpread: 'Разброс магического',
    aggressiveJoinChancePerSec: 'Шанс вмешаться агрессивный/сек',
    aggressiveForceAfterSec: 'Сек до 100% агрессии',
    collectiveJoinChancePerSec: 'Шанс вмешаться коллективный/сек',
  };

  function renderFormulas() {
    const el = $('formulasTable');
    if (!el) return;
    const f = state.content.formulas || {};
    el.innerHTML = '';
    for (const [key, label] of Object.entries(FORMULA_META)) {
      const wrap = document.createElement('label');
      wrap.innerHTML = `<span>${label}</span><span class="formula-desc">${key}</span>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.value = f[key] ?? '';
      input.addEventListener('input', () => {
        state.content.formulas[key] = +input.value;
        markDirty();
      });
      el.appendChild(wrap);
      el.appendChild(document.createElement('div'));
      el.appendChild(input);
    }
  }

  function renderDungeons() {
    const el = $('dungeonList');
    if (!el) return;
    el.innerHTML = '';
    const dungeons = state.content.dungeons || {};
    for (const [id, d] of Object.entries(dungeons)) {
      const card = document.createElement('div');
      card.className = 'dungeon-card';
      card.innerHTML = `<strong>${escapeHtml(d.name || id)}</strong> <small>(${id})</small>`;
      const locs = d.locations || {};
      for (const [lid, loc] of Object.entries(locs)) {
        const row = document.createElement('div');
        row.className = 'dungeon-loc-row';
        const mobOpts = Object.keys(state.content.mobs)
          .map((mid) => `<option value="${mid}">${escapeHtml(state.content.mobs[mid].name)}</option>`)
          .join('');
        row.innerHTML = `
          <input type="text" value="${escapeAttr(loc.name || lid)}" data-dungeon="${id}" data-loc="${lid}" data-field="name" placeholder="Название" />
          <select data-dungeon="${id}" data-loc="${lid}" data-field="mobs" multiple size="2">${mobOpts}</select>
          <label><input type="checkbox" data-dungeon="${id}" data-loc="${lid}" data-field="boss" ${d.bossLocationId === lid ? 'checked' : ''} /> Босс</label>
        `;
        const sel = row.querySelector('select');
        for (const opt of sel.options) {
          if ((loc.mobs || []).includes(opt.value)) opt.selected = true;
        }
        card.appendChild(row);
      }
      card.querySelectorAll('input, select').forEach((inp) => {
        inp.addEventListener('change', () => {
          const dungeon = state.content.dungeons[inp.dataset.dungeon];
          const loc = dungeon.locations[inp.dataset.loc];
          if (inp.dataset.field === 'name') loc.name = inp.value;
          if (inp.dataset.field === 'boss' && inp.checked) dungeon.bossLocationId = inp.dataset.loc;
          if (inp.dataset.field === 'mobs') {
            loc.mobs = [...inp.selectedOptions].map((o) => o.value);
          }
          markDirty();
        });
      });
      el.appendChild(card);
    }
  }

  function switchTab(tab) {
    state.activeTab = tab;
    $('panelWorld').classList.toggle('hidden', tab !== 'world');
    $('panelFormulas').classList.toggle('hidden', tab !== 'formulas');
    $('panelDungeons').classList.toggle('hidden', tab !== 'dungeons');
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    if (tab === 'world') $('tabWorld').classList.add('active');
    if (tab === 'formulas') $('tabFormulas').classList.add('active');
    if (tab === 'dungeons') $('tabDungeons').classList.add('active');
  }

  function renderMobList() {
    const list = $('mobList');
    list.innerHTML = '';
    const mobs = Object.values(state.content.mobs);
    if (!mobs.length) {
      list.innerHTML = '<p class="hint">Пока нет мобов. Создайте первого.</p>';
      return;
    }
    for (const mob of mobs) {
      const card = document.createElement('div');
      card.className = 'mob-card';
      card.draggable = true;
      card.dataset.mobId = mob.id;
      card.innerHTML = `
        <div class="ic"><span class="material-icons">${escapeAttr(mob.icon || 'smart_toy')}</span></div>
        <div class="meta"><b>${escapeHtml(mob.name)}</b><small>Ур.${mob.level} · ${mobMaxHp(mob)} HP</small></div>
        <span class="edit material-icons" title="Изменить">edit</span>`;
      card.querySelector('.edit').addEventListener('click', (e) => {
        e.stopPropagation();
        openMobModal(mob.id);
      });
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/mob', mob.id);
        e.dataTransfer.effectAllowed = 'copy';
      });
      list.appendChild(card);
    }
  }

  function renderNodes() {
    nodesEl.innerHTML = '';
    for (const loc of Object.values(state.content.locations)) {
      const node = document.createElement('div');
      node.className = 'node ' + (loc.type || 'normal');
      node.style.left = (loc.x || 100) + 'px';
      node.style.top = (loc.y || 100) + 'px';
      node.dataset.id = loc.id;
      if (state.connectingFrom && state.connectingFrom !== loc.id) {
        node.classList.add('connect-target');
      }

      const mobCounts = countMobs(loc.mobs || []);
      const chips = Object.entries(mobCounts)
        .map(([id, n]) => {
          const m = state.content.mobs[id];
          return `<span class="node-mob-chip">${escapeHtml(m ? m.name : id)}${n > 1 ? ' ×' + n : ''}</span>`;
        })
        .join('');

      node.innerHTML = `
        <div class="node-head">
          <b>${escapeHtml(loc.name)}</b>
          <span class="node-type">${typeLabel(loc.type)}</span>
        </div>
        <div class="node-body">
          <p class="desc">${escapeHtml(loc.description || '')}</p>
          <div class="node-mobs">${chips || '<span class="node-type">нет мобов</span>'}</div>
        </div>
        <div class="node-actions">
          <button data-act="edit"><span class="material-icons">edit</span>Изменить</button>
          <button data-act="connect"><span class="material-icons">trending_flat</span>Переход</button>
        </div>`;

      attachNodeDrag(node, loc);
      node.querySelector('[data-act="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        openLocModal(loc.id);
      });
      node.querySelector('[data-act="connect"]').addEventListener('click', (e) => {
        e.stopPropagation();
        startConnect(loc.id);
      });

      // drop a mob onto the location
      node.addEventListener('dragover', (e) => {
        e.preventDefault();
        node.classList.add('drag-over');
      });
      node.addEventListener('dragleave', () => node.classList.remove('drag-over'));
      node.addEventListener('drop', (e) => {
        e.preventDefault();
        node.classList.remove('drag-over');
        const mobId = e.dataTransfer.getData('text/mob');
        if (mobId && state.content.mobs[mobId]) {
          loc.mobs = loc.mobs || [];
          loc.mobs.push(mobId);
          markDirty();
          renderNodes();
          renderEdges();
        }
      });

      nodesEl.appendChild(node);
    }
  }

  function countMobs(arr) {
    const counts = {};
    for (const id of arr) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }

  function nodeCenter(loc) {
    const el = nodesEl.querySelector(`.node[data-id="${cssEscape(loc.id)}"]`);
    const w = el ? el.offsetWidth : NODE_W;
    const h = el ? el.offsetHeight : 120;
    return { x: (loc.x || 100) + w / 2, y: (loc.y || 100) + h / 2 };
  }

  function renderEdges() {
    const locs = state.content.locations;
    const pairs = {};
    for (const loc of Object.values(locs)) {
      for (const to of loc.exits || []) {
        if (!locs[to]) continue;
        const key = loc.id < to ? `${loc.id}|${to}` : `${to}|${loc.id}`;
        pairs[key] = true;
      }
    }

    const SVGNS = 'http://www.w3.org/2000/svg';
    edgesEl.innerHTML = '';

    for (const key of Object.keys(pairs)) {
      const [a, b] = key.split('|');
      const la = locs[a];
      const lb = locs[b];
      if (!la || !lb) continue;
      const ca = nodeCenter(la);
      const cb = nodeCenter(lb);
      const aToB = (la.exits || []).includes(b);
      const bToA = (lb.exits || []).includes(a);

      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', ca.x);
      line.setAttribute('y1', ca.y);
      line.setAttribute('x2', cb.x);
      line.setAttribute('y2', cb.y);
      line.setAttribute('stroke', '#94a3c4');
      line.setAttribute('stroke-width', '2.5');
      edgesEl.appendChild(line);

      // invisible thick hit line for easy clicking
      const hit = document.createElementNS(SVGNS, 'line');
      hit.setAttribute('x1', ca.x);
      hit.setAttribute('y1', ca.y);
      hit.setAttribute('x2', cb.x);
      hit.setAttribute('y2', cb.y);
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('stroke-width', '16');
      hit.setAttribute('class', 'edge-hit');
      hit.addEventListener('click', () => openEdgeModal(a, b));
      edgesEl.appendChild(hit);

      drawArrows(edgesEl, ca, cb, aToB, bToA);

      // label
      const mx = (ca.x + cb.x) / 2;
      const my = (ca.y + cb.y) / 2;
      const label = document.createElementNS(SVGNS, 'text');
      label.setAttribute('x', mx);
      label.setAttribute('y', my - 6);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'edge-label');
      const tAB = la.travel && la.travel[b];
      const tBA = lb.travel && lb.travel[a];
      const parts = [];
      if (aToB) parts.push(`${tAB || '?'}с`);
      if (bToA && tBA !== tAB) parts.push(`${tBA || '?'}с`);
      label.textContent = parts.join(' / ');
      edgesEl.appendChild(label);
    }
  }

  function drawArrows(svg, ca, cb, aToB, bToA) {
    const SVGNS = 'http://www.w3.org/2000/svg';
    const dx = cb.x - ca.x;
    const dy = cb.y - ca.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    function arrow(px, py, dirx, diry) {
      const size = 9;
      const angle = Math.atan2(diry, dirx);
      const a1 = angle + Math.PI - 0.4;
      const a2 = angle + Math.PI + 0.4;
      const p = document.createElementNS(SVGNS, 'polygon');
      const pts = [
        `${px},${py}`,
        `${px + size * Math.cos(a1)},${py + size * Math.sin(a1)}`,
        `${px + size * Math.cos(a2)},${py + size * Math.sin(a2)}`,
      ].join(' ');
      p.setAttribute('points', pts);
      p.setAttribute('fill', '#5b6573');
      svg.appendChild(p);
    }
    if (aToB) arrow(cb.x - ux * 78, cb.y - uy * 78, ux, uy);
    if (bToA) arrow(ca.x + ux * 78, ca.y + uy * 78, -ux, -uy);
  }

  // ---------- node dragging ----------
  function attachNodeDrag(node, loc) {
    let startX, startY, origX, origY, moved;
    const onDown = (e) => {
      if (e.target.closest('.node-actions')) return; // buttons handle themselves
      if (state.connectingFrom) {
        if (state.connectingFrom !== loc.id) finishConnect(loc.id);
        return;
      }
      e.preventDefault();
      moved = false;
      const pt = pointer(e);
      startX = pt.x;
      startY = pt.y;
      origX = loc.x || 100;
      origY = loc.y || 100;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    const onMove = (e) => {
      const pt = pointer(e);
      const dx = pt.x - startX;
      const dy = pt.y - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      loc.x = Math.max(0, origX + dx);
      loc.y = Math.max(0, origY + dy);
      node.style.left = loc.x + 'px';
      node.style.top = loc.y + 'px';
      renderEdges();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) markDirty();
    };
    node.addEventListener('pointerdown', onDown);
  }

  function pointer(e) {
    return { x: e.clientX, y: e.clientY };
  }

  // ---------- connect mode ----------
  function startConnect(fromId) {
    state.connectingFrom = fromId;
    $('connectHint').classList.remove('hidden');
    renderNodes();
    renderEdges();
  }

  function cancelConnect() {
    state.connectingFrom = null;
    $('connectHint').classList.add('hidden');
    renderNodes();
    renderEdges();
  }

  function finishConnect(toId) {
    const from = state.content.locations[state.connectingFrom];
    const to = state.content.locations[toId];
    state.connectingFrom = null;
    $('connectHint').classList.add('hidden');
    if (from && to && from.id !== to.id) {
      addExit(from, to.id, DEFAULT_TRAVEL);
      markDirty();
      renderNodes();
      renderEdges();
      openEdgeModal(from.id, to.id);
    } else {
      renderNodes();
      renderEdges();
    }
  }

  function addExit(loc, toId, sec) {
    loc.exits = loc.exits || [];
    if (!loc.exits.includes(toId)) loc.exits.push(toId);
    loc.travel = loc.travel || {};
    loc.travel[toId] = sec;
  }

  function removeExit(loc, toId) {
    loc.exits = (loc.exits || []).filter((e) => e !== toId);
    if (loc.travel) delete loc.travel[toId];
  }

  // ---------- location modal ----------
  function openLocModal(id) {
    state.editingLocId = id;
    const loc = state.content.locations[id];
    $('locName').value = loc.name || '';
    $('locType').value = loc.type || 'normal';
    $('locDesc').value = loc.description || '';
    renderLocMobs(loc);
    $('deleteLocBtn').style.display = '';
    $('locModal').classList.remove('hidden');
  }

  function renderLocMobs(loc) {
    const wrap = $('locMobs');
    wrap.innerHTML = '';
    const counts = countMobs(loc.mobs || []);
    const mobs = Object.values(state.content.mobs);
    if (!mobs.length) {
      wrap.innerHTML = '<p class="hint">Сначала создайте мобов в бестиарии слева.</p>';
      return;
    }
    for (const mob of mobs) {
      const n = counts[mob.id] || 0;
      const row = document.createElement('div');
      row.className = 'loc-mob-row';
      row.innerHTML = `
        <b>${escapeHtml(mob.name)}</b>
        <div class="stepper">
          <button data-act="minus">−</button>
          <span>${n}</span>
          <button data-act="plus">+</button>
        </div>`;
      row.querySelector('[data-act="plus"]').addEventListener('click', () => {
        loc.mobs = loc.mobs || [];
        loc.mobs.push(mob.id);
        renderLocMobs(loc);
      });
      row.querySelector('[data-act="minus"]').addEventListener('click', () => {
        const idx = (loc.mobs || []).indexOf(mob.id);
        if (idx !== -1) loc.mobs.splice(idx, 1);
        renderLocMobs(loc);
      });
      wrap.appendChild(row);
    }
  }

  function saveLocModal() {
    const loc = state.content.locations[state.editingLocId];
    if (!loc) return closeModal('locModal');
    loc.name = $('locName').value.trim() || loc.id;
    loc.type = $('locType').value;
    loc.description = $('locDesc').value.trim();
    markDirty();
    closeModal('locModal');
    renderAll();
  }

  function deleteLoc() {
    const id = state.editingLocId;
    if (!id) return;
    if (!confirm('Удалить локацию и все переходы в неё?')) return;
    delete state.content.locations[id];
    for (const loc of Object.values(state.content.locations)) {
      removeExit(loc, id);
    }
    markDirty();
    closeModal('locModal');
    renderAll();
  }

  function addLocation() {
    const id = uniqueId('loc', state.content.locations);
    const scroll = canvasEl;
    state.content.locations[id] = {
      id,
      name: 'Новая локация',
      description: '',
      type: 'normal',
      exits: [],
      travel: {},
      mobs: [],
      x: scroll.scrollLeft + 80,
      y: scroll.scrollTop + 80,
    };
    markDirty();
    renderAll();
    openLocModal(id);
  }

  // ---------- mob modal ----------
  const MOB_STATS = ['strength', 'agility', 'endurance', 'intellect', 'spirit', 'will', 'luck'];

  function totalStatPoints(level) {
    return 10 + 2 * (Math.max(1, level) - 1);
  }
  function spentStatPoints(stats) {
    let total = 0;
    for (const s of MOB_STATS) {
      const v = Math.max(0, Math.floor(stats?.[s] || 0));
      for (let i = 0; i < v; i++) total += 1 + Math.floor(i / 10);
    }
    return total;
  }
  function mobMaxHp(mob) {
    const s = mob.stats || {};
    return Math.round(60 + (s.endurance || 0) * 10 + (mob.level || 1) * 5);
  }
  function readMobStats() {
    const stats = {};
    for (const s of MOB_STATS) stats[s] = +$('stat_' + s).value || 0;
    return stats;
  }
  function updateMobHints() {
    const level = +$('mobLevel').value || 1;
    const stats = readMobStats();
    const spent = spentStatPoints(stats);
    const total = totalStatPoints(level);
    const hint = $('mobPointsHint');
    hint.textContent = `Очки характеристик: ${spent} / ${total}` + (spent > total ? ' — превышен бюджет!' : '');
    hint.style.color = spent > total ? '#c0392b' : '';
    const s = stats;
    const physDmg = Math.round(6 + s.strength * 2 + level * 0.5);
    const magDmg = Math.round(5 + s.intellect * 2 + level * 0.5);
    const physArmor = Math.round(s.endurance * 1.5 + s.agility * 0.3);
    const magArmor = Math.round(s.spirit * 1.8 + s.intellect * 0.5);
    $('mobDerivedHint').textContent =
      `≈ HP ${Math.round(60 + s.endurance * 10 + level * 5)} · Физ.урон ${physDmg} · Маг.урон ${magDmg} · Физ.защ ${physArmor} · Маг.защ ${magArmor}`;
  }

  function openMobModal(id) {
    state.editingMobId = id;
    const isNew = !id;
    const mob = id
      ? state.content.mobs[id]
      : { name: '', description: '', level: 1, xp: 20, stats: {}, icon: 'smart_toy' };
    $('mobName').value = mob.name || '';
    $('mobDesc').value = mob.description || '';
    $('mobLevel').value = mob.level ?? 1;
    $('mobXp').value = mob.xp ?? 20;
    for (const s of MOB_STATS) $('stat_' + s).value = mob.stats?.[s] ?? 0;
    $('mobBehavior').value = mob.behaviorType || 'normal';
    $('mobAttackStyle').value = mob.attackStyle || 'melee';
    $('mobIcon').value = mob.icon || 'smart_toy';
    $('deleteMobBtn').style.display = isNew ? 'none' : '';
    updateMobHints();
    document.querySelectorAll('.mob-stat').forEach((el) => {
      el.oninput = updateMobHints;
    });
    $('mobLevel').oninput = updateMobHints;
    $('mobModal').classList.remove('hidden');
  }

  function saveMobModal() {
    const data = {
      name: $('mobName').value.trim() || 'Моб',
      description: $('mobDesc').value.trim(),
      level: +$('mobLevel').value || 1,
      xp: +$('mobXp').value || 0,
      stats: readMobStats(),
      behaviorType: $('mobBehavior').value,
      attackStyle: $('mobAttackStyle').value,
      icon: $('mobIcon').value.trim() || 'smart_toy',
    };
    let id = state.editingMobId;
    if (!id) {
      id = uniqueId(data.name, state.content.mobs);
      data.id = id;
      state.content.mobs[id] = data;
    } else {
      state.content.mobs[id] = { ...state.content.mobs[id], ...data, id };
    }
    markDirty();
    closeModal('mobModal');
    renderAll();
  }

  function deleteMob() {
    const id = state.editingMobId;
    if (!id) return;
    if (!confirm('Удалить моба? Он исчезнет из всех локаций.')) return;
    delete state.content.mobs[id];
    for (const loc of Object.values(state.content.locations)) {
      loc.mobs = (loc.mobs || []).filter((m) => m !== id);
    }
    markDirty();
    closeModal('mobModal');
    renderAll();
  }

  // ---------- edge modal ----------
  function openEdgeModal(a, b) {
    state.edgePair = [a, b];
    const la = state.content.locations[a];
    const lb = state.content.locations[b];
    const aToB = (la.exits || []).includes(b);
    const bToA = (lb.exits || []).includes(a);
    $('edgeABLabel').textContent = `${la.name} → ${lb.name}`;
    $('edgeBALabel').textContent = `${lb.name} → ${la.name}`;
    $('edgeAB').checked = aToB;
    $('edgeBA').checked = bToA;
    $('edgeABTime').value = (la.travel && la.travel[b]) || DEFAULT_TRAVEL;
    $('edgeBATime').value = (lb.travel && lb.travel[a]) || DEFAULT_TRAVEL;
    $('edgeModal').classList.remove('hidden');
  }

  function saveEdgeModal() {
    const [a, b] = state.edgePair;
    const la = state.content.locations[a];
    const lb = state.content.locations[b];
    if ($('edgeAB').checked) addExit(la, b, +$('edgeABTime').value || DEFAULT_TRAVEL);
    else removeExit(la, b);
    if ($('edgeBA').checked) addExit(lb, a, +$('edgeBATime').value || DEFAULT_TRAVEL);
    else removeExit(lb, a);
    markDirty();
    closeModal('edgeModal');
    renderAll();
  }

  function closeModal(id) {
    $(id).classList.add('hidden');
  }

  // ---------- token gate ----------
  function showTokenGate(error) {
    $('tokenError').textContent = error || '';
    $('tokenGate').classList.remove('hidden');
  }
  function hideTokenGate() {
    $('tokenGate').classList.add('hidden');
  }

  // ---------- escaping ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }
  function cssEscape(s) {
    return String(s).replace(/"/g, '\\"');
  }

  // ---------- events ----------
  $('tabWorld').addEventListener('click', () => switchTab('world'));
  $('tabFormulas').addEventListener('click', () => switchTab('formulas'));
  $('tabDungeons').addEventListener('click', () => switchTab('dungeons'));
  $('addDungeonBtn')?.addEventListener('click', () => {
    const id = uniqueId('dungeon', state.content.dungeons || {});
    state.content.dungeons[id] = {
      id,
      name: 'Новый данж',
      requiredSize: 1,
      passItemId: 'dungeon_pass',
      startLocationId: 'start',
      locations: {
        start: { id: 'start', name: 'Вход', type: 'dungeon', exits: [], mobs: [], linear: true },
      },
      bossLocationId: 'start',
    };
    markDirty();
    renderDungeons();
    switchTab('dungeons');
  });
  $('saveBtn').addEventListener('click', save);
  $('reloadBtn').addEventListener('click', () => {
    if (!state.dirty || confirm('Сбросить несохранённые изменения?')) loadContent();
  });
  $('addLocationBtn').addEventListener('click', addLocation);
  $('addMobBtn').addEventListener('click', () => openMobModal(null));
  $('cancelConnect').addEventListener('click', cancelConnect);
  $('saveLocBtn').addEventListener('click', saveLocModal);
  $('deleteLocBtn').addEventListener('click', deleteLoc);
  $('saveMobBtn').addEventListener('click', saveMobModal);
  $('deleteMobBtn').addEventListener('click', deleteMob);
  $('saveEdgeBtn').addEventListener('click', saveEdgeModal);
  document.querySelectorAll('[data-close]').forEach((el) =>
    el.addEventListener('click', () => closeModal(el.dataset.close))
  );
  $('tokenBtn').addEventListener('click', () => {
    state.token = $('tokenInput').value.trim();
    localStorage.setItem('adminToken', state.token);
    loadContent();
  });
  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.connectingFrom) cancelConnect();
      ['locModal', 'mobModal', 'edgeModal'].forEach((id) => closeModal(id));
    }
  });

  bootstrap();
})();
