import { MaterialIcons } from '@expo/vector-icons';

const ALIASES: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  water_drop: 'opacity',
  local_fire_department: 'whatshot',
  swords: 'sports-martial-arts',
  healing: 'favorite',
  shield: 'security',
  key: 'vpn-key',
};

export function gameIcon(name?: string): keyof typeof MaterialIcons.glyphMap {
  if (!name) return 'inventory';
  const aliased = ALIASES[name] ?? (name as keyof typeof MaterialIcons.glyphMap);
  if (aliased in MaterialIcons.glyphMap) return aliased;
  return 'inventory';
}
