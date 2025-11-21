// simulate_shuffle.js
// Compare bias of sort(() => Math.random() - 0.5) vs Fisher-Yates
const N = 200000; // 試行回数
const LEN = 4;

function sortShuffle(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function fisherShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function test(method, name) {
  const posCounts = Array.from({ length: LEN }, () => Array(LEN).fill(0));
  const arr = Array.from({ length: LEN }, (_, i) => i);

  for (let t = 0; t < N; t++) {
    const s = method(arr);
    for (let pos = 0; pos < LEN; pos++) {
      posCounts[pos][s[pos]]++;
    }
  }

  console.log(`\n=== ${name} (N=${N}) ===`);
  for (let pos = 0; pos < LEN; pos++) {
    const row = posCounts[pos];
    const pct = row.map(v => (v / N * 100).toFixed(3) + '%');
    console.log(`pos ${pos}: ${pct.join('  ')}`);
  }

  // 出力平均偏差 (各セル vs 理想値)
  const ideal = 100 / LEN; // 25%
  let totalAbsDiff = 0;
  for (let pos = 0; pos < LEN; pos++) {
    for (let item = 0; item < LEN; item++) {
      const val = posCounts[pos][item] / N * 100;
      totalAbsDiff += Math.abs(val - ideal);
    }
  }
  const avgAbsDiff = totalAbsDiff / (LEN * LEN);
  console.log(`avg abs diff per cell vs ideal ${ideal}%: ${avgAbsDiff.toFixed(4)}%`);
}

// 実行
(function main(){
  test(sortShuffle, 'sort(() => Math.random()-0.5)');
  test(fisherShuffle, 'Fisher-Yates');
})();
