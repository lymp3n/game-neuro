export const STAT_ORDER = ['strength', 'agility', 'endurance', 'intellect', 'spirit', 'will', 'luck'];

export const STAT_LABELS: Record<string, string> = {
  strength: 'Сила',
  agility: 'Ловкость',
  endurance: 'Выносливость',
  intellect: 'Интеллект',
  spirit: 'Дух',
  will: 'Воля',
  luck: 'Удача',
};

export const STAT_ICONS: Record<string, string> = {
  strength: 'fitness-center',
  agility: 'directions-run',
  endurance: 'shield',
  intellect: 'auto-stories',
  spirit: 'auto-awesome',
  will: 'self-improvement',
  luck: 'casino',
};

export const STAT_DESCRIPTIONS: Record<string, string> = {
  strength: 'Физический урон и вместимость инвентаря',
  agility: 'Шанс уклонения',
  endurance: 'Здоровье, физ. защита и сопр. дебаффам',
  intellect: 'Магический урон и немного маг. защиты',
  spirit: 'Мана, маг. защита, сила и длительность дебаффов',
  will: 'Сопр. дебаффам, защита от безумия, тренировки',
  luck: 'Шанс крита, защита от критов, сопр. дебаффам',
};

export const SLOT_LABELS: Record<string, string> = {
  head: 'Голова',
  body: 'Тело',
  rightHand: 'Правая рука',
  leftHand: 'Левая рука',
  boots: 'Ботинки',
};
