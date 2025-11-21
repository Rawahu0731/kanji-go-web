#!/usr/bin/env python3
"""
常用漢字にゲーム属性（レアリティ、属性、スキル）を付与するスクリプト
"""

import csv
import random

# 属性定義
ELEMENTS = ['fire', 'water', 'earth', 'wind', 'light', 'dark']
RARITIES = ['common', 'rare', 'epic', 'legendary']
SKILLS = [
    'xp_boost', 'coin_boost', 'combo_bonus', 'streak_power',
    'revival', 'lucky_draw', 'synergy', 'multi_answer',
    'time_freeze', 'shield'
]

# 特別な漢字の設定（手動で設定）
SPECIAL_KANJI = {
    '龍': {'rarity': 'legendary', 'element': 'fire', 'skill': 'combo_bonus', 'power': 10, 'attack': 10, 'defense': 6, 'speed': 8},
    '竜': {'rarity': 'legendary', 'element': 'fire', 'skill': 'combo_bonus', 'power': 10, 'attack': 10, 'defense': 7, 'speed': 8},
    '火': {'rarity': 'rare', 'element': 'fire', 'skill': 'xp_boost', 'power': 6, 'attack': 8, 'defense': 3, 'speed': 5},
    '水': {'rarity': 'rare', 'element': 'water', 'skill': 'coin_boost', 'power': 6, 'attack': 3, 'defense': 8, 'speed': 5},
    '土': {'rarity': 'common', 'element': 'earth', 'skill': 'shield', 'power': 5, 'attack': 5, 'defense': 7, 'speed': 4},
    '風': {'rarity': 'common', 'element': 'wind', 'skill': 'multi_answer', 'power': 4, 'attack': 6, 'defense': 4, 'speed': 8},
    '光': {'rarity': 'epic', 'element': 'light', 'skill': 'lucky_draw', 'power': 7, 'attack': 7, 'defense': 7, 'speed': 6},
    '雷': {'rarity': 'rare', 'element': 'light', 'skill': 'streak_power', 'power': 7, 'attack': 9, 'defense': 2, 'speed': 7},
    '海': {'rarity': 'rare', 'element': 'water', 'skill': 'coin_boost', 'power': 5, 'attack': 4, 'defense': 9, 'speed': 4},
    '森': {'rarity': 'common', 'element': 'earth', 'skill': 'revival', 'power': 5, 'attack': 5, 'defense': 8, 'speed': 3},
    '空': {'rarity': 'rare', 'element': 'wind', 'skill': 'multi_answer', 'power': 6, 'attack': 5, 'defense': 5, 'speed': 9},
    '星': {'rarity': 'epic', 'element': 'light', 'skill': 'xp_boost', 'power': 8, 'attack': 8, 'defense': 5, 'speed': 7},
    '夜': {'rarity': 'rare', 'element': 'dark', 'skill': 'streak_power', 'power': 8, 'attack': 9, 'defense': 4, 'speed': 6},
    '炎': {'rarity': 'epic', 'element': 'fire', 'skill': 'xp_boost', 'power': 7, 'attack': 9, 'defense': 4, 'speed': 6},
    '氷': {'rarity': 'epic', 'element': 'water', 'skill': 'time_freeze', 'power': 8, 'attack': 5, 'defense': 8, 'speed': 5},
    '岩': {'rarity': 'rare', 'element': 'earth', 'skill': 'shield', 'power': 7, 'attack': 6, 'defense': 10, 'speed': 2},
    '嵐': {'rarity': 'epic', 'element': 'wind', 'skill': 'combo_bonus', 'power': 7, 'attack': 7, 'defense': 5, 'speed': 9},
    '聖': {'rarity': 'legendary', 'element': 'light', 'skill': 'revival', 'power': 10, 'attack': 8, 'defense': 8, 'speed': 8},
    '闇': {'rarity': 'epic', 'element': 'dark', 'skill': 'synergy', 'power': 8, 'attack': 10, 'defense': 3, 'speed': 7},
    '焔': {'rarity': 'legendary', 'element': 'fire', 'skill': 'xp_boost', 'power': 9, 'attack': 10, 'defense': 5, 'speed': 7},
    '泉': {'rarity': 'rare', 'element': 'water', 'skill': 'coin_boost', 'power': 7, 'attack': 4, 'defense': 9, 'speed': 5},
    '煉': {'rarity': 'legendary', 'element': 'fire', 'skill': 'xp_boost', 'power': 10, 'attack': 10, 'defense': 6, 'speed': 8},
    '滝': {'rarity': 'epic', 'element': 'water', 'skill': 'coin_boost', 'power': 8, 'attack': 5, 'defense': 10, 'speed': 6},
    '翔': {'rarity': 'legendary', 'element': 'wind', 'skill': 'multi_answer', 'power': 9, 'attack': 7, 'defense': 6, 'speed': 10},
    '輝': {'rarity': 'legendary', 'element': 'light', 'skill': 'lucky_draw', 'power': 10, 'attack': 9, 'defense': 8, 'speed': 8},
    '魔': {'rarity': 'legendary', 'element': 'dark', 'skill': 'synergy', 'power': 10, 'attack': 10, 'defense': 5, 'speed': 9},
    '天': {'rarity': 'epic', 'element': 'light', 'skill': 'xp_boost', 'power': 7, 'attack': 7, 'defense': 6, 'speed': 7},
    '地': {'rarity': 'epic', 'element': 'earth', 'skill': 'coin_boost', 'power': 7, 'attack': 6, 'defense': 8, 'speed': 5},
    '山': {'rarity': 'common', 'element': 'earth', 'skill': 'shield', 'power': 4, 'attack': 5, 'defense': 7, 'speed': 3},
    '川': {'rarity': 'common', 'element': 'water', 'skill': 'revival', 'power': 4, 'attack': 4, 'defense': 6, 'speed': 5},
    '雨': {'rarity': 'common', 'element': 'water', 'skill': 'coin_boost', 'power': 4, 'attack': 3, 'defense': 6, 'speed': 5},
    '雪': {'rarity': 'rare', 'element': 'water', 'skill': 'time_freeze', 'power': 6, 'attack': 4, 'defense': 7, 'speed': 4},
    '雲': {'rarity': 'common', 'element': 'wind', 'skill': 'multi_answer', 'power': 4, 'attack': 5, 'defense': 4, 'speed': 7},
    '雷': {'rarity': 'rare', 'element': 'light', 'skill': 'streak_power', 'power': 7, 'attack': 9, 'defense': 2, 'speed': 7},
    '王': {'rarity': 'epic', 'element': 'light', 'skill': 'combo_bonus', 'power': 7, 'attack': 7, 'defense': 7, 'speed': 6},
    '皇': {'rarity': 'legendary', 'element': 'light', 'skill': 'combo_bonus', 'power': 9, 'attack': 8, 'defense': 8, 'speed': 7},
    '帝': {'rarity': 'legendary', 'element': 'dark', 'skill': 'combo_bonus', 'power': 9, 'attack': 9, 'defense': 7, 'speed': 7},
    '神': {'rarity': 'legendary', 'element': 'light', 'skill': 'lucky_draw', 'power': 10, 'attack': 9, 'defense': 9, 'speed': 9},
    '仏': {'rarity': 'epic', 'element': 'light', 'skill': 'revival', 'power': 8, 'attack': 6, 'defense': 8, 'speed': 6},
    '悪': {'rarity': 'epic', 'element': 'dark', 'skill': 'streak_power', 'power': 7, 'attack': 8, 'defense': 4, 'speed': 7},
    '鬼': {'rarity': 'epic', 'element': 'dark', 'skill': 'combo_bonus', 'power': 8, 'attack': 9, 'defense': 5, 'speed': 7},
    '魂': {'rarity': 'rare', 'element': 'dark', 'skill': 'revival', 'power': 6, 'attack': 6, 'defense': 6, 'speed': 6},
    '夢': {'rarity': 'rare', 'element': 'light', 'skill': 'lucky_draw', 'power': 6, 'attack': 5, 'defense': 5, 'speed': 7},
    '愛': {'rarity': 'epic', 'element': 'light', 'skill': 'revival', 'power': 8, 'attack': 6, 'defense': 7, 'speed': 7},
    '心': {'rarity': 'common', 'element': 'light', 'skill': 'revival', 'power': 4, 'attack': 4, 'defense': 5, 'speed': 5},
    '力': {'rarity': 'common', 'element': 'fire', 'skill': 'xp_boost', 'power': 4, 'attack': 7, 'defense': 3, 'speed': 5},
    '剣': {'rarity': 'rare', 'element': 'fire', 'skill': 'streak_power', 'power': 6, 'attack': 8, 'defense': 3, 'speed': 6},
    '刀': {'rarity': 'rare', 'element': 'fire', 'skill': 'streak_power', 'power': 6, 'attack': 8, 'defense': 2, 'speed': 7},
    '槍': {'rarity': 'rare', 'element': 'fire', 'skill': 'combo_bonus', 'power': 6, 'attack': 7, 'defense': 3, 'speed': 6},
    '弓': {'rarity': 'common', 'element': 'wind', 'skill': 'multi_answer', 'power': 4, 'attack': 6, 'defense': 3, 'speed': 7},
    '矢': {'rarity': 'common', 'element': 'wind', 'skill': 'streak_power', 'power': 4, 'attack': 6, 'defense': 2, 'speed': 8},
    '盾': {'rarity': 'rare', 'element': 'earth', 'skill': 'shield', 'power': 6, 'attack': 3, 'defense': 9, 'speed': 3},
    '鎧': {'rarity': 'epic', 'element': 'earth', 'skill': 'shield', 'power': 8, 'attack': 4, 'defense': 10, 'speed': 2},
}

