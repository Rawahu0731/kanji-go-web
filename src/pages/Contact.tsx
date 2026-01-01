import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { saveInquiry } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function Contact() {
  const { user, isFirebaseEnabled } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [replyRequested, setReplyRequested] = useState<boolean>(!!user?.email);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ログイン状態が変わったらフォームを更新
    setName(user?.displayName || '');
    setEmail(user?.email || '');
    setReplyRequested(!!user?.email);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 必須チェック: お名前、メール、本文
    if (!name.trim()) {
      setError('お名前を入力してください');
      return;
    }
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }
    if (!message.trim()) {
      setError('内容を入力してください');
      return;
    }
    if (message.trim().length > 1000) {
      setError('本文は1000文字以内で入力してください');
      return;
    }

    if (!isFirebaseEnabled) {
      setError('サーバー側の設定が無効です。管理者に連絡してください。');
      return;
    }

    setStatus('sending');
    try {
      await saveInquiry(name.trim(), email.trim(), message.trim(), replyRequested);
      setStatus('success');
      setMessage('');
    } catch (err: any) {
      console.error('Failed to send inquiry:', err);
      setError(err?.message || '送信に失敗しました');
      setStatus('error');
    }
  };

  return (
    <div className="page-root" style={{ maxWidth: 760, margin: '2rem auto', padding: '1rem' }}>
      <Link to="/" className="back-button">← ホームへ戻る</Link>
      <h2>お問い合わせ</h2>
      <p>不具合報告・要望・その他のお問い合わせはこちらから送信してください。</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontWeight: 600 }}>お名前（必須）</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontWeight: 600 }}>メールアドレス（必須）</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontWeight: 600 }}>内容（必須）</label>
          <textarea value={message} onChange={e => setMessage((e.target as HTMLTextAreaElement).value.slice(0,1000))} rows={8} style={{ width: '100%', padding: '8px' }} maxLength={1000} />
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 6 }}>{message.length}/1000</div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={replyRequested} onChange={e => setReplyRequested(e.target.checked)} />
            <span>返信を希望する（任意）</span>
          </label>
        </div>

        {error && <div style={{ color: 'var(--danger, #c53030)', marginBottom: '0.75rem' }}>{error}</div>}

        <div>
          <button type="submit" disabled={status === 'sending'} style={{ padding: '8px 14px' }}>
            {status === 'sending' ? '送信中…' : '送信'}
          </button>
          {status === 'success' && <span style={{ marginLeft: 12, color: '#16a34a' }}>送信が完了しました。ありがとうございます。</span>}
        </div>
      </form>
    </div>
  );
}
