import { Link } from 'react-router-dom';

export default function CollectionPlusPlus() {
  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/" className="back-button">← ホームへ戻る</Link>
      <h1>コレクション++（削除済み）</h1>
      <p>この機能は削除されました。コレクション+ をお楽しみください。</p>
    </div>
  );
}
