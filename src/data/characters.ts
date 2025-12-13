// キャラクター定義
export type CharacterRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'ultra';

export type CharacterEffect = {
  type: 'xp_boost' | 'coin_boost' | 'both_boost' | 'streak_shield' | 'lucky';
  value: number; // ブースト倍率（1.1 = 10%増加）
};

export type Character = {
  id: string;
  name: string;
  icon: string;
  rarity: CharacterRarity;
  description: string;
  effect: CharacterEffect;
  unlockDate?: string; // YYYY-MM-DD形式の解放日（オプション）
};

export type OwnedCharacter = Character & {
  level: number; // キャラクターのレベル（1から開始、最大100）
  count: number; // 所持数（重複した回数）
  xp: number; // キャラクターの経験値
};

// レアリティの優先度（ソート用）
export const RARITY_ORDER: Record<CharacterRarity, number> = {
  ultra: 6,
  mythic: 5,
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1
};

// レアリティごとのレベルあたりの効果上昇率（例: 0.02 = レベルごとに2%増加）
export const RARITY_LEVEL_BONUS: Record<CharacterRarity, number> = {
  common: 0.02,
  rare: 0.03,
  epic: 0.04,
  legendary: 0.06,
  mythic: 0.10,
  ultra: 0.15
};

// キャラクターリスト
export const CHARACTERS: Record<string, Character> = {
  // コモン（よく出る）
  student: {
    id: 'student',
    name: '学生',
    icon: '👨‍🎓',
    rarity: 'common',
    description: 'XPを10%増加',
    effect: { type: 'xp_boost', value: 1.1 }
  },
  merchant: {
    id: 'merchant',
    name: '商人',
    icon: '🧑‍💼',
    rarity: 'common',
    description: 'コインを10%増加',
    effect: { type: 'coin_boost', value: 1.1 }
  },
  farmer: {
    id: 'farmer',
    name: '農夫',
    icon: '👨‍🌾',
    rarity: 'common',
    description: 'XPを5%増加',
    effect: { type: 'xp_boost', value: 1.05 }
  },
  artist: {
    id: 'artist',
    name: '芸術家',
    icon: '🧑‍🎨',
    rarity: 'common',
    description: 'コインを5%増加',
    effect: { type: 'coin_boost', value: 1.05 }
  },
  
  // レア
  teacher: {
    id: 'teacher',
    name: '先生',
    icon: '👨‍🏫',
    rarity: 'rare',
    description: 'XPを20%増加',
    effect: { type: 'xp_boost', value: 1.2 }
  },
  banker: {
    id: 'banker',
    name: '銀行家',
    icon: '🧑‍💼',
    rarity: 'rare',
    description: 'コインを20%増加',
    effect: { type: 'coin_boost', value: 1.2 }
  },
  ninja: {
    id: 'ninja',
    name: '忍者',
    icon: '🥷',
    rarity: 'rare',
    description: 'XPとコインを15%増加',
    effect: { type: 'both_boost', value: 1.15 }
  },
  samurai: {
    id: 'samurai',
    name: '侍',
    icon: '⚔️',
    rarity: 'rare',
    description: 'XPとコインを12%増加',
    effect: { type: 'both_boost', value: 1.12 }
  },
  bear: {
    id: 'bear',
    name: '熊',
    icon: '🐻',
    rarity: 'ultra',
    description: 'XPとコインを1200%増加（13倍）',
    effect: { type: 'both_boost', value: 13.0 }
  },
  
  // エピック
  wizard: {
    id: 'wizard',
    name: '魔法使い',
    icon: '🧙',
    rarity: 'epic',
    description: 'XPを30%増加',
    effect: { type: 'xp_boost', value: 1.3 }
  },
  dragon: {
    id: 'dragon',
    name: '龍',
    icon: '🐉',
    rarity: 'epic',
    description: 'XPとコインを25%増加',
    effect: { type: 'both_boost', value: 1.25 }
  },
  phoenix: {
    id: 'phoenix',
    name: '不死鳥',
    icon: '🔥🦅',
    rarity: 'epic',
    description: 'XPとコインを20%増加、ストリーク保護',
    effect: { type: 'both_boost', value: 1.2 }
  },
  
  // レジェンダリー
  deity: {
    id: 'deity',
    name: '神',
    icon: '✨👑',
    rarity: 'legendary',
    description: 'XPとコインを50%増加',
    effect: { type: 'both_boost', value: 1.5 }
  },
  sage: {
    id: 'sage',
    name: '賢者',
    icon: '🧙‍♂️✨',
    rarity: 'legendary',
    description: 'XPを60%増加',
    effect: { type: 'xp_boost', value: 1.6 }
  },
  emperor: {
    id: 'emperor',
    name: '皇帝',
    icon: '👑',
    rarity: 'legendary',
    description: 'コインを60%増加',
    effect: { type: 'coin_boost', value: 1.6 }
  },
  
  // ミシック（超レア）
  celestial: {
    id: 'celestial',
    name: '天界の守護者',
    icon: '🌟👼',
    rarity: 'mythic',
    description: 'XPとコインを200%増加（3倍）',
    effect: { type: 'both_boost', value: 3.0 }
  },
  primordial: {
    id: 'primordial',
    name: '原初の存在',
    icon: '🌌✨',
    rarity: 'mythic',
    description: 'XPを400%増加（5倍）',
    effect: { type: 'xp_boost', value: 5.0 }
  },
  transcendent: {
    id: 'transcendent',
    name: '超越者',
    icon: '⚡🔱',
    rarity: 'mythic',
    description: 'コインを400%増加（5倍）',
    effect: { type: 'coin_boost', value: 5.0 }
  },

  // ウルトラ（最高レアリティ）- 12/1解放
  worldCreator: {
    id: 'worldCreator',
    name: '世界創造神',
    icon: '🌍✨',
    rarity: 'ultra',
    description: 'XPとコインを800%増加（9倍）',
    effect: { type: 'both_boost', value: 9.0 },
    unlockDate: '2025-12-01'
  },
  eternalKing: {
    id: 'eternalKing',
    name: '永遠の王',
    icon: '👑💎',
    rarity: 'ultra',
    description: 'XPを1000%増加（11倍）',
    effect: { type: 'xp_boost', value: 11.0 },
    unlockDate: '2025-12-01'
  },
  infiniteWealth: {
    id: 'infiniteWealth',
    name: '無限の富',
    icon: '💰🌟',
    rarity: 'ultra',
    description: 'コインを1000%増加（11倍）',
    effect: { type: 'coin_boost', value: 11.0 },
    unlockDate: '2025-12-01'
  }
};