def get_rarity_weights(char_code):
    """文字コードに基づいてレアリティを決定"""
    # 文字コードで決定的にレアリティを割り当て
    val = char_code % 100
    if val < 60:
        return 'common'
    elif val < 85:
        return 'rare'
    elif val < 96:
        return 'epic'
    else:
        return 'legendary'

def get_element_from_code(char_code):
    """文字コードから属性を決定"""
    return ELEMENTS[char_code % len(ELEMENTS)]

def get_skill_from_rarity_and_code(rarity, char_code):
    """レアリティと文字コードからスキルを決定"""
    if rarity == 'legendary':
        skills = ['combo_bonus', 'lucky_draw', 'synergy', 'xp_boost', 'coin_boost']
    elif rarity == 'epic':
        skills = ['xp_boost', 'coin_boost', 'streak_power', 'time_freeze', 'combo_bonus']
    elif rarity == 'rare':
        skills = ['xp_boost', 'coin_boost', 'multi_answer', 'shield', 'streak_power']
    else:
        skills = ['revival', 'shield', 'multi_answer', 'xp_boost', 'coin_boost']
    
    return skills[char_code % len(skills)]

def get_power_from_rarity(rarity, char_code):
    """レアリティからパワーを決定"""
    base = {
        'legendary': 9,
        'epic': 7,
        'rare': 5,
        'common': 4
    }[rarity]
    return base + (char_code % 2)

