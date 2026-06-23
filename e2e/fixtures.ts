import { test as base, type Page } from '@playwright/test';

const MOCK_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const BSC_TESTNET_CHAIN_ID = 97;

async function injectMockWallet(page: Page): Promise<void> {
  // Registers an init script that runs before any page scripts on every
  // navigation — provides window.ethereum so wagmi's injected connector
  // can respond to eth_accounts / eth_chainId calls.
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
          if (method === 'wallet_requestPermissions') {
            // shimDisconnect=true connector tries this first; return minimal
            // permission so eth_requestAccounts is skipped on connect.
            return [{ parentCapability: 'eth_accounts', caveats: [{ type: 'filterResponse', value: [address] }] }];
          }
          if (method === 'wallet_switchEthereumChain') {
            return null;
          }
          // Return null rather than throwing so wagmi doesn't error on
          // unexpected read-only calls (e.g. eth_getBalance, wallet_getPermissions).
          return null;
        },
      };
      Object.defineProperty(window, 'ethereum', {
        get: () => mockProvider,
        set: () => {}, // prevent MetaMask SDK from overwriting the mock
        configurable: true,
        enumerable: true,
      });
    },
    { address: MOCK_ADDRESS, chainId: BSC_TESTNET_CHAIN_ID }
  );
}

export const test = base.extend<{ walletPage: Page }>({
  walletPage: async ({ page }, use) => {
    await injectMockWallet(page);

    // Navigate to the app root so localStorage is scoped to the correct
    // origin (localhost:3000), then seed the wagmi v2 keys that the
    // injected connector's isAuthorized() gate requires.
    //
    // Why page.evaluate() rather than addInitScript():
    // addInitScript fires at document-creation time — before the browser has
    // committed to a final origin — so localStorage writes may land on
    // "about:blank" rather than "localhost:3000" on some Chromium builds.
    // page.evaluate() runs synchronously after navigation commits, guaranteeing
    // the write is scoped to the correct origin.
    //
    // Keys and JSON-serialised values match wagmi/core createStorage format:
    //   'wagmi.injected.connected' = serialize(true)  = 'true'
    //   'wagmi.recentConnectorId'  = serialize('injected') = '"injected"'
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.setItem('wagmi.injected.connected', 'true');
      localStorage.setItem('wagmi.recentConnectorId', '"injected"');
    });
    // Reload so wagmi reinitialises with the storage keys already present.
    // Without the reload, wagmi may have run isAuthorized() during the first
    // page load (before evaluate() ran) and cached a disconnected decision.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await use(page);
  },
});

export { expect } from '@playwright/test';
export { MOCK_ADDRESS };
