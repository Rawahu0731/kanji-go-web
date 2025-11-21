// 漢字カードの拡張属性データ
// レアリティ、属性、スキルをCSV形式で定義

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ElementType = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';
export type SkillType = 
  | 'xp_boost'      // XP獲得量増加
  | 'coin_boost'    // コイン獲得量増加
  | 'combo_bonus'   // コンボボーナス
  | 'streak_power'  // 連続正解時強化
  | 'revival'       // 不正解時のペナルティ軽減
  | 'lucky_draw'    // カードパック強化
  | 'synergy'       // 特定属性と組み合わせて強化
  | 'multi_answer'  // 複数回答可能（時間延長）
  | 'time_freeze'   // 時間停止
  | 'shield';       // ミス1回無効化

export interface KanjiAttributes {
  kanji: string;
  rarity: CardRarity;
  element: ElementType;
  skill: SkillType;
  power: number;
  xpBoost: number;    // XPブースト値（パーセント）
  coinBoost: number;  // コインブースト値（パーセント）
}

// 属性ごとの特徴
export const ELEMENT_INFO: Record<ElementType, { name: string; emoji: string; color: string; description: string }> = {
  fire: { name: '火', emoji: '🔥', color: '#ff4444', description: 'XP重視の攻撃型' },
  water: { name: '水', emoji: '💧', color: '#4444ff', description: 'コイン重視の防御型' },
  earth: { name: '土', emoji: '🌍', color: '#8b4513', description: 'XP/コイン両立のバランス型' },
  wind: { name: '風', emoji: '💨', color: '#87ceeb', description: 'XP寄りの速攻型' },
  light: { name: '光', emoji: '✨', color: '#ffd700', description: 'XP/コイン両方高水準' },
  dark: { name: '闇', emoji: '🌙', color: '#4b0082', description: 'XP特化のリスク型' }
};

// スキル情報
export const SKILL_INFO: Record<SkillType, { name: string; icon: string; description: string }> = {
  xp_boost: { name: 'XPブースト', icon: '⭐', description: 'XP獲得量を増加' },
  coin_boost: { name: 'コインブースト', icon: '💰', description: 'コイン獲得量を増加' },
  combo_bonus: { name: 'コンボマスター', icon: '🔗', description: 'コンボ時の効果を強化' },
  streak_power: { name: '連撃強化', icon: '⚡', description: '連続正解時のボーナスを強化' },
  revival: { name: 'リバイバル', icon: '💚', description: '不正解のペナルティを軽減' },
  lucky_draw: { name: 'ラッキードロー', icon: '🍀', description: 'カードパックの品質向上' },
  synergy: { name: 'シナジー', icon: '🤝', description: '同属性との組み合わせで強化' },
  multi_answer: { name: '時間延長', icon: '⏰', description: '回答時間を延長' },
  time_freeze: { name: 'タイムフリーズ', icon: '❄️', description: '時間を一時停止' },
  shield: { name: 'シールド', icon: '🛡️', description: 'ミスを無効化' }
};

// 漢字属性データ（一部抜粋 - 全2136字の初期値）
// kanji,rarity,element,skill,power,xpBoost,coinBoost
const KANJI_ATTRIBUTES_CSV = `龍,legendary,fire,combo_bonus,10,25,20
竜,legendary,fire,combo_bonus,10,25,20
火,rare,fire,xp_boost,6,15,8
水,rare,water,coin_boost,6,8,15
土,common,earth,shield,5,7,7
風,common,wind,multi_answer,4,8,6
光,epic,light,lucky_draw,7,18,15
雷,rare,light,streak_power,7,16,10
海,rare,water,coin_boost,5,8,16
森,common,earth,revival,5,7,8
空,rare,wind,multi_answer,6,12,10
星,epic,light,xp_boost,8,22,12
夜,rare,dark,streak_power,8,17,11
炎,epic,fire,xp_boost,7,20,10
氷,epic,water,time_freeze,8,12,18
岩,rare,earth,shield,7,9,12
嵐,epic,wind,combo_bonus,7,16,14
聖,legendary,light,revival,10,20,20
闇,epic,dark,synergy,8,19,11
焔,legendary,fire,xp_boost,9,28,15
泉,rare,water,coin_boost,7,10,17
煉,legendary,fire,xp_boost,10,30,18
滝,epic,water,coin_boost,8,14,22
翔,legendary,wind,multi_answer,9,22,20
輝,legendary,light,lucky_draw,10,25,25
魔,legendary,dark,synergy,10,27,18
天,epic,light,xp_boost,7,18,14
地,epic,earth,coin_boost,7,12,18
山,common,earth,shield,4,6,6
川,common,water,revival,4,5,7
雨,common,water,coin_boost,4,5,8
雪,rare,water,time_freeze,6,9,13
雲,common,wind,multi_answer,4,7,6
王,epic,light,combo_bonus,7,16,16
皇,legendary,light,combo_bonus,9,23,23
帝,legendary,dark,combo_bonus,9,24,22
神,legendary,light,lucky_draw,10,28,28
仏,epic,light,revival,8,15,16
悪,epic,dark,streak_power,7,19,12
鬼,epic,dark,combo_bonus,8,20,14
魂,rare,dark,revival,6,11,11
夢,rare,light,lucky_draw,6,12,12
愛,epic,light,revival,8,16,17
心,common,light,revival,4,5,6
力,common,fire,xp_boost,4,9,4
剣,rare,fire,streak_power,6,14,8
刀,rare,fire,streak_power,6,15,7
槍,rare,fire,combo_bonus,6,13,9
弓,common,wind,multi_answer,4,8,5
矢,common,wind,streak_power,4,9,5
盾,rare,earth,shield,6,7,13
鎧,epic,earth,shield,8,10,20`;

