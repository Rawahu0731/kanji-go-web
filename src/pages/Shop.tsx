import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { SHOP_ITEMS } from '../data/shopItems';
import type { ShopItem } from '../data/shopItems';
import type { KanjiCard } from '../data/cardCollection';
import type { Character } from '../data/characters';
import { getRarityName as getCharacterRarityName, MAX_CHARACTER_COUNT, CHARACTERS, GACHA_RATES, RARITY_ORDER } from '../data/characters';
import '../styles/Shop.css';

function Shop() {
  const { state, purchaseItem, purchaseWithMedals, pullCollectionPlusGacha, setTheme, setIcon, setCustomIconUrl, addCardToCollection, openCardPack, canOpenCardPack, pullCharacterGacha, addTickets, useTicket, isCollectionComplete } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'theme' | 'icon' | 'collection' | 'gacha' | 'medal' | 'ticket'>('all');
  const [purchaseMessage, setPurchaseMessage] = useState<string>('');
  const [showCustomIconModal, setShowCustomIconModal] = useState(false);
  const [customIconError, setCustomIconError] = useState('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [showCardPackModal, setShowCardPackModal] = useState(false);
  const [openedCards, setOpenedCards] = useState<KanjiCard[]>([]);
  const [isCollectionPlusModal, setIsCollectionPlusModal] = useState(false);
  const [previousOwnedKanji, setPreviousOwnedKanji] = useState<Set<string>>(new Set());
  const [showGachaModal, setShowGachaModal] = useState(false);
  const [pulledCharacters, setPulledCharacters] = useState<Character[]>([]);
  const [lastShopAction, setLastShopAction] = useState<{
    id: string;
    price: number;
    category: string;
    effect?: any;
    rarity?: string;
  } | null>(null);
  const [showProbModal, setShowProbModal] = useState(false);
  const [probabilities, setProbabilities] = useState<Record<string, number> | null>(null);
  const [probNote, setProbNote] = useState<string>('');

  const collectionComplete = isCollectionComplete();

  useEffect(() => {
    // モーダル表示中に Enter を押すと最後に引いたショップアクションを再実行する
    if (!lastShopAction) return;
    if (!showGachaModal && !showCardPackModal) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      // safety
      if (!lastShopAction) return;

      // キャラクターガチャ
      if (lastShopAction.category === 'gacha') {
        if (areAllCharactersMaxed()) {
          setPurchaseMessage('全てのキャラクターが上限に達しています');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        if (state.coins < lastShopAction.price) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const ok = purchaseItem(lastShopAction.id, lastShopAction.price, false);
        if (!ok) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const count = parseInt(String(lastShopAction.effect).replace('character_gacha_', '')) || 1;
        const chars = pullCharacterGacha(count, lastShopAction.rarity as any);
        setPulledCharacters(chars);
        setShowGachaModal(true);
        setPurchaseMessage('再びガチャを引きました');
        setTimeout(() => setPurchaseMessage(''), 2000);
        return;
      }

      // カードパック（コイン）
      if (lastShopAction.category === 'collection') {
        if (state.coins < lastShopAction.price) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const ok = purchaseItem(lastShopAction.id, lastShopAction.price, false);
        if (!ok) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const cards = lastShopAction.effect ? openCardPack(lastShopAction.effect) : [];
        cards.forEach(card => addCardToCollection(card));
        setOpenedCards(cards);
        setIsCollectionPlusModal(false);
        setShowCardPackModal(true);
        setPurchaseMessage('再びカードパックを開封しました');
        setTimeout(() => setPurchaseMessage(''), 2000);
        return;
      }

      // コレクション+（メダル）
      if (lastShopAction.category === 'medal') {
        if (state.medals < lastShopAction.price) {
          setPurchaseMessage('メダルが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const ok = purchaseWithMedals(lastShopAction.id, lastShopAction.price, false);
        if (!ok) {
          setPurchaseMessage('メダルが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const count = parseInt(String(lastShopAction.effect).replace('collection_plus_', '')) || 1;
        const cards = pullCollectionPlusGacha(count);
        setOpenedCards(cards);
        setIsCollectionPlusModal(true);
        setShowCardPackModal(true);
        setPurchaseMessage('再びコレクション+を引きました');
        setTimeout(() => setPurchaseMessage(''), 2000);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showGachaModal, showCardPackModal, lastShopAction, state.coins, state.medals, purchaseItem, purchaseWithMedals, pullCharacterGacha, pullCollectionPlusGacha, openCardPack, addCardToCollection]);

  const filteredItems = (() => {
    if (selectedCategory === 'all') return SHOP_ITEMS;
    if (selectedCategory === 'medal') {
      // コレクション未完了の場合は、コレクション+ ガチャを一覧から除外する
      return SHOP_ITEMS.filter(item => {
        if (item.category !== 'medal') return false;
        const isCollectionPlusGacha = item.effect && String(item.effect).startsWith('collection_plus_');
        if (!collectionComplete && isCollectionPlusGacha) return false;
        return true;
      });
    }
    return SHOP_ITEMS.filter(item => item.category === selectedCategory);
  })();

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

    // 価格が0の場合の特別処理（テーマ/アイコンの無料適用のみ）
    if (item.price === 0 && (item.category === 'theme' || item.category === 'icon')) {
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
          setIsCollectionPlusModal(false);
          setShowCardPackModal(true);
          setLastShopAction({ id: item.id, price: item.price, category: item.category, effect: item.effect });
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
        setLastShopAction({ id: item.id, price: item.price, category: item.category, effect: item.effect, rarity: item.rarity });
        setPurchaseMessage(`${item.name}を引いています...`);
      } else if (!success) {
        setPurchaseMessage('コインが足りません');
        setTimeout(() => setPurchaseMessage(''), 2000);
      }
      return;
    }

    // メダル専用ガチャ（コレクション+）
    if (item.category === 'medal') {
      // コレクション完了していない場合は購入不可
      const collectionComplete = isCollectionComplete();
      if (!collectionComplete) {
        setPurchaseMessage('コレクションが完了するまで利用できません');
        setTimeout(() => setPurchaseMessage(''), 2000);
        return;
      }
      const success = purchaseWithMedals(item.id, item.price, false);

      if (success && item.effect) {
        const count = parseInt(item.effect.replace('collection_plus_', '')) || 1;
        const cards = pullCollectionPlusGacha(count);
        // collection+ の値はコンテキスト側で反映される
        setOpenedCards(cards);
        setIsCollectionPlusModal(true);
        setShowCardPackModal(true);
        setLastShopAction({ id: item.id, price: item.price, category: item.category, effect: item.effect });
        setPurchaseMessage(`${item.name}を引いています...`);
      } else if (!success) {
        setPurchaseMessage('メダルが足りません');
        setTimeout(() => setPurchaseMessage(''), 2000);
      }
      return;
    }

    // チケット（配布用・使用）
    if (item.category === 'ticket') {
      // 無料チケットは配布で付与する想定だが、ショップで直接獲得できる場合は付与処理を行う
      const count = item.id.endsWith('_3') ? 3 : 1;
      addTickets(item.id, count);
      setPurchaseMessage(`チケットを${count}枚獲得しました！`);
      setTimeout(() => setPurchaseMessage(''), 2000);
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

  const blockSameGacha = (id?: string) => {
    const targetId = id || lastShopAction?.id;
    if (!targetId || !lastShopAction) {
      setPurchaseMessage('操作できません');
      setTimeout(() => setPurchaseMessage(''), 2000);
      return;
    }

    // 再実行処理（Enter押下時と同等）
    try {
      // キャラクターガチャ
      if (lastShopAction.category === 'gacha') {
        if (areAllCharactersMaxed()) {
          setPurchaseMessage('全てのキャラクターが上限に達しています');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        if (state.coins < lastShopAction.price) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const ok = purchaseItem(lastShopAction.id, lastShopAction.price, false);
        if (!ok) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const count = parseInt(String(lastShopAction.effect).replace('character_gacha_', '')) || 1;
        const chars = pullCharacterGacha(count, lastShopAction.rarity as any);
        setPulledCharacters(chars);
        setShowGachaModal(true);
        setPurchaseMessage('再びガチャを引きました');
        setTimeout(() => setPurchaseMessage(''), 2000);
      }

      // カードパック（コイン）
      if (lastShopAction.category === 'collection') {
        if (state.coins < lastShopAction.price) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const ok = purchaseItem(lastShopAction.id, lastShopAction.price, false);
        if (!ok) {
          setPurchaseMessage('コインが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const cards = lastShopAction.effect ? openCardPack(lastShopAction.effect) : [];
        cards.forEach(card => addCardToCollection(card));
        setOpenedCards(cards);
        setIsCollectionPlusModal(false);
        setShowCardPackModal(true);
        setPurchaseMessage('再びカードパックを開封しました');
        setTimeout(() => setPurchaseMessage(''), 2000);
      }

      // コレクション+（メダル）
      if (lastShopAction.category === 'medal') {
        if (state.medals < lastShopAction.price) {
          setPurchaseMessage('メダルが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const ok = purchaseWithMedals(lastShopAction.id, lastShopAction.price, false);
        if (!ok) {
          setPurchaseMessage('メダルが足りません');
          setTimeout(() => setPurchaseMessage(''), 2000);
          return;
        }
        const count = parseInt(String(lastShopAction.effect).replace('collection_plus_', '')) || 1;
        const cards = pullCollectionPlusGacha(count);
        setOpenedCards(cards);
        setIsCollectionPlusModal(true);
        setShowCardPackModal(true);
        setPurchaseMessage('再びコレクション+を引きました');
        setTimeout(() => setPurchaseMessage(''), 2000);
      }

      // 実行後にブロックIDを保存
      try {
        const key = 'blockedGachas';
        const raw = localStorage.getItem(key) || '[]';
        const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        if (!arr.includes(targetId)) arr.push(targetId);
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e) { /* ignore storage error */ }

    } catch (e) {
      setPurchaseMessage('操作に失敗しました');
      setTimeout(() => setPurchaseMessage(''), 2000);
    }
  };

  const handleModalClose = () => {
    setShowCustomIconModal(false);
    setPreviewImage('');
    setCustomIconError('');
  };

  return (
    <div className="shop-container page-root">
      <header className="shop-header">
        <Link to="/" className="back-button">← ホームへ戻る</Link>
        <h1>ショップ</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="coins-display">💰 {state.coins} コイン</div>
          {collectionComplete && (
            <div className="coins-display" style={{ fontSize: '0.95rem' }}>🪙 {state.medals} メダル</div>
          )}
        </div>
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
          {collectionComplete && (
            <button 
              onClick={() => setSelectedCategory('medal')}
              className={selectedCategory === 'medal' ? 'active' : ''}
            >
              コレクション+
            </button>
          )}
          {/* コレクション++ は削除済み */}
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
            const isMedal = item.category === 'medal';
            // コレクション+（従来）のガチャかどうか
            const isCollectionPlusGacha = item.category === 'medal' && item.effect && String(item.effect).startsWith('collection_plus_');
            // collection+ ガチャはコレクション未完了なら非表示
            if (isCollectionPlusGacha && !collectionComplete) return null;
            const collectionPlusPulls = isCollectionPlusGacha ? (parseInt(String(item.effect).replace('collection_plus_', '')) || 1) : 0;
            // collection+ tickets removed: hide ticket-related UI
            const hasCollectionPlusTicket = false;
            const isActive = (item.category === 'theme' && state.activeTheme === item.effect) ||
                            (item.category === 'icon' && state.activeIcon === item.effect);
            const isFree = item.price === 0;
            const isCustomIcon = item.id === 'icon_custom';
            const isCollection = item.category === 'collection';
            const isCollectionPack = isCollection && item.effect && String(item.effect).startsWith('card_pack_');
            const isCollectionPackDisabled = isCollectionPack && !canOpenCardPack(String(item.effect));
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
                {isCollectionPackDisabled && (
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
                    全ての漢字が既にレジェンダリーです
                  </div>
                )}
                {item.category === 'medal' && !collectionComplete && (
                  <div style={{
                    background: 'rgba(200,200,200,0.06)',
                    border: '1px solid rgba(180,180,180,0.08)',
                    borderRadius: '8px',
                    padding: '0.4rem',
                    marginTop: '0.5rem',
                    fontSize: '0.85rem',
                    color: '#666',
                    textAlign: 'center'
                  }}>
                    コレクション完了で解放
                  </div>
                )}
                <div className="item-footer">
                  <div className="item-price">
                    {isFree ? '無料' : isMedal ? `🪙 ${item.price}` : `💰 ${item.price}`}
                  </div>
                  {item.category === 'ticket' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          const cards = useTicket(item.id);
                          if (cards && cards.length > 0) {
                            setOpenedCards(cards);
                            setIsCollectionPlusModal(true);
                            setShowCardPackModal(true);
                            setPurchaseMessage('チケットを使用しました');
                            setTimeout(() => setPurchaseMessage(''), 2000);
                          } else {
                            setPurchaseMessage('チケットが足りません');
                            setTimeout(() => setPurchaseMessage(''), 2000);
                          }
                        }}
                        disabled={!(state.tickets && state.tickets[item.id] > 0)}
                        className={`purchase-button`}
                      >
                        使用
                      </button>
                      <button onClick={() => handlePurchase(item)} className="purchase-button">獲得</button>
                    </div>
                    ) : hasCollectionPlusTicket ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          // 使えるチケットIDを優先的に選ぶ（単発チケット優先）
                          const singleId = '';
                          const multiId = '';
                          const usableId = (state.tickets && state.tickets[singleId] > 0) ? singleId : ((state.tickets && state.tickets[multiId] > 0) ? multiId : null);
                          if (!usableId) {
                            setPurchaseMessage('チケットが足りません');
                            setTimeout(() => setPurchaseMessage(''), 2000);
                            return;
                          }
                          const cards = useTicket(usableId, collectionPlusPulls);
                          if (cards && cards.length > 0) {
                            setOpenedCards(cards);
                            setIsCollectionPlusModal(true);
                            setShowCardPackModal(true);
                            setPurchaseMessage('チケットで引きました');
                            setTimeout(() => setPurchaseMessage(''), 2000);
                          } else {
                            setPurchaseMessage('チケットが足りません');
                            setTimeout(() => setPurchaseMessage(''), 2000);
                          }
                        }}
                        className={`purchase-button`}
                      >
                        チケットで引く
                      </button>
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={state.medals < item.price}
                        className={`purchase-button`}
                      >
                        メダルで購入
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={
                        (!isFree && !isPurchased && !isMedal && state.coins < item.price) ||
                        (!isFree && isMedal && state.medals < item.price) ||
                        isAlreadyOwned ||
                        isGachaDisabled ||
                        (!collectionComplete && item.category === 'medal') ||
                        Boolean(isCollection && item.effect && String(item.effect).startsWith('card_pack_') && !canOpenCardPack(String(item.effect)))
                      }
                      className={`purchase-button ${isPurchased ? 'purchased-btn' : ''} ${isActive ? 'active-btn' : ''} ${isAlreadyOwned ? 'owned-btn' : ''}`}
                    >
                      {isGachaDisabled || isCollectionPackDisabled ? '上限達成' :
                        isAlreadyOwned ? 'コレクション済' : 
                        isCustomIcon && isPurchased ? '設定' : 
                          isCollection ? '獲得' : 
                            isActive ? '使用中' : 
                              (isPurchased || isFree ? '適用' : '購入')
                      }
                    </button>
                    {isGacha && (
                      <button
                        onClick={() => {
                          // 確率を計算してモーダル表示
                          const compute = () => {
                            // 利用可能なキャラクター（上限に達したものを除外）
                            const maxed = new Set<string>(state.characters.filter(c => c.count >= MAX_CHARACTER_COUNT).map(c => c.id));
                            const availablePool: Record<string, Character> = {};
                            for (const [id, ch] of Object.entries(CHARACTERS)) {
                              if (!maxed.has(id) && (ch.unlockDate ? new Date(ch.unlockDate) <= new Date(new Date().setHours(0,0,0,0)) : true)) {
                                availablePool[id] = ch;
                              }
                            }

                            const totalRate = Object.values(GACHA_RATES).reduce((a, b) => a + b, 0);
                            const baseProb: Record<string, number> = {};
                            for (const [r, rate] of Object.entries(GACHA_RATES)) baseProb[r] = (rate as number) / totalRate;

                            // キャラクターの数をレア度ごとに算出
                            const countsByRarity: Record<string, number> = {};
                            let totalAvailable = 0;
                            for (const ch of Object.values(availablePool)) {
                              countsByRarity[ch.rarity] = (countsByRarity[ch.rarity] || 0) + 1;
                              totalAvailable++;
                            }

                            // ベースをコピー
                            const finalProb: Record<string, number> = {};
                            for (const r of Object.keys(baseProb)) finalProb[r] = 0;

                            // 欠損しているレア度の質量はフォールバックされる
                            let fallbackMass = 0;
                            for (const r of Object.keys(baseProb)) {
                              const availableOfR = Object.values(availablePool).filter(c => c.rarity === r).length;
                              if (availableOfR > 0) {
                                finalProb[r] += baseProb[r];
                              } else {
                                fallbackMass += baseProb[r];
                              }
                            }

                            if (fallbackMass > 0 && totalAvailable > 0) {
                              for (const r of Object.keys(finalProb)) {
                                const cnt = countsByRarity[r] || 0;
                                finalProb[r] += fallbackMass * (cnt / totalAvailable);
                              }
                            }

                            // パーセンテージ化
                            const asPct: Record<string, number> = {};
                            for (const [r, v] of Object.entries(finalProb)) {
                              asPct[r] = Math.round((v || 0) * 10000) / 100; // 小数2桁
                            }

                            // パック保証の注釈
                            let note = '';
                            const count = parseInt(String(item.effect).replace('character_gacha_', '')) || 1;
                            const guaranteed = item.rarity as unknown as string | undefined;
                            if (guaranteed && count > 1) {
                              // 保証対象のランクが利用可能か
                              const availableGuaranteed = Object.values(availablePool).some(c => RARITY_ORDER[c.rarity] >= (RARITY_ORDER as any)[guaranteed]);
                              if (availableGuaranteed) {
                                note = `注意: ${count}連ガチャは少なくとも1体が${getCharacterRarityName(guaranteed as any)}以上に保証されます`;
                              } else {
                                note = '注意: 保証対象のランクのキャラクターは現在利用できません';
                              }
                            }

                            return { asPct, note };
                          };

                          const { asPct, note } = compute();
                          setProbabilities(asPct);
                          setProbNote(note);
                          setShowProbModal(true);
                        }}
                        className="purchase-button"
                        style={{ marginLeft: '0.5rem', background: 'linear-gradient(135deg,#9dd3ff 0%,#7aa2ff 100%)' }}
                      >
                        確率
                      </button>
                    )}
                    </div>
                  )}
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
                  const cardClass = isCollectionPlusModal ? 'card-item collection-plus' : `card-item rarity-${card.rarity}`;

                  return (
                    <div 
                      key={card.id} 
                      className={cardClass}
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
                        {!isCollectionPlusModal && (
                          <div className={`card-rarity-badge rarity-${card.rarity}`}>
                            {getRarityName(card.rarity)}
                          </div>
                        )}
                        {isNewCard && !isCollectionPlusModal && (
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
                <button
                  onClick={() => blockSameGacha()}
                  style={{
                    flex: '1',
                    padding: '1rem',
                    background: 'linear-gradient(135deg,#ff8a8a 0%,#ff6b6b 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    cursor: 'pointer'
                  }}
                >
                  同じガチャを引く
                </button>
                <div style={{ minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>Enterで同じガチャを引く</div>
                </div>
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
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem', width: '100%', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {char.icon.startsWith('/') || char.icon.startsWith('http') ? (
                        <img src={char.icon} alt={char.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        char.icon
                      )}
                    </div>
                    <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{char.name}</div>
                    <div style={{ 
                      fontSize: '0.8rem',
                      color: char.rarity === 'origin' ? '#ff00ff' :
                             char.rarity === 'ultra' ? '#00ffff' :
                             char.rarity === 'mythic' ? '#ff4444' :
                             char.rarity === 'legendary' ? '#ffd700' :
                             char.rarity === 'epic' ? '#a335ee' :
                             char.rarity === 'rare' ? '#0070dd' : '#9d9d9d',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      textShadow: char.rarity === 'origin' ? '0 0 10px #ff00ff' : 
                                  char.rarity === 'ultra' ? '0 0 10px #00ffff' : 'none'
                    }}>
                      {getCharacterRarityName(char.rarity)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a0a0c0' }}>{char.description}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <div style={{ marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>Enterで同じガチャを引く</div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                  <button
                    onClick={() => blockSameGacha()}
                    style={{
                      background: 'linear-gradient(135deg,#ff8a8a 0%,#ff6b6b 100%)',
                      color: 'white',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      cursor: 'pointer'
                    }}
                  >
                     同じガチャを引く
                  </button>
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
        </div>
      )}
      {/* ガチャ確率モーダル */}
      {showProbModal && probabilities && (
        <div className="modal-overlay" onClick={() => setShowProbModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>ガチャ排出率</h2>
              <button className="modal-close" onClick={() => setShowProbModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(probabilities).sort((a,b)=> (RARITY_ORDER as any)[b[0]] - (RARITY_ORDER as any)[a[0]]).map(([rarity, pct]) => (
                  <div key={rarity} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{getCharacterRarityName(rarity as any)}</div>
                    <div style={{ color: '#666' }}>{pct}%</div>
                  </div>
                ))}
              </div>
              {probNote && (
                <div style={{ marginTop: '1rem', color: '#a0a0a0', fontSize: '0.9rem' }}>{probNote}</div>
              )}
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <button
                  onClick={() => setShowProbModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
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
