const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SCALE = 1_000n;

export function decimalToMilli(value: string): bigint {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new TypeError(`Invalid decimal value: ${value}`);
  }

  const negative = value.startsWith('-');
  const unsignedValue = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsignedValue.split('.');
  const milli = BigInt(whole) * SCALE + BigInt((fraction.slice(0, 3) + '000').slice(0, 3));
  return negative ? -milli : milli;
}

export function milliToDecimal(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE).toString().padStart(3, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function truncateToThousandths(value: string): string {
  return milliToDecimal(decimalToMilli(value));
}

export function associationMinimum(associationCoefficient: string): string {
  const coefficient = decimalToMilli(associationCoefficient);
  if (coefficient < 0n) {
    throw new RangeError('Association coefficients cannot be negative');
  }
  return milliToDecimal((coefficient * 20n) / 100n);
}

export function divideToThousandths(value: string, divisor: number): string {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new TypeError(`Invalid decimal value: ${value}`);
  }
  if (value.startsWith('-')) {
    throw new RangeError('Points cannot be negative');
  }
  if (!Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new RangeError('Divisor must be a positive safe integer');
  }
  const [whole, fraction = ''] = value.split('.');
  const numerator = BigInt(whole + fraction) * SCALE;
  const denominator = 10n ** BigInt(fraction.length) * BigInt(divisor);
  return milliToDecimal(numerator / denominator);
}
