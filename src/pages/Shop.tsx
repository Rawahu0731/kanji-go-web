import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { SHOP_ITEMS } from '../data/shopItems';
import type { ShopItem } from '../data/shopItems';
import type { KanjiCard } from '../data/cardCollection';
import type { Character } from '../data/characters';
import { getRarityName as getCharacterRarityName, MAX_CHARACTER_COUNT, CHARACTERS } from '../data/characters';
import '../styles/Shop.css';

function Shop() {
  const { state, purchaseItem, setTheme, setIcon, setCustomIconUrl, addCardToCollection, openCardPack, pullCharacterGacha } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'theme' | 'icon' | 'collection' | 'gacha'>('all');
  const [purchaseMessage, setPurchaseMessage] = useState<string>('');
  const [showCustomIconModal, setShowCustomIconModal] = useState(false);
  const [customIconError, setCustomIconError] = useState('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [showCardPackModal, setShowCardPackModal] = useState(false);
  const [openedCards, setOpenedCards] = useState<KanjiCard[]>([]);
  const [previousOwnedKanji, setPreviousOwnedKanji] = useState<Set<string>>(new Set());
  const [showGachaModal, setShowGachaModal] = useState(false);
  const [pulledCharacters, setPulledCharacters] = useState<Character[]>([]);

  const filteredItems = selectedCategory === 'all' 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === selectedCategory);

  // 全キャラクターが上限に達しているかチェック
  const areAllCharactersMaxed = () => {
    const totalCharacters = Object.keys(CHARACTERS).length;
    const maxedCharacters = state.characters.filter(c => c.count >= MAX_CHARACTER_COUNT).length;
    return maxedCharacters >= totalCharacters;
  };

  // レアリティの日本語名を取得
  const getRarityName = (rarity: string): string => {
    switch (rarity) {
      case 'common': return 'コモン';
      case 'rare': return 'レア';
      case 'epic': return 'エピック';
      case 'legendary': return 'レジェンダリー';
      case 'mythic': return 'ミシック';
      default: return '';
    }
  };

  const handlePurchase = (item: ShopItem) => {
    // カスタムアイコンの場合は特別処理
    if (item.id === 'icon_custom') {
      if (state.purchasedItems.includes(item.id)) {
        // 既に購入済みならモーダルを開く
        setShowCustomIconModal(true);
        return;
      }
      // 未購入なら購入処理
      const success = purchaseItem(item.id, item.price);
      if (success) {
        setPurchaseMessage(`${item.name}を購入しました！`);
        setTimeout(() => {
          setPurchaseMessage('');
          setShowCustomIconModal(true);
        }, 1000);
      } else {
        setPurchaseMessage('コインが足りません');
        setTimeout(() => setPurchaseMessage(''), 2000);
      }
      return;
    }

    // 価格が0の場合は無料で適用
    if (item.price === 0) {
      if (item.category === 'theme' && item.effect) {
        setTheme(item.effect);
        setPurchaseMessage(`${item.name}を適用しました！`);
      } else if (item.category === 'icon' && item.effect) {
        setIcon(item.effect);
        setPurchaseMessage(`${item.name}を適用しました！`);
      }
      setTimeout(() => setPurchaseMessage(''), 2000);
      return;
    }

    // コレクションアイテムの処理
    if (item.category === 'collection') {
      // カードパックの場合（消耗品なので何度でも購入可能）
      if (item.effect && item.effect.startsWith('card_pack_')) {
        const success = purchaseItem(item.id, item.price, false);
        
        if (success && item.effect) {
          // 開封前の所持漢字リストを保存
          const ownedKanjiBeforeOpen = new Set(state.cardCollection.map(c => c.kanji));
          setPreviousOwnedKanji(ownedKanjiBeforeOpen);
          
          const cards = openCardPack(item.effect);
          cards.forEach(card => addCardToCollection(card));
          setOpenedCards(cards);
          setShowCardPackModal(true);
          setPurchaseMessage(`${item.name}を開封中...`);
        } else if (!success) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
        }
        return;
      }
      
      // その他のコレクションアイテム
      if (state.purchasedItems.includes(item.id)) {
        setPurchaseMessage('このアイテムは既に購入済みです！');
        setTimeout(() => setPurchaseMessage(''), 2000);
        return;
      }
      
      const success = purchaseItem(item.id, item.price);
      
      if (success) {
        setPurchaseMessage(`${item.name}を獲得しました！`);
      } else {
        setPurchaseMessage('コインが足りません');
      }
      setTimeout(() => setPurchaseMessage(''), 2000);
      return;
    }

    // キャラクターガチャの処理
    if (item.category === 'gacha') {
      // 全キャラクターが上限に達しているかチェック
      if (areAllCharactersMaxed()) {
        setPurchaseMessage('全てのキャラクターが上限に達しています');
        setTimeout(() => setPurchaseMessage(''), 2000);
        return;
      }
      
      const success = purchaseItem(item.id, item.price, false);
      
      if (success && item.effect) {
        const count = parseInt(item.effect.replace('character_gacha_', ''));
        const characters = pullCharacterGacha(count, item.rarity as 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | undefined);
        setPulledCharacters(characters);
        setShowGachaModal(true);
        setPurchaseMessage(`${item.name}を引いています...`);
      } else if (!success) {
        setPurchaseMessage('コインが足りません');
        setTimeout(() => setPurchaseMessage(''), 2000);
      }
      return;
    }

    // テーマとアイコンの処理
    if (state.purchasedItems.includes(item.id)) {
      // 既に購入済みの場合は適用/切り替え
      if (item.category === 'theme' && item.effect) {
        setTheme(item.effect);
        setPurchaseMessage(`${item.name}を適用しました！`);
      } else if (item.category === 'icon' && item.effect) {
        setIcon(item.effect);
        setPurchaseMessage(`${item.name}を適用しました！`);
      } else {
        setPurchaseMessage('すでに購入済みです');
      }
      setTimeout(() => setPurchaseMessage(''), 2000);
      return;
    }

    const success = purchaseItem(item.id, item.price);
    
    if (success) {
      setPurchaseMessage(`${item.name}を購入しました！`);
      
      // テーマまたはアイコンの場合、自動的に適用
      if (item.category === 'theme' && item.effect) {
        setTheme(item.effect);
      } else if (item.category === 'icon' && item.effect) {
        setIcon(item.effect);
      }
      
      setTimeout(() => setPurchaseMessage(''), 3000);
    } else {
      setPurchaseMessage('コインが足りません');
      setTimeout(() => setPurchaseMessage(''), 2000);
    }
  };

  const handleCustomIconSubmit = () => {
    if (!previewImage) {
      setCustomIconError('画像ファイルを選択してください');
      return;
    }
    
    setCustomIconUrl(previewImage);
    setPurchaseMessage('カスタムアイコンを設定しました！');
    setShowCustomIconModal(false);
    setPreviewImage('');
    setCustomIconError('');
    setTimeout(() => setPurchaseMessage(''), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      setCustomIconError('画像ファイルを選択してください');
      return;
    }

    // ファイルサイズチェック (5MB以下)
    if (file.size > 5 * 1024 * 1024) {
      setCustomIconError('ファイルサイズは5MB以下にしてください');
      return;
    }

    // FileReaderで画像を読み込み、Base64に変換
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewImage(result);
      setCustomIconError('');
    };
    reader.onerror = () => {
      setCustomIconError('ファイルの読み込みに失敗しました');
    };
    reader.readAsDataURL(file);
  };

  const handleModalClose = () => {
    setShowCustomIconModal(false);
    setPreviewImage('');
    setCustomIconError('');
  };

  return (
    <div className="shop-container">
      <header className="shop-header">
        <Link to="/" className="back-button">← ホームへ戻る</Link>
        <h1>ショップ</h1>
        <div className="coins-display">💰 {state.coins} コイン</div>
      </header>

      <div className="shop-content">
        {/* カテゴリフィルター */}
        <div className="category-filter">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'active' : ''}
          >
            すべて
          </button>
          <button 
            onClick={() => setSelectedCategory('theme')}
            className={selectedCategory === 'theme' ? 'active' : ''}
          >
            テーマ
          </button>
          <button 
            onClick={() => setSelectedCategory('icon')}
            className={selectedCategory === 'icon' ? 'active' : ''}
          >
            アイコン
          </button>
          <button 
            onClick={() => setSelectedCategory('collection')}
            className={selectedCategory === 'collection' ? 'active' : ''}
          >
            コレクション
          </button>
          <button 
            onClick={() => setSelectedCategory('gacha')}
            className={selectedCategory === 'gacha' ? 'active' : ''}
          >
            ガチャ
          </button>
        </div>

        {/* 購入メッセージ */}
        {purchaseMessage && (
          <div className="purchase-message">
            {purchaseMessage}
          </div>
        )}

        {/* アイテムグリッド */}
        <div className="items-grid">
          {filteredItems.map(item => {
            const isPurchased = state.purchasedItems.includes(item.id) || item.price === 0;
            const isActive = (item.category === 'theme' && state.activeTheme === item.effect) ||
                            (item.category === 'icon' && state.activeIcon === item.effect);
            const isFree = item.price === 0;
            const isCustomIcon = item.id === 'icon_custom';
            const isCollection = item.category === 'collection';
            const isAlreadyOwned = isCollection && isPurchased;
            const isGacha = item.category === 'gacha';
            const isGachaDisabled = isGacha && areAllCharactersMaxed();
            const rarityClass = item.rarity ? `rarity-${item.rarity}` : '';
            
            return (
              <div 
                key={item.id} 
                className={`shop-item ${isPurchased && !isCollection ? 'purchased' : ''} ${isActive ? 'active' : ''} ${isFree ? 'free' : ''} ${isAlreadyOwned ? 'owned' : ''} ${rarityClass}`}
              >
                <div className="item-icon">{item.icon}</div>
                <h3 className="item-name">{item.name}</h3>
                <p className="item-description">{item.description}</p>
                {item.rarity && (
                  <div className={`rarity-badge rarity-badge-${item.rarity}`}>
                    {getRarityName(item.rarity)}
                  </div>
                )}
                {isGachaDisabled && (
                  <div style={{
                    background: 'rgba(255, 68, 68, 0.2)',
                    border: '1px solid rgba(255, 68, 68, 0.5)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    marginTop: '0.5rem',
                    fontSize: '0.85rem',
                    color: '#ff4444',
                    textAlign: 'center'
                  }}>
                    全キャラクター上限達成
                  </div>
                )}
                <div className="item-footer">
                  <div className="item-price">{isFree ? '無料' : `💰 ${item.price}`}</div>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!isFree && !isPurchased && state.coins < item.price || isAlreadyOwned || isGachaDisabled}
                    className={`purchase-button ${isPurchased ? 'purchased-btn' : ''} ${isActive ? 'active-btn' : ''} ${isAlreadyOwned ? 'owned-btn' : ''}`}
                  >
                    {isGachaDisabled ? '上限達成' :
                      isAlreadyOwned ? 'コレクション済' : 
                      isCustomIcon && isPurchased ? '設定' : 
                        isCollection ? '獲得' : 
                          isActive ? '使用中' : 
                            (isPurchased || isFree ? '適用' : '購入')
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="empty-message">
            このカテゴリにはアイテムがありません
          </div>
        )}
      </div>

      {/* カスタムアイコン設定モーダル */}
      {showCustomIconModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎨 カスタムアイコン設定</h2>
              <button className="modal-close" onClick={handleModalClose}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#a0a0c0' }}>
                お好きな画像ファイルをアップロードしてください
              </p>
              
              {/* プレビュー表示 */}
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                {(previewImage || state.customIconUrl) && (
                  <>
                    <p style={{ fontSize: '0.9rem', color: '#a0a0c0', marginBottom: '0.5rem' }}>
                      {previewImage ? 'プレビュー:' : '現在の画像:'}
                    </p>
                    <img 
                      src={previewImage || state.customIconUrl} 
                      alt="カスタムアイコン" 
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '3px solid rgba(102, 126, 234, 0.5)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </>
                )}
              </div>

              {/* ファイル選択 */}
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '2px dashed rgba(102, 126, 234, 0.4)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: '#fff',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                />
                <p style={{ 
                  fontSize: '0.8rem', 
                  color: '#a0a0c0', 
                  marginTop: '0.5rem',
                  textAlign: 'center'
                }}>
                  対応形式: JPG, PNG, GIF など (最大5MB)
                </p>
              </div>

              {customIconError && (
                <div style={{ 
                  color: '#ff6b6b', 
                  fontSize: '0.9rem', 
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  background: 'rgba(255, 107, 107, 0.1)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  {customIconError}
                </div>
              )}

              <button
                onClick={handleCustomIconSubmit}
                disabled={!previewImage}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: previewImage 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'rgba(102, 126, 234, 0.3)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: previewImage ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  opacity: previewImage ? 1 : 0.5
                }}
              >
                この画像を設定する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カードパック開封モーダル */}
      {showCardPackModal && (
        <div className="modal-overlay" onClick={() => setShowCardPackModal(false)}>
          <div className="modal-content card-pack-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎉 カードパック開封！</h2>
              <button className="modal-close" onClick={() => setShowCardPackModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="opened-cards-grid">
                {openedCards.map((card, index) => {
                  // このカードが新規取得かどうかを判定
                  // 開封前のコレクションに含まれていなければ新規
                  const isNewCard = !previousOwnedKanji.has(card.kanji);
                  
                  return (
                    <div 
                      key={card.id} 
                      className={`card-item rarity-${card.rarity}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="card-image-container">
                        <img 
                          src={card.imageUrl} 
                          alt={card.kanji}
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" font-size="60" text-anchor="middle" dy=".3em">' + card.kanji + '</text></svg>';
                          }}
                        />
                        <div className="card-kanji">{card.kanji}</div>
                        <div className={`card-rarity-badge rarity-${card.rarity}`}>
                          {getRarityName(card.rarity)}
                        </div>
                        {isNewCard && (
                          <div className="card-new-badge-gacha">NEW!</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1.5rem'
              }}>
                <button
                  onClick={() => {
                    setShowCardPackModal(false);
                    setPurchaseMessage(`${openedCards.length}枚のカードを獲得しました！`);
                    setTimeout(() => setPurchaseMessage(''), 3000);
                  }}
                  style={{
                    flex: '1',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    cursor: 'pointer'
                  }}
                >
                  確認
                </button>
                <Link
                  to="/collection"
                  style={{
                    flex: '1',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  📚 コレクションを見る
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* キャラクターガチャ結果モーダル */}
      {showGachaModal && (
        <div className="modal-overlay" onClick={() => setShowGachaModal(false)}>
          <div className="modal-content card-pack-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✨ ガチャ結果 ✨</h2>
              <button className="modal-close" onClick={() => setShowGachaModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="opened-cards-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1rem',
                padding: '1rem 0'
              }}>
                {pulledCharacters.map((char, index) => (
                  <div 
                    key={`${char.id}-${index}`} 
                    className={`character-card rarity-${char.rarity}`}
                    style={{
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
                      borderRadius: '12px',
                      padding: '1rem',
                      textAlign: 'center',
                      border: '2px solid rgba(102, 126, 234, 0.3)',
                      animation: 'slideIn 0.3s ease-out'
                    }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{char.icon}</div>
                    <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{char.name}</div>
                    <div style={{ 
                      fontSize: '0.8rem',
                      color: char.rarity === 'ultra' ? '#00ffff' :
                             char.rarity === 'mythic' ? '#ff4444' :
                             char.rarity === 'legendary' ? '#ffd700' :
                             char.rarity === 'epic' ? '#a335ee' :
                             char.rarity === 'rare' ? '#0070dd' : '#9d9d9d',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      textShadow: char.rarity === 'ultra' ? '0 0 10px #00ffff' : 'none'
                    }}>
                      {getCharacterRarityName(char.rarity)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a0a0c0' }}>{char.description}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                  onClick={() => setShowGachaModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '0.75rem 2rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shop;
