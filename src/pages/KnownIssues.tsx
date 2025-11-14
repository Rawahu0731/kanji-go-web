import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getKnownIssues } from '../lib/microcms';
import type { Article, BugStatus } from '../lib/microcms';
import '../App.css';

// ステータス表示用のヘルパー関数
function getStatusLabel(status?: BugStatus | BugStatus[]): { text: string; color: string; bgColor: string } {
  // 配列の場合は最初の要素を取得
  const actualStatus = Array.isArray(status) ? status[0] : status;
  
  switch (actualStatus) {
    case 'investigating':
      return { text: '🔍 調査中', color: '#856404', bgColor: '#fff3cd' };
    case 'fixed':
      return { text: '✅ 修正済み', color: '#155724', bgColor: '#d4edda' };
    case 'wontfix':
      return { text: '⚪ 対応なし', color: '#6c757d', bgColor: '#e9ecef' };
    default:
      return { text: '❓ 未設定', color: '#666', bgColor: '#e9ecef' };
  }
}

export default function KnownIssues() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getKnownIssues();
        setArticles(data);
      } catch (err) {
        console.error('不具合情報の取得に失敗しました:', err);
        const errorMessage = err instanceof Error 
            ? err.message 
            : '不具合情報の取得に失敗しました。microCMS の設定を確認してください。';
        setError(errorMessage);
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
            既知の不具合
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
            既知の不具合
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
          既知の不具合
        </h1>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          現在確認されている不具合の一覧です。修正され次第、パッチノートでお知らせします。
        </p>

        {articles.length === 0 ? (
          <p style={{ color: '#28a745', fontWeight: 'bold' }}>
            ✅ 現在、既知の不具合はありません。
          </p>
        ) : (
          articles.map((article) => {
            const statusInfo = getStatusLabel(article.status);
            const isExpanded = expandedIds.has(article.id);
            
            return (
              <section 
                key={article.id}
                style={{
                  marginBottom: '1rem',
                  paddingBottom: '0.6rem',
                  borderBottom: '1px solid #f0f0f4'
                }}
              >
                <div 
                  onClick={() => toggleExpanded(article.id)}
                  style={{ 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.8rem', 
                    marginTop: '1.2rem'
                  }}>
                    <span style={{ fontSize: '1.2rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      ▶
                    </span>
                    <h2 style={{ fontSize: '1.15rem', margin: 0, color: '#dc3545' }}>
                      🐛 {article.title}
                    </h2>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.3rem 0.8rem',
                      background: statusInfo.bgColor,
                      color: statusInfo.color,
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      border: `1px solid ${statusInfo.color}33`,
                      whiteSpace: 'nowrap'
                    }}>
                      {statusInfo.text}
                    </span>
                  </div>
                  <time 
                    style={{ 
                      color: '#6b6f85', 
                      fontSize: '0.95rem',
                      display: 'block',
                      marginTop: '0.3rem',
                      marginLeft: '2rem',
                      textAlign: 'left'
                    }}
                  >
                    報告日: {new Date(article.date).toLocaleDateString('ja-JP')}
                  </time>
                </div>
                {isExpanded && (
                  <>
                    <div 
                      className="known-issues-content"
                      style={{ 
                        marginTop: '0.8rem', 
                        marginLeft: '2rem',
                        color: '#333',
                        textAlign: 'left'
                      }}
                      dangerouslySetInnerHTML={{ __html: article.body }}
                    />
                    {article.tags && article.tags.length > 0 && (
                      <div style={{ marginTop: '0.6rem', marginLeft: '2rem' }}>
                        {article.tags.map((tag, idx) => (
                          <span 
                            key={idx}
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              marginRight: '0.4rem',
                              background: '#fee',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              color: '#c00'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })
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
