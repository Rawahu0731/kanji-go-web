// microCMS 接続テストスクリプト
import 'dotenv/config';

const serviceId = process.env.VITE_MICROCMS_SERVICE_ID;
const apiKey = process.env.VITE_MICROCMS_API_KEY;

console.log('🔍 microCMS 接続テスト\n');
console.log('サービスID:', serviceId);
console.log('APIキー:', apiKey ? `${apiKey.substring(0, 8)}...` : '未設定');
console.log('');

if (!serviceId || !apiKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const url = `https://${serviceId}.microcms.io/api/v1/articles`;

console.log('📡 リクエスト送信:');
console.log('  URL:', url);
console.log('  フィルタ: type[equals]bug');
console.log('');

// 複数のフィルタパターンを試す
const filterPatterns = [
  { name: 'type[equals]bug', value: 'type[equals]bug' },
  { name: 'type[contains]bug', value: 'type[contains]bug' },
  { name: 'type:bug', value: 'type:bug' },
];

for (const pattern of filterPatterns) {
  console.log(`\n🔍 フィルタパターン: ${pattern.name}`);
  
  try {
    const response = await fetch(url + `?filters=${encodeURIComponent(pattern.value)}&limit=100`, {
      headers: {
        'X-MICROCMS-API-KEY': apiKey,
      },
    });

    console.log('  ステータス:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  取得件数:', data.contents.length);
      
      if (data.contents.length > 0) {
        console.log('  ✅ このパターンで取得できました！');
        data.contents.forEach((item) => {
          console.log(`    - ${item.title} (type: ${item.type})`);
        });
      }
    }
  } catch (error) {
    console.log('  ❌ エラー:', error.message);
  }
}

console.log('\n---\n');

try {
  const response = await fetch(url + '?filters=type[equals]bug&limit=100', {
    headers: {
      'X-MICROCMS-API-KEY': apiKey,
    },
  });

  console.log('📊 レスポンス:');
  console.log('  ステータス:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ エラー:', errorText);
    process.exit(1);
  }

  const data = await response.json();
  console.log('  総件数:', data.totalCount);
  console.log('  取得件数:', data.contents.length);
  console.log('');

  if (data.contents.length > 0) {
    console.log('✅ コンテンツが見つかりました:');
    data.contents.forEach((item, index) => {
      console.log(`\n  [${index + 1}] ${item.title}`);
      console.log(`      ID: ${item.id}`);
      console.log(`      type: ${item.type}`);
      console.log(`      日付: ${item.date}`);
    });
  } else {
    console.log('⚠️  コンテンツが0件です');
    console.log('');
    console.log('📝 確認事項:');
    console.log('  1. microCMS で articles API が作成されているか');
    console.log('  2. コンテンツが「公開」されているか（下書きではない）');
    console.log('  3. type フィールドが "bug" に設定されているか');
    console.log('');
    console.log('🔍 全コンテンツを取得してみます...');
    
    // フィルタなしで全取得
    const allResponse = await fetch(url + '?limit=100', {
      headers: {
        'X-MICROCMS-API-KEY': apiKey,
      },
    });
    
    if (allResponse.ok) {
      const allData = await allResponse.json();
      console.log(`  全コンテンツ: ${allData.totalCount}件`);
      
      if (allData.contents.length > 0) {
        console.log('\n  登録されているコンテンツ:');
        allData.contents.forEach((item, index) => {
          console.log(`\n    [${index + 1}] ${item.title}`);
          console.log(`        type: ${item.type || '未設定'}`);
          console.log(`        status: ${item.status || '未設定'}`);
          console.log(`        日付: ${item.date || '未設定'}`);
          console.log(`        全フィールド:`, JSON.stringify(item, null, 2));
        });
      }
    }
  }

  console.log('\n✅ テスト完了');
} catch (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}
