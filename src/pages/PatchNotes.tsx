import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPatchNotes } from '../lib/microcms';
import type { Article } from '../lib/microcms';
import '../App.css';

export default function PatchNotes() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setDebugInfo('データ取得開始...');
        const data = await getPatchNotes();
        setDebugInfo(`取得成功: ${data.length}件のパッチノートを取得しました`);
        setArticles(data);
      } catch (err) {
        console.error('パッチノートの取得に失敗しました:', err);
        const errorMessage = err instanceof Error 
            ? err.message 
            : 'パッチノートの取得に失敗しました。microCMS の設定を確認してください。';
        setError(errorMessage);
        setDebugInfo(`エラー: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        background: '#fff',
        color: '#222',
        margin: 0,
        padding: '2rem',
        minHeight: '100vh'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#4756e6' }}>
            アップデート履歴（パッチノート）
          </h1>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        background: '#fff',
        color: '#222',
        margin: 0,
        padding: '2rem',
        minHeight: '100vh'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#4756e6' }}>
            アップデート履歴（パッチノート）
          </h1>
          <div style={{ 
            padding: '1rem', 
            background: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: 0, color: '#856404' }}>⚠️ {error}</p>
          </div>
          <Link 
            to="/"
            style={{
              display: 'inline-block',
              marginTop: '1.6rem',
              padding: '0.6rem 1rem',
              background: '#fff',
              border: '1px solid #eef0f6',
              borderRadius: '8px',
              boxShadow: '0 6px 16px rgba(30,30,60,0.04)',
              textDecoration: 'none',
              color: '#222'
            }}
          >
            ← サイトに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      background: '#fff',
      color: '#222',
      margin: 0,
      padding: '2rem',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#4756e6' }}>
          アップデート履歴（パッチノート）
        </h1>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          このページではサイトの主要な更新内容を時系列で記録しています。
        </p>

        {/* デバッグ情報 */}
        {debugInfo && (
          <div style={{ 
            padding: '1rem', 
            background: '#e3f2fd', 
            border: '1px solid #2196f3',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            <strong>📊 デバッグ情報:</strong> {debugInfo}
          </div>
        )}

        {articles.length === 0 ? (
          <p>パッチノートがまだ登録されていません。</p>
        ) : (
          articles.map((article) => (
            <section 
              key={article.id}
              style={{
                marginBottom: '1rem',
                paddingBottom: '0.6rem',
                borderBottom: '1px solid #f0f0f4'
              }}
            >
              <h2 style={{ fontSize: '1.15rem', marginTop: '1.2rem', color: '#222' }}>
                {article.title}
              </h2>
              <time style={{ color: '#6b6f85', fontSize: '0.95rem' }}>
                公開日: {new Date(article.date).toLocaleDateString('ja-JP')}
              </time>
              <div 
                style={{ marginTop: '0.8rem', color: '#333' }}
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
              {article.tags && article.tags.length > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  {article.tags.map((tag, idx) => (
                    <span 
                      key={idx}
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        marginRight: '0.4rem',
                        background: '#eef0f6',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        color: '#666'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>
          ))
        )}

        <Link 
          to="/"
          style={{
            display: 'inline-block',
            marginTop: '1.6rem',
            padding: '0.6rem 1rem',
            background: '#fff',
            border: '1px solid #eef0f6',
            borderRadius: '8px',
            boxShadow: '0 6px 16px rgba(30,30,60,0.04)',
            textDecoration: 'none',
            color: '#222'
          }}
        >
          ← サイトに戻る
        </Link>
      </div>
    </div>
  );
}
