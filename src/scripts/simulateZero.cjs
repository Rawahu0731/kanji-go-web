const fs = require('fs');
const vm = require('vm');

const file = fs.readFileSync(require('path').resolve(__dirname, '../data/characters.ts'), 'utf8');
const marker = 'export const CHARACTERS';
const idx = file.indexOf(marker);
if (idx === -1) {
  console.error('CHARACTERS marker not found');
  process.exit(1);
}
// find the first '{' after the equals
const eqIdx = file.indexOf('=', idx);
const startBrace = file.indexOf('{', eqIdx);
if (startBrace === -1) {
  console.error('start brace not found');
  process.exit(1);
}
let pos = startBrace;
let depth = 0;
let endBrace = -1;
for (; pos < file.length; pos++) {
  const ch = file[pos];
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { endBrace = pos; break; }
  }
}
if (endBrace === -1) {
  console.error('end brace not found');
  process.exit(1);
}
const objectLiteral = file.slice(startBrace, endBrace + 1);
// Build runnable JS that exports the object. Remove TypeScript-only constructs if any
const wrapped = 'const CHARACTERS = ' + objectLiteral + '; CHARACTERS;';
let CHARACTERS;
try {
  CHARACTERS = vm.runInNewContext(wrapped, {}, {timeout: 1000});
} catch (e) {
  console.error('Failed to evaluate CHARACTERS literal:', e);
  process.exit(1);
}

// Also extract GACHA_RATES and RARITY_ORDER and RARITY_ORDER mapping from file by simple regex
const ratesMatch = file.match(/export const GACHA_RATES = \{([\s\S]*?)\};/m);
let GACHA_RATES = { common: 60, rare: 30, epic: 9, legendary: 0.9, mythic: 0.09, ultra: 0.01 };
if (ratesMatch) {
  try {
    GACHA_RATES = vm.runInNewContext('(' + '{' + ratesMatch[1] + '}' + ')');
  } catch (e) {}
}
// RARITY_ORDER
const rarityMatch = file.match(/export const RARITY_ORDER[\s\S]*?=\s*\{([\s\S]*?)\};/m);
let RARITY_ORDER = { common:1, rare:2, epic:3, legendary:4, mythic:5, ultra:6, origin:7 };
if (rarityMatch) {
  try {
    RARITY_ORDER = vm.runInNewContext('(' + '{' + rarityMatch[1] + '}' + ')');
  } catch (e) {}
}

// helper from source: isCharacterUnlocked (uses unlockDate)
const isCharacterUnlocked = (character) => {
  if (!character.unlockDate) return true;
  const unlockDate = new Date(character.unlockDate);
  const today = new Date();
  today.setHours(0,0,0,0);
  return today >= unlockDate;
};

const getCharactersByRarity = (rarity, characterPool = CHARACTERS) => {
  return Object.values(characterPool).filter(char => char.rarity === rarity && isCharacterUnlocked(char) && char.id !== 'zero');
};

const getAvailableCharacters = () => {
  const available = {};
  for (const [id, char] of Object.entries(CHARACTERS)) {
    if (id === 'zero') continue;
    if (isCharacterUnlocked(char)) available[id] = char;
  }
  return available;
};

const pullGacha = (count = 1, guaranteedRarity, characterPool) => {
  const availablePool = characterPool || getAvailableCharacters();
  const results = [];
  if (Object.keys(availablePool).length === 0) return results;
  const rateValues = Object.values(GACHA_RATES).reduce((a,b)=>a+b,0);

  for (let i=0;i<count;i++){
    let totalRate = Object.values(GACHA_RATES).reduce((a,b)=>a+b,0);
    let random = Math.random() * totalRate;
    let selectedRarity = 'common';
    for (const [rarity, rate] of Object.entries(GACHA_RATES)){
      random -= rate;
      if (random <= 0) { selectedRarity = rarity; break; }
    }
    const charactersOfRarity = getCharactersByRarity(selectedRarity, availablePool);
    if (charactersOfRarity.length === 0){
      const allAvailable = Object.values(availablePool).filter(char => isCharacterUnlocked(char) && char.id !== 'zero');
      if (allAvailable.length === 0) continue;
      const randomChar = allAvailable[Math.floor(Math.random()*allAvailable.length)];
      results.push(randomChar);
    } else {
      const randomChar = charactersOfRarity[Math.floor(Math.random()*charactersOfRarity.length)];
      results.push(randomChar);
    }
  }

  if (guaranteedRarity && count > 0) {
    const hasGuaranteed = results.some(char => RARITY_ORDER[char.rarity] >= RARITY_ORDER[guaranteedRarity]);
    if (!hasGuaranteed) {
      const guaranteedChars = Object.values(availablePool).filter(char => RARITY_ORDER[char.rarity] >= RARITY_ORDER[guaranteedRarity] && isCharacterUnlocked(char) && char.id !== 'zero');
      if (guaranteedChars.length > 0) {
        const guaranteedChar = guaranteedChars[Math.floor(Math.random()*guaranteedChars.length)];
        results[results.length - 1] = guaranteedChar;
      }
    }
  }

  return results;
};

// Simulation
const TRIALS = Number(process.env.TRIALS) || 1000;
const PULLS = Number(process.env.PULLS) || 100;
let zeroCountTrials = 0;
let zeroCountPulls = 0;

const start = Date.now();
for (let t=0;t<TRIALS;t++){
  const res = pullGacha(PULLS);
  if (res.some(r=>r.id==='zero')) zeroCountTrials++;
  zeroCountPulls += res.filter(r=>r.id==='zero').length;
}
const duration = (Date.now()-start)/1000;
console.log(`TRIALS=${TRIALS}, PULLS=${PULLS}, duration=${duration}s`);
console.log(`trials with zero: ${zeroCountTrials}`);
console.log(`total zero pulls: ${zeroCountPulls}`);
console.log(`zero per trial rate: ${(zeroCountTrials/TRIALS*100).toFixed(6)}%`);
console.log(`zero per pull rate: ${(zeroCountPulls/(TRIALS*PULLS)*100).toFixed(8)}%`);
if (zeroCountTrials===0 && zeroCountPulls===0) console.log('OK: zero did not appear'); else console.log('WARNING: zero appeared');
