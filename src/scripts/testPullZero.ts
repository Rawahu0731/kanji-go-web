import { pullGacha } from '../data/characters';

const TRIALS = Number(process.env.TRIALS) || 1000; // 1000回デフォルト
const PULLS = Number(process.env.PULLS) || 100; // 100連

let zeroCountTrials = 0;
let zeroCountPulls = 0;

const start = Date.now();
for (let t = 0; t < TRIALS; t++) {
  const results = pullGacha(PULLS);
  if (results.some(r => r.id === 'zero')) {
    zeroCountTrials++;
  }
  zeroCountPulls += results.filter(r => r.id === 'zero').length;
}
const duration = (Date.now() - start) / 1000;
console.log(`TRIALS=${TRIALS}, PULLS=${PULLS}, duration=${duration}s`);
console.log(`trials with zero: ${zeroCountTrials}`);
console.log(`total zero pulls: ${zeroCountPulls}`);
console.log(`zero per trial rate: ${(zeroCountTrials / TRIALS * 100).toFixed(4)}%`);
console.log(`zero per pull rate: ${(zeroCountPulls / (TRIALS * PULLS) * 100).toFixed(8)}%`);

if (zeroCountTrials === 0 && zeroCountPulls === 0) {
  console.log('OK: zero did not appear in any simulated pulls.');
} else {
  console.log('WARNING: zero appeared!');
}
