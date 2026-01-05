import React from 'react';

type Props = {
  children: React.ReactNode;
  duration?: number; // ms
  className?: string;
};

export default function CenterScrollText({ children, duration = 800, className = '' }: Props) {
  const dur = Math.max(100, duration);
  const style: React.CSSProperties = {
    animationDuration: `${dur}ms`
  };

  return (
    <div className={`center-scroll-text ${className}`} aria-hidden>
      <style>{`
        .center-scroll-text{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:20 }
        .center-scroll-text .center-scroll-inner{ transform: translateY(30vh); opacity:0; animation-name: centerRiseAnim; animation-timing-function: ease-out; animation-fill-mode: forwards; }
        @keyframes centerRiseAnim { from { transform: translateY(30vh); opacity:0 } to { transform: translateY(0); opacity:1 } }
      `}</style>
      <div className="center-scroll-inner" style={style}>{children}</div>
    </div>
  );
}
