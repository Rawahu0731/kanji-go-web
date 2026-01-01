import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { ALL_KANJI } from '../data/allKanji';
import '../styles/CollectionPlus.css';

type SortKey = 'plus' | 'kanji' | 'obtained';

export default function CollectionPlus() {
  const { state, getCollectionPlusEffect } = useGamification();
  const list = state.collectionPlus || [];
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('plus');
  const [showOnlyMaxed, setShowOnlyMaxed] = useState(false);

  const filtered = useMemo(() => {
    // Only include kanji that have + >= 1
    const base = list
      .filter(e => (e.plus || 0) > 0)
      .map(e => ({ kanji: e.kanji, plus: e.plus || 0, obtainedAt: e.obtainedAt }));

    const q = query.trim();
    let items = base;
    if (q.length > 0) items = items.filter(e => e.kanji.includes(q));
    if (showOnlyMaxed) items = items.filter(e => e.plus >= 30);

    items.sort((a, b) => {
      if (sortBy === 'plus') return b.plus - a.plus;
      if (sortBy === 'kanji') return a.kanji.localeCompare(b.kanji);
      return (b.obtainedAt || 0) - (a.obtainedAt || 0);
    });

    return items;
  }, [list, query, sortBy, showOnlyMaxed]);

  return (
    <div className="collection-plus-container page-root">
      <header className="collection-plus-header">
        <div className="header-top">
          <Link to="/" className="back-button">← ホームへ戻る</Link>
          <h1>🪙 コレクション+</h1>
        </div>
        <div className="collection-stats">
          <div className="stat-badge">
            <span className="stat-label">収集率</span>
            <span className="stat-value">{list.filter(e => (e.plus||0) > 0).length} / {ALL_KANJI.length}</span>
            <span className="stat-percentage">({Math.round((list.filter(e => (e.plus||0) > 0).length / ALL_KANJI.length) * 100)}%)</span>
          </div>
          {(() => {
            const eff = getCollectionPlusEffect();
            if (!eff) return null;
            return (
              <>
                <div className="stat-badge">
                  <span className="stat-label">合計+値</span>
                  <span className="stat-value">{eff.totalPlus}</span>
                </div>
                <div className="stat-badge">
                  <span className="stat-label">XP/コインボーナス</span>
                  <span className="stat-value">+{eff.xpCoinBonusPercent.toFixed(0)}%</span>
                </div>
                <div className="stat-badge">
                  <span className="stat-label">メダル獲得</span>
                  <span className="stat-value">+{(eff.medalBoost * 100).toFixed(1)}%</span>
                </div>
              </>
            );
          })()}
        </div>
      </header>

      <div className="controls">
        <input placeholder="漢字で検索" value={query} onChange={e => setQuery(e.target.value)} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}>
          <option value="plus">+値順</option>
          <option value="kanji">漢字順</option>
          <option value="obtained">取得順</option>
        </select>
        <label className="checkbox">
          <input type="checkbox" checked={showOnlyMaxed} onChange={e => setShowOnlyMaxed(e.target.checked)} />
          +30のみ
        </label>
      </div>

      <div className="tiles">
        {filtered.length === 0 && (
          <div className="empty">条件に合う項目はありません</div>
        )}

        {filtered.map(item => (
          <div key={item.kanji} className={`tile ${ (item.plus||0) >= 30 ? 'maxed' : ''}`}>
            <div className="tile-kanji">{item.kanji}</div>
            <div className="tile-plus">+{item.plus || 0}</div>
            <div className="tile-meta">{item.obtainedAt ? new Date(item.obtainedAt).toLocaleDateString() : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
