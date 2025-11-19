import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './EmailAuthForm.css';

interface EmailAuthFormProps {
  onClose: () => void;
}

export default function EmailAuthForm({ onClose }: EmailAuthFormProps) {
  const { signUp, signInWithEmailAndPassword } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          setError('ユーザー名を入力してください');
          setIsLoading(false);
          return;
        }
        await signUp(email, password, username);
      } else {
        await signInWithEmailAndPassword(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に使用されています');
      } else if (err.code === 'auth/weak-password') {
        setError('パスワードは6文字以上で設定してください');
      } else if (err.code === 'auth/invalid-email') {
        setError('有効なメールアドレスを入力してください');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('メールアドレスまたはパスワードが間違っています');
      } else if (err.code === 'auth/invalid-credential') {
        setError('メールアドレスまたはパスワードが間違っています');
      } else {
        setError('認証に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="email-auth-overlay" onClick={onClose}>
      <div className="email-auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <h2>{isSignUp ? 'アカウント作成' : 'ログイン'}</h2>
        
        {error && <div className="auth-error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="username">ユーザー名</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名"
                required={isSignUp}
                disabled={isLoading}
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : (isSignUp ? 'アカウント作成' : 'ログイン')}
          </button>
        </form>
        
        <div className="toggle-mode">
          {isSignUp ? (
            <p>
              すでにアカウントをお持ちですか？{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                }}
                disabled={isLoading}
              >
                ログイン
              </button>
            </p>
          ) : (
            <p>
              アカウントをお持ちでないですか？{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                }}
                disabled={isLoading}
              >
                アカウント作成
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
