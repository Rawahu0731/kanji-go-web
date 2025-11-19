import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import './AuthButton.css';

export default function AuthButton() {
  const { user, signIn, signOut, isFirebaseEnabled } = useAuth();
  const { syncWithFirebase } = useGamification();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signIn();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signOut();
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError('ログアウトに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFirebaseEnabled) {
    return null;
  }

  return (
    <div className="auth-button-container">
      {error && <div className="auth-error">{error}</div>}
      
      {user ? (
        <div className="user-info-container">
          <div className="user-display">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                className="user-avatar"
              />
            )}
            <span className="user-name">{user.displayName || user.email}</span>
          </div>
          <button 
            onClick={handleSignOut}
            disabled={isLoading}
            className="auth-button signout-button"
          >
            {isLoading ? 'ログアウト中...' : 'ログアウト'}
          </button>
          <button
            onClick={async () => {
              if (!user) return;
              try {
                setIsSyncing(true);
                await syncWithFirebase(user.uid);
              } catch (err) {
                console.error('Sync error:', err);
                setError('同期に失敗しました');
              } finally {
                setIsSyncing(false);
              }
            }}
            disabled={isSyncing}
            className="auth-button signin-button"
            style={{ background: '#4caf50' }}
          >
            {isSyncing ? '同期中...' : '同期'}
          </button>
        </div>
      ) : (
        <button 
          onClick={handleSignIn}
          disabled={isLoading}
          className="auth-button signin-button"
        >
          {isLoading ? 'ログイン中...' : 'Googleでログイン'}
        </button>
      )}
    </div>
  );
}
