# KasPump - Quick Deployment Guide

Get KasPump running in production in under 2 hours with this streamlined guide.

---

## 🚀 Quick Launch (Minimum Setup)

### Step 1: Deploy Smart Contracts (30 min)

**Prerequisites:**
- Wallet with ~0.1 BNB on BSC Mainnet
- BscScan API key (get from https://bscscan.com/apis)

**Deploy to BSC Mainnet:**

1. Create `.env` file:
```bash
cp .env.example .env
```

2. Fill in required values:
```bash
# .env
PRIVATE_KEY=your_wallet_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key
BSC_RPC_URL=https://bsc-dataseed1.binance.org
```

3. Deploy contracts:
```bash
npm run deploy:deterministic:bsc
```

4. Save the contract addresses output. Update `.env.local`:
```bash
NEXT_PUBLIC_BSC_TOKEN_FACTORY=0xYourFactoryAddress
NEXT_PUBLIC_BSC_FEE_RECIPIENT=0xYourFeeRecipientAddress
```

### Step 2: Set Up IPFS Storage (10 min)

**Option: Pinata (Recommended)**

1. Create account: https://pinata.cloud
2. Get API key from dashboard
3. Add to `.env.local`:
```bash
IPFS_API_KEY=your_pinata_api_key
IPFS_API_SECRET=your_pinata_secret
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

**Free tier includes:** 1GB storage, 100GB bandwidth/month

### Step 3: Configure WalletConnect (5 min)

1. Create project: https://cloud.walletconnect.com
2. Get Project ID
3. Add to `.env.local`:
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Step 4: Deploy to Vercel (15 min)

**One-Click Deployment:**

1. Push code to GitHub (if not already)
2. Go to https://vercel.com
3. Click "New Project"
4. Import your KasPump repository
5. Add environment variables in Vercel:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - `NEXT_PUBLIC_BSC_TOKEN_FACTORY`
   - `NEXT_PUBLIC_BSC_FEE_RECIPIENT`
   - `NEXT_PUBLIC_DEFAULT_CHAIN_ID=56`
   - `IPFS_API_KEY`
   - `IPFS_API_SECRET`
   - `NEXT_PUBLIC_IPFS_GATEWAY`

6. Click "Deploy"

**Your app will be live at:** `https://your-project.vercel.app`

### Step 5: Configure Custom Domain (10 min)

1. In Vercel dashboard → Settings → Domains
2. Add your domain (e.g., `kaspump.io`)
3. Follow DNS configuration instructions
4. SSL is automatic via Vercel

---

## 🎯 Complete Setup (Recommended for Production)

### Additional Services to Add

**1. Database (Required for Push Notifications)**

**Option: Vercel Postgres (Easy Integration)**
```bash
# In Vercel dashboard:
# Storage → Create Database → Postgres
# Copy DATABASE_URL to environment variables

# Run migrations:
psql $DATABASE_URL -f database/schema.sql
```

**2. Premium RPC Endpoints (Better Reliability)**

**Option: Alchemy**
- Sign up: https://www.alchemy.com
- Create API key for BSC
- Update `.env.local`:
```bash
NEXT_PUBLIC_BSC_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/YOUR_KEY
```

**3. Error Tracking with Sentry**

1. Create account: https://sentry.io
2. Create new Next.js project
3. Add to `.env.local`:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

**4. WebSocket Server (Real-time Updates)**

**Quick Option: Use Vercel Serverless**
- Already included in deployment
- No additional setup needed

**Better Option: Dedicated Server**
- Deploy WebSocket server to DigitalOcean/Railway
- Update: `NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com`

---

## 💰 Cost Breakdown

### Minimum Setup (Start Here)
| Service | Cost |
|---------|------|
| Vercel Hobby | Free |
| Pinata Free | Free |
| WalletConnect | Free |
| Domain | $12/year |
| Contract Deploy | ~$50 one-time |
| **Total Monthly** | **$0** (+ $1/mo domain) |

### Recommended Setup
| Service | Cost |
|---------|------|
| Vercel Pro | $20/month |
| Pinata Picnic | $20/month |
| Vercel Postgres | $10/month |
| Alchemy Growth | $49/month |
| Domain | $12/year |
| **Total Monthly** | **~$100/month** |

---

## 🔧 Configuration Examples

### Complete `.env.local` for Production

```bash
# ===== REQUIRED =====
NODE_ENV=production
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=abc123def456

# Network
NEXT_PUBLIC_DEFAULT_CHAIN_ID=56

# Contracts
NEXT_PUBLIC_BSC_TOKEN_FACTORY=0x1234...
NEXT_PUBLIC_BSC_FEE_RECIPIENT=0x5678...

# IPFS
IPFS_API_KEY=your_pinata_key
IPFS_API_SECRET=your_pinata_secret
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# ===== OPTIONAL =====
# Custom RPC (recommended)
NEXT_PUBLIC_BSC_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Database (for push notifications)
DATABASE_URL=postgresql://user:pass@host/db

# Error tracking
NEXT_PUBLIC_SENTRY_DSN=https://...

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX

# WebSocket
NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com
```

---

## ✅ Post-Deployment Testing

### Critical Tests (Do Before Announcing)

1. **Connect Wallet**
   - [ ] Test MetaMask connection
   - [ ] Test WalletConnect
   - [ ] Verify correct chain (BSC Mainnet)

2. **Create Token**
   - [ ] Upload image to IPFS
   - [ ] Fill token details
   - [ ] Deploy token (use small test amounts first!)
   - [ ] Verify token appears on blockchain

3. **Trading**
   - [ ] Buy small amount of token
   - [ ] Sell tokens
   - [ ] Verify balances update

4. **Performance**
   - [ ] Run Lighthouse audit (target >90)
   - [ ] Test on mobile
   - [ ] Check page load times

---

## 🚨 Common Issues & Solutions

### Issue: Transaction Fails

**Solution:**
- Check you're on correct network (BSC Mainnet)
- Ensure sufficient BNB for gas
- Verify contract addresses are correct
- Check BscScan for error details

### Issue: Images Not Loading

**Solution:**
- Verify IPFS API keys are correct
- Check Pinata dashboard for upload status
- Try different IPFS gateway
- Check browser console for errors

### Issue: Wallet Won't Connect

**Solution:**
- Clear browser cache
- Verify WalletConnect project ID
- Check if wallet is on correct network
- Try different wallet provider

### Issue: High Gas Costs

**Solution:**
- Wait for lower gas prices (check bscscan.com/gastracker)
- Optimize contract calls
- Consider L2 deployment (Arbitrum/Base)

---

## 📈 Scaling Your Deployment

### When to Upgrade

**Database:** When you have >100 active users with push notifications
**RPC Endpoint:** When you see rate limiting or slow responses
**Hosting:** When traffic exceeds Vercel hobby limits
**IPFS:** When storage exceeds 1GB or bandwidth exceeds 100GB/month

### Multi-Chain Expansion

**After stable on BSC, add:**

1. **Arbitrum (Lower Gas Costs)**
```bash
npm run deploy:deterministic:arbitrum
# Add NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY to env
```

2. **Base (Coinbase Users)**
```bash
npm run deploy:deterministic:base
# Add NEXT_PUBLIC_BASE_TOKEN_FACTORY to env
```

---

## 🎬 Launch Checklist

### Pre-Launch (Day Before)
- [ ] All contracts deployed and verified
- [ ] Test all features with real money (small amounts)
- [ ] Documentation complete
- [ ] Support channels ready (Discord/Telegram)
- [ ] Monitoring set up

### Launch Day
- [ ] Announce on social media
- [ ] Monitor error rates
- [ ] Watch for any transaction failures
- [ ] Be ready to respond to user issues
- [ ] Celebrate! 🎉

### Post-Launch (Week 1)
- [ ] Daily monitoring
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan feature updates

---

## 📞 Getting Help

- **Documentation:** Full checklist in `PRE_DELIVERY_CHECKLIST.md`
- **Smart Contracts:** See `CONTRACT_CONFIGURATION.md`
- **Testing:** See test files in `src/hooks/*.test.ts`

---

## 🎯 Next Steps After Launch

1. **Monitor Performance**
   - Set up Sentry alerts
   - Watch transaction success rates
   - Monitor gas costs

2. **Gather Feedback**
   - Create Discord community
   - Track user requests
   - Identify pain points

3. **Iterate & Improve**
   - Add requested features
   - Optimize gas costs
   - Improve UX based on data

4. **Scale Infrastructure**
   - Upgrade services as needed
   - Add more chains
   - Optimize for higher traffic

---

**Ready to deploy?** Start with Step 1 and you'll be live in ~2 hours!

**Questions?** Check the comprehensive guide in `PRE_DELIVERY_CHECKLIST.md`
