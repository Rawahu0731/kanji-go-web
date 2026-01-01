import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import type { CardRarity, KanjiCard } from '../data/cardCollection';
import { ELEMENT_INFO, SKILL_INFO, getKanjiAttributes } from '../data/kanjiAttributes';
import { ALL_KANJI } from '../data/allKanji';
import '../styles/CardCollection.css';

type DisplayMode = 'owned' | 'all';

function CardCollection() {
  const [searchParams] = useSearchParams();
  const deckModeEnabled = searchParams.get('deck') === 'true';
  
  const gamification = useGamification();
  const { state, upgradeCardInDeck, addCardsToDeck, removeCardFromDeck } = gamification;
  const [selectedRarity, setSelectedRarity] = useState<'all' | CardRarity>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'level' | 'rarity'>('recent');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('all');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showDeckPanel, setShowDeckPanel] = useState(false);

  // heavy computations memoized to avoid recalculation on every render
  const { cardCounts, ownedKanjiSet, firstObtainedMap, ownedCardMap } = useMemo(() => {
    const counts = new Map<string, number>();
    const ownedSet = new Set<string>();
    const firstMap = new Map<string, number>();
    const ownedMap = new Map<string, any>();

    for (const card of state.cardCollection) {
      const cnt = counts.get(card.kanji) || 0;
      counts.set(card.kanji, cnt + 1);
      ownedSet.add(card.kanji);

      const cur = firstMap.get(card.kanji);
      if (!cur || (card.obtainedAt && card.obtainedAt < cur)) {
        firstMap.set(card.kanji, card.obtainedAt || 0);
      }

      // keep reference to the first owned card for quicker lookup
      if (!ownedMap.has(card.kanji)) {
        ownedMap.set(card.kanji, card);
      }
    }

    return { cardCounts: counts, ownedKanjiSet: ownedSet, firstObtainedMap: firstMap, ownedCardMap: ownedMap };
  }, [state.cardCollection]);

  // 表示するカードリスト
  // prepare display list (memoized)
  const displayCards = useMemo(() => {
    if (displayMode === 'owned') {
      // unique owned cards (preserve first occurrence order)
      const seen = new Set<string>();
      const unique: any[] = [];
      for (const card of state.cardCollection) {
        if (!seen.has(card.kanji)) {
          seen.add(card.kanji);
          unique.push(card);
        }
      }
      return unique;
    }

    return ALL_KANJI.map(kanjiData => {
      const ownedCard = ownedCardMap.get(kanjiData.kanji);
      if (ownedCard) return ownedCard;
      return {
        id: `dummy-${kanjiData.kanji}`,
        kanji: kanjiData.kanji,
        reading: kanjiData.reading,
        meaning: kanjiData.meaning,
        level: kanjiData.level,
        imageUrl: `/kanji/level-${kanjiData.level}/images/${kanjiData.kanji}.png`,
        rarity: 'common' as CardRarity,
        obtainedAt: 0
      };
    });
  }, [displayMode, state.cardCollection, ownedCardMap]);

  // レアリティでフィルター（全表示モードでは未取得カードも含む）
  const filteredCards = useMemo(() => {
    if (selectedRarity === 'all') return displayCards;
    return displayCards.filter(card => {
      if (displayMode === 'all' && !ownedKanjiSet.has(card.kanji)) {
        return true;
      }
      return card.rarity === selectedRarity;
    });
  }, [selectedRarity, displayMode, displayCards, ownedKanjiSet]);

  // ソート
  const sortedCards = useMemo(() => {
    return [...filteredCards].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return (b.obtainedAt || 0) - (a.obtainedAt || 0);
      case 'level':
        return a.level - b.level;
      case 'rarity':
  const rarityOrder: Record<CardRarity, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
  return rarityOrder[b.rarity as CardRarity] - rarityOrder[a.rarity as CardRarity];
      default:
        return 0;
    }
    });
  }, [filteredCards, sortBy]);

  // レアリティの日本語名
  const getRarityName = (rarity: string): string => {
    switch (rarity) {
      case 'common': return 'コモン';
      case 'rare': return 'レア';
      case 'epic': return 'エピック';
      case 'legendary': return 'レジェンダリー';
      default: return '';
    }
  };

  // 統計情報
  const stats = useMemo(() => {
    const uniqueOwned = ownedKanjiSet.size;
    const totalKanji = ALL_KANJI.length;
    const rarityCount = {
      common: state.cardCollection.filter(c => c.rarity === 'common').length,
      rare: state.cardCollection.filter(c => c.rarity === 'rare').length,
      epic: state.cardCollection.filter(c => c.rarity === 'epic').length,
      legendary: state.cardCollection.filter(c => c.rarity === 'legendary').length,
    };
    return {
      owned: uniqueOwned,
      total: totalKanji,
      percentage: Math.round((uniqueOwned / totalKanji) * 100),
      ...rarityCount,
    };
  }, [ownedKanjiSet, state.cardCollection]);

  // コレクションボーナスを計算
  const collectionBonus = gamification.getCollectionBoost();
  const bonusPercentage = Math.round(collectionBonus * 100);

  // デッキ関連の処理
  const MAX_DECK_SIZE = 5;
  const deck = state.deck || [];

  const toggleCardSelection = (kanji: string) => {
    if (!deckModeEnabled) return;
    
    const newSelected = new Set(selectedCards);
    if (newSelected.has(kanji)) {
      newSelected.delete(kanji);
    } else {
      if (newSelected.size < MAX_DECK_SIZE) {
        newSelected.add(kanji);
      }
    }
    setSelectedCards(newSelected);
  };

  const addCardsToMyDeck = () => {
    if (selectedCards.size === 0) return;
    
    const cardsToAdd: KanjiCard[] = [];
    selectedCards.forEach(kanji => {
      const card = state.cardCollection.find(c => c.kanji === kanji);
      if (card && !deck.find(d => d.kanji === kanji)) {
        cardsToAdd.push(card);
      }
    });
    
    if (cardsToAdd.length > 0) {
      addCardsToDeck(cardsToAdd);
      setSelectedCards(new Set());
      setShowDeckPanel(true);
    }
  };

  const removeFromDeck = (kanji: string) => {
    removeCardFromDeck(kanji);
  };

  const upgradeCard = (kanji: string, cost: number) => {
    if (state.coins >= cost) {
      upgradeCardInDeck(kanji, cost);
    }
  };

  const getUpgradeCost = (level: number) => {
    return Math.floor(100 * Math.pow(1.5, level));
  };

  // デッキ全体の強化効果を計算
  const calculateDeckTotalBoost = () => {
    let totalXpBoost = 0;
    let totalCoinBoost = 0;
    
    deck.forEach(card => {
      const attrs = card.attributes || getKanjiAttributes(card.kanji);
      const level = card.deckLevel || 0;
      
      // 基本値 + レベルごとの追加（レベル×5%）
      totalXpBoost += attrs.xpBoost + (level * 5);
      totalCoinBoost += attrs.coinBoost + (level * 3);
    });
    
    return { totalXpBoost, totalCoinBoost };
  };

  const deckBoost = calculateDeckTotalBoost();

  return (
    <div className="card-collection-container page-root">
      <header className="collection-header">
        <Link to="/" className="back-button">← ホームへ戻る</Link>
        <h1>📚 カードコレクション</h1>
        {deckModeEnabled && (
          <div className="deck-mode-badge">🃏 デッキモード (試験的)</div>
        )}
        <div className="collection-stats">
          <div className="stat-badge">
            <span className="stat-label">収集率</span>
            <span className="stat-value">{stats.owned} / {stats.total}</span>
            <span className="stat-percentage">({stats.percentage}%)</span>
          </div>
        </div>
      </header>

      <div className="collection-content">
        {/* デッキパネル */}
        {deckModeEnabled && (
          <div className={`deck-panel ${showDeckPanel ? 'expanded' : ''}`}>
            <div className="deck-header" onClick={() => setShowDeckPanel(!showDeckPanel)}>
              <h3>🃏 現在のデッキ ({deck.length}/{MAX_DECK_SIZE})</h3>
              <button className="deck-toggle">{showDeckPanel ? '▼' : '▲'}</button>
            </div>
            {showDeckPanel && (
              <div className="deck-content">
                {/* デッキ全体の合計値表示 */}
                {deck.length > 0 && (
                  <div className="deck-total-stats">
                    <div className="deck-total-title">デッキ合計効果</div>
                    <div className="deck-total-values">
                      <div className="total-stat-xp">⭐ XP +{deckBoost.totalXpBoost}%</div>
                      <div className="total-stat-coin">💰 コイン +{deckBoost.totalCoinBoost}%</div>
                    </div>
                  </div>
                )}
                
                {deck.length === 0 ? (
                  <p className="deck-empty">デッキが空です。カードを選択してデッキに追加してください。</p>
                ) : (
                  <div className="deck-cards">
                    {deck.map(card => {
                      const upgradeCost = getUpgradeCost(card.deckLevel || 0);
                      const canUpgrade = state.coins >= upgradeCost;
                      const attrs = card.attributes || getKanjiAttributes(card.kanji);
                      const elementInfo = ELEMENT_INFO[attrs.element];
                      const skillInfo = SKILL_INFO[attrs.skill];
                      const cardLevel = card.deckLevel || 0;
                      
                      // レベルによる強化効果
                      const currentXp = attrs.xpBoost + (cardLevel * 5);
                      const currentCoin = attrs.coinBoost + (cardLevel * 3);
                      
                      return (
                        <div key={card.id || card.kanji} className={`deck-card rarity-${card.rarity}`}>
                          <div className="deck-card-image">
                            <img
                              src={card.imageUrl}
                              alt={card.kanji}
                              loading="lazy"
                              width={120}
                              height={120}
                              onError={(e) => {
                                e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23667eea"/><text x="50%" y="50%" font-size="100" fill="white" text-anchor="middle" dy=".35em">${card.kanji}</text></svg>`;
                              }}
                            />
                            <div className="card-element-badge" style={{ background: elementInfo.color }}>
                              {elementInfo.emoji}
                            </div>
                          </div>
                          <div className="deck-card-info">
                            <div className="deck-card-kanji">{card.kanji}</div>
                            <div className="deck-card-level">Lv.{cardLevel}</div>
                            <div className="deck-card-skill">
                              {skillInfo.icon} {skillInfo.name}
                            </div>
                            <div className="deck-card-stats">
                              <div className="stat-xp">
                                ⭐XP +{currentXp}%
                                {cardLevel > 0 && <span className="stat-bonus"> (+{cardLevel * 5})</span>}
                              </div>
                              <div className="stat-coin">
                                💰コイン +{currentCoin}%
                                {cardLevel > 0 && <span className="stat-bonus"> (+{cardLevel * 3})</span>}
                              </div>
                            </div>
                          </div>
                          <div className="deck-card-actions">
                            <button
                              className="upgrade-btn"
                              onClick={() => upgradeCard(card.kanji, upgradeCost)}
                              disabled={!canUpgrade}
                            >
                              強化 ({upgradeCost}💰)
                            </button>
                            <button
                              className="remove-btn"
                              onClick={() => removeFromDeck(card.kanji)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedCards.size > 0 && (
                  <button
                    className="add-to-deck-btn"
                    onClick={addCardsToMyDeck}
                    disabled={deck.length + selectedCards.size > MAX_DECK_SIZE}
                  >
                    選択中のカードをデッキに追加 ({selectedCards.size}枚)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 表示モード切り替え */}
        <div className="mode-toggle">
          <button
            className={displayMode === 'owned' ? 'active' : ''}
            onClick={() => setDisplayMode('owned')}
          >
            取得済みのみ
          </button>
          <button
            className={displayMode === 'all' ? 'active' : ''}
            onClick={() => setDisplayMode('all')}
          >
            全カード表示
          </button>
        </div>
        {/* 統計情報 */}
        <div className="rarity-stats">
          <div className="rarity-stat-item rarity-common">
            <span className="rarity-icon">⬜</span>
            <span className="rarity-name">コモン</span>
            <span className="rarity-count">{stats.common}</span>
          </div>
          <div className="rarity-stat-item rarity-rare">
            <span className="rarity-icon">🔵</span>
            <span className="rarity-name">レア</span>
            <span className="rarity-count">{stats.rare}</span>
          </div>
          <div className="rarity-stat-item rarity-epic">
            <span className="rarity-icon">🟣</span>
            <span className="rarity-name">エピック</span>
            <span className="rarity-count">{stats.epic}</span>
          </div>
          <div className="rarity-stat-item rarity-legendary">
            <span className="rarity-icon">🌟</span>
            <span className="rarity-name">レジェンダリー</span>
            <span className="rarity-count">{stats.legendary}</span>
          </div>
        </div>

        {/* コレクションボーナス表示 */}
        {collectionBonus > 0 && (
          <div className="collection-bonus-info">
            <div className="bonus-header">
              <span className="bonus-icon">✨</span>
              <span className="bonus-title">コレクションボーナス</span>
            </div>
            <div className="bonus-value">+{bonusPercentage}% XP/コイン</div>
            <div className="bonus-details">
              <div className="bonus-detail-item">
                <span>⬜ コモン: {stats.common}枚</span>
                <span>+{stats.common}%</span>
              </div>
              <div className="bonus-detail-item">
                <span>🔵 レア: {stats.rare}枚</span>
                <span>+{Math.round(stats.rare * 2.5)}%</span>
              </div>
              <div className="bonus-detail-item">
                <span>🟣 エピック: {stats.epic}枚</span>
                <span>+{stats.epic * 5}%</span>
              </div>
              <div className="bonus-detail-item">
                <span>🌟 レジェンダリー: {stats.legendary}枚</span>
                <span>+{stats.legendary * 10}%</span>
              </div>
            </div>
          </div>
        )}

        {/* フィルター・ソート */}
        <div className="collection-controls">
          <div className="filter-section">
            <label>レアリティ:</label>
            <select 
              value={selectedRarity} 
              onChange={(e) => setSelectedRarity(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">すべて</option>
              <option value="common">コモン</option>
              <option value="rare">レア</option>
              <option value="epic">エピック</option>
              <option value="legendary">レジェンダリー</option>
            </select>
          </div>
          <div className="sort-section">
            <label>並び替え:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-select"
            >
              <option value="recent">最近獲得した順</option>
              <option value="level">レベル順</option>
              <option value="rarity">レアリティ順</option>
            </select>
          </div>
        </div>

        {/* カードグリッド */}
        {sortedCards.length > 0 ? (
          <div className="cards-grid">
      {sortedCards.map((card) => {
              const isOwned = ownedKanjiSet.has(card.kanji);
              const count = cardCounts.get(card.kanji) || 0;
              const isSelected = selectedCards.has(card.kanji);
              const inDeck = deck.some(d => d.kanji === card.kanji);
              
              // 新規取得判定（最初の取得から24時間以内）
              const firstObtainedAt = firstObtainedMap.get(card.kanji) || 0;
              const isNew = isOwned && firstObtainedAt > 0 && (Date.now() - firstObtainedAt < 24 * 60 * 60 * 1000);
              
              // 属性情報を取得
              const attrs = isOwned && card.attributes ? card.attributes : getKanjiAttributes(card.kanji);
              const elementInfo = ELEMENT_INFO[attrs.element as keyof typeof ELEMENT_INFO] as any;
              const skillInfo = SKILL_INFO[attrs.skill as keyof typeof SKILL_INFO] as any;
              
              return (
                <div 
                  key={card.id || card.kanji} 
                  className={`collection-card ${isOwned ? `rarity-${card.rarity}` : 'not-owned'} ${isSelected ? 'selected' : ''} ${inDeck ? 'in-deck' : ''}`}
                  onClick={() => isOwned && toggleCardSelection(card.kanji)}
                  style={{ cursor: deckModeEnabled && isOwned ? 'pointer' : 'default' }}
                >
                  {deckModeEnabled && isOwned && (
                    <div className="card-select-indicator">
                      {isSelected ? '✓' : inDeck ? '🃏' : ''}
                    </div>
                  )}
                  <div className="card-image-wrapper">
                    {isOwned ? (
                      <>
                        <img
                          src={card.imageUrl}
                          alt={card.kanji}
                          loading="lazy"
                          width={96}
                          height={96}
                          onError={(e) => {
                            e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23667eea"/><text x="50%" y="50%" font-size="100" fill="white" text-anchor="middle" dy=".35em">${card.kanji}</text></svg>`;
                          }}
                        />
                        <div className={`card-rarity-overlay rarity-${card.rarity}`}>
                          {getRarityName(card.rarity)}
                        </div>
                        {deckModeEnabled && (
                          <div className="card-element-badge-small" style={{ background: elementInfo.color }}>
                            {elementInfo.emoji}
                          </div>
                        )}
                        {count > 1 && (
                          <div className="card-count-badge">×{count}</div>
                        )}
                        {isNew && (
                          <div className="card-new-badge">NEW</div>
                        )}
                      </>
                    ) : (
                      <div className="card-silhouette">
                        <div className="silhouette-icon">?</div>
                      </div>
                    )}
                  </div>
                  <div className="card-details">
                    {isOwned ? (
                      <>
                        <div className="card-kanji-large">{card.kanji}</div>
                        {deckModeEnabled && (
                          <>
                            <div className="card-skill-mini">
                              {skillInfo.icon} {skillInfo.name}
                            </div>
                            <div className="card-stats-mini">
                              <span className="mini-xp">⭐{attrs.xpBoost}%</span>
                              <span className="mini-coin">💰{attrs.coinBoost}%</span>
                            </div>
                          </>
                        )}
                        {card.obtainedAt && card.obtainedAt > 0 && (
                          <div className="card-obtained-date">
                            {new Date(card.obtainedAt).toLocaleDateString('ja-JP')}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="card-kanji-large locked">???</div>
                        <div className="card-locked-text">未取得</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-collection">
            <div className="empty-icon">📭</div>
            <h3>カードがありません</h3>
            <p>ショップでカードパックを購入してコレクションを始めましょう！</p>
            <Link to="/shop" className="shop-link-button">
              ショップへ行く
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default CardCollection;
