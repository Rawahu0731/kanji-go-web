// simulate_fy_quiz.js
// Fisher-Yates の偏りを様々な配列長・条件で検証するスクリプト

function fisherShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function analyzeShuffle(len, trials) {
  const counts = Array.from({ length: len }, () => new Array(len).fill(0));
  const base = Array.from({ length: len }, (_, i) => i);

  for (let t = 0; t < trials; t++) {
    const s = fisherShuffle(base);
    for (let pos = 0; pos < len; pos++) {
      counts[pos][s[pos]]++;
    }
  }

  console.log(`\n=== Shuffle distribution len=${len}, trials=${trials} ===`);
  const ideal = 100 / len;
  let totalAbsDiff = 0;
  for (let pos = 0; pos < len; pos++) {
    const row = counts[pos];
    const pct = row.map(v => (v / trials * 100).toFixed(3) + '%');
    console.log(`pos ${pos}: ${pct.join('  ')}`);
    for (let item = 0; item < len; item++) {
      totalAbsDiff += Math.abs((counts[pos][item] / trials * 100) - ideal);
    }
  }
  const avgAbsDiff = totalAbsDiff / (len * len);
  console.log(`avg abs diff per cell vs ideal ${ideal}%: ${avgAbsDiff.toFixed(4)}%`);
}

function analyzeChoiceGeneration(poolSize, trials) {
  // pool: items excluding correct one; we simulate selecting 3 wrong choices by shuffling others and slicing
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  const wrongSlotCounts = [new Map(), new Map(), new Map()]; // maps item -> count for slot 0..2
  const correctPosCounts = [0,0,0,0];

  for (let t = 0; t < trials; t++) {
    // pick a random correct index in [0,poolSize-1]
    const correctItem = Math.floor(Math.random() * poolSize);
    const others = pool.filter(x => x !== correctItem);
    const shuffledOthers = fisherShuffle(others);
    const wrongs = shuffledOthers.slice(0,3);
    const correctPos = Math.floor(Math.random() * 4); // 0..3

    correctPosCounts[correctPos]++;
    for (let i = 0; i < 3; i++) {
      const m = wrongSlotCounts[i];
      m.set(wrongs[i], (m.get(wrongs[i]) || 0) + 1);
    }
  }

  console.log(`\n=== Choice generation pool=${poolSize}, trials=${trials} ===`);
  console.log('Correct position distribution (should be ~uniform 25%):');
  for (let i = 0; i < 4; i++) {
    console.log(`pos ${i}: ${(correctPosCounts[i] / trials * 100).toFixed(3)}%`);
  }

  // For wrong slots, show a few sample items' frequencies (first 6 items)
  for (let slot = 0; slot < 3; slot++) {
    const m = wrongSlotCounts[slot];
    console.log(`\nWrong slot ${slot} sample distribution (first 8 items):`);
    for (let item = 0; item < Math.min(8, poolSize); item++) {
      console.log(` item ${item}: ${((m.get(item) || 0) / trials * 100).toFixed(4)}%`);
    }
    // compute avg abs diff vs ideal among all poolSize items
    let totalAbs = 0;
    const ideal = 100 / poolSize;
    for (let item = 0; item < poolSize; item++) {
      totalAbs += Math.abs(((wrongSlotCounts[slot].get(item) || 0) / trials * 100) - ideal);
    }
    console.log(` avg abs diff per item vs ideal ${ideal}%: ${(totalAbs / poolSize).toFixed(6)}%`);
  }
}

function main() {
  // Shuffle checks for multiple lengths
  analyzeShuffle(4, 200000);
  analyzeShuffle(10, 100000);
  analyzeShuffle(50, 50000);
  analyzeShuffle(200, 20000);

  // Choice generation check
  analyzeChoiceGeneration(50, 200000);
}

main();
