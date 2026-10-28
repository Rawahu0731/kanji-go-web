import { type Item, type Level } from '../types/kanji';
import { parseCSVLine } from './kanjiUtils';

function encodeImageUrl(path: string): string {
  // パス全体ではなく各セグメントをエンコードする。カンマや空白を含む
  // ファイル名を静的ホスティング側で正しく解決するため、スラッシュは残す。
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

function resolveImagePath(filename: string, selectedLevel: Exclude<Level, 'extra'>): string {
  if (filename.startsWith('/')) {
    return filename;
  }

  // スクレイパーのCSVはpublicからの相対パスを保存するため、
  // `kanji/level-8/images/...` はそのままサイトルートから解決する。
  if (filename.startsWith('kanji/')) {
    return `/${filename}`;
  }

  return `/kanji/level-${selectedLevel}/${filename}`;
}

export async function loadKanjiData(selectedLevel: Level): Promise<Item[]> {
  const isExtra = selectedLevel === 'extra';

  // エクストラは指定期間のみ利用可能にする
  if (isExtra) {
    const urlParams = new URLSearchParams(window.location.search);
    const debugDateStr = urlParams.get('debugDate');
    const now = debugDateStr ? new Date(debugDateStr) : new Date();

    const startDate = new Date('2026-01-13T00:00:00+09:00');
    const endDate = new Date('2026-01-26T23:59:59+09:00');

    if (now < startDate || now > endDate) {
      throw new Error('エクストラモードは現在利用できません');
    }
  }

  // レベル1〜8以外は無効
  if (!isExtra && (selectedLevel < 1 || selectedLevel > 8)) {
    throw new Error('準備中です');
  }

  // CSV を fetch
  const csvPath = isExtra
    ? `/kanji/extra/mappings.csv`
    : `/kanji/level-${selectedLevel}/mappings.csv`;
  const res = await fetch(csvPath);
  if (!res.ok) {
    throw new Error(`CSV取得失敗: ${res.status}`);
  }
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  
  // ヘッダー行を解析
  const headerLine = lines.shift() || '';
  const header = parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
  
  const data = lines.map(line => {
    const cols = parseCSVLine(line);
    const obj: any = {};
    for (let i = 0; i < cols.length; i++) {
      obj[header[i] || `col${i}`] = cols[i].trim();
    }
    return obj;
  });

  let mapped: Item[];
  
  if (isExtra) {
    mapped = data.map(d => {
      const hasAnswer2 = (d.answer2 || '').trim() !== '';
      if (hasAnswer2) {
        // 誤字訂正問題: sentence に誤字が含まれており、answer に誤字、answer2 に正しい字が入る
        return {
          filename: '',
          reading: '',
          meaning: '',
          imageUrl: '',
          sentence: d.sentence || '',
          answer: d.answer || '', // 誤字（文章中に出ている文字）
          answer2: d.answer2 || '', // 正しい字
          questionType: 'correction'
        } as Item;
      }

      // 読み問題（answer2 が空）: sentence に語（または単語）が入り、answer は読み
      return {
        filename: '',
        reading: d.answer || '',
        meaning: '',
        imageUrl: '',
        sentence: d.sentence || '',
        answer: d.answer || '',
        questionType: 'reading'
      } as Item;
    });
  } else {
    const filenameField = header.includes('path') ? 'path' : (header.includes('filename') ? 'filename' : header[0]);
    const kanjiField = header.includes('kanji') ? 'kanji' : null;

    mapped = data.map(d => {
      const fname = d[filenameField];
      const kanjiChar = kanjiField ? d[kanjiField] : null;
      const imagePath = fname ? resolveImagePath(fname, selectedLevel) : '';
      const imageUrl = imagePath ? encodeImageUrl(imagePath) : '';
      
      return {
        filename: fname || kanjiChar || '',
        reading: d.reading || d['reading'] || '',
        meaning: d.meaning,
        imageUrl,
        kanji: kanjiChar || null,
        additionalInfo: d.additional_info || d['additional_info'] || '',
        components: d.components || d['components'] || '',
      } as Item;
    });
  }
  
  return mapped;
}
