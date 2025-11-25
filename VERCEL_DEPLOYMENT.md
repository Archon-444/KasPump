# Vercel Deployment Guide for KasPump

This guide covers deploying the KasPump Next.js application to Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Environment Variables**: Prepare all required environment variables (see below)
4. **WalletConnect Project ID**: Get one free at [cloud.walletconnect.com](https://cloud.walletconnect.com)

## 🚀 Quick Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Import Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your KasPump repository
   - Click "Import"

2. **Configure Project**
   - Framework Preset: `Next.js` (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

3. **Add Environment Variables** (see section below)

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🔐 Required Environment Variables

Add these in the Vercel Dashboard under **Settings > Environment Variables**:

### Essential Variables (Required)

```env
# WalletConnect (Required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Default Network (Required)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=97

# Contract Addresses (Set based on your deployments)
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x...
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0x...
```

### Optional Variables

```env
# RPC URLs (Optional - defaults are configured)
NEXT_PUBLIC_BSC_RPC_URL=https://bsc-dataseed1.binance.org
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# IPFS (Optional)
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.ipfs.io

# Analytics (Optional)
NEXT_PUBLIC_GA_TRACKING_ID=
MIXPANEL_TOKEN=

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=

# Debug Mode (Optional)
NEXT_PUBLIC_DEBUG=false
```

### Setting Environment Variables

1. Go to your project dashboard on Vercel
2. Navigate to **Settings > Environment Variables**
3. Add each variable with:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`)
   - **Value**: Your actual value
   - **Environment**: Select all (Production, Preview, Development)
4. Click "Save"

## 📦 What Gets Deployed

The Vercel deployment includes:
- ✅ Next.js frontend application
- ✅ API routes (`src/app/api/*`)
- ✅ Static assets and images
- ✅ Optimized production build

The deployment **excludes**:
- ❌ Smart contracts and Hardhat files
- ❌ WebSocket server (`server/` directory - deploy separately)
- ❌ Test files
- ❌ Documentation files

## 🔧 Build Configuration

The project is pre-configured for Vercel with:

- **`vercel.json`**: Vercel-specific settings
- **`.vercelignore`**: Files to exclude from deployment
- **`next.config.js`**: Next.js configuration with standalone output

### Build Settings

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install --legacy-peer-deps",
  "outputDirectory": ".next"
}
```

> **Note**: The `--legacy-peer-deps` flag is required due to a peer dependency conflict between `@sentry/nextjs` and Next.js 16. This is a known issue and doesn't affect functionality.

## 🌐 WebSocket Server (Separate Deployment)

The WebSocket server in `server/` directory **cannot** be deployed to Vercel (Vercel is serverless and doesn't support long-running processes).

### Deploy WebSocket Server To:

**Option 1: Railway** (Recommended)
```bash
cd server
# Install Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

**Option 2: Render**
1. Create a new Web Service on [render.com](https://render.com)
2. Connect your repository
3. Set Root Directory: `server`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`

**Option 3: Fly.io**
```bash
cd server
flyctl launch
flyctl deploy
```

### Update WebSocket URL

After deploying the WebSocket server, update your frontend to use the WebSocket URL:

```env
# Add to Vercel environment variables
NEXT_PUBLIC_WS_URL=https://your-websocket-server.railway.app
```

## 🔍 Deployment Verification

After deployment, verify:

1. **Build Success**: Check Vercel deployment logs for errors
2. **Environment Variables**: Verify all required variables are set
3. **Homepage Load**: Visit your Vercel URL
4. **Wallet Connection**: Test connecting MetaMask/WalletConnect
5. **API Routes**: Test `/api/tokens` and other endpoints
6. **Contract Integration**: Verify contract addresses are correct

### Common Issues

**Issue**: "The specified Root Directory 'frontend' does not exist"
- **Solution**: The KasPump Next.js app is at the project root, not in a subdirectory
- Go to your Vercel project **Settings > General > Root Directory**
- Clear the Root Directory field (leave it empty or set to `./`)
- Click "Save" and redeploy

**Issue**: Build fails with "ERESOLVE unable to resolve dependency tree"
- **Solution**: The `vercel.json` is already configured to use `--legacy-peer-deps`
- This is due to Sentry/Next.js 16 peer dependency conflict
- If you're deploying manually, use: `npm install --legacy-peer-deps`

**Issue**: Build fails with "Module not found"
- **Solution**: Check that all dependencies are in `package.json`
- Run `npm install --legacy-peer-deps` locally to verify

**Issue**: Environment variables not working
- **Solution**: Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding environment variables

**Issue**: Wallet connection fails
- **Solution**: Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
- Check WalletConnect project settings

**Issue**: Contract calls fail
- **Solution**: Verify contract addresses are correct for the selected network
- Check RPC URLs are accessible

## 🔄 CI/CD Setup

Vercel automatically deploys when you push to GitHub:

- **Production**: Pushes to `main` branch
- **Preview**: Pushes to other branches or pull requests

### Deployment Branches

```bash
# Production deployment
git push origin main

# Preview deployment
git push origin feature-branch
```

### Disable Auto-Deploy for Specific Commits

```bash
git commit -m "update docs [skip ci]"
```

## 🎯 Production Checklist

Before going live:

- [ ] Set all required environment variables
- [ ] Update contract addresses for mainnet
- [ ] Set `NEXT_PUBLIC_DEFAULT_CHAIN_ID` to 56 (BSC Mainnet)
- [ ] Configure custom domain (optional)
- [ ] Enable Sentry error tracking (recommended)
- [ ] Set up Google Analytics (optional)
- [ ] Test all wallet connections
- [ ] Test token creation and trading
- [ ] Verify CORS settings
- [ ] Review security headers in `next.config.js`
- [ ] Enable Vercel Analytics (optional)

## 🌍 Custom Domain

To use a custom domain:

1. Go to your project **Settings > Domains**
2. Add your domain (e.g., `kaspump.com`)
3. Update DNS records as instructed
4. Wait for DNS propagation (5-30 minutes)

### DNS Configuration

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## 📊 Monitoring

### Vercel Analytics

Enable in project settings:
- **Analytics**: Real-time visitor data
- **Speed Insights**: Core Web Vitals
- **Logs**: Runtime and build logs

### External Monitoring

1. **Sentry**: Error tracking and performance monitoring
   ```env
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   SENTRY_DSN=your_sentry_server_dsn
   ```

2. **Google Analytics**: User behavior tracking
   ```env
   NEXT_PUBLIC_GA_TRACKING_ID=your_ga_id
   ```

## 🔒 Security Best Practices

1. **Never commit sensitive data**
   - Private keys
   - API secrets
   - Database credentials

2. **Use environment variables**
   - Store all secrets in Vercel dashboard
   - Never hardcode credentials

3. **Enable security headers**
   - Already configured in `next.config.js`
   - Includes CSP, HSTS, XSS protection

4. **Review CORS settings**
   - Configure allowed origins
   - Restrict API access

## 💰 Vercel Pricing

- **Hobby**: Free
  - 100 GB bandwidth
  - Unlimited deployments
  - Perfect for testing

- **Pro**: $20/month
  - 1 TB bandwidth
  - Advanced analytics
  - Password protection
  - Recommended for production

## 🆘 Support & Troubleshooting

### Vercel Resources
- **Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Status**: [vercel-status.com](https://vercel-status.com)

### KasPump Resources
- **Main README**: [README.md](./README.md)
- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Getting Help

If you encounter issues:
1. Check Vercel deployment logs
2. Review environment variables
3. Check browser console for errors
4. Verify contract addresses and network settings
5. Contact KasPump support

## 🎉 Success!

Once deployed, your KasPump instance will be live at:
```
https://your-project.vercel.app
```

Share your link and start launching tokens! 🚀

---

**Need help?** Check our [documentation](./README.md) or reach out to the community.
