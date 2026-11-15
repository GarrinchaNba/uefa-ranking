import { describe, expect, it } from 'vitest';
import {
  associationMinimum,
  decimalToMilli,
  divideToThousandths,
  milliToDecimal,
  truncateToThousandths,
} from '../src/domain/decimal.js';

describe('decimal arithmetic', () => {
  it('converts and formats decimals without binary floating-point', () => {
    expect(decimalToMilli('12.375')).toBe(12_375n);
    expect(milliToDecimal(-12_375n)).toBe('-12.375');
    expect(milliToDecimal(12_000n)).toBe('12');
  });

  it('truncates to thousandths without rounding up', () => {
    expect(truncateToThousandths('1.2349')).toBe('1.234');
    expect(truncateToThousandths('0.0099')).toBe('0.009');
    expect(truncateToThousandths('0.0009')).toBe('0');
  });

  it('calculates the association floor at thousandth precision', () => {
    expect(associationMinimum('10.001')).toBe('2');
    expect(associationMinimum('10.004')).toBe('2');
    expect(associationMinimum('9.999')).toBe('1.999');
  });

  it('rejects malformed or negative association coefficients', () => {
    expect(() => decimalToMilli('01.2')).toThrow(TypeError);
    expect(() => associationMinimum('-1')).toThrow(RangeError);
  });

  it('divides exact decimal values before truncating to thousandths', () => {
    expect(divideToThousandths('10', 3)).toBe('3.333');
    expect(divideToThousandths('1.9999', 2)).toBe('0.999');
    expect(divideToThousandths('0.005999', 2)).toBe('0.002');
    expect(divideToThousandths('99999999999999999999', 3)).toBe('33333333333333333333');
    expect(() => divideToThousandths('10', 0)).toThrow(RangeError);
    expect(() => divideToThousandths('-1', 2)).toThrow(RangeError);
    expect(() => divideToThousandths('1', 1.5)).toThrow(RangeError);
    expect(() => divideToThousandths('NaN', 1)).toThrow(TypeError);
  });
});
