import { useEffect, useRef, useState } from 'react';
import { formatJstIso, formatElapsed } from './utils/rtaTimer';

type Props = {
  result: { startIso: string; endIso: string; elapsedMs: number } | null;
  onClose: () => void;
};

export default function RtaResult({ result, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    const canvas = canvasRef.current || document.createElement('canvas');
    const w = 1200;
    const h = 630;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    const grad = ctx.createLinearGradient(0,0,w,h);
    grad.addColorStop(0,'#0b2545');
    grad.addColorStop(0.5,'#0b6cff');
    grad.addColorStop(1,'#ffd27a');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,w,h);

    // Decorative shapes
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffffff';
    for (let i=0;i<6;i++){
      ctx.beginPath();
      ctx.ellipse(w*(0.1+i*0.15), h*(0.2 + (i%3)*0.18), 120, 220, (i%2?0.3:-0.4), 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Central time text
    const elapsed = formatElapsed(result.elapsedMs);
    ctx.fillStyle = '#081224';
    ctx.font = 'bold 84px "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLEAR TIME', w/2, h*0.28);

    ctx.font = 'bold 128px "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
    ctx.fillStyle = '#0b1720';
    ctx.fillText(elapsed, w/2, h*0.5);

    // Footer: url + timestamps
    ctx.font = '20px Meiryo, sans-serif';
    ctx.fillStyle = '#021018';
    const url = location.href.split('#')[0];
    ctx.fillText(url, w/2, h*0.86);
    ctx.fillText(`${formatJstIso(result.startIso)} → ${formatJstIso(result.endIso)}`, w/2, h*0.92);

    const dataUrl = canvas.toDataURL('image/png');
    setImgUrl(dataUrl);
    // attach to DOM canvasRef for potential download
    if (!canvasRef.current) canvasRef.current = canvas;
  }, [result]);

  const handleShare = async () => {
    if (!result) return;
    const text = `漢字ストーリー クリアタイム: ${formatElapsed(result.elapsedMs)}\n${location.href.split('#')[0]}`;

    // Try Web Share with files (most mobile browsers)
    try {
      if ((navigator as any).canShare && imgUrl) {
        const res = await fetch(imgUrl!);
        const blob = await res.blob();
        const file = new File([blob], 'kanji-clear.png', { type: blob.type });
        if ((navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({ files: [file], text });
          return;
        }
      }
    } catch (e) {
      console.warn('Web Share failed', e);
    }

    // Fallback: open Twitter intent (cannot attach image automatically). Provide download link.
    const tweet = encodeURIComponent(`漢字ストーリー クリアタイム: ${formatElapsed(result.elapsedMs)}\n${location.href.split('#')[0]}`);
    const url = `https://twitter.com/intent/tweet?text=${tweet}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div style={{ position: 'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:960, maxWidth:'100%', background:'#fff', borderRadius:12, padding:24, boxShadow:'0 8px 40px rgba(2,6,23,0.6)' }}>
        <h2 style={{ margin:0, marginBottom:12 }}>ゲームクリア — RTA記録</h2>
        {!result && <div>記録が見つかりません。</div>}
        {result && (
          <>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ flex:1 }}>
                <div><strong>開始（JST）:</strong> {formatJstIso(result.startIso)}</div>
                <div><strong>終了（JST）:</strong> {formatJstIso(result.endIso)}</div>
                <div style={{ fontSize:20, marginTop:8 }}><strong>経過:</strong> {formatElapsed(result.elapsedMs)}</div>
              </div>
              <div style={{ width:420, textAlign:'center' }}>
                {imgUrl && <img src={imgUrl} alt="RTA" style={{ maxWidth:'100%', borderRadius:8, boxShadow:'0 8px 24px rgba(11,17,34,0.2)' }} />}
              </div>
            </div>

            <div style={{ marginTop:18, display:'flex', gap:8 }}>
              <button onClick={handleShare} style={{ padding:'10px 14px', borderRadius:8, background:'#1da1f2', color:'#fff', border:'none', cursor:'pointer' }}>ツイートで共有</button>
              <a href={imgUrl || '#'} download="kanji-clear.png" style={{ padding:'10px 14px', borderRadius:8, background:'#eee', color:'#0b1720', textDecoration:'none', display:'inline-block' }}>画像をダウンロード</a>
              <button onClick={onClose} style={{ marginLeft:'auto', padding:'10px 14px', borderRadius:8, background:'#0b6cff', color:'#fff', border:'none', cursor:'pointer' }}>タイトルへ戻る</button>
            </div>
          </>
        )}
        <canvas ref={canvasRef} style={{ display:'none' }} />
      </div>
    </div>
  );
}
