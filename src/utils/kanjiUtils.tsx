// CSV行をパースする関数（ダブルクォートで囲まれたカンマに対応）
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// 読み方から送り仮名を抽出し、表示用にフォーマット
export function formatReadingWithOkurigana(reading: string) {
  const parts = [];
  let lastIndex = 0;
  const regex = /'([^']+)'/g;
  let match;
  let key = 0;

  while ((match = regex.exec(reading)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{reading.substring(lastIndex, match.index)}</span>
      );
    }
    parts.push(
      <span key={key++} style={{ color: '#ff6b6b' }}>{match[1]}</span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < reading.length) {
    parts.push(
      <span key={key++}>{reading.substring(lastIndex)}</span>
    );
  }

  return <>{parts}</>;
}

// 読み方から送り仮名を除外した本体部分を取得
export function extractReadingCore(reading: string): string {
  return reading.replace(/'[^']*'/g, '');
}

// 読み方からクォート（送り仮名のマーク）を取り除き、送り仮名を保持したままの文字列を返す
export function readingWithoutQuotes(reading: string): string {
  return reading.replace(/'/g, '');
}
