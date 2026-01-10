import type { Badge } from '../../data/badges';
import type { OwnedCharacter } from '../../data/characters';

// 通知表示用のヘルパー関数
export function showCharacterLevelUpNotification(character: OwnedCharacter, newLevel: number) {
  const notification = document.createElement('div');
  // icon が画像パスかどうかを判定して適切にレンダリングする
  const isImage = typeof character.icon === 'string' && (character.icon.startsWith('/') || character.icon.startsWith('http') || /\.(png|jpe?g|gif|webp|svg)$/i.test(character.icon));
  const iconMarkup = isImage
    ? `<img src="${character.icon}" alt="${character.name}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;" loading="lazy"/>`
    : `<div style="font-size: 1.75rem;">${character.icon}</div>`;

  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 16px;
      right: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 1rem;
      z-index: 1200;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.25);
      animation: slideInRight 0.45s ease-out;
      display: flex;
      gap: 0.75rem;
      align-items: center;
      min-width: 220px;
    ">
      ${iconMarkup}
      <div>
        <div style="font-weight:700;">${character.name}</div>
        <div style="font-size:0.9rem; opacity:0.95;">Lv.${newLevel}</div>
      </div>
    </div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    const el = notification.firstElementChild as HTMLElement | null;
    if (el) {
      el.style.animation = 'slideOutRight 0.4s ease-out';
    }
    setTimeout(() => notification.remove(), 400);
  }, 2000);
}

export function showLevelUpNotification(level: number) {
  const notification = document.createElement('div');
  notification.className = 'level-up-notification';
  notification.textContent = `🎉 レベルアップ！ Lv.${level}`;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

export function showBadgeNotification(badge: Badge) {
  const notification = document.createElement('div');
  notification.className = 'badge-notification';
  notification.textContent = `🏆 ${badge.icon} ${badge.name}`;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// CSSアニメーションを追加
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      to { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    }
    @keyframes slideInRight {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// 汎用の一時通知を表示（右上）
export function showTemporaryNotification(text: string, duration: number = 2000) {
  const notification = document.createElement('div');
  notification.className = 'temporary-notification';
  notification.style.position = 'fixed';
  notification.style.top = '16px';
  notification.style.right = '16px';
  notification.style.background = 'linear-gradient(135deg, #ffb86b 0%, #ff7eb6 100%)';
  notification.style.color = 'white';
  notification.style.padding = '0.75rem 1rem';
  notification.style.borderRadius = '10px';
  notification.style.fontWeight = '700';
  notification.style.fontSize = '1rem';
  notification.style.zIndex = '1200';
  notification.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
  notification.style.animation = 'slideInRight 0.35s ease-out';
  notification.textContent = text;
  document.body.appendChild(notification);

  setTimeout(() => {
    const el = notification as HTMLElement | null;
    if (el) el.style.animation = 'slideOutRight 0.35s ease-out';
    setTimeout(() => notification.remove(), 350);
  }, duration);
}
