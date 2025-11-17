import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { SHOP_ITEMS } from '../data/shopItems';
import type { ShopItem } from '../data/shopItems';
import '../styles/Shop.css';

function Shop() {
  const { state, purchaseItem, setTheme, setIcon } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'theme' | 'icon' | 'boost'>('all');
  const [purchaseMessage, setPurchaseMessage] = useState<string>('');

  const filteredItems = selectedCategory === 'all' 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === selectedCategory);

  const handlePurchase = (item: ShopItem) => {
    if (state.purchasedItems.includes(item.id)) {
      setPurchaseMessage('すでに購入済みです');
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
            const isPurchased = state.purchasedItems.includes(item.id);
            const isActive = (item.category === 'theme' && state.activeTheme === item.effect) ||
                            (item.category === 'icon' && state.activeIcon === item.effect);
            
            return (
              <div 
                key={item.id} 
                className={`shop-item ${isPurchased ? 'purchased' : ''} ${isActive ? 'active' : ''}`}
              >
                <div className="item-icon">{item.icon}</div>
                <h3 className="item-name">{item.name}</h3>
                <p className="item-description">{item.description}</p>
                <div className="item-footer">
                  <div className="item-price">💰 {item.price}</div>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={isPurchased || state.coins < item.price}
                    className={`purchase-button ${isPurchased ? 'purchased-btn' : ''}`}
                  >
                    {isPurchased ? (isActive ? '使用中' : '購入済み') : '購入'}
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
    </div>
  );
}

export default Shop;
