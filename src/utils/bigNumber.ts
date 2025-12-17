/**
 * 大きな数値を仮数と指数で管理するシステム
 * mantissa * 10^exponent で値を表現
 * mantissa は常に 1.0 <= mantissa < 10.0 の範囲に正規化
 */
export interface BigNumber {
  mantissa: number;
  exponent: number;
}

// 正規化: mantissa を 1.0 以上 10.0 未満に調整
function normalize(bn: BigNumber): BigNumber {
  if (bn.mantissa === 0) {
    return { mantissa: 0, exponent: 0 };
  }

  let { mantissa, exponent } = bn;

  // mantissaが大きすぎる場合
  while (Math.abs(mantissa) >= 10) {
    mantissa /= 10;
    exponent++;
  }

  // mantissaが小さすぎる場合
  while (Math.abs(mantissa) < 1 && mantissa !== 0) {
    mantissa *= 10;
    exponent--;
  }

  return { mantissa, exponent };
}

// 通常の数値からBigNumberへ変換
export function fromNumber(n: number): BigNumber {
  if (!isFinite(n) || n === 0) {
    return { mantissa: 0, exponent: 0 };
  }

  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const exponent = Math.floor(Math.log10(abs));
  const mantissa = sign * (abs / Math.pow(10, exponent));

  return normalize({ mantissa, exponent });
}

// BigNumberから通常の数値へ変換（範囲外の場合はInfinityなど）
export function toNumber(bn: BigNumber): number {
  if (bn.mantissa === 0) return 0;
  
  // 指数が大きすぎる場合
  if (bn.exponent > 308) return bn.mantissa > 0 ? Infinity : -Infinity;
  if (bn.exponent < -308) return 0;

  return bn.mantissa * Math.pow(10, bn.exponent);
}

// BigNumberの加算
export function add(a: BigNumber, b: BigNumber): BigNumber {
  if (a.mantissa === 0) return b;
  if (b.mantissa === 0) return a;

  // 指数を揃える
  const expDiff = a.exponent - b.exponent;

  let mantissaSum: number;
  let resultExponent: number;

  // JavaScriptのnumber精度限界（約15桁）を考慮しつつ、より広い範囲で加算
  // 閾値を15→25に変更（レベル10000超えでも150XPが加算されるように）
  if (Math.abs(expDiff) > 25) {
    // 差が大きすぎる場合は大きい方をそのまま返す
    return expDiff > 0 ? a : b;
  }

  if (expDiff >= 0) {
    mantissaSum = a.mantissa + b.mantissa * Math.pow(10, -expDiff);
    resultExponent = a.exponent;
  } else {
    mantissaSum = a.mantissa * Math.pow(10, expDiff) + b.mantissa;
    resultExponent = b.exponent;
  }

  return normalize({ mantissa: mantissaSum, exponent: resultExponent });
}

// BigNumberの減算
export function subtract(a: BigNumber, b: BigNumber): BigNumber {
  return add(a, { mantissa: -b.mantissa, exponent: b.exponent });
}

// BigNumberの乗算
export function multiply(a: BigNumber, b: BigNumber | number): BigNumber {
  // bが数値の場合はBigNumberに変換
  const bNum = typeof b === 'number' ? fromNumber(b) : b;
  
  if (a.mantissa === 0 || bNum.mantissa === 0) {
    return { mantissa: 0, exponent: 0 };
  }

  const mantissa = a.mantissa * bNum.mantissa;
  const exponent = a.exponent + bNum.exponent;

  return normalize({ mantissa, exponent });
}

// BigNumberの除算
export function divide(a: BigNumber, b: BigNumber | number): BigNumber {
  // bが数値の場合はBigNumberに変換
  const bNum = typeof b === 'number' ? fromNumber(b) : b;
  
  if (bNum.mantissa === 0) {
    throw new Error('Division by zero');
  }
  
  if (a.mantissa === 0) {
    return { mantissa: 0, exponent: 0 };
  }

  const mantissa = a.mantissa / bNum.mantissa;
  const exponent = a.exponent - bNum.exponent;

  return normalize({ mantissa, exponent });
}

// BigNumberの比較（a > b なら正、a < b なら負、a === b なら0）
export function compare(a: BigNumber, b: BigNumber): number {
  if (a.mantissa === 0 && b.mantissa === 0) return 0;
  if (a.mantissa === 0) return b.mantissa > 0 ? -1 : 1;
  if (b.mantissa === 0) return a.mantissa > 0 ? 1 : -1;

  // 符号が異なる場合
  if (a.mantissa > 0 && b.mantissa < 0) return 1;
  if (a.mantissa < 0 && b.mantissa > 0) return -1;

  // 同符号の場合、指数を比較
  if (a.exponent !== b.exponent) {
    const sign = a.mantissa > 0 ? 1 : -1;
    return sign * (a.exponent - b.exponent);
  }

  // 指数が同じ場合、仮数を比較
  return a.mantissa - b.mantissa;
}

// BigNumberを文字列に変換（表示用）
export function toString(bn: BigNumber, decimals: number = 2): string {
  if (bn.mantissa === 0) return '0';

  const num = toNumber(bn);
  
  // 通常の範囲内なら普通の数値として表示
  if (Math.abs(num) < 1e6 && isFinite(num)) {
    return num.toLocaleString('ja-JP', { maximumFractionDigits: 0 });
  }

  // 大きい場合は指数表記
  return `${bn.mantissa.toFixed(decimals)}e${bn.exponent}`;
}

// BigNumber >= number の判定
export function greaterThanOrEqual(bn: BigNumber, n: number): boolean {
  return compare(bn, fromNumber(n)) >= 0;
}

// BigNumber < number の判定
export function lessThan(bn: BigNumber, n: number): boolean {
  return compare(bn, fromNumber(n)) < 0;
}

// 既存のnumber | BigNumber を BigNumber に統一
export function ensureBigNumber(value: number | BigNumber): BigNumber {
  if (typeof value === 'number') {
    return fromNumber(value);
  }
  return value;
}
