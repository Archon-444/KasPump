import { test as base, type Page } from '@playwright/test';

const MOCK_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const BSC_TESTNET_CHAIN_ID = 97;

async function injectMockWallet(page: Page): Promise<void> {
  await page.addInitScript(
    ({ address, chainId }: { address: string; chainId: number }) => {
      const mockProvider = {
        isMetaMask: true,
        selectedAddress: address,
        chainId: `0x${chainId.toString(16)}`,
        networkVersion: String(chainId),
        _events: {} as Record<string, ((...args: unknown[]) => void)[]>,
        on(event: string, fn: (...args: unknown[]) => void) {
          if (!this._events[event]) this._events[event] = [];
          this._events[event]!.push(fn);
        },
        removeListener() {},
        emit(event: string, ...args: unknown[]) {
          (this._events[event] || []).forEach((fn) => fn(...args));
        },
        async request({ method }: { method: string; params?: unknown[] }) {
          if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
            return [address];
          }
          if (method === 'eth_chainId') {
            return `0x${chainId.toString(16)}`;
          }
          if (method === 'net_version') {
            return String(chainId);
          }
          if (method === 'wallet_switchEthereumChain') {
            return null;
          }
          throw new Error(`Unhandled method: ${method}`);
        },
      };
      Object.defineProperty(window, 'ethereum', {
        value: mockProvider,
        writable: true,
        configurable: true,
      });
    },
    { address: MOCK_ADDRESS, chainId: BSC_TESTNET_CHAIN_ID }
  );
}

export const test = base.extend<{ walletPage: Page }>({
  walletPage: async ({ page }, use) => {
    await injectMockWallet(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { MOCK_ADDRESS };
