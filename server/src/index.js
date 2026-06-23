import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { world, ITEMS, SPELLS, LOCATIONS, DUNGEONS, STAT_LABELS } from './game/world.js';
import { applyContent, exportContent } from './data/gameData.js';
import { loadContent, saveContent } from './data/contentStore.js';
import { dbEnabled, initDb, loadAllPlayers, upsertPlayer, countPlayers } from './db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Apply persisted content (or seed defaults) and rebuild the live world.
loadContent();
world.reloadContent();

// ---- PostgreSQL persistence (optional, enabled via DATABASE_URL) ----
async function setupDatabase() {
  if (!dbEnabled) {
    console.log('БД: DATABASE_URL не задан — игра работает в памяти.');
    return;
  }
  try {
    await initDb();
    const players = await loadAllPlayers();
    players.forEach((p) => world.hydratePlayer(p));
    world.setPersistence(upsertPlayer);
    if ((await countPlayers()) === 0) {
      seedTestCharacters();
      console.log('БД: добавлены тестовые персонажи.');
    }
    console.log(`БД: подключена, загружено игроков: ${players.length}.`);
  } catch (err) {
    console.error('БД: ошибка подключения, продолжаю в памяти:', err.message);
  }
}

function seedTestCharacters() {
  const samples = [
    { name: 'Богатырь Илья', level: 12, xp: 0, stats: { strength: 14, agility: 4, endurance: 12, intellect: 2, spirit: 3, will: 5, luck: 4 } },
    { name: 'Маг Аркан', level: 12, xp: 0, stats: { strength: 2, agility: 4, endurance: 6, intellect: 14, spirit: 12, will: 5, luck: 3 } },
    { name: 'Плут Тень', level: 10, xp: 0, stats: { strength: 6, agility: 14, endurance: 6, intellect: 2, spirit: 2, will: 3, luck: 9 } },
    { name: 'Новичок Гриша', level: 1, xp: 0, stats: { strength: 3, agility: 2, endurance: 3, intellect: 0, spirit: 1, will: 1, luck: 0 } },
  ];
  for (const s of samples) {
    const player = world.createPlayer(s.name, { level: s.level, xp: s.xp, stats: s.stats });
    world.persistPlayer(player);
  }
}

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ---- Демо-вход (имитация Google) + аккаунт с до 3 персонажей ----
app.post('/api/auth/demo-google', (req, res) => {
  const account = world.createAccount({
    provider: 'demo-google',
    email: req.body?.email || 'demo@textquest.local',
    displayName: req.body?.name || 'Игрок Google',
  });
  res.json({
    accountId: account.id,
    displayName: account.displayName,
    characters: world.listAccountCharacters(account.id),
    maxCharacters: 3,
  });
});

app.get('/api/account/:accountId/characters', (req, res) => {
  const account = world.getAccount(req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Аккаунт не найден' });
  res.json({
    accountId: account.id,
    displayName: account.displayName,
    characters: world.listAccountCharacters(account.id),
    maxCharacters: 3,
  });
});

app.post('/api/account/:accountId/characters', (req, res) => {
  const result = world.createCharacterForAccount(req.params.accountId, req.body?.name);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/account/:accountId/select', (req, res) => {
  const result = world.selectCharacter(req.params.accountId, req.body?.playerId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Введите имя' });
  const player = world.login(name.trim());
  res.json({ playerId: player.id, name: player.name });
});

// ---- Google Sign-In (optional, enabled via GOOGLE_CLIENT_ID) ----
app.get('/api/auth/google/config', (_, res) =>
  res.json({ enabled: !!GOOGLE_CLIENT_ID, clientId: GOOGLE_CLIENT_ID })
);

app.post('/api/auth/google', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(400).json({ error: 'Google-вход не настроен' });
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Нет токена Google' });
  try {
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!resp.ok) return res.status(401).json({ error: 'Недействительный токен Google' });
    const info = await resp.json();
    if (info.aud !== GOOGLE_CLIENT_ID) return res.status(401).json({ error: 'Токен для другого приложения' });
    const player = world.loginWithGoogle({ googleId: info.sub, email: info.email, name: info.name });
    res.json({ playerId: player.id, name: player.name });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка проверки Google: ' + err.message });
  }
});

