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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Apply persisted content (or seed defaults) and rebuild the live world.
loadContent();
world.reloadContent();

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Введите имя' });
  const player = world.login(name.trim());
  res.json({ playerId: player.id, name: player.name });
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
