import { type Item, type Level } from '../types/kanji';
import { parseCSVLine } from './kanjiUtils';

export async function loadKanjiData(selectedLevel: Level): Promise<Item[]> {
  // エクストラは指定期間のみ利用可能にする
  if (selectedLevel === 'extra') {
    const urlParams = new URLSearchParams(window.location.search);
    const debugDateStr = urlParams.get('debugDate');
    const now = debugDateStr ? new Date(debugDateStr) : new Date();

    const startDate = new Date('2026-01-13T00:00:00+09:00');
    const endDate = new Date('2026-01-26T23:59:59+09:00');

    if (now < startDate || now > endDate) {
      throw new Error('エクストラモードは現在利用できません');
    }
  }

  // レベル7, 8, extra以外は準備中
  if (selectedLevel !== 7 && selectedLevel !== 8 && selectedLevel !== 'extra') {
    throw new Error('準備中です');
  }

  // CSV を fetch
  const csvPath = selectedLevel === 'extra' 
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
  
  if (selectedLevel === 'extra') {
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
      const imageUrl = fname?.startsWith('/') ? fname : `/kanji/level-${selectedLevel}/${fname}`;
      
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
