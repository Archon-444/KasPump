# Skills Demo Examples - Ready to Run

These are copy-paste ready examples you can use immediately to enhance the KasPump UI.

## Example 1: Test the Trading Interface

### Command:
```
Use the web3-testing skill to create comprehensive unit tests for the TradingInterface component at src/components/features/TradingInterface.tsx including buy/sell flows, slippage calculations, and error handling
```

### What it will create:
- `src/components/features/__tests__/TradingInterface.test.tsx`
- Tests for buy/sell toggle
- Tests for amount input validation
- Tests for slippage settings
- Tests for quote calculation mocking
- Tests for error states

### Expected outcome:
✅ Complete test suite with 15+ test cases
✅ Proper wagmi mocking patterns
✅ Test coverage report increase

---

## Example 2: Create Bonding Curve Visualizer

### Command:
```
Use the artifacts-builder skill to create an interactive BondingCurveSimulator component that:
- Shows a visual curve graph
- Lets users drag sliders to adjust virtualKasReserves and virtualTokenReserves
- Displays real-time price calculations
- Shows how price changes with different buy amounts
- Uses Recharts for visualization and Tailwind for styling
```

### What it will create:
- Complete React component with TypeScript
- Interactive sliders using shadcn/ui
- Recharts area chart showing the curve
- Real-time calculations
- Beautiful Tailwind styling

### Where to use it:
Add to `TokenCreationWizard.tsx` as Step 3.5 (before review)

### Expected outcome:
✅ Beautiful interactive visualizer
✅ Helps users understand economics
✅ Reduces bad token configurations

---

## Example 3: E2E Test for Token Creation

### Command:
```
Use the webapp-testing skill to create a Playwright E2E test for the complete token creation flow:
1. Navigate to localhost:3000
2. Click "Connect Wallet" and select MetaMask
3. Click "Create Token" button
4. Fill in token name "Test Token"
5. Fill in symbol "TEST"
6. Fill in description "Test Description"
7. Proceed to next step
8. Skip image upload
9. Review and submit
10. Wait for transaction confirmation
11. Verify token appears in listings
```

### What it will create:
- `e2e/token-creation.spec.ts`
- Playwright test configuration
- Wallet mocking setup
- Page object pattern
- Screenshot on failure

### Expected outcome:
✅ Automated E2E test
✅ Catches integration issues
✅ CI/CD ready

---

## Example 4: Enhanced Token Card with Launch Indicators

### Command:
```
Use the kaspump-token-launch skill to enhance the TokenCard component with:
- A "Launch Health" badge (Good/Fair/Poor) based on economics
- A graduation progress bar showing % to DEX graduation
- A price stability indicator (trending up/down/stable)
- Hover tooltip explaining each indicator
Provide the enhanced component code for src/components/features/TokenCard.tsx
```

### What it will create:
- Enhanced TokenCard with new features
- Economics evaluation logic
- Visual indicators with Tailwind
- Accessible tooltips

### Expected outcome:
✅ More informative token cards
✅ Helps users identify quality launches
✅ Better UX

---

## Example 5: Admin Deployment Dashboard

### Command:
```
Use the smart-contract-deployment skill to create an AdminDeploymentDashboard component that:
- Reads from deployments.json
- Shows all deployed contracts by network (BSC, Arbitrum, Base)
- Displays deployment status with colored badges
- Links to block explorers
- Shows last deployment time
- Has a "Deploy to Network" button that shows the correct npm command
```

### What it will create:
- `src/components/features/AdminDeploymentDashboard.tsx`
- Deployment data loader
- Network badges
- Explorer links
- Command hints

### Where to add it:
Create new admin page at `src/app/admin/page.tsx`

### Expected outcome:
✅ Easy deployment management
✅ Quick status overview
✅ Reduced deployment errors

---

## Example 6: Trading Chart with Technical Indicators

### Command:
```
Use the artifacts-builder skill to create a TechnicalIndicatorsPanel component for the trading chart that shows:
- RSI (Relative Strength Index) with overbought/oversold zones
- MACD (Moving Average Convergence Divergence) histogram
- 24h volume bar chart
- Toggle buttons to show/hide each indicator
- Uses Recharts library and matches the existing dark theme
```