app.get('/api/static/items', (_, res) => res.json(ITEMS));
app.get('/api/static/spells', (_, res) => res.json(SPELLS));
app.get('/api/static/locations', (_, res) => res.json(LOCATIONS));
app.get('/api/static/dungeons', (_, res) => res.json(DUNGEONS));
app.get('/api/static/stats', (_, res) => res.json(STAT_LABELS));

// ---- Admin API: live content editing ----
function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return next(); // open in local dev
  const token = req.get('x-admin-token') || req.query.token;
  if (token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'Неверный токен администратора' });
}

app.get('/api/admin/content', requireAdmin, (_, res) => {
  res.json(exportContent());
});

app.put('/api/admin/content', requireAdmin, (req, res) => {
  try {
    const applied = applyContent(req.body || {});
    saveContent(applied);
    world.reloadContent();
    res.json({ ok: true, content: applied });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/auth-required', (_, res) => res.json({ required: !!ADMIN_TOKEN }));

// ---- Static hosting: admin panel + (optional) exported web client ----
const adminDir = path.join(__dirname, '../../admin');
if (fs.existsSync(adminDir)) {
  app.use('/admin', express.static(adminDir));
}

const webClientDir = path.join(__dirname, '../../client/dist');
if (fs.existsSync(webClientDir)) {
  app.use('/', express.static(webClientDir));
  // SPA fallback for the exported Expo web client.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(webClientDir, 'index.html'));
  });
}

setupDatabase();

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const playerId = url.searchParams.get('playerId');
  if (!playerId || !world.getPlayer(playerId)) {
    ws.close(4001, 'Invalid player');
    return;
  }

  world.attachSession(playerId, ws);
  const player = world.getPlayer(playerId);

  ws.send(
    JSON.stringify({
      type: 'init',
      data: {
        player: world.serializePlayer(player),
        chat: world.getChatHistory(),
        merchant: world.getMerchantStock(),
        spells: SPELLS,
        items: ITEMS,
      },
    })
  );

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const result = world.handleMessage(playerId, msg);
      if (result?.error) {
        ws.send(JSON.stringify({ type: 'error', data: result.error }));
      } else if (result?.battle) {
        ws.send(JSON.stringify({ type: 'battle_update', data: result.battle }));
      } else if (result?.player) {
        ws.send(JSON.stringify({ type: 'player_update', data: result.player }));
        if (result.groups) {
          ws.send(JSON.stringify({ type: 'dungeon_groups', data: result.groups }));
        }
      } else if (result?.groups) {
        ws.send(JSON.stringify({ type: 'dungeon_groups', data: result.groups }));
      } else if (result?.success && typeNeedsUpdate(msg.type)) {
        ws.send(JSON.stringify({ type: 'player_update', data: world.serializePlayer(player) }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    if (player) player.ws = null;
    world.sessions.delete(ws);
  });
});

function typeNeedsUpdate(type) {
  return ['create_dungeon_group', 'join_dungeon_group', 'leave_dungeon_group', 'launch_dungeon'].includes(type);
}

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

server.listen(PORT, HOST, () => {
  console.log(`TextQuest server running on http://localhost:${PORT}`);
  console.log(`Админка: http://localhost:${PORT}/admin`);
  const lan = getLanAddresses();
  if (lan.length) {
    console.log('Для телефона в той же Wi‑Fi сети:');
    for (const ip of lan) {
      console.log(`  EXPO_PUBLIC_API_URL=http://${ip}:${PORT}`);
    }
  }
  console.log(`WebSocket: ws://localhost:${PORT}/ws?playerId=...`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} уже занят. Запустите: npm run server:stop`);
    console.error('Или укажите другой порт: set PORT=3002 && npm run server');
  } else {
    console.error('Ошибка сервера:', err.message);
  }
  process.exit(1);
});
