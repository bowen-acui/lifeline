# Deployment & Product Launch Plan

## 1. Technical Architecture (MVP)

### Frontend (Current)
- **Hosting**: Vercel or Netlify (Recommended for static sites/SPA).
    - *Why*: Free tier is generous, global CDN, automatic SSL, git integration.
- **Domain**: Purchase a clean, short domain (e.g., `lifeline.art` or `lifeline.io`).

### Backend (Future / Phase 2)
- **API**: Serverless Functions (Vercel Functions / AWS Lambda).
    - *Why*: Pay-per-use, scales to zero cost when no users.
- **Database**: Supabase (PostgreSQL) or PlanetScale (MySQL).
    - *Why*: Serverless, easy to manage, generous free tier.
- **AI Integration**: DeepSeek API (deepseek-chat) via backend proxy.
    - *Why*: Best in class reasoning for complex astrological synthesis.

## 2. Step-by-Step Launch Guide

### Phase 1: Static MVP (Current State)
1.  **Domain Registration**:
    -   Go to Namecheap, GoDaddy, or Porkbun.
    -   Search for a name that reflects "Minimalism" and "Destiny".
    -   Cost: ~$10-50/year.

2.  **Hosting Setup**:
    -   Create account on [Vercel](https://vercel.com).
    -   Connect your GitHub repository.
    -   Import `minimal-astrology-web`.
    -   Vercel will automatically detect Vite and build settings.
    -   Deploy.
    -   Add your custom domain in Vercel settings.

3.  **Analytics**:
    -   Add Vercel Analytics or a privacy-focused tool like Plausible.
    -   *Goal*: Track user engagement without compromising the "clean" feel with cookie banners.

### Phase 2: Dynamic Features (The "Analysis" Step)
To enable the real AI analysis (currently simulated):

1.  **API Route**:
    -   ✅ Created `api/analyze.ts` using OpenAI SDK (compatible with DeepSeek).
    -   ✅ Integrated with frontend `App.tsx`.

2.  **Configuration**:
    -   You must set `DEEPSEEK_API_KEY` in your Vercel Project Settings > Environment Variables.
    -   For local development, create a `.env` file in the root:
        ```
        DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
        ```
    -   Run locally with `npx vercel dev` to test the API functions.

3.  **Rate Limiting & Monetization**:
    -   Use Upstash (Redis) for rate limiting (1 free request per IP).
    -   Implement a simple "Share to Unlock" mechanism on the client side (localStorage check).

## 3. Cost Estimate (Monthly)

| Service | MVP (0-1k users) | Growth (10k+ users) |
| :--- | :--- | :--- |
| **Hosting** | $0 (Vercel Hobby) | $20 (Vercel Pro) |
| **Database** | $0 (Supabase Free) | $25 (Compute) |
| **AI API** | Pay as you go (~$5) | Scale with usage |
| **Domain** | ~$1/mo (amortized) | ~$1/mo |
| **Total** | **~$1 - $10** | **~$50+** |

## 4. Future Roadmap

-   **User Accounts**: Save charts (requires Auth - Supabase Auth recommended).
-   **Export**: Generate high-res PDF of the "Life Map".
-   **Social**: "Compare Charts" feature.
