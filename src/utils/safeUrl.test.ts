import { describe, it, expect } from 'vitest';
import { safeUrl } from './safeUrl';

describe('safeUrl', () => {
  it('allows http and https URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com/');
    expect(safeUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('upgrades a bare host to https', () => {
    expect(safeUrl('example.com')).toBe('https://example.com');
    expect(safeUrl('t.me/foo')).toBe('https://t.me/foo');
  });

  it('blocks javascript: and other script-bearing schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('JavaScript:alert(1)')).toBeUndefined();
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeUrl('vbscript:msgbox(1)')).toBeUndefined();
    expect(safeUrl(' javascript:alert(1) ')).toBeUndefined();
  });

  it('returns undefined for empty/nullish input', () => {
    expect(safeUrl('')).toBeUndefined();
    expect(safeUrl('   ')).toBeUndefined();
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
  });
});
