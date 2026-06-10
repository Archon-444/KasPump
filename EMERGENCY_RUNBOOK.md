# Emergency Withdrawal Runbook

Operator-facing procedure for emergency situations on the KasPump platform. This covers the pause, withdrawal, and recovery flow enforced by the `BondingCurveAMM` smart contract (V2 — sigmoid curve era).

---

## When to Trigger Emergency

Initiate this procedure when any of the following are detected:

- Active exploit draining contract funds
- Critical vulnerability discovered (e.g., reentrancy, curve-math manipulation)
- Abnormal `curveNativeBalance` drainage that cannot be explained by normal trading
- Regulatory order requiring immediate cessation of operations
- Upstream dependency failure (DEX router compromise, LP pair manipulation)

**Do NOT use emergency withdrawal for:** routine maintenance, contract upgrades, or minor UI bugs.

---

## Contract Architecture (V2)

Each token has its own `BondingCurveAMM` instance. Emergency actions must be taken **per-AMM**, not globally.

| Contract | Role |
|----------|------|
| `TokenFactory` | Creates tokens and deploys AMMs. Has `pause()` to block new token creation. |
| `BondingCurveAMM` (per token) | Holds bonding curve liquidity (`curveNativeBalance`). Has `pause()`, `emergencyWithdraw()`. |
| `CreatorVesting` (per graduated token) | Holds creator's vesting allocation. Independent of AMM pause state. |

### Balance accounting invariant

```
address(this).balance =
      curveNativeBalance
    + creatorAccumulatedFees
    + referrerAccumulatedFees
```

---

## Step 1: Pause the Contract

**Requirement:** Caller must be the contract `owner` (should be a Gnosis Safe multi-sig).

```
Function: pause()
Access: onlyOwner
Effect: Blocks all buyTokens(), sellTokens(), and new trading
```

### Procedure

1. Open Gnosis Safe (safe.global) connected to the correct chain (Base for Phase 1)
2. Navigate to **New Transaction** > **Contract Interaction**
3. Enter the BondingCurveAMM address for the affected token
4. Select `pause()` from the ABI
5. Submit and collect required signatures (2/3 or 3/5 depending on Safe config)
6. Execute the transaction
7. **Verify on BaseScan:** Call `paused()` — should return `true`

### To pause ALL new token creation:

Repeat with `TokenFactory.pause()` to prevent new launches during the incident.

---

## Step 2: Emergency Withdrawal (if needed)

**Requirements:**
- Contract MUST be paused first (`whenPaused` modifier enforced)
- Caller must be contract `owner`

```
Function: emergencyWithdraw(string calldata reason)
Access: onlyOwner, whenPaused
Effect: Withdraws owner-accessible funds ONLY
```

### What Gets Withdrawn

| Fund Type | Withdrawn? |
|-----------|-----------|
| Bonding curve liquidity (minus reserved fees) | YES |
| `creatorAccumulatedFees` | NO (preserved) |
| `referrerAccumulatedFees` | NO (preserved) |
| `CreatorVesting` token balances | NO (separate contract) |

The contract calculates:
```
withdrawable = address(this).balance - creatorAccumulatedFees - referrerAccumulatedFees
```

Creator and referrer fees are **never** swept. They remain in the contract for their rightful owners to claim when the contract is unpaused.

### Procedure

1. Confirm contract is paused (Step 1 complete)
2. In Gnosis Safe, call `emergencyWithdraw("Reason: brief description of the incident")`
3. Collect required signatures and execute
4. Verify the `EmergencyWithdraw` event on BaseScan (includes amount and reason)
5. Confirm withdrawn ETH arrived in the Safe wallet

---

## Step 3: Communication

Within **15 minutes** of pausing:

1. **Frontend banner:** Deploy a maintenance notice (can use Vercel environment variable + conditional rendering)
2. **Social media:** Post on X/Twitter explaining the situation at a high level
   - What happened (without revealing exploit details that could be copied)
   - That funds are secured
   - Estimated timeline for resolution
3. **Discord/Telegram** (if applicable): Pin an announcement

Template:
> We've temporarily paused trading on [TOKEN] while we investigate a potential issue. User funds held in creator and referrer fee reserves are secure. We'll provide an update within [X hours].

---

## Step 4: Recovery

Once the issue is resolved:

1. Deploy the fix (if contract upgrade needed, deploy new contract and migrate)
2. If the same contract can be reused:
   - Call `unpause()` via Gnosis Safe
   - Verify `paused()` returns `false`
   - Monitor the first few transactions closely
3. If funds were withdrawn, determine the fair distribution plan before redeployment
4. Post all-clear communication on the same channels

---

## Key Addresses

| Chain | TokenFactory | Treasury | Safe |
|-------|-------------|----------|------|
| Base Sepolia (84532) | TBD (post V2 smoke test) | TBD | TBD |
| Base Mainnet (8453) | TBD | TBD | TBD |
| BSC Testnet (97, legacy V1) | `0x7Af627Bf902549543701C58366d424eE59A4ee08` | `0xEFec2Eddf5151c724B610B7e5fa148752674D667` | — |

**Update this table after each deployment and Safe setup.**

---

## Quick Reference

| Action | Function | Modifier | Who Can Call |
|--------|----------|----------|-------------|
| Stop trading | `pause()` | `onlyOwner` | Safe multi-sig |
| Resume trading | `unpause()` | `onlyOwner` | Safe multi-sig |
| Withdraw excess funds | `emergencyWithdraw(reason)` | `onlyOwner`, `whenPaused` | Safe multi-sig |
| Withdraw creator fees | `withdrawCreatorFees()` | none (msg.sender == creator) | Token creator |
| Withdraw referrer fees | `withdrawReferrerFees()` | none (msg.sender == referrer) | Referrer |
| Claim vested tokens | `CreatorVesting.claim()` | none (msg.sender == creator) | Token creator |

---

## Post-Incident Checklist

- [ ] Incident documented with timeline, root cause, and impact assessment
- [ ] All affected users identified and communicated with
- [ ] Fix verified on testnet (Base Sepolia) before mainnet deployment
- [ ] Safe transaction history reviewed for any unauthorized actions
- [ ] Security audit updated with findings from the incident
- [ ] Monitoring alerts adjusted to catch similar issues earlier
