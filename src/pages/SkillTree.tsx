import { useState, useRef, useEffect } from 'react';
import { SKILLS, type Skill } from '../data/skillTree';
import { useGamification } from '../contexts/GamificationContext';
import '../styles/SkillTree.css';

const SkillTree = () => {
  const { state, isMedalSystemEnabled, getSkillLevel, upgradeSkill } = useGamification();
  const medals = state.medals;
  const streakProtectionCount = state.streakProtectionCount;
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const containerWidth = canvasRef.current.offsetWidth || 800;
        const width = Math.min(containerWidth, 900);
        const height = Math.min(width, 850); // 高さを少し低く
        setCanvasSize({ width, height });
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const getSkillIcon = (skill: Skill): string => {
    const type = skill.effect.type;
    if (type === 'xp_boost' || type === 'xp_multiplier') return '⚡';
    if (type === 'coin_boost' || type === 'lucky_coin') return '💰';
    if (type === 'medal_boost') return '🪙';
    if (type === 'streak_protection') return '🛡️';
    if (type === 'double_reward' || type === 'critical_hit') return '✨';
    if (type === 'time_bonus') return '⏱️';
    return '🎯';
  };

  const isSkillUnlocked = (skill: Skill): boolean => {
    if (!skill.prerequisite || skill.prerequisite.length === 0) return true;
    return skill.prerequisite.every(prereqId => {
      const prereq = SKILLS.find(s => s.id === prereqId);
      if (!prereq) return true;
      return getSkillLevel(prereqId) > 0;
    });
  };

  const canUpgradeSkill = (skill: Skill): boolean => {
    const currentLevel = getSkillLevel(skill.id);
    if (currentLevel >= skill.maxLevel) return false;
    if (!isSkillUnlocked(skill)) return false;
    return medals >= skill.cost;
  };

  const handleUpgrade = (skill: Skill) => {
    if (canUpgradeSkill(skill)) {
      upgradeSkill(skill.id);
      setSelectedSkill({ ...skill });
    }
  };

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
  };

  // 円形配置の座標を計算
  const getNodePosition = (skill: Skill) => {
    // マージンを考慮したサイズ
    const margin = 100; // ノードがはみ出さないためのマージン
    const effectiveWidth = canvasSize.width - margin;
    const effectiveHeight = canvasSize.height - margin;
    const centerX = canvasSize.width / 2;
    
    // 画面幅を確認して2列レイアウトかどうか判定
    const isTwoColumnLayout = window.innerWidth > 1200;
    const centerY = isTwoColumnLayout 
      ? canvasSize.height / 2 + 50  // 2列時は中心よりさらに下にずらす
      : canvasSize.height / 2 - 70; // 1列時は中心を少し上にずらす
    
    if (skill.tier === 0) {
      return { x: centerX, y: centerY };
    }
    
    // 各階層の半径を調整（2列時は半径を広げる）
    const baseRadius = isTwoColumnLayout 
      ? Math.min(effectiveWidth, effectiveHeight) * 0.15  // 2列時は半径を広げる
      : Math.min(effectiveWidth, effectiveHeight) * 0.10; // 1列時は元の半径
    const radius = baseRadius * skill.tier;
    const angleRad = (skill.angle - 90) * (Math.PI / 180);
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    
    return { x, y };
  };

  // 接続線を描画
  const renderConnections = () => {
    return SKILLS.filter(skill => skill.prerequisite && skill.prerequisite.length > 0).map(skill => {
      const skillPos = getNodePosition(skill);
      return (skill.prerequisite || []).map(prereqId => {
        const prereq = SKILLS.find(s => s.id === prereqId);
        if (!prereq) return null;
        
        const prereqPos = getNodePosition(prereq);
        const isActive = getSkillLevel(skill.id) > 0 && getSkillLevel(prereqId) > 0;
        
        return (
          <line
            key={`${prereqId}-${skill.id}`}
            x1={prereqPos.x}
            y1={prereqPos.y}
            x2={skillPos.x}
            y2={skillPos.y}
            stroke={isActive ? '#28a745' : '#d1d5da'}
            strokeWidth={isActive ? 3 : 2}
            className={isActive ? 'connection-line active' : 'connection-line'}
          />
        );
      });
    });
  };

  const renderSkillNode = (skill: Skill) => {
    const currentLevel = getSkillLevel(skill.id);
    const unlocked = isSkillUnlocked(skill);
    const canUpgrade = canUpgradeSkill(skill);
    const isMaxLevel = currentLevel >= skill.maxLevel;
    const isSelected = selectedSkill?.id === skill.id;
    const isActive = currentLevel > 0;
    
    const pos = getNodePosition(skill);
    const nodeSize = skill.tier === 0 ? 80 : 70;
    
    let className = 'skill-node';
    if (isSelected) className += ' selected';
    if (isActive) className += ' active';
    if (canUpgrade) className += ' can-upgrade';
    if (isMaxLevel && skill.tier > 0) className += ' max-level';
    if (!unlocked) className += ' locked';

    return (
      <div
        key={skill.id}
        className={className}
        style={{
          position: 'absolute',
          left: pos.x - nodeSize / 2,
          top: pos.y - nodeSize / 2,
          width: nodeSize,
          height: nodeSize,
        }}
        onClick={() => handleSkillClick(skill)}
      >
        <div className="skill-node-inner">
          <span className="skill-icon">{getSkillIcon(skill)}</span>
          {currentLevel > 0 && skill.tier > 0 && (
            <div className="skill-level-badge">
              Lv.{currentLevel}
            </div>
          )}
          {isMaxLevel && skill.tier > 0 && <div className="max-badge">MAX</div>}
          {!unlocked && <div className="lock-badge">🔒</div>}
        </div>
      </div>
    );
  };

  const renderDetailsPanel = () => {
    if (!selectedSkill) {
      return (
        <div className="skill-details-panel">
          <p style={{ textAlign: 'center', color: '#586069', marginTop: '2rem' }}>
            スキルを選択して詳細を表示
          </p>
        </div>
      );
    }

    const currentLevel = getSkillLevel(selectedSkill.id);
    const unlocked = isSkillUnlocked(selectedSkill);
    const canUpgrade = canUpgradeSkill(selectedSkill);
    const isMaxLevel = currentLevel >= selectedSkill.maxLevel;
    const currentEffect = currentLevel * selectedSkill.effect.value;
    const nextEffect = (currentLevel + 1) * selectedSkill.effect.value;

    return (
      <div className="skill-details-panel">
        <div className="skill-details-header">
          <div className="skill-details-icon">{getSkillIcon(selectedSkill)}</div>
          <div>
            <h2>{selectedSkill.name}</h2>
            <div className="skill-details-level">
              レベル {currentLevel} / {selectedSkill.maxLevel}
            </div>
          </div>
        </div>
        
        <div className="skill-details-body">
          <p className="skill-details-description">{selectedSkill.description}</p>
          
          {currentLevel > 0 && (
            <div className="skill-details-effect">
              <h3>現在の効果</h3>
              <div className="effect-value">
                {selectedSkill.effect.type === 'streak_protection' 
                  ? `${currentEffect}回保護`
                  : `+${currentEffect}%`}
              </div>
            </div>
          )}
          
          {!isMaxLevel && (
            <div className="skill-details-next">
              <h3>次のレベル</h3>
              <div className="next-effect">
                {selectedSkill.effect.type === 'streak_protection' 
                  ? `${nextEffect}回保護`
                  : `+${nextEffect}%`}
              </div>
            </div>
          )}
          
          {selectedSkill.prerequisite && selectedSkill.prerequisite.length > 0 && (
            <div className={`skill-details-prerequisite ${unlocked ? 'met' : 'unmet'}`}>
              {unlocked ? '✓ 前提条件を満たしています' : '🔒 前提スキルが必要です'}
            </div>
          )}
          
          {!isMaxLevel && (
            <>
              <div className="skill-details-cost">
                <span>アップグレードコスト:</span>
                <span className="cost-amount">🪙 {selectedSkill.cost}</span>
              </div>
              
              <button
                className="upgrade-button-large"
                onClick={() => handleUpgrade(selectedSkill)}
                disabled={!canUpgrade}
              >
                {!unlocked ? '前提スキルが必要' : 
                 medals < selectedSkill.cost ? 'メダルが不足' : 
                 'アップグレード'}
              </button>
            </>
          )}
          
          {isMaxLevel && (
            <div className="max-level-message">
              ✨ 最大レベル到達！
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="skill-tree-page">
      {!isMedalSystemEnabled ? (
        <div className="skill-tree-disabled">
          <div className="disabled-message">
            <h1>🌳 スキルツリー</h1>
            <div className="coming-soon-banner">
              <p className="coming-soon-title">⏰ 11/26から開始！</p>
              <p className="coming-soon-description">
                もうすぐリリースされますので、お楽しみに！
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="skill-tree-header">
            <h1>スキルツリー</h1>
            <div className="medal-display">
              <span className="medal-icon">🪙</span>
              <div>
                <div className="medal-count">{medals}</div>
                <div className="medal-label">メダル</div>
              </div>
            </div>
          </div>

          <div className="skill-tree-info">
            <p>メダルを使ってスキルをアップグレードし、学習効率を高めましょう！</p>
            <p>スキルノードをクリックすると詳細が表示されます。</p>
            {streakProtectionCount > 0 && (
              <div className="protection-count">
                🛡️ ストリーク保護: 残り{streakProtectionCount}回
              </div>
            )}
          </div>

          <div className="skill-tree-layout">
            <div className="skill-tree-canvas" ref={canvasRef}>
              <svg 
                className="connection-lines"
                width={canvasSize.width}
                height={canvasSize.height}
              >
                {renderConnections()}
              </svg>
              {SKILLS.map(skill => renderSkillNode(skill))}
            </div>
            
            {renderDetailsPanel()}
          </div>
        </>
      )}
    </div>
  );
};

export default SkillTree;