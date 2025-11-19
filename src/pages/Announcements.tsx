import { useState, useEffect } from 'react';
import { getPatchNotes } from '../lib/microcms';
import type { Article } from '../lib/microcms';
import '../styles/Announcements.css';

function Announcements() {
  const [announcements, setAnnouncements] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        setLoading(true);
        const data = await getPatchNotes();
        setAnnouncements(data);
      } catch (err) {
        console.error('お知らせの取得に失敗しました:', err);
        setError('お知らせを読み込めませんでした');
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className="announcements-container">
        <h1>📢 お知らせ</h1>
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="announcements-container">
        <h1>📢 お知らせ</h1>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="announcements-container">
      <h1>📢 お知らせ</h1>
      
      {announcements.length === 0 ? (
        <div className="no-announcements">
          現在お知らせはありません
        </div>
      ) : (
        <div className="announcements-list">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-card">
              <div className="announcement-header">
                <h2 className="announcement-title">{announcement.title}</h2>
                <span className="announcement-date">
                  {new Date(announcement.date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div 
                className="announcement-body"
                dangerouslySetInnerHTML={{ __html: announcement.body }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Announcements;
