import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import os from 'os';
import { world, ITEMS, SPELLS, LOCATIONS, DUNGEONS, STAT_LABELS } from './game/world.js';

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const app = express();
app.use(cors());
app.use(express.json());

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
