import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { API_URL, getWsUrl } from '@/config/api';

export type Overlay =
  | null
  | 'character'
  | 'spells'
  | 'inventory'
  | 'stash'
  | 'merchant'
  | 'dungeon'
  | 'chat'
  | 'battle'
  | 'battle_result';

export interface GameContextValue {
  player: any;
  location: any;
  locations: Record<string, any>;
  chat: any[];
  merchant: any[];
  items: Record<string, any>;
  spells: Record<string, any>;
  connected: boolean;
  overlay: Overlay;
  overlayStack: Overlay[];
  battle: any;
  toast: string | null;
  dungeonGroups: any[];
  inventoryFilter: string | null;
  openOverlay: (o: Overlay, opts?: { inventoryFilter?: string | null }) => void;
  closeOverlay: () => void;
  closeAllOverlays: () => void;
  send: (type: string, payload?: any) => void;
  login: (name: string) => Promise<void>;
  showToast: (msg: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [locations, setLocations] = useState<Record<string, any>>({});
  const [chat, setChat] = useState<any[]>([]);
  const [merchant, setMerchant] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any>>({});
  const [spells, setSpells] = useState<Record<string, any>>({});
  const [connected, setConnected] = useState(false);
  const [overlayStack, setOverlayStack] = useState<Overlay[]>([]);
  const [battle, setBattle] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dungeonGroups, setDungeonGroups] = useState<any[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string | null>(null);

  const overlay = overlayStack[overlayStack.length - 1] ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const openOverlay = useCallback((o: Overlay, opts?: { inventoryFilter?: string | null }) => {
    if (opts?.inventoryFilter !== undefined) setInventoryFilter(opts.inventoryFilter);
    setOverlayStack((prev) => [...prev, o]);
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayStack((prev) => {
      const next = prev.slice(0, -1);
      if (prev[prev.length - 1] === 'inventory') setInventoryFilter(null);
      return next;
    });
  }, []);

  const closeAllOverlays = useCallback(() => {
    setOverlayStack([]);
    setInventoryFilter(null);
    setBattle(null);
  }, []);

  const connect = useCallback(
    (playerId: string) => {
      if (wsRef.current) wsRef.current.close();
      const wsUrl = getWsUrl(`/ws?playerId=${playerId}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => showToast('Ошибка соединения');

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case 'init':
            setPlayer(msg.data.player);
            setLocation(msg.data.player.locationView);
            setChat(msg.data.chat ?? []);
            setMerchant(msg.data.merchant ?? []);
            setItems(msg.data.items ?? {});
            setSpells(msg.data.spells ?? {});
            break;
          case 'player_update':
            setPlayer(msg.data);
            setLocation(msg.data.locationView);
            break;
          case 'location_update':
            setLocation(msg.data);
            break;
          case 'travel_complete':
            setPlayer(msg.data);
            setLocation(msg.data.locationView);
            showToast('Вы прибыли в новую локацию');
            break;
          case 'battle_start':
          case 'battle_update':
            setBattle(msg.data);
            setOverlayStack(['battle']);
            break;
          case 'battle_victory':
          case 'battle_end':
            setBattle({ ...msg.data.battle, result: msg.data.result ?? (msg.type === 'battle_victory' ? 'victory' : 'defeat') });
            setPlayer(msg.data.player);
            setLocation(msg.data.player.locationView);
            setOverlayStack(['battle_result']);
            break;
          case 'battle_defeat':
            setPlayer(msg.data.player);
            setBattle(
              msg.data.battle
                ? { ...msg.data.battle, result: 'defeat' }
                : { status: 'lost', result: 'defeat', mobName: 'Противник' }
            );
            setOverlayStack(['battle_result']);
            break;
          case 'chat':
            setChat((prev) => [...prev.slice(-49), msg.data]);
            break;
          case 'dungeon_start':
            setPlayer(msg.data);
            setLocation(msg.data.locationView);
            closeAllOverlays();
            showToast('Подземелье началось!');
            break;
          case 'dungeon_groups':
            setDungeonGroups(msg.data ?? []);
            break;
          case 'error':
            showToast(msg.data);
            break;
        }
      };
    },
    [showToast, closeAllOverlays]
  );

  const login = useCallback(
    async (name: string) => {
      let loginRes: Response;
      let locRes: Response;
      try {
        [loginRes, locRes] = await Promise.all([
          fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          }),
          fetch(`${API_URL}/api/static/locations`),
        ]);
      } catch {
        throw new Error(
          `Не удалось подключиться к серверу (${API_URL}). Запустите: npm run server`
        );
      }

      let data: { error?: string; playerId?: string };
      try {
        data = await loginRes.json();
      } catch {
        throw new Error('Сервер вернул некорректный ответ');
      }

      if (!loginRes.ok) throw new Error(data.error ?? 'Ошибка входа');

      let locData: Record<string, unknown>;
      try {
        locData = await locRes.json();
      } catch {
        throw new Error('Не удалось загрузить карту локаций');
      }

      setLocations(locData);
      playerIdRef.current = data.playerId!;
      connect(data.playerId!);
    },
    [connect]
  );

  const send = useCallback((type: string, payload?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => () => wsRef.current?.close(), []);

  return (
    <GameContext.Provider
      value={{
        player,
        location,
        locations,
        chat,
        merchant,
        items,
        spells,
        connected,
        overlay,
        overlayStack,
        battle,
        toast,
        dungeonGroups,
        inventoryFilter,
        openOverlay,
        closeOverlay,
        closeAllOverlays,
        send,
        login,
        showToast,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
