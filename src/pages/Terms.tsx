import { Link } from 'react-router-dom';
import terms from '../../利用規約.md?raw';
import '../styles/Ranking.css';

export default function Terms() {
  // シンプルに生のMarkdownをそのまま表示する（軽量で依存なし）
  return (
    <div className="ranking-page">
      <header>
        <h1>利用規約</h1>
        <Link to="/" className="back-link">← メニューに戻る</Link>
      </header>

      <div style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', lineHeight: 1.7 }}>
        {terms}
      </div>
    </div>
  );
}
