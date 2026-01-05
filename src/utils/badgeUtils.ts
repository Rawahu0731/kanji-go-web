import { BADGES } from '../data/badges';

type Stats = {
  totalQuizzes?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  currentStreak?: number;
  bestStreak?: number;
};

type PartialState = {
  level?: number;
  coins?: number;
  stats?: Stats;
  unlockedBadges?: string[];
};

// 戻り値: 追加で付与すべきバッジID配列（prev にまだ含まれていないもの）
export function computeNewBadges(prev: PartialState, next: PartialState): string[] {
  const prevSet = new Set(prev.unlockedBadges || []);
  const toAdd = new Set<string>();

  const level = next.level ?? prev.level ?? 0;
  const coins = next.coins ?? prev.coins ?? 0;
  const stats = { ...(prev.stats || {}), ...(next.stats || {}) } as Required<Stats>;

  // レベル閾値
  const levelThresholds: Array<[string, number]> = [
    ['level_5', 5], ['level_10', 10], ['level_20', 20], ['level_50', 50], ['level_100', 100],
    ['level_500', 500], ['level_1000', 1000], ['level_10000', 10000]
  ];
  for (const [id, th] of levelThresholds) {
    if (level >= th && !prevSet.has(id) && BADGES[id]) toAdd.add(id);
  }

  // クイズ系
  const quizThresholds: Array<[string, number]> = [
    ['first_quiz', 1], ['quiz_master_10', 10], ['quiz_master_50', 50], ['quiz_master_100', 100],
    ['quiz_master_500', 500], ['quiz_master_1000', 1000]
  ];
  for (const [id, th] of quizThresholds) {
    if ((stats.totalQuizzes || 0) >= th && !prevSet.has(id) && BADGES[id]) toAdd.add(id);
  }

  // 連勝系
  const streakThresholds: Array<[string, number]> = [
    ['perfect_streak_5', 5], ['perfect_streak_10', 10], ['perfect_streak_50', 50], ['perfect_streak_100', 100], ['perfect_streak_1000', 1000]
  ];
  for (const [id, th] of streakThresholds) {
    if ((stats.currentStreak || 0) >= th && !prevSet.has(id) && BADGES[id]) toAdd.add(id);
  }

  // コイン系（所持額）
  const coinThresholds: Array<[string, number]> = [
    ['coin_million', 1_000_000], ['coin_100m', 100_000_000], ['coin_10b', 10_000_000_000], ['coin_trillion', 1_000_000_000_000]
  ];
  for (const [id, th] of coinThresholds) {
    if ((coins || 0) >= th && !prevSet.has(id) && BADGES[id]) toAdd.add(id);
  }

  // Collector系は他のバッジが増えた後の合計で判定する
  const hypothetical = new Set<string>([...prevSet, ...Array.from(toAdd)]);
  if (hypothetical.size >= 10 && !prevSet.has('collector') && BADGES['collector']) toAdd.add('collector');
  if (hypothetical.size >= 20 && !prevSet.has('super_collector') && BADGES['super_collector']) toAdd.add('super_collector');

  return Array.from(toAdd.values());
}

export default computeNewBadges;