def get_stats_from_element_and_rarity(element, rarity, char_code):
    """属性とレアリティからステータスを決定"""
    base_total = {
        'legendary': 25,
        'epic': 20,
        'rare': 16,
        'common': 13
    }[rarity]
    
    # 属性による配分
    if element == 'fire':
        attack = int(base_total * 0.5)
        defense = int(base_total * 0.2)
        speed = int(base_total * 0.3)
    elif element == 'water':
        attack = int(base_total * 0.2)
        defense = int(base_total * 0.5)
        speed = int(base_total * 0.3)
    elif element == 'earth':
        attack = int(base_total * 0.35)
        defense = int(base_total * 0.40)
        speed = int(base_total * 0.25)
    elif element == 'wind':
        attack = int(base_total * 0.3)
        defense = int(base_total * 0.2)
        speed = int(base_total * 0.5)
    elif element == 'light':
        attack = int(base_total * 0.35)
        defense = int(base_total * 0.35)
        speed = int(base_total * 0.3)
    else:  # dark
        attack = int(base_total * 0.45)
        defense = int(base_total * 0.25)
        speed = int(base_total * 0.3)
    
    # ランダムな調整（±1）
    variation = (char_code % 3) - 1
    attack = max(1, attack + variation)
    
    return attack, defense, speed

def generate_attributes_csv():
    """all.csvを読み込んで属性付きCSVを生成"""
    input_file = 'public/kanji/always/all.csv'
    output_file = 'public/kanji/always/all.csv'
    
    kanji_list = []
    
    # 既存のCSVを読み込み
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # ヘッダーをスキップ
        for row in reader:
            if row:
                kanji_list.append(row[0])
    
    # 新しいCSVを生成
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        # ヘッダー
        writer.writerow(['kanji', 'rarity', 'element', 'skill', 'power', 'attack', 'defense', 'speed'])
        
        for kanji in kanji_list:
            if kanji in SPECIAL_KANJI:
                # 特別な漢字
                special = SPECIAL_KANJI[kanji]
                writer.writerow([
                    kanji,
                    special['rarity'],
                    special['element'],
                    special['skill'],
                    special['power'],
                    special['attack'],
                    special['defense'],
                    special['speed']
                ])
            else:
                # 自動生成
                char_code = ord(kanji)
                rarity = get_rarity_weights(char_code)
                element = get_element_from_code(char_code)
                skill = get_skill_from_rarity_and_code(rarity, char_code)
                power = get_power_from_rarity(rarity, char_code)
                attack, defense, speed = get_stats_from_element_and_rarity(element, rarity, char_code)
                
                writer.writerow([
                    kanji,
                    rarity,
                    element,
                    skill,
                    power,
                    attack,
                    defense,
                    speed
                ])
    
    print(f"✅ 生成完了: {output_file}")
    print(f"📊 総数: {len(kanji_list)}漢字")
    
    # レアリティ分布を表示
    rarity_count = {'common': 0, 'rare': 0, 'epic': 0, 'legendary': 0}
    for kanji in kanji_list:
        if kanji in SPECIAL_KANJI:
            rarity_count[SPECIAL_KANJI[kanji]['rarity']] += 1
        else:
            rarity = get_rarity_weights(ord(kanji))
            rarity_count[rarity] += 1
    
    print("\n📈 レアリティ分布:")
    for rarity, count in rarity_count.items():
        percentage = (count / len(kanji_list)) * 100
        print(f"  {rarity}: {count}枚 ({percentage:.1f}%)")

if __name__ == '__main__':
    generate_attributes_csv()
