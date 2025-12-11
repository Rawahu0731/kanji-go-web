// スキルツリーのスキル定義
export interface Skill {
  id: string;
  name: string;
  description: string;
  cost: number; // メダル消費量
  maxLevel: number; // 最大レベル
  effect: {
    type: 'xp_boost' | 'coin_boost' | 'medal_boost' | 'streak_protection' | 'streak_amp' | 'double_reward' | 'critical_hit' | 'lucky_coin' | 'xp_multiplier' | 'time_bonus';
    value: number; // レベルごとの効果値（パーセンテージまたは回数）
  };
  prerequisite?: string[]; // 前提スキルID（複数可）
  tier: number; // 階層（0=中心、1-4=外周）
  angle: number; // 円形配置の角度（0-360度）
}

export const SKILLS: Skill[] = [
  // Tier 0: 中心スキル
  {
    id: 'core',
    name: 'コア',
    description: 'スキルツリーの中核',
    cost: 0,
    maxLevel: 1,
    effect: {
      type: 'xp_boost',
      value: 0
    },
    tier: 0,
    angle: 0
  },
  
  // Tier 1: 内側リング（6個）- 60度間隔
  {
    id: 'xp_boost_1',
    name: 'XPブースト I',
    description: 'XP獲得量+10%',
    cost: 3,
    maxLevel: 5,
    effect: {
      type: 'xp_boost',
      value: 1000
    },
    prerequisite: ['core'],
    tier: 1,
    angle: 0
  },
  {
    id: 'coin_boost_1',
    name: 'コインブースト I',
    description: 'コイン獲得量+10%',
    cost: 3,
    maxLevel: 5,
    effect: {
      type: 'coin_boost',
      value: 1000
    },
    prerequisite: ['core'],
    tier: 1,
    angle: 60
  },
  {
    id: 'medal_boost_1',
    name: 'メダルブースト I',
    description: 'メダルドロップ率+5%',
    cost: 5,
    maxLevel: 3,
    effect: {
      type: 'medal_boost',
      value: 5
    },
    prerequisite: ['core'],
    tier: 1,
    angle: 120
  },
  {
    id: 'streak_amp_1',
    name: 'チェーン増幅 I',
    description: '連続正解ごとにXP獲得量が増加します（1つ上の連続で発動）',
    cost: 30,
    maxLevel: 3,
    effect: {
      type: 'streak_amp',
      value: 5
    },
    prerequisite: ['core'],
    tier: 1,
    angle: 180
  },
  {
    id: 'lucky_coin_1',
    name: 'ラッキーコイン I',
    description: '5%の確率でコイン2倍',
    cost: 6,
    maxLevel: 5,
    effect: {
      type: 'lucky_coin',
      value: 5
    },
    prerequisite: ['core'],
    tier: 1,
    angle: 240
  },
  {
    id: 'critical_hit_1',
    name: 'クリティカル I',
    description: '5%の確率でXP2倍',
    cost: 6,
    maxLevel: 5,
    effect: {
      type: 'critical_hit',
      value: 5
    },
    prerequisite: ['core'],
    tier: 1,
    angle: 300
  },
  
  // Tier 2: 中間リング（12個）- 30度間隔
  {
    id: 'xp_boost_2',
    name: 'XPブースト II',
    description: 'XP獲得量+15%',
    cost: 8,
    maxLevel: 5,
    effect: {
      type: 'xp_boost',
      value: 1500
    },
    prerequisite: ['xp_boost_1'],
    tier: 2,
    angle: 0
  },
  {
    id: 'xp_multiplier',
    name: 'XPマルチプライヤー',
    description: '連続正解時にXPボーナス',
    cost: 10,
    maxLevel: 3,
    effect: {
      type: 'xp_multiplier',
      value: 5
    },
    prerequisite: ['xp_boost_1', 'critical_hit_1'],
    tier: 2,
    angle: 330
  },
  {
    id: 'coin_boost_2',
    name: 'コインブースト II',
    description: 'コイン獲得量+15%',
    cost: 8,
    maxLevel: 5,
    effect: {
      type: 'coin_boost',
      value: 1500
    },
    prerequisite: ['coin_boost_1'],
    tier: 2,
    angle: 60
  },
  {
    id: 'double_reward',
    name: 'ダブル報酬',
    description: '5%の確率でXPとコイン両方2倍',
    cost: 12,
    maxLevel: 5,
    effect: {
      type: 'double_reward',
      value: 5
    },
    prerequisite: ['coin_boost_1', 'xp_boost_1'],
    tier: 2,
    angle: 30
  },
  {
    id: 'medal_boost_2',
    name: 'メダルブースト II',
    description: 'メダルドロップ率+10%',
    cost: 10,
    maxLevel: 3,
    effect: {
      type: 'medal_boost',
      value: 10
    },
    prerequisite: ['medal_boost_1'],
    tier: 2,
    angle: 120
  },
  {
    id: 'time_bonus',
    name: 'タイムボーナス',
    description: '素早く回答するとボーナスXP',
    cost: 10,
    maxLevel: 5,
    effect: {
      type: 'time_bonus',
      value: 10
    },
    prerequisite: ['medal_boost_1', 'coin_boost_1'],
    tier: 2,
    angle: 90
  },
  {
    id: 'streak_amp_2',
    name: 'チェーン増幅 II',
    description: '連続正解ごとにXP獲得量が増加します（強化版）',
    cost: 50,
    maxLevel: 3,
    effect: {
      type: 'streak_amp',
      value: 10
    },
    prerequisite: ['streak_amp_1'],
    tier: 2,
    angle: 180
  },
  {
    id: 'lucky_coin_2',
    name: 'ラッキーコイン II',
    description: 'コイン2倍の確率+5%',
    cost: 12,
    maxLevel: 5,
    effect: {
      type: 'lucky_coin',
      value: 5
    },
    prerequisite: ['lucky_coin_1'],
    tier: 2,
    angle: 240
  },
  {
    id: 'critical_hit_2',
    name: 'クリティカル II',
    description: 'XP2倍の確率+5%',
    cost: 12,
    maxLevel: 5,
    effect: {
      type: 'critical_hit',
      value: 5
    },
    prerequisite: ['critical_hit_1'],
    tier: 2,
    angle: 300
  },
  
  // Tier 3: 外側リング（12個）- 30度間隔
  {
    id: 'xp_boost_3',
    name: 'XPブースト III',
    description: 'XP獲得量+20%',
    cost: 15,
    maxLevel: 5,
    effect: {
      type: 'xp_boost',
      value: 2000
    },
    prerequisite: ['xp_boost_2'],
    tier: 3,
    angle: 0
  },
  {
    id: 'xp_multiplier_2',
    name: 'XPマルチプライヤー II',
    description: '連続正解ボーナス+10%',
    cost: 18,
    maxLevel: 3,
    effect: {
      type: 'xp_multiplier',
      value: 10
    },
    prerequisite: ['xp_multiplier'],
    tier: 3,
    angle: 330
  },
  {
    id: 'double_reward_2',
    name: 'ダブル報酬 II',
    description: '両方2倍の確率+5%',
    cost: 20,
    maxLevel: 5,
    effect: {
      type: 'double_reward',
      value: 5
    },
    prerequisite: ['double_reward'],
    tier: 3,
    angle: 30
  },
  {
    id: 'coin_boost_3',
    name: 'コインブースト III',
    description: 'コイン獲得量+20%',
    cost: 15,
    maxLevel: 5,
    effect: {
      type: 'coin_boost',
      value: 2000
    },
    prerequisite: ['coin_boost_2'],
    tier: 3,
    angle: 60
  },
  {
    id: 'time_bonus_2',
    name: 'タイムボーナス II',
    description: 'タイムボーナス+15%',
    cost: 18,
    maxLevel: 5,
    effect: {
      type: 'time_bonus',
      value: 15
    },
    prerequisite: ['time_bonus'],
    tier: 3,
    angle: 90
  },
  {
    id: 'medal_boost_3',
    name: 'メダルブースト III',
    description: 'メダルドロップ率+15%',
    cost: 20,
    maxLevel: 3,
    effect: {
      type: 'medal_boost',
      value: 15
    },
    prerequisite: ['medal_boost_2'],
    tier: 3,
    angle: 120
  },
  {
    id: 'streak_amp_3',
    name: 'チェーン増幅 III',
    description: '連続正解ごとにXP獲得量が大幅に増加します',
    cost: 100,
    maxLevel: 3,
    effect: {
      type: 'streak_amp',
      value: 20
    },
    prerequisite: ['streak_amp_2'],
    tier: 3,
    angle: 180
  },
  {
    id: 'lucky_coin_3',
    name: 'ラッキーコイン III',
    description: 'コイン2倍の確率+10%',
    cost: 20,
    maxLevel: 5,
    effect: {
      type: 'lucky_coin',
      value: 10
    },
    prerequisite: ['lucky_coin_2'],
    tier: 3,
    angle: 240
  },
  {
    id: 'critical_hit_3',
    name: 'クリティカル III',
    description: 'XP2倍の確率+10%',
    cost: 20,
    maxLevel: 5,
    effect: {
      type: 'critical_hit',
      value: 10
    },
    prerequisite: ['critical_hit_2'],
    tier: 3,
    angle: 300
  },
  
  // Tier 4: 最外周（6個）- 60度間隔 - 究極スキル
  {
    id: 'master_xp',
    name: 'マスターXP',
    description: 'XP獲得量+30%',
    cost: 30,
    maxLevel: 5,
    effect: {
      type: 'xp_boost',
      value: 3000
    },
    prerequisite: ['xp_boost_3'],
    tier: 4,
    angle: 0
  },
  {
    id: 'master_coin',
    name: 'マスターコイン',
    description: 'コイン獲得量+30%',
    cost: 30,
    maxLevel: 5,
    effect: {
      type: 'coin_boost',
      value: 3000
    },
    prerequisite: ['coin_boost_3'],
    tier: 4,
    angle: 60
  },
  {
    id: 'master_medal',
    name: 'マスターメダル',
    description: 'メダルドロップ率+25%',
    cost: 40,
    maxLevel: 3,
    effect: {
      type: 'medal_boost',
      value: 25
    },
    prerequisite: ['medal_boost_3'],
    tier: 4,
    angle: 120
  },
  {
    id: 'master_streak_amp',
    name: 'マスターチェーン',
    description: '連続正解で得られるXPボーナスを強化します（究極）',
    cost: 300,
    maxLevel: 3,
    effect: {
      type: 'streak_amp',
      value: 30
    },
    prerequisite: ['streak_amp_3'],
    tier: 4,
    angle: 180
  },
  {
    id: 'master_lucky',
    name: 'マスターラッキー',
    description: 'コイン2倍の確率+15%',
    cost: 35,
    maxLevel: 5,
    effect: {
      type: 'lucky_coin',
      value: 15
    },
    prerequisite: ['lucky_coin_3'],
    tier: 4,
    angle: 240
  },
  {
    id: 'master_critical',
    name: 'マスタークリティカル',
    description: 'XP2倍の確率+15%',
    cost: 35,
    maxLevel: 5,
    effect: {
      type: 'critical_hit',
      value: 15
    },
    prerequisite: ['critical_hit_3'],
    tier: 4,
    angle: 300
  }
  ,
  // 最終アンロック: 全てのスキルを1以上開放すると表示され、回転をアンロックする
  {
    id: 'unlock_rotation',
    name: '回転アンロック',
    description: '全てのスキルを開放するとアンロックされ、回転（Revolution）へのアクセスを有効化します。',
    cost: 999,
    maxLevel: 1,
    effect: {
      type: 'time_bonus',
      value: 0
    },
    // 前提はコード側で判定（全スキルが1以上のときに開放）
    prerequisite: [],
    tier: 5,
    angle: 0
  }
];

// スキルレベル情報
export interface SkillLevel {
  skillId: string;
  level: number;
}
