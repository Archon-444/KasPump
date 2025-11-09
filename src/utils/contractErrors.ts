/**
 * Contract Error Parsing Utilities
 * Extracts error handling logic from useContracts for better organization
 */

import { ContractError, EthersError } from '../types';

/**
 * Parse contract errors into user-friendly messages
 * @param error - Error from contract interaction
 * @returns Structured contract error
 */
export function parseContractError(error: unknown): ContractError {
  // Type guard for EthersError
  const isEthersError = (err: unknown): err is EthersError => {
    return err instanceof Error;
  };

  if (!isEthersError(error)) {
    return {
      code: 'CONTRACT_ERROR',
      message: 'An unknown error occurred',
    };
  }

  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return {
      code: 'GAS_ESTIMATION_FAILED',
      message: 'Unable to estimate gas. Transaction may fail.',
    };
  }

  if (error.code === 'INSUFFICIENT_FUNDS') {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient balance for transaction and gas fees.',
    };
  }

  if (error.message.includes('user rejected')) {
    return {
      code: 'USER_REJECTED',
      message: 'Transaction was rejected by user.',
    };
  }

  if (error.message.includes('nonce too low')) {
    return {
      code: 'NONCE_ERROR',
      message: 'Transaction nonce error. Please try again.',
    };
  }

  if (error.message.includes('slippage')) {
    return {
      code: 'SLIPPAGE_ERROR',
      message: 'Transaction failed due to slippage. Try increasing slippage tolerance.',
    };
  }

  return {
    code: 'CONTRACT_ERROR',
    message: error.reason || error.message || 'Contract interaction failed',
    txHash: error.transactionHash,
  };
}
