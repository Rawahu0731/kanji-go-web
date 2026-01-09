import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { type Item, type Level } from '../types/kanji';
import { formatReadingWithOkurigana } from '../utils/kanjiUtils';

interface ListModeProps {
  items: Item[];
  selectedLevel: Level;
  selectedGenre: string;
  searchQuery: string;
  searchMode: 'reading' | 'component';
  studyMode: boolean;
}

const CARD_WIDTH = 160;
const CARD_HEIGHT = 200;
const GAP = 12;

const VirtualizedGrid = memo(({ items, studyMode, revealed, handleCardClick }: { 
  items: Item[]; 
  studyMode: boolean;
  revealed: Set<string>;
  handleCardClick: (item: Item) => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      setWidth(window.innerWidth || 800);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columnCount = Math.max(1, Math.floor((width + GAP) / (CARD_WIDTH + GAP)));
  const rowCount = Math.max(1, Math.ceil(items.length / columnCount));
  const listWidth = Math.floor(width);
  const listHeight = Math.min(800, rowCount * (CARD_HEIGHT + GAP));

  const Row = memo(({ index, style, data }: any) => {
    const { items, columnCount, studyMode, revealed, handleCardClick } = data;
    const from = index * columnCount;
    const cells = [] as any[];
    for (let i = 0; i < columnCount; i++) {
      const item = items[from + i];
      if (item) {
        const key = item.filename || item.imageUrl || `${from + i}`;
        const isRevealed = revealed.has(key);
        cells.push(
          <div key={i} style={{ width: CARD_WIDTH, marginRight: GAP }}>
            <div className={`kanji-card ${studyMode ? 'clickable' : ''}`} onClick={() => handleCardClick(item)}>
              <img src={item.imageUrl} alt={item.filename} loading="lazy" decoding="async" style={{ width: '100%', height: 'auto' }} />
              {studyMode ? (
                isRevealed ? (
                  <>
                    {item.additionalInfo && <div className="additional-info">{item.additionalInfo}</div>}
                    <div className="reading">読み: {formatReadingWithOkurigana(item.reading)}</div>
                  </>
                ) : (
                  <div className="hidden-reading">クリックで表示</div>
                )
              ) : (
                <>
                  {item.additionalInfo && <div className="additional-info">{item.additionalInfo}</div>}
                  <div className="reading">読み: {formatReadingWithOkurigana(item.reading)}</div>
                </>
              )}
            </div>
          </div>
        );
      } else {
        cells.push(<div key={i} style={{ width: CARD_WIDTH, marginRight: GAP }} />);
      }
    }

    return (
      <div style={{ ...style, display: 'flex', alignItems: 'flex-start' }}>
        {cells}
      </div>
    );
  });

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <List
        height={listHeight}
        itemCount={rowCount}
        itemSize={CARD_HEIGHT + GAP}
        width={listWidth}
        itemData={{
          items,
          columnCount,
          studyMode,
          revealed,
          handleCardClick
        }}
      >
        {Row}
      </List>
    </div>
  );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';

const ListMode = memo(({ 
  items, 
  selectedLevel, 
  selectedGenre, 
  searchQuery, 
  searchMode, 
  studyMode
}: ListModeProps) => {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const definedGenres = useMemo(() => [
    '動物',
    '植物・藻類',
    '地名・建造物',
    '人名',
    'スラング',
    '飲食',
    '単位',
    '演目・外題',
    '則天文字',
    'チュノム',
    '元素',
    '嘘字',
    '簡体字',
    '文学の漢字',
    '字義未詳',
    '西夏文字'
  ], []);

  const filteredItems = useMemo(() => {
    let filtered = selectedGenre === 'all'
      ? items
      : selectedGenre === 'ジャンルなし'
      ? items.filter(item => {
          const info = item.additionalInfo || '';
          return !definedGenres.some(genre => info.includes(genre));
        })
      : items.filter(item => {
          const info = item.additionalInfo || '';
          return info.includes(selectedGenre);
        });

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(item => {
        if (searchMode === 'reading') {
          const okuriganaMatches = item.reading.match(/'([^']+)'/g);
          if (!okuriganaMatches) return false;
          const okuriganaText = okuriganaMatches.map(m => m.replace(/'/g, '')).join('');
          return okuriganaText.toLowerCase().includes(query);
        } else {
          const components = item.components || '';
          const componentList = components.split(/\s+/).filter(c => c).map(c => c.trim().toLowerCase());
          return componentList.some(component => component.includes(query));
        }
      });
    }

    return filtered;
  }, [items, selectedGenre, searchQuery, searchMode, definedGenres]);

  const handleCardClick = useCallback((it: Item) => {
    if (!studyMode) return;
    const key = it.filename || it.imageUrl;
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [studyMode]);

  if (selectedLevel === 'extra') {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {filteredItems.map((it, i) => {
          const key = it.answer || String(i);
          const isRevealed = revealed.has(key);
          return (
            <div
              key={i}
              className={studyMode ? 'clickable' : ''}
              onClick={() => studyMode && handleCardClick({ ...it, filename: key })}
              style={{
                padding: '20px 24px',
                margin: '16px 0',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: studyMode ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div 
                style={{ marginBottom: '12px', fontSize: '20px', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    const s = it.sentence || '';
                    if (it.katakana && it.katakana.trim()) {
                      return s.replace(it.katakana, `<span class="katakana-highlight">${it.katakana}</span>`);
                    }
                    return s;
                  })() || ''
                }}
              />
              {studyMode ? (
                isRevealed ? (
                  <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '22px', marginTop: '8px' }}>
                    {it.answer2 ? (
                      <span>答え: {it.answer} → {it.answer2}</span>
                    ) : (
                      <span>答え: {it.answer}</span>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#999', fontSize: '18px', fontStyle: 'italic' }}>
                    クリックで表示
                  </div>
                )
              ) : (
                <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '22px', marginTop: '8px' }}>
                  {it.answer2 ? (
                    <span>{it.answer} → {it.answer2}</span>
                  ) : (it.questionType === 'reading' ? (
                    // 読み問題はクォートを外して表示（赤い送り仮名は formatReadingWithOkurigana が担当）
                    <span>読み: {formatReadingWithOkurigana(it.reading || it.answer || '')}</span>
                  ) : (
                    <span>{it.katakana} → {it.answer}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <VirtualizedGrid items={filteredItems} studyMode={studyMode} revealed={revealed} handleCardClick={handleCardClick} />;
});

ListMode.displayName = 'ListMode';

export default ListMode;
