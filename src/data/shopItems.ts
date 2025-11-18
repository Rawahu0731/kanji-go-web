// ショップアイテム定義
export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'theme' | 'icon' | 'boost' | 'collection';
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
  // ブーストアイテム
  {
    id: 'xp_boost_2x_1h',
    name: 'XP2倍ブースト（1時間）',
    description: '1時間XPが2倍になる。短時間の集中学習に最適！',
    price: 1000,
    category: 'boost',
    icon: '⚡',
    effect: 'xp_boost_2x_1h'
  },
  {
    id: 'xp_boost_3x_30m',
    name: 'XP3倍ブースト（30分）',
    description: '30分間XPが3倍になる。超集中モードで一気に稼ぐ！',
    price: 1500,
    category: 'boost',
    icon: '⚡⚡',
    effect: 'xp_boost_3x_30m'
  },
  {
    id: 'xp_boost_5x_15m',
    name: 'XP5倍ブースト（15分）',
    description: '15分間XPが5倍になる。最強の瞬発力でレベルアップ！',
    price: 2000,
    category: 'boost',
    icon: '⚡⚡⚡',
    effect: 'xp_boost_5x_15m'
  },
  {
    id: 'coin_boost_2x_1h',
    name: 'コイン2倍ブースト（1時間）',
    description: '1時間獲得コインが2倍になる。お金を稼ぎたい時に！',
    price: 800,
    category: 'boost',
    icon: '💰',
    effect: 'coin_boost_2x_1h'
  },
  {
    id: 'combo_boost_1h',
    name: 'コンボ維持ブースト（1時間）',
    description: '1時間コンボが途切れにくくなる。連続正解でハイスコア！',
    price: 1200,
    category: 'boost',
    icon: '🔗',
    effect: 'combo_boost_1h'
  },
  {
    id: 'lucky_boost_30m',
    name: 'ラッキーブースト（30分）',
    description: '30分間レアアイテムドロップ率が上昇。運試しに！',
    price: 1500,
    category: 'boost',
    icon: '🍀',
    effect: 'lucky_boost_30m'
  },
  {
    id: 'all_boost_15m',
    name: '全能力ブースト（15分）',
    description: '15分間XP・コイン・コンボすべてが1.5倍。究極のパワーアップ！',
    price: 2500,
    category: 'boost',
    icon: '🌟',
    effect: 'all_boost_15m'
  },
  {
    id: 'streak_shield',
    name: '連続記録シールド',
    description: '1回分の学習を逃してもストリークが途切れない保護アイテム。',
    price: 3000,
    category: 'boost',
    icon: '🛡️',
    effect: 'streak_shield'
  },
  {
    id: 'auto_hint_1h',
    name: 'オートヒント（1時間）',
    description: '1時間難しい問題で自動的にヒントが表示される。学習サポート！',
    price: 500,
    category: 'boost',
    icon: '💡',
    effect: 'auto_hint_1h'
  },
  {
    id: 'perfect_bonus_1h',
    name: 'パーフェクトボーナス（1時間）',
    description: '1時間全問正解時のボーナスが2倍になる。完璧を目指そう！',
    price: 1800,
    category: 'boost',
    icon: '✨',
    effect: 'perfect_bonus_1h'
  },
  // プレミアムブースト（やり込み要素）
  {
    id: 'xp_boost_10x_5m',
    name: 'XP10倍ブースト（5分）',
    description: '5分間XPが10倍！超短時間で爆発的成長。使いこなせるか？',
    price: 5000,
    category: 'boost',
    icon: '⚡⚡⚡⚡',
    effect: 'xp_boost_10x_5m'
  },
  {
    id: 'mega_boost_1h',
    name: 'メガブースト（1時間）',
    description: '1時間XP・コイン・コンボすべてが3倍！圧倒的なパワー！',
    price: 8000,
    category: 'boost',
    icon: '💥',
    effect: 'mega_boost_1h'
  },
  {
    id: 'double_reward_24h',
    name: '24時間ダブル報酬',
    description: '丸一日すべての報酬が2倍。本気の学習マラソンに！',
    price: 12000,
    category: 'boost',
    icon: '🎁',
    effect: 'double_reward_24h'
  },
  {
    id: 'legendary_boost_30m',
    name: 'レジェンダリーブースト（30分）',
    description: '30分間XP×5、コイン×5、完璧ボーナス×3！伝説級の力！',
    price: 15000,
    category: 'boost',
    icon: '👑⚡',
    effect: 'legendary_boost_30m'
  },
  // 永続アップグレード（やり込み要素）
  {
    id: 'permanent_xp_boost',
    name: '永続XPブースト+10%',
    description: '永久にXP獲得量が10%増加！一度購入すれば効果は永続！',
    price: 25000,
    category: 'boost',
    icon: '🔰',
    effect: 'permanent_xp_boost'
  },
  {
    id: 'permanent_coin_boost',
    name: '永続コインブースト+10%',
    description: '永久にコイン獲得量が10%増加！富への第一歩！',
    price: 25000,
    category: 'boost',
    icon: '💰🔰',
    effect: 'permanent_coin_boost'
  },
  {
    id: 'auto_save_streak',
    name: '自動ストリーク保護',
    description: 'ストリークが途切れそうな時、自動的に保護（月3回まで）。安心の保険！',
    price: 30000,
    category: 'boost',
    icon: '🛡️✨',
    effect: 'auto_save_streak'
  },
  {
    id: 'master_learner',
    name: 'マスター学習者の証',
    description: 'すべての基本能力が永続的に20%向上。真の達人の証明！',
    price: 50000,
    category: 'boost',
    icon: '🎓👑',
    effect: 'master_learner'
  },
  {
    id: 'ultimate_power',
    name: '究極の力',
    description: '全能力が永続的に50%向上。このゲームの最終到達点。手に入れられるか？',
    price: 100000,
    category: 'boost',
    icon: '💫🌟',
    effect: 'ultimate_power'
  },
  // カードパック（ガチャ要素）
  {
    id: 'card_pack_basic',
    name: 'ベーシックパック',
    description: 'ランダムで3枚の漢字カードを獲得。レベル4-5の漢字が出る！',
    price: 1000,
    category: 'collection',
    icon: '📦',
    effect: 'card_pack_basic',
    rarity: 'common'
  },
  {
    id: 'card_pack_bronze',
    name: 'ブロンズパック',
    description: 'ランダムで5枚の漢字カードを獲得。レベル4-6の漢字が出やすい！',
    price: 3000,
    category: 'collection',
    icon: '🃏',
    effect: 'card_pack_bronze',
    rarity: 'common'
  },
  {
    id: 'card_pack_silver',
    name: 'シルバーパック',
    description: 'ランダムで5枚の漢字カードを獲得。レベル5-7の漢字が出る。レアカードの可能性も！',
    price: 8000,
    category: 'collection',
    icon: '🎴',
    effect: 'card_pack_silver',
    rarity: 'rare'
  },
  {
    id: 'card_pack_gold',
    name: 'ゴールドパック',
    description: 'ランダムで7枚の漢字カードを獲得。レベル6-8の漢字が中心。レアカード1枚確定！',
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
  }
];
