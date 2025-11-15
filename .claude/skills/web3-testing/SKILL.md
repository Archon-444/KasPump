---
name: web3-testing
description: Test Web3 components, smart contract interactions, and wallet integrations in the KasPump application. Use this skill for testing RainbowKit wallet connections, wagmi hooks, and blockchain transactions.
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

# Web3 Testing Skill

This skill provides guidance for testing Web3 functionality in the KasPump Next.js application.

## Test Types

### 1. Unit Tests (Vitest)

Test React components and hooks in isolation.

**Run Tests:**
```bash
npm run test:unit              # Run once
npm run test:unit:watch        # Watch mode
npm run test:unit:coverage     # With coverage
```

**Test Locations:**
- Component tests: `src/**/__tests__/*.test.tsx`
- Hook tests: `src/hooks/__tests__/*.test.ts`
- Utility tests: `test/*.test.ts`

### 2. Smart Contract Tests (Hardhat)

Test Solidity contracts with Hardhat.

**Run Tests:**
```bash
npm run test                   # Run all contract tests
npm run test:bsc              # Test on BSC testnet
```

**Test Locations:**
- Contract tests: `test/*.ts`

### 3. Integration Tests

Test full user flows with blockchain interactions.

**Key Areas to Test:**
- Wallet connection (RainbowKit)
- Token creation flow
- Trading functionality
- Chart updates and real-time data
- Transaction confirmations

## Web3 Testing Patterns

### Testing Wallet Connections

```typescript
import { renderHook } from '@testing-library/react'
import { useAccount } from 'wagmi'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
}))

test('should handle wallet connection', () => {
  const mockAccount = '0x1234...'
  vi.mocked(useAccount).mockReturnValue({
    address: mockAccount,
    isConnected: true,
  })

  // Test component behavior
})
```

### Testing Blockchain Transactions

```typescript
import { waitForTransactionReceipt } from 'wagmi/actions'

// Mock transaction
const mockTxHash = '0xabc123...'

test('should handle token creation', async () => {
  // Mock transaction execution
  // Verify UI updates
  // Check error handling
})
```

### Testing Smart Contracts (Hardhat)

```typescript
import { expect } from "chai"
import { ethers } from "hardhat"

describe("KasPumpFactory", function () {
  it("Should create a new token", async function () {
    const [owner] = await ethers.getSigners()

    const Factory = await ethers.getContractFactory("KasPumpFactory")
    const factory = await Factory.deploy()

    const tx = await factory.createToken("Test Token", "TEST", ...)
    await tx.wait()

    // Verify token creation
  })
})
```

## Common Testing Scenarios

### 1. Token Creation Flow
- Connect wallet
- Fill token creation form
- Submit transaction
- Wait for confirmation
- Verify token appears in UI

### 2. Trading Flow
- Connect wallet
- Select token
- Enter trade amount
- Approve transaction
- Execute trade
- Verify balance updates

### 3. Chart Integration
- Load token data
- Verify chart renders
- Test real-time updates
- Handle edge cases (no data, loading states)

## Mocking Strategies

### Mock Providers

```typescript
import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'

const mockConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
})
```

### Mock Contract Calls

```typescript
// Mock ethers contract
const mockContract = {
  createToken: vi.fn().mockResolvedValue({
    wait: vi.fn().mockResolvedValue({ status: 1 })
  })
}
```

## Best Practices

1. **Isolate Blockchain Calls**: Mock wallet and contract interactions in unit tests
2. **Use Test Networks**: Run integration tests on testnets, not mainnet
3. **Test Error Paths**: Verify handling of failed transactions, rejected connections
4. **Mock Expensive Operations**: Don't make real blockchain calls in unit tests
5. **Test Loading States**: Verify UI during pending transactions
6. **Clean Up**: Disconnect wallets and clear state between tests

## Debugging Tips

1. **Check Network**: Ensure test is using correct chain ID
2. **Verify Gas**: Confirm sufficient gas for test transactions
3. **Check Approvals**: Token approvals may be needed before trading
4. **Monitor Events**: Listen for contract events to verify state changes
5. **Use Console Logs**: Log transaction hashes and addresses for debugging

## Test Coverage Goals

- Components: 80%+
- Hooks: 90%+
- Utilities: 95%+
- Smart Contracts: 100%

Run `npm run test:unit:coverage` to check coverage.
