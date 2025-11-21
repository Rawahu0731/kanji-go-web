const fs = require('fs');
const path = require('path');

// 属性定義
const ELEMENTS = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const SKILLS = [
  'xp_boost', 'coin_boost', 'combo_bonus', 'streak_power',
  'revival', 'lucky_draw', 'synergy', 'multi_answer',
  'time_freeze', 'shield'
];

// 特別な漢字の設定
const SPECIAL_KANJI = {
  '龍': { rarity: 'legendary', element: 'fire', skill: 'combo_bonus', power: 10, attack: 10, defense: 6, speed: 8 },
  '竜': { rarity: 'legendary', element: 'fire', skill: 'combo_bonus', power: 10, attack: 10, defense: 7, speed: 8 },
  '火': { rarity: 'rare', element: 'fire', skill: 'xp_boost', power: 6, attack: 8, defense: 3, speed: 5 },
  '水': { rarity: 'rare', element: 'water', skill: 'coin_boost', power: 6, attack: 3, defense: 8, speed: 5 },
  '土': { rarity: 'common', element: 'earth', skill: 'shield', power: 5, attack: 5, defense: 7, speed: 4 },
  '風': { rarity: 'common', element: 'wind', skill: 'multi_answer', power: 4, attack: 6, defense: 4, speed: 8 },
  '光': { rarity: 'epic', element: 'light', skill: 'lucky_draw', power: 7, attack: 7, defense: 7, speed: 6 },
  '雷': { rarity: 'rare', element: 'light', skill: 'streak_power', power: 7, attack: 9, defense: 2, speed: 7 },
  '海': { rarity: 'rare', element: 'water', skill: 'coin_boost', power: 5, attack: 4, defense: 9, speed: 4 },
  '森': { rarity: 'common', element: 'earth', skill: 'revival', power: 5, attack: 5, defense: 8, speed: 3 },
  '空': { rarity: 'rare', element: 'wind', skill: 'multi_answer', power: 6, attack: 5, defense: 5, speed: 9 },
  '星': { rarity: 'epic', element: 'light', skill: 'xp_boost', power: 8, attack: 8, defense: 5, speed: 7 },
  '夜': { rarity: 'rare', element: 'dark', skill: 'streak_power', power: 8, attack: 9, defense: 4, speed: 6 },
  '炎': { rarity: 'epic', element: 'fire', skill: 'xp_boost', power: 7, attack: 9, defense: 4, speed: 6 },
  '氷': { rarity: 'epic', element: 'water', skill: 'time_freeze', power: 8, attack: 5, defense: 8, speed: 5 },
  '岩': { rarity: 'rare', element: 'earth', skill: 'shield', power: 7, attack: 6, defense: 10, speed: 2 },
  '嵐': { rarity: 'epic', element: 'wind', skill: 'combo_bonus', power: 7, attack: 7, defense: 5, speed: 9 },
  '聖': { rarity: 'legendary', element: 'light', skill: 'revival', power: 10, attack: 8, defense: 8, speed: 8 },
  '闇': { rarity: 'epic', element: 'dark', skill: 'synergy', power: 8, attack: 10, defense: 3, speed: 7 },
  '焔': { rarity: 'legendary', element: 'fire', skill: 'xp_boost', power: 9, attack: 10, defense: 5, speed: 7 },
  '泉': { rarity: 'rare', element: 'water', skill: 'coin_boost', power: 7, attack: 4, defense: 9, speed: 5 },
  '煉': { rarity: 'legendary', element: 'fire', skill: 'xp_boost', power: 10, attack: 10, defense: 6, speed: 8 },
  '滝': { rarity: 'epic', element: 'water', skill: 'coin_boost', power: 8, attack: 5, defense: 10, speed: 6 },
  '翔': { rarity: 'legendary', element: 'wind', skill: 'multi_answer', power: 9, attack: 7, defense: 6, speed: 10 },
  '輝': { rarity: 'legendary', element: 'light', skill: 'lucky_draw', power: 10, attack: 9, defense: 8, speed: 8 },
  '魔': { rarity: 'legendary', element: 'dark', skill: 'synergy', power: 10, attack: 10, defense: 5, speed: 9 },
  '天': { rarity: 'epic', element: 'light', skill: 'xp_boost', power: 7, attack: 7, defense: 6, speed: 7 },
  '地': { rarity: 'epic', element: 'earth', skill: 'coin_boost', power: 7, attack: 6, defense: 8, speed: 5 },
  '山': { rarity: 'common', element: 'earth', skill: 'shield', power: 4, attack: 5, defense: 7, speed: 3 },
  '川': { rarity: 'common', element: 'water', skill: 'revival', power: 4, attack: 4, defense: 6, speed: 5 },
  '雨': { rarity: 'common', element: 'water', skill: 'coin_boost', power: 4, attack: 3, defense: 6, speed: 5 },
  '雪': { rarity: 'rare', element: 'water', skill: 'time_freeze', power: 6, attack: 4, defense: 7, speed: 4 },
  '雲': { rarity: 'common', element: 'wind', skill: 'multi_answer', power: 4, attack: 5, defense: 4, speed: 7 },
  '王': { rarity: 'epic', element: 'light', skill: 'combo_bonus', power: 7, attack: 7, defense: 7, speed: 6 },
  '皇': { rarity: 'legendary', element: 'light', skill: 'combo_bonus', power: 9, attack: 8, defense: 8, speed: 7 },
  '帝': { rarity: 'legendary', element: 'dark', skill: 'combo_bonus', power: 9, attack: 9, defense: 7, speed: 7 },
  '神': { rarity: 'legendary', element: 'light', skill: 'lucky_draw', power: 10, attack: 9, defense: 9, speed: 9 },
  '仏': { rarity: 'epic', element: 'light', skill: 'revival', power: 8, attack: 6, defense: 8, speed: 6 },
  '悪': { rarity: 'epic', element: 'dark', skill: 'streak_power', power: 7, attack: 8, defense: 4, speed: 7 },
  '鬼': { rarity: 'epic', element: 'dark', skill: 'combo_bonus', power: 8, attack: 9, defense: 5, speed: 7 },
  '魂': { rarity: 'rare', element: 'dark', skill: 'revival', power: 6, attack: 6, defense: 6, speed: 6 },
  '夢': { rarity: 'rare', element: 'light', skill: 'lucky_draw', power: 6, attack: 5, defense: 5, speed: 7 },
  '愛': { rarity: 'epic', element: 'light', skill: 'revival', power: 8, attack: 6, defense: 7, speed: 7 },
  '心': { rarity: 'common', element: 'light', skill: 'revival', power: 4, attack: 4, defense: 5, speed: 5 },
  '力': { rarity: 'common', element: 'fire', skill: 'xp_boost', power: 4, attack: 7, defense: 3, speed: 5 },
  '剣': { rarity: 'rare', element: 'fire', skill: 'streak_power', power: 6, attack: 8, defense: 3, speed: 6 },
  '刀': { rarity: 'rare', element: 'fire', skill: 'streak_power', power: 6, attack: 8, defense: 2, speed: 7 },
  '槍': { rarity: 'rare', element: 'fire', skill: 'combo_bonus', power: 6, attack: 7, defense: 3, speed: 6 },
  '弓': { rarity: 'common', element: 'wind', skill: 'multi_answer', power: 4, attack: 6, defense: 3, speed: 7 },
  '矢': { rarity: 'common', element: 'wind', skill: 'streak_power', power: 4, attack: 6, defense: 2, speed: 8 },
  '盾': { rarity: 'rare', element: 'earth', skill: 'shield', power: 6, attack: 3, defense: 9, speed: 3 },
  '鎧': { rarity: 'epic', element: 'earth', skill: 'shield', power: 8, attack: 4, defense: 10, speed: 2 },
};

