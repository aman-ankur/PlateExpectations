# 11 — Vercel Deployment

## Why Vercel

Evaluated several free/low-cost deployment options for testing the PWA on real phones within a small circle:

| Option | Pros | Cons |
|--------|------|------|
| **Vercel (chosen)** | Zero-config Next.js deploy, auto HTTPS, preview URLs per PR, global edge network | Hobby tier 10s serverless timeout (scan route needs ~30-45s) |
| Cloudflare Pages | Unlimited bandwidth, free | Next.js App Router API routes + streaming have compatibility gaps |
| Railway | Full Node.js, no timeout limits | $5 credit then paid |
| Fly.io | 3 free VMs, no timeouts | Needs Dockerfile, more setup |
| ngrok | Instant, zero deploy | Laptop must stay on, random URL on free tier |
| Render | Free tier available | 30-60s cold starts after inactivity |

**Decision:** Vercel is the natural fit — Next.js is their product, the project needs no config changes, and the hobby tier is generous enough for small-circle testing. The 10s function timeout is the main risk for the `/api/scan` streaming route, but NDJSON streaming may keep the connection alive in practice. If it cuts off, upgrading to Pro ($20/mo) gives 60s timeout via `maxDuration`.

## Setup Instructions

### 1. Import project on Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → **Add New Project**
2. **Import Git Repository** → select `aman-ankur/PlateExpectations`
3. Vercel auto-detects Next.js — no build/output settings to change
4. Add **Environment Variables** before deploying (see below)
5. Click **Deploy**

### 2. Environment Variables

Set these in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | GPT-4o-mini Vision validation, DALL-E 3 fallback, TTS |
| `GROQ_API_KEY` | Yes | Llama 3.3 70B for menu parsing + dish enrichment |
| `GOOGLE_CLOUD_VISION_API_KEY` | Yes | Cloud Vision OCR for menu images |
| `UNSPLASH_ACCESS_KEY` | Optional | Unsplash image search fallback |
| `DEMO_MODE` | No | Set to `true` only if you want demo fixture data (no API calls) |

**Do not set `DEMO_MODE`** for production — it replaces all API calls with fixture data.

**Runtime demo toggle:** You can also switch between demo and real mode at runtime without changing env vars. Go to **Settings** (gear icon on home page) → scroll to the bottom → toggle **Demo Mode**. This sets a `pe-demo` cookie that API routes check. An amber banner appears at the top of every page when demo mode is active. Useful for testing the UI flow on a deployed Vercel instance without burning API credits.

### 3. Auto-deploy

- Every push to `main` triggers a production deploy
- Every PR gets a unique preview URL (great for testing feature branches on phone)

### 4. Custom domain (optional)

Vercel dashboard → **Settings → Domains** → add your domain and update DNS.

## Known Limitations on Hobby Tier

- **Serverless function timeout:** 10s on hobby (scan pipeline needs 30-45s). The NDJSON streaming response may keep the connection alive past 10s. If menus with 15+ dishes fail mid-stream, Pro plan ($20/mo) is needed for `maxDuration = 60`.
- **1 team member** on hobby — fine for personal testing.
- **100 deployments/day** — not a concern for small-circle testing.

## Testing on Phone

1. Open the Vercel URL on your phone browser
2. Tap **Add to Home Screen** (iOS Safari share menu, Android Chrome menu) for PWA experience
3. Test: scan a menu photo, check streaming results, try order builder, verify spice meter touch interaction

## Useful Commands

```bash
# Install Vercel CLI (optional — dashboard import is easier)
npm i -g vercel

# Deploy from CLI
vercel          # preview deploy
vercel --prod   # production deploy

# Check deployment status
vercel ls
```
