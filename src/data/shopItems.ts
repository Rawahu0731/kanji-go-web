// ショップアイテム定義
export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'theme' | 'icon' | 'collection' | 'gacha';
  icon: string;
  effect?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
};

export const SHOP_ITEMS: ShopItem[] = [
  // デフォルトテーマ（無料）
  {
    id: 'theme_default',
    name: 'デフォルトテーマ',
    description: '明るく清潔感のある白ベースのテーマ。初期設定の見た目に戻します。',
    price: 0,
    category: 'theme',
    icon: '☀️',
    effect: 'default'
  },
  {
    id: 'theme_dark_blue',
    name: 'ダークブルーテーマ',
    description: '深海のような青色の背景テーマ。落ち着いた雰囲気で集中力アップ！',
    price: 500,
    category: 'theme',
    icon: '🌊',
    effect: 'theme_dark_blue'
  },
  {
    id: 'theme_purple',
    name: 'パープルテーマ',
    description: '神秘的な紫色の背景テーマ。魔法のような雰囲気で学習を楽しく！',
    price: 500,
    category: 'theme',
    icon: '🔮',
    effect: 'theme_purple'
  },
  {
    id: 'theme_green',
    name: 'グリーンテーマ',
    description: '自然の緑色の背景テーマ。目に優しく長時間の学習に最適！',
    price: 500,
    category: 'theme',
    icon: '🌿',
    effect: 'theme_green'
  },
  {
    id: 'theme_sunset',
    name: 'サンセットテーマ',
    description: '夕焼けのような暖色の背景テーマ。温かみのある雰囲気でリラックス学習！',
    price: 800,
    category: 'theme',
    icon: '🌅',
    effect: 'theme_sunset'
  },
  {
    id: 'theme_cherry',
    name: '桜テーマ',
    description: '桜色の優しいピンクの背景テーマ。春の訪れのような華やかさ！',
    price: 600,
    category: 'theme',
    icon: '🌸',
    effect: 'theme_cherry'
  },
  {
    id: 'theme_midnight',
    name: 'ミッドナイトテーマ',
    description: '真夜中の濃紺の背景テーマ。深夜の学習に最適な落ち着きの空間！',
    price: 700,
    category: 'theme',
    icon: '🌙',
    effect: 'theme_midnight'
  },
  {
    id: 'theme_autumn',
    name: '紅葉テーマ',
    description: '秋の紅葉をイメージした暖色の背景テーマ。読書の秋にぴったり！',
    price: 800,
    category: 'theme',
    icon: '🍁',
    effect: 'theme_autumn'
  },
  // デフォルトアイコン（無料）
  {
    id: 'icon_default',
    name: 'デフォルトアイコン',
    description: '標準のプロフィールアイコン。初期設定の見た目に戻します。',
    price: 0,
    category: 'icon',
    icon: '👤',
    effect: 'default'
  },
  {
    id: 'icon_fire',
    name: '炎アイコン',
    description: 'プロフィールアイコン：燃える炎。情熱的な学習者に！',
    price: 300,
    category: 'icon',
    icon: '🔥',
    effect: 'icon_fire'
  },
  {
    id: 'icon_star',
    name: '星アイコン',
    description: 'プロフィールアイコン：輝く星。目標に向かって輝こう！',
    price: 300,
    category: 'icon',
    icon: '⭐',
    effect: 'icon_star'
  },
  {
    id: 'icon_dragon',
    name: 'ドラゴンアイコン',
    description: 'プロフィールアイコン：東洋の龍。力強さと知恵の象徴！',
    price: 600,
    category: 'icon',
    icon: '🐉',
    effect: 'icon_dragon'
  },
  {
    id: 'icon_crown',
    name: '王冠アイコン',
    description: 'プロフィールアイコン：金の王冠。学習の王者を目指せ！',
    price: 500,
    category: 'icon',
    icon: '👑',
    effect: 'icon_crown'
  },
  {
    id: 'icon_ninja',
    name: '忍者アイコン',
    description: 'プロフィールアイコン：忍者。密かに実力をつける！',
    price: 400,
    category: 'icon',
    icon: '🥷',
    effect: 'icon_ninja'
  },
  {
    id: 'icon_wizard',
    name: '魔法使いアイコン',
    description: 'プロフィールアイコン：魔法使い。知識の魔法をマスター！',
    price: 500,
    category: 'icon',
    icon: '🧙',
    effect: 'icon_wizard'
  },
  {
    id: 'icon_samurai',
    name: '侍アイコン',
    description: 'プロフィールアイコン：侍。武士道精神で学習に取り組む！',
    price: 600,
    category: 'icon',
    icon: '⚔️',
    effect: 'icon_samurai'
  },
  {
    id: 'icon_robot',
    name: 'ロボットアイコン',
    description: 'プロフィールアイコン：ロボット。効率的な学習マシン！',
    price: 400,
    category: 'icon',
    icon: '🤖',
    effect: 'icon_robot'
  },
  {
    id: 'icon_cherry_blossom',
    name: '桜アイコン',
    description: 'プロフィールアイコン：桜の花。美しく儚い日本の象徴！',
    price: 400,
    category: 'icon',
    icon: '🌸',
    effect: 'icon_cherry_blossom'
  },
  {
    id: 'icon_custom',
    name: 'カスタムアイコン',
    description: 'ローカルの画像ファイルをアップロードして設定できる特別なアイコン。あなただけのオリジナル！',
    price: 10000,
    category: 'icon',
    icon: '🎨',
    effect: 'custom'
  },
  // カードパック（ガチャ要素）
  {
    id: 'card_pack_basic',
    name: 'ベーシックパック',
    description: 'ランダムで3枚の漢字カードを獲得。',
    price: 1000,
    category: 'collection',
    icon: '📦',
    effect: 'card_pack_basic',
    rarity: 'common'
  },
  {
    id: 'card_pack_bronze',
    name: 'ブロンズパック',
    description: 'ランダムで5枚の漢字カードを獲得。',
    price: 3000,
    category: 'collection',
    icon: '🃏',
    effect: 'card_pack_bronze',
    rarity: 'common'
  },
  {
    id: 'card_pack_silver',
    name: 'シルバーパック',
    description: 'ランダムで5枚の漢字カードを獲得。レアカードの可能性も！',
    price: 8000,
    category: 'collection',
    icon: '🎴',
    effect: 'card_pack_silver',
    rarity: 'rare'
  },
  {
    id: 'card_pack_gold',
    name: 'ゴールドパック',
    description: 'ランダムで7枚の漢字カードを獲得。レアカード1枚確定！',
    price: 15000,
    category: 'collection',
    icon: '🎰',
    effect: 'card_pack_gold',
    rarity: 'epic'
  },
  {
    id: 'card_pack_platinum',
    name: 'プラチナパック',
    description: 'ランダムで10枚の漢字カードを獲得。高レベル漢字多数！エピックカード1枚確定！',
    price: 30000,
    category: 'collection',
    icon: '💎',
    effect: 'card_pack_platinum',
    rarity: 'legendary'
  },
  // キャラクターガチャ
  {
    id: 'character_gacha_single',
    name: '単発ガチャ',
    description: 'ランダムで1体のキャラクターを獲得。XP・コインブースト効果を持つ！',
    price: 500,
    category: 'gacha',
    icon: '🎲',
    effect: 'character_gacha_1'
  },
  {
    id: 'character_gacha_5',
    name: '5連ガチャ',
    description: 'ランダムで5体のキャラクターを獲得。レア以上1体確定！',
    price: 2000,
    category: 'gacha',
    icon: '🎲🎲',
    effect: 'character_gacha_5',
    rarity: 'rare'
  },
  {
    id: 'character_gacha_10',
    name: '10連ガチャ',
    description: 'ランダムで10体のキャラクターを獲得。エピック以上1体確定！',
    price: 3500,
    category: 'gacha',
    icon: '🎲🎲🎲',
    effect: 'character_gacha_10',
    rarity: 'epic'
  }
  ,
  {
    id: 'character_gacha_100',
    name: '100連ガチャ',
    description: 'ランダムで100体のキャラクターを獲得。レジェンダリー以上1体以上確定！',
    // 10連を基準に、増えた分だけ比例して価格を設定（3500 * (100 / 10) = 35000）
    price: 35000,
    category: 'gacha',
    icon: '🎲🎲🎲🎲🎲',
    effect: 'character_gacha_100',
    rarity: 'legendary'
  },
  
];