function getRarityWeights(charCode) {
  const val = charCode % 100;
  if (val < 60) return 'common';
  if (val < 85) return 'rare';
  if (val < 96) return 'epic';
  return 'legendary';
}

function getElementFromCode(charCode) {
  return ELEMENTS[charCode % ELEMENTS.length];
}

function getSkillFromRarityAndCode(rarity, charCode) {
  let skills;
  if (rarity === 'legendary') {
    skills = ['combo_bonus', 'lucky_draw', 'synergy', 'xp_boost', 'coin_boost'];
  } else if (rarity === 'epic') {
    skills = ['xp_boost', 'coin_boost', 'streak_power', 'time_freeze', 'combo_bonus'];
  } else if (rarity === 'rare') {
    skills = ['xp_boost', 'coin_boost', 'multi_answer', 'shield', 'streak_power'];
  } else {
    skills = ['revival', 'shield', 'multi_answer', 'xp_boost', 'coin_boost'];
  }
  return skills[charCode % skills.length];
}

function getPowerFromRarity(rarity, charCode) {
  const base = {
    legendary: 9,
    epic: 7,
    rare: 5,
    common: 4
  }[rarity];
  return base + (charCode % 2);
}

function getStatsFromElementAndRarity(element, rarity, charCode) {
  const baseTotal = {
    legendary: 25,
    epic: 20,
    rare: 16,
    common: 13
  }[rarity];

  let attack, defense, speed;
  if (element === 'fire') {
    attack = Math.floor(baseTotal * 0.5);
    defense = Math.floor(baseTotal * 0.2);
    speed = Math.floor(baseTotal * 0.3);
  } else if (element === 'water') {
    attack = Math.floor(baseTotal * 0.2);
    defense = Math.floor(baseTotal * 0.5);
    speed = Math.floor(baseTotal * 0.3);
  } else if (element === 'earth') {
    attack = Math.floor(baseTotal * 0.35);
    defense = Math.floor(baseTotal * 0.40);
    speed = Math.floor(baseTotal * 0.25);
  } else if (element === 'wind') {
    attack = Math.floor(baseTotal * 0.3);
    defense = Math.floor(baseTotal * 0.2);
    speed = Math.floor(baseTotal * 0.5);
  } else if (element === 'light') {
    attack = Math.floor(baseTotal * 0.35);
    defense = Math.floor(baseTotal * 0.35);
    speed = Math.floor(baseTotal * 0.3);
  } else { // dark
    attack = Math.floor(baseTotal * 0.45);
    defense = Math.floor(baseTotal * 0.25);
    speed = Math.floor(baseTotal * 0.3);
  }

  const variation = (charCode % 3) - 1;
  attack = Math.max(1, attack + variation);

  return { attack, defense, speed };
}

