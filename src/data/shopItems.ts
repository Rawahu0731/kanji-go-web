// ショップアイテム定義
export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'theme' | 'icon' | 'boost';
  icon: string;
  effect?: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'theme_dark_blue',
    name: 'ダークブルーテーマ',
    description: '深い青色のダークテーマ',
    price: 500,
    category: 'theme',
    icon: '🌊',
    effect: 'theme_dark_blue'
  },
  {
    id: 'theme_purple',
    name: 'パープルテーマ',
    description: '神秘的な紫色のテーマ',
    price: 500,
    category: 'theme',
    icon: '🔮',
    effect: 'theme_purple'
  },
  {
    id: 'theme_green',
    name: 'グリーンテーマ',
    description: '自然の緑色のテーマ',
    price: 500,
    category: 'theme',
    icon: '🌿',
    effect: 'theme_green'
  },
  {
    id: 'theme_sunset',
    name: 'サンセットテーマ',
    description: '夕焼けのような暖色テーマ',
    price: 800,
    category: 'theme',
    icon: '🌅',
    effect: 'theme_sunset'
  },
  {
    id: 'icon_fire',
    name: '炎アイコン',
    description: 'プロフィールアイコン：炎',
    price: 300,
    category: 'icon',
    icon: '🔥',
    effect: 'icon_fire'
  },
  {
    id: 'icon_star',
    name: '星アイコン',
    description: 'プロフィールアイコン：星',
    price: 300,
    category: 'icon',
    icon: '⭐',
    effect: 'icon_star'
  },
  {
    id: 'icon_dragon',
    name: 'ドラゴンアイコン',
    description: 'プロフィールアイコン：龍',
    price: 600,
    category: 'icon',
    icon: '🐉',
    effect: 'icon_dragon'
  },
  {
    id: 'xp_boost_2x',
    name: 'XP2倍ブースト（1時間）',
    description: '1時間XPが2倍になる',
    price: 1000,
    category: 'boost',
    icon: '⚡',
    effect: 'xp_boost_2x_1h'
  }
];
