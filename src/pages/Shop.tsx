import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { SHOP_ITEMS } from '../data/shopItems';
import type { ShopItem } from '../data/shopItems';
import type { KanjiCard } from '../data/cardCollection';
import '../styles/Shop.css';

function Shop() {
  const { state, purchaseItem, activateBoost, setTheme, setIcon, setCustomIconUrl, addCardToCollection, openCardPack } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'theme' | 'icon' | 'boost' | 'collection'>('all');
  const [purchaseMessage, setPurchaseMessage] = useState<string>('');
  const [showCustomIconModal, setShowCustomIconModal] = useState(false);
  const [customIconError, setCustomIconError] = useState('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [showCardPackModal, setShowCardPackModal] = useState(false);
  const [openedCards, setOpenedCards] = useState<KanjiCard[]>([]);

  const filteredItems = selectedCategory === 'all' 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === selectedCategory);

  // ブースト効果から時間（分）を抽出する関数
  const getBoostDuration = (effect: string): number => {
    if (effect.includes('24h')) return 1440;
    if (effect.includes('1h')) return 60;
    if (effect.includes('30m')) return 30;
    if (effect.includes('15m')) return 15;
    if (effect.includes('5m')) return 5;
    return 60; // デフォルト
  };

  // 永続アップグレードかどうか判定
  const isPermanentUpgrade = (effect: string): boolean => {
    return effect.startsWith('permanent_') || 
           effect === 'auto_save_streak' ||
           effect === 'master_learner' ||
           effect === 'ultimate_power';
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

    // ブーストアイテムの処理
    if (item.category === 'boost') {
      // 永続アップグレードは一度のみ購入可能
      if (item.effect && isPermanentUpgrade(item.effect)) {
        if (state.purchasedItems.includes(item.id)) {
          setPurchaseMessage('このアイテムは既に購入済みです！');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        
        const success = purchaseItem(item.id, item.price);
        
        if (success) {
          setPurchaseMessage(`${item.name}を獲得しました！効果は永続的に適用されます！`);
        } else {
          setPurchaseMessage('コインが足りません');
        }
        setTimeout(() => setPurchaseMessage(''), 3000);
        return;
      }
      
      // 通常のブーストアイテム（消耗品）
      const success = purchaseItem(item.id, item.price);
      
      if (success && item.effect) {
        const duration = getBoostDuration(item.effect);
        activateBoost(item.id, item.name, item.effect, item.icon, duration);
        setPurchaseMessage(`${item.name}を使用しました！`);
      } else if (!success) {
        setPurchaseMessage('コインが足りません');
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
        if (item.rarity) {
          setTimeout(() => {
            setPurchaseMessage(`✨ ${getRarityName(item.rarity!)}アイテムを獲得！`);
          }, 1500);
        }
      } else {
        setPurchaseMessage('コインが足りません');
      }
      setTimeout(() => setPurchaseMessage(''), 3000);
      return;
    }

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
            onClick={() => setSelectedCategory('boost')}
            className={selectedCategory === 'boost' ? 'active' : ''}
          >
            ブースト
          </button>
          <button 
            onClick={() => setSelectedCategory('collection')}
            className={selectedCategory === 'collection' ? 'active' : ''}
          >
            コレクション
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
            const isBoost = item.category === 'boost';
            const isCollection = item.category === 'collection';
            const isPermanent = item.effect && isPermanentUpgrade(item.effect);
            const isAlreadyOwned = (isPermanent || isCollection) && isPurchased;
            const rarityClass = item.rarity ? `rarity-${item.rarity}` : '';
            
            return (
              <div 
                key={item.id} 
                className={`shop-item ${isPurchased && !isBoost && !isCollection ? 'purchased' : ''} ${isActive ? 'active' : ''} ${isFree ? 'free' : ''} ${isPermanent ? 'permanent-item' : ''} ${isAlreadyOwned ? 'owned' : ''} ${rarityClass}`}
              >
                <div className="item-icon">{item.icon}</div>
                <h3 className="item-name">{item.name}</h3>
                <p className="item-description">{item.description}</p>
                {item.rarity && (
                  <div className={`rarity-badge rarity-badge-${item.rarity}`}>
                    {getRarityName(item.rarity)}
                  </div>
                )}
                <div className="item-footer">
                  <div className="item-price">{isFree ? '無料' : `💰 ${item.price}`}</div>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!isFree && (state.coins < item.price || isAlreadyOwned)}
                    className={`purchase-button ${isPurchased && !isBoost ? 'purchased-btn' : ''} ${isActive ? 'active-btn' : ''} ${isAlreadyOwned ? 'owned-btn' : ''}`}
                  >
                    {isAlreadyOwned ? (isCollection ? 'コレクション済' : '所持中') : (
                      isCustomIcon && isPurchased ? '設定' : (
                        isPermanent ? '購入' : (
                          isCollection ? '獲得' : (
                            isBoost ? '使用' : (
                              isActive ? '使用中' : (isPurchased || isFree ? '適用' : '購入')
                            )
                          )
                        )
                      )
                    )}
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
                {openedCards.map((card, index) => (
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
                    </div>
                  </div>
                ))}
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
    </div>
  );
}

export default Shop;