// ガチャの排出率
export const GACHA_RATES = {
  common: 60,      // 60%
  rare: 30,        // 30%
  epic: 9,         // 9%
  legendary: 0.9,  // 0.9%
  mythic: 0.09,    // 0.09%
  ultra: 0.01      // 0.01%
};

// レアリティごとのキャラクターリストを取得
export const getCharactersByRarity = (rarity: CharacterRarity, characterPool: Record<string, Character> = CHARACTERS): Character[] => {
  return Object.values(characterPool).filter(char => char.rarity === rarity && isCharacterUnlocked(char));
};

// キャラクターが解放されているかチェック
export const isCharacterUnlocked = (character: Character): boolean => {
  if (!character.unlockDate) return true;
  const unlockDate = new Date(character.unlockDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= unlockDate;
};

// 解放済みのキャラクタープールを取得
export const getAvailableCharacters = (): Record<string, Character> => {
  const available: Record<string, Character> = {};
  for (const [id, char] of Object.entries(CHARACTERS)) {
    if (isCharacterUnlocked(char)) {
      available[id] = char;
    }
  }
  return available;
};

// ガチャを引く
export const pullGacha = (count: number = 1, guaranteedRarity?: CharacterRarity, characterPool?: Record<string, Character>): Character[] => {
  // 解放済みのキャラクターのみを使用
  const availablePool = characterPool || getAvailableCharacters();
  const results: Character[] = [];
  
  // 利用可能なキャラクターがない場合は空配列を返す
  if (Object.keys(availablePool).length === 0) {
    return [];
  }
  
  for (let i = 0; i < count; i++) {
    // レアリティを決定
    const totalRate = Object.values(GACHA_RATES).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalRate;
    
    let selectedRarity: CharacterRarity = 'common';
    for (const [rarity, rate] of Object.entries(GACHA_RATES)) {
      random -= rate;
      if (random <= 0) {
        selectedRarity = rarity as CharacterRarity;
        break;
      }
    }
    
    // そのレアリティのキャラクターからランダムに選択
    const charactersOfRarity = getCharactersByRarity(selectedRarity, availablePool);
    
    // 選択したレアリティにキャラクターがいない場合は、他のレアリティから選択
    if (charactersOfRarity.length === 0) {
      const allAvailable = Object.values(availablePool).filter(char => isCharacterUnlocked(char));
      if (allAvailable.length === 0) continue;
      const randomChar = allAvailable[Math.floor(Math.random() * allAvailable.length)];
      results.push(randomChar);
    } else {
      const randomChar = charactersOfRarity[Math.floor(Math.random() * charactersOfRarity.length)];
      results.push(randomChar);
    }
  }
  
  // 確定レアリティが指定されている場合、そのレアリティ以上が1体も出ていなければ最後の1体を置き換える
  if (guaranteedRarity && count > 0) {
    const hasGuaranteed = results.some(char => 
      RARITY_ORDER[char.rarity] >= RARITY_ORDER[guaranteedRarity]
    );
    
    if (!hasGuaranteed) {
      // 確定レアリティ以上のキャラクターをランダムに選択
      const guaranteedChars = Object.values(availablePool).filter(char => 
        RARITY_ORDER[char.rarity] >= RARITY_ORDER[guaranteedRarity] && isCharacterUnlocked(char)
      );
      if (guaranteedChars.length > 0) {
        const guaranteedChar = guaranteedChars[Math.floor(Math.random() * guaranteedChars.length)];
        // 最後の1体を確定キャラクターに置き換える
        results[results.length - 1] = guaranteedChar;
      }
    }
  }
  
  return results;
};

// キャラクターのレベルに応じた効果値を計算
export const getCharacterEffectValue = (character: OwnedCharacter): number => {
  const baseValue = character.effect.value;
  // レアリティに応じてレベルごとの上昇率を変える
  const perLevel = RARITY_LEVEL_BONUS[character.rarity] ?? 0.02;
  const levelBonus = 1 + (character.level - 1) * perLevel;
  return baseValue * levelBonus;
};

// キャラクターの次のレベルに必要な経験値（レベルに応じて増加）
export const getXpForCharacterLevel = (level: number): number => {
  // レベル1→2: 100XP, レベル2→3: 110XP... と徐々に増加
  return Math.floor(100 * Math.pow(1.05, level - 1));
};

// キャラクターの最大レベル
export const MAX_CHARACTER_LEVEL = 100;

// キャラクターの最大+値（count - 1の最大値）
export const MAX_CHARACTER_COUNT = 200001;

// レアリティの日本語名
export const getRarityName = (rarity: CharacterRarity): string => {
  switch (rarity) {
    case 'common': return 'コモン';
    case 'rare': return 'レア';
    case 'epic': return 'エピック';
    case 'legendary': return 'レジェンダリー';
    case 'mythic': return 'ミシック';
    case 'ultra': return 'ウルトラ';
    default: return '';
  }
};
