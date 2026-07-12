import { describe, it, expect } from 'vitest';
import { parseContractError, ContractInteractionError } from './contractErrors';

describe('parseContractError', () => {
  it('returns a real Error subclass so `instanceof Error` gates pass', () => {
    // This is the core regression: callers/toasts do `error instanceof Error`
    // before showing the message. A plain object silently fell through to a
    // generic "Failed to execute trade".
    const result = parseContractError(new Error('boom'));
    expect(result).toBeInstanceOf(Error);
    expect(result).toBeInstanceOf(ContractInteractionError);
    expect(result.name).toBe('ContractInteractionError');
  });

  it('maps user rejection to a friendly message', () => {
    const result = parseContractError(new Error('user rejected the request'));
    expect(result.code).toBe('USER_REJECTED');
    expect(result.message).toBe('Transaction was rejected by user.');
  });

  it('maps insufficient funds by error code', () => {
    const err = Object.assign(new Error('x'), { code: 'INSUFFICIENT_FUNDS' });
    const result = parseContractError(err);
    expect(result.code).toBe('INSUFFICIENT_FUNDS');
    expect(result.message).toContain('Insufficient balance');
  });

  it('maps gas estimation failures', () => {
    const err = Object.assign(new Error('x'), { code: 'UNPREDICTABLE_GAS_LIMIT' });
    const result = parseContractError(err);
    expect(result.code).toBe('GAS_ESTIMATION_FAILED');
  });

  it('maps nonce and slippage errors', () => {
    expect(parseContractError(new Error('nonce too low')).code).toBe('NONCE_ERROR');
    expect(parseContractError(new Error('slippage exceeded')).code).toBe('SLIPPAGE_ERROR');
  });

  it('preserves the contract revert reason and tx hash', () => {
    const err = Object.assign(new Error('execution reverted'), {
      reason: 'Deadline expired',
      transactionHash: '0xabc',
    });
    const result = parseContractError(err);
    expect(result.code).toBe('CONTRACT_ERROR');
    expect(result.message).toBe('Deadline expired');
    expect(result.txHash).toBe('0xabc');
  });

  it('handles non-Error inputs', () => {
    const result = parseContractError('just a string');
    expect(result).toBeInstanceOf(ContractInteractionError);
    expect(result.code).toBe('CONTRACT_ERROR');
    expect(result.message).toBe('An unknown error occurred');
  });

  it('is throwable and catchable as an Error', () => {
    try {
      throw parseContractError(new Error('user rejected'));
    } catch (e) {
      expect(e instanceof Error).toBe(true);
      expect((e as Error).message).toBe('Transaction was rejected by user.');
    }
  });
});
