import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { RARITY_ORDER, getCharacterEffectValue, getXpForCharacterLevel, MAX_CHARACTER_LEVEL } from '../data/characters';
import '../styles/Characters.css';

function Characters() {
  const { state, equipCharacter } = useGamification();

  const getRarityName = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return 'ミシック';
      case 'legendary': return 'レジェンダリー';
      case 'epic': return 'エピック';
      case 'rare': return 'レア';
      case 'common': return 'コモン';
      default: return rarity;
    }
  };

  return (
    <div className="characters-container page-root">
      <div className="characters-header">
        <Link to="/" className="back-button">
          ← ホームへ戻る
        </Link>
        <h1>キャラクター</h1>
      </div>

      <div className="characters-content">
        {/* 装備中のキャラクター */}
        <div className="equipped-section">
          <h2>装備中</h2>
          {state.equippedCharacter ? (
            <div className="equipped-character">
              <div className="equipped-icon">
                {state.equippedCharacter.icon.startsWith('/') || state.equippedCharacter.icon.startsWith('http') ? (
                  <img src={state.equippedCharacter.icon} alt={state.equippedCharacter.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  state.equippedCharacter.icon
                )}
              </div>
              <div className="equipped-info">
                <div className="equipped-name">
                  {state.equippedCharacter.name}
                  {state.equippedCharacter.count > 1 && (
                    <span className="equipped-count">
                      +{state.equippedCharacter.count - 1}
                    </span>
                  )}
                </div>
                <div className="equipped-meta">
                  {getRarityName(state.equippedCharacter.rarity)} • Lv.{state.equippedCharacter.level}
                  {state.equippedCharacter.count > 1 && (
                    <span className="equipped-effective-level">
                      （実効Lv.{state.equippedCharacter.level + state.equippedCharacter.count - 1}）
                    </span>
                  )}
                  {state.equippedCharacter.level < MAX_CHARACTER_LEVEL && (
                    <span className="equipped-xp">
                      ({state.equippedCharacter.xp} / {getXpForCharacterLevel(state.equippedCharacter.level)} XP)
                    </span>
                  )}
                </div>
                <div className="equipped-description">
                  {state.equippedCharacter.description}
                </div>
                <div className="equipped-effect">
                  {state.equippedCharacter.effect.type === 'xp_boost' && 
                    `XP +${Math.round((getCharacterEffectValue(state.equippedCharacter) - 1) * 100)}%`}
                  {state.equippedCharacter.effect.type === 'coin_boost' && 
                    `コイン +${Math.round((getCharacterEffectValue(state.equippedCharacter) - 1) * 100)}%`}
                  {state.equippedCharacter.effect.type === 'both_boost' && 
                    `XP・コイン +${Math.round((getCharacterEffectValue(state.equippedCharacter) - 1) * 100)}%`}
                  {state.equippedCharacter.effect.value !== getCharacterEffectValue(state.equippedCharacter) && (
                    <span className="equipped-base-effect">
                      （基本: +{Math.round((state.equippedCharacter.effect.value - 1) * 100)}%）
                    </span>
                  )}
                </div>
              </div>
              <div className="equipped-actions">
                <button
                  onClick={() => equipCharacter(null)}
                  className="unequip-button"
                >
                  解除
                </button>
              </div>
            </div>
          ) : (
            <div className="no-equipped">
              キャラクターが装備されていません
            </div>
          )}
        </div>

        {/* 所持キャラクター一覧 */}
        <div className="characters-list-section">
          <h2>所持キャラクター ({state.characters.length})</h2>
          {state.characters.length === 0 ? (
            <div className="no-characters">
              <p>まだキャラクターを持っていません</p>
              <p className="no-characters-hint">ショップでガチャを引いてキャラクターを入手しよう！</p>
            </div>
          ) : (
            <div className="characters-grid">
              {state.characters
                .sort((a, b) => {
                  const rarityDiff = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
                  if (rarityDiff !== 0) return rarityDiff;
                  return b.level - a.level;
                })
                .map((char, index) => {
                const isEquipped = state.equippedCharacter?.id === char.id;
                const effectValue = getCharacterEffectValue(char);
                const effectPercent = Math.round((effectValue - 1) * 100);
                
                return (
                  <div 
                    key={`${char.id}-${index}`}
                    onClick={() => equipCharacter(isEquipped ? null : char)}
                    className={`character-card ${isEquipped ? 'equipped' : ''}`}
                  >
                    {isEquipped && (
                      <div className="equipped-badge">
                        ✓
                      </div>
                    )}
                    {/* デバッグ用ボタン（開発時のみ）を削除しました */}
                    <div className="character-icon">
                      {char.icon.startsWith('/') || char.icon.startsWith('http') ? (
                        <img src={char.icon} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        char.icon
                      )}
                    </div>
                    <div className="character-name">
                      {char.name}
                      {char.count > 1 && (
                        <span className="character-name-count">
                          +{char.count - 1}
                        </span>
                      )}
                    </div>
                    <div className={`character-rarity ${char.rarity}`}>
                      {getRarityName(char.rarity)} • Lv.{char.level}
                      {char.count > 1 && (
                        <span className="character-effective-level">
                          （実効Lv.{char.level + char.count - 1}）
                        </span>
                      )}
                    </div>
                    {char.level < MAX_CHARACTER_LEVEL && (
                      <div className="character-xp">
                        XP: {char.xp} / {getXpForCharacterLevel(char.level)}
                      </div>
                    )}
                    <div className="character-description">
                      {char.description}
                    </div>
                    <div className="character-effect">
                      {char.effect.type === 'xp_boost' && `XP +${effectPercent}%`}
                      {char.effect.type === 'coin_boost' && `コイン +${effectPercent}%`}
                      {char.effect.type === 'both_boost' && `XP・コイン +${effectPercent}%`}
                      {char.effect.value !== effectValue && (
                        <span className="character-base-effect">
                          （基本: +{Math.round((char.effect.value - 1) * 100)}%）
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Characters;