function generateAttributesCSV() {
  const inputFile = path.join(__dirname, 'public/kanji/always/all.csv');
  const outputFile = path.join(__dirname, 'public/kanji/always/all.csv');

  // 既存のCSVを読み込み
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.trim().split('\n');
  const kanjiList = lines.slice(1).map(line => line.trim()).filter(k => k);

  // 新しいCSVを生成
  const rows = ['kanji,rarity,element,skill,power,attack,defense,speed'];

  const rarityCount = { common: 0, rare: 0, epic: 0, legendary: 0 };

  kanjiList.forEach(kanji => {
    if (SPECIAL_KANJI[kanji]) {
      const special = SPECIAL_KANJI[kanji];
      rows.push(`${kanji},${special.rarity},${special.element},${special.skill},${special.power},${special.attack},${special.defense},${special.speed}`);
      rarityCount[special.rarity]++;
    } else {
      const charCode = kanji.charCodeAt(0);
      const rarity = getRarityWeights(charCode);
      const element = getElementFromCode(charCode);
      const skill = getSkillFromRarityAndCode(rarity, charCode);
      const power = getPowerFromRarity(rarity, charCode);
      const stats = getStatsFromElementAndRarity(element, rarity, charCode);

      rows.push(`${kanji},${rarity},${element},${skill},${power},${stats.attack},${stats.defense},${stats.speed}`);
      rarityCount[rarity]++;
    }
  });

  fs.writeFileSync(outputFile, rows.join('\n'), 'utf-8');

  console.log(`✅ 生成完了: ${outputFile}`);
  console.log(`📊 総数: ${kanjiList.length}漢字`);
  console.log('\n📈 レアリティ分布:');
  Object.entries(rarityCount).forEach(([rarity, count]) => {
    const percentage = (count / kanjiList.length) * 100;
    console.log(`  ${rarity}: ${count}枚 (${percentage.toFixed(1)}%)`);
  });
}

generateAttributesCSV();