### What it will create:
- Complete technical indicators panel
- Multiple chart types
- Toggle controls
- Responsive design
- Dark theme styling

### Where to integrate:
Add below the main chart in `TradingChart.tsx`

### Expected outcome:
✅ Professional-grade charting
✅ Better trading decisions
✅ Competitive with major DEXes

---

## Example 7: Complete Test Suite for Token Creation

### Command:
```
Use the web3-testing skill to create a complete test suite for the TokenCreationWizard component including:
- Step 1 validation tests (name, symbol, description)
- Step 2 image upload tests
- Step 3 review and confirmation tests
- Navigation between steps tests
- Form error handling tests
- Mock useAccount hook from wagmi
- Mock image upload to IPFS
```

### What it will create:
- `src/components/features/__tests__/TokenCreationWizard.test.tsx`
- 20+ test cases
- Proper mocking setup
- Integration with vitest

### Expected outcome:
✅ Comprehensive wizard testing
✅ Catch validation bugs
✅ Confidence in deployments

---

## Example 8: Interactive Launch Economics Guide

### Command:
```
Use the kaspump-token-launch skill to create an interactive LaunchEconomicsGuide component that:
- Explains bonding curve parameters in simple terms
- Shows preset configurations (Conservative, Balanced, Aggressive)
- Has an interactive calculator for starting price
- Displays example scenarios with visual charts
- Includes best practices checklist
- Can be shown as a modal during token creation
```

### What it will create:
- Educational modal component
- Preset configurations
- Interactive calculator
- Visual examples
- Checklist component

### Where to use:
Add help button in TokenCreationWizard Step 3

### Expected outcome:
✅ Better educated creators
✅ Higher quality token launches
✅ Reduced support requests

---

## Example 9: Multi-Network Contract Monitor

### Command:
```
Use the smart-contract-deployment skill to create a ContractHealthMonitor component that:
- Checks contract status on BSC, Arbitrum, and Base
- Shows last activity timestamp
- Displays contract balance
- Shows total tokens created count
- Has refresh button
- Color-codes status (green=healthy, yellow=warning, red=error)
- Uses the contract addresses from deployments.json
```

### What it will create:
- Health monitoring component
- Multi-chain RPC calls
- Status indicators
- Auto-refresh capability

### Where to add:
Admin dashboard or platform stats

### Expected outcome:
✅ Proactive monitoring
✅ Quick issue detection
✅ Multi-chain visibility

---

## Example 10: Complete Trading Flow E2E Test

### Command:
```
Use the webapp-testing skill to create a comprehensive E2E test for the trading flow:
1. Connect wallet
2. Navigate to a specific token page
3. Enter buy amount of 0.1 BNB
4. Adjust slippage to 1%
5. Click "Buy"
6. Confirm transaction in MetaMask
7. Wait for confirmation toast
8. Verify portfolio shows new tokens
9. Navigate back to token page
10. Sell 50% of tokens
11. Verify balance updated
Include proper wait conditions and error handling
```

### What it will create:
- Complete trading E2E test
- Transaction mocking
- Balance verification
- Error scenarios

### Expected outcome:
✅ Automated trading tests
✅ Catch regression bugs
✅ Safe deployments

---

## Quick Start Checklist

Pick one example and run it:

- [ ] Copy the command exactly
- [ ] Paste into Claude Code conversation
- [ ] Wait for skill to generate code
- [ ] Review the generated code
- [ ] Save to the suggested location
- [ ] Test it locally
- [ ] Commit if successful

## Pro Tips

1. **Start Small**: Begin with Example 1 or 2
2. **Test Immediately**: Run tests after creation
3. **Iterate**: Ask for modifications if needed
4. **Combine Skills**: Use multiple skills together
5. **Document**: Save successful patterns

## Success Metrics

After running these examples, you should have:

- ✅ 3+ new test suites
- ✅ 2+ new UI components
- ✅ 1+ E2E test
- ✅ Better code quality
- ✅ Faster development

---

**Ready to try one? Pick an example above and paste the command into Claude Code!**
