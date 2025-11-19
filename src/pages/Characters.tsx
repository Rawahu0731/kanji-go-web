import { useGamification } from '../contexts/GamificationContext';
import { RARITY_ORDER, getCharacterEffectValue, getXpForCharacterLevel, MAX_CHARACTER_LEVEL } from '../data/characters';

function Characters() {
  const { state, equipCharacter } = useGamification();

  const getRarityName = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'レジェンダリー';
      case 'epic': return 'エピック';
      case 'rare': return 'レア';
      case 'common': return 'コモン';
      default: return rarity;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#ffffff',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          キャラクター
        </h1>

        {/* 装備中のキャラクター */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '2px solid rgba(102, 126, 234, 0.3)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>装備中</h2>
          {state.equippedCharacter ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <div style={{ fontSize: '4rem' }}>{state.equippedCharacter.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {state.equippedCharacter.name}
                  {state.equippedCharacter.count > 1 && (
                    <span style={{ 
                      fontSize: '1rem',
                      marginLeft: '0.5rem',
                      color: '#ffd700'
                    }}>
                      +{state.equippedCharacter.count - 1}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '1rem', marginBottom: '0.5rem', opacity: 0.9 }}>
                  {getRarityName(state.equippedCharacter.rarity)} • Lv.{state.equippedCharacter.level}
                  {state.equippedCharacter.level < MAX_CHARACTER_LEVEL && (
                    <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', opacity: 0.7 }}>
                      ({state.equippedCharacter.xp} / {getXpForCharacterLevel(state.equippedCharacter.level)} XP)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.95rem', marginBottom: '0.75rem', opacity: 0.8 }}>
                  {state.equippedCharacter.description}
                </div>
                <div style={{ 
                  fontSize: '1.1rem', 
                  color: '#88dd88',
                  fontWeight: '600'
                }}>
                  {state.equippedCharacter.effect.type === 'xp_boost' && 
                    `XP +${Math.round((getCharacterEffectValue(state.equippedCharacter) - 1) * 100)}%`}
                  {state.equippedCharacter.effect.type === 'coin_boost' && 
                    `コイン +${Math.round((getCharacterEffectValue(state.equippedCharacter) - 1) * 100)}%`}
                  {state.equippedCharacter.effect.type === 'both_boost' && 
                    `XP・コイン +${Math.round((getCharacterEffectValue(state.equippedCharacter) - 1) * 100)}%`}
                </div>
              </div>
              <button
                onClick={() => equipCharacter(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                解除
              </button>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#a0a0c0',
              fontSize: '1.1rem'
            }}>
              キャラクターが装備されていません
            </div>
          )}
        </div>

        {/* 所持キャラクター一覧 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '2px solid rgba(102, 126, 234, 0.3)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            所持キャラクター ({state.characters.length})
          </h2>
          {state.characters.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#a0a0c0',
              fontSize: '1.1rem'
            }}>
              <p style={{ marginBottom: '1rem' }}>まだキャラクターを持っていません</p>
              <p style={{ fontSize: '0.95rem' }}>ショップでガチャを引いてキャラクターを入手しよう！</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '1rem',
              marginTop: '1rem'
            }}>
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
                    style={{
                      background: isEquipped 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      textAlign: 'center',
                      border: isEquipped 
                        ? '3px solid #667eea'
                        : '2px solid rgba(102, 126, 234, 0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isEquipped) {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEquipped) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                      }
                    }}
                  >
                    {isEquipped && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#667eea',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '700'
                      }}>
                        ✓
                      </div>
                    )}
                    <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{char.icon}</div>
                    <div style={{ fontWeight: '700', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                      {char.name}
                      {char.count > 1 && (
                        <span style={{ 
                          fontSize: '0.8rem',
                          marginLeft: '0.25rem',
                          color: '#ffd700'
                        }}>
                          +{char.count - 1}
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem',
                      color: char.rarity === 'legendary' ? '#ffd700' :
                             char.rarity === 'epic' ? '#a335ee' :
                             char.rarity === 'rare' ? '#0070dd' : '#9d9d9d',
                      marginBottom: '0.25rem',
                      fontWeight: '600'
                    }}>
                      {getRarityName(char.rarity)} • Lv.{char.level}
                    </div>
                    {char.level < MAX_CHARACTER_LEVEL && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#a0a0c0',
                        marginBottom: '0.5rem'
                      }}>
                        XP: {char.xp} / {getXpForCharacterLevel(char.level)}
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#a0a0c0', 
                      marginBottom: '0.5rem',
                      lineHeight: '1.3'
                    }}>
                      {char.description}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#88dd88',
                      fontWeight: '600'
                    }}>
                      {char.effect.type === 'xp_boost' && `XP +${effectPercent}%`}
                      {char.effect.type === 'coin_boost' && `コイン +${effectPercent}%`}
                      {char.effect.type === 'both_boost' && `XP・コイン +${effectPercent}%`}
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