// CSVをパースして属性マップを作成
export const KANJI_ATTRIBUTES_MAP = new Map<string, KanjiAttributes>();

KANJI_ATTRIBUTES_CSV.split('\n').forEach(line => {
  const [kanji, rarity, element, skill, power, xpBoost, coinBoost] = line.split(',');
  KANJI_ATTRIBUTES_MAP.set(kanji, {
    kanji,
    rarity: rarity as CardRarity,
    element: element as ElementType,
    skill: skill as SkillType,
    power: parseInt(power),
    xpBoost: parseInt(xpBoost),
    coinBoost: parseInt(coinBoost)
  });
});

// デフォルト属性を生成（データにない漢字用）
export function getDefaultKanjiAttributes(kanji: string): KanjiAttributes {
  const charCode = kanji.charCodeAt(0);
  
  // レアリティを決定
  const val = charCode % 100;
  let rarity: CardRarity;
  if (val < 60) rarity = 'common';
  else if (val < 85) rarity = 'rare';
  else if (val < 96) rarity = 'epic';
  else rarity = 'legendary';
  
  // 属性を決定
  const elements: ElementType[] = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
  const element = elements[charCode % elements.length];
  
  // スキルを決定
  let skills: SkillType[];
  if (rarity === 'legendary') {
    skills = ['combo_bonus', 'lucky_draw', 'synergy', 'xp_boost', 'coin_boost'];
  } else if (rarity === 'epic') {
    skills = ['xp_boost', 'coin_boost', 'streak_power', 'time_freeze', 'combo_bonus'];
  } else if (rarity === 'rare') {
    skills = ['xp_boost', 'coin_boost', 'multi_answer', 'shield', 'streak_power'];
  } else {
    skills = ['revival', 'shield', 'multi_answer', 'xp_boost', 'coin_boost'];
  }
  const skill = skills[charCode % skills.length];
  
  // パワーを決定
  const basePower = { legendary: 9, epic: 7, rare: 5, common: 4 }[rarity];
  const power = basePower + (charCode % 2);
  
  // XPブーストとコインブーストを決定
  const baseXpBoost = { legendary: 25, epic: 18, rare: 12, common: 6 }[rarity];
  const baseCoinBoost = { legendary: 20, epic: 15, rare: 10, common: 5 }[rarity];
  
  let xpBoost, coinBoost;
  
  // 属性による傾向
  if (element === 'fire') {
    // 火属性：XP寄り
    xpBoost = baseXpBoost + Math.floor(baseXpBoost * 0.3);
    coinBoost = baseCoinBoost;
  } else if (element === 'water') {
    // 水属性：コイン寄り
    xpBoost = baseXpBoost;
    coinBoost = baseCoinBoost + Math.floor(baseCoinBoost * 0.3);
  } else if (element === 'earth') {
    // 土属性：バランス
    xpBoost = baseXpBoost + Math.floor(baseXpBoost * 0.1);
    coinBoost = baseCoinBoost + Math.floor(baseCoinBoost * 0.1);
  } else if (element === 'wind') {
    // 風属性：XP寄り（少し）
    xpBoost = baseXpBoost + Math.floor(baseXpBoost * 0.2);
    coinBoost = baseCoinBoost;
  } else if (element === 'light') {
    // 光属性：両方高め
    xpBoost = baseXpBoost + Math.floor(baseXpBoost * 0.15);
    coinBoost = baseCoinBoost + Math.floor(baseCoinBoost * 0.15);
  } else { // dark
    // 闇属性：XP特化
    xpBoost = baseXpBoost + Math.floor(baseXpBoost * 0.4);
    coinBoost = baseCoinBoost - Math.floor(baseCoinBoost * 0.1);
  }
  
  // ランダムな調整（±1〜2）
  const variation = (charCode % 3) - 1;
  xpBoost = Math.max(1, xpBoost + variation);
  coinBoost = Math.max(1, coinBoost + variation);
  
  return { kanji, rarity, element, skill, power, xpBoost, coinBoost };
}

// 漢字の属性を取得（マップにあればそれを、なければデフォルトを生成）
export function getKanjiAttributes(kanji: string): KanjiAttributes {
  return KANJI_ATTRIBUTES_MAP.get(kanji) || getDefaultKanjiAttributes(kanji);
}

// デッキのシナジー効果を計算
export function calculateDeckSynergy(deck: KanjiAttributes[]): {
  elementBonus: Record<ElementType, number>;
  totalPower: number;
  synergyMultiplier: number;
} {
  const elementCount: Record<ElementType, number> = {
    fire: 0, water: 0, earth: 0, wind: 0, light: 0, dark: 0
  };

  deck.forEach(card => {
    elementCount[card.element]++;
  });

  const elementBonus: Record<ElementType, number> = {
    fire: 0, water: 0, earth: 0, wind: 0, light: 0, dark: 0
  };

  // 同じ属性が複数あるとボーナス
  Object.entries(elementCount).forEach(([element, count]) => {
    if (count >= 2) {
      elementBonus[element as ElementType] = (count - 1) * 0.1; // 10%ずつ
    }
  });

  // 全属性揃っているとボーナス（レインボーボーナス）
  const hasAllElements = Object.values(elementCount).every(count => count > 0);
  const synergyMultiplier = hasAllElements && deck.length >= 5 ? 1.5 : 1.0;

  const totalPower = deck.reduce((sum, card) => sum + card.power, 0);

  return { elementBonus, totalPower, synergyMultiplier };
}
