/**
 * Contract Error Parsing Utilities
 * Extracts error handling logic from useContracts for better organization
 */

import { ContractError, EthersError } from '../types';

/**
 * A real Error subclass carrying the parsed, user-friendly message plus the
 * structured `code`/`txHash`. Returning an actual Error (rather than a plain
 * `{ code, message }` object) is essential: callers and toasts gate on
 * `error instanceof Error`, so a plain object silently fell through to a generic
 * "Failed to execute trade" and the mapped message was never shown.
 */
export class ContractInteractionError extends Error implements ContractError {
  code: string;
  txHash?: string;

  constructor(code: string, message: string, txHash?: string) {
    super(message);
    this.name = 'ContractInteractionError';
    this.code = code;
    if (txHash) this.txHash = txHash;
  }
}

/**
 * Parse contract errors into user-friendly messages.
 * @param error - Error from contract interaction
 * @returns A ContractInteractionError (an Error subclass) with a mapped message.
 */
export function parseContractError(error: unknown): ContractInteractionError {
  // Type guard for EthersError
  const isEthersError = (err: unknown): err is EthersError => {
    return err instanceof Error;
  };

  if (!isEthersError(error)) {
    return new ContractInteractionError('CONTRACT_ERROR', 'An unknown error occurred');
  }

  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return new ContractInteractionError(
      'GAS_ESTIMATION_FAILED',
      'Unable to estimate gas. Transaction may fail.'
    );
  }

  if (error.code === 'INSUFFICIENT_FUNDS') {
    return new ContractInteractionError(
      'INSUFFICIENT_FUNDS',
      'Insufficient balance for transaction and gas fees.'
    );
  }

  if (error.message.includes('user rejected')) {
    return new ContractInteractionError('USER_REJECTED', 'Transaction was rejected by user.');
  }

  if (error.message.includes('nonce too low')) {
    return new ContractInteractionError('NONCE_ERROR', 'Transaction nonce error. Please try again.');
  }

  if (error.message.includes('slippage')) {
    return new ContractInteractionError(
      'SLIPPAGE_ERROR',
      'Transaction failed due to slippage. Try increasing slippage tolerance.'
    );
  }

  return new ContractInteractionError(
    'CONTRACT_ERROR',
    error.reason || error.message || 'Contract interaction failed',
    error.transactionHash
  );
}
