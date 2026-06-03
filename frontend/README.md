# PerpCEX Frontend

React + Vite trading UI for the Perp CEX boilerplate.

## Routes

| Path | Access | Page |
|------|--------|------|
| `/` | Public | Landing |
| `/auth` | Guest only | Sign in / sign up |
| `/login` | Redirect → `/auth` | |
| `/signup` | Redirect → `/auth?mode=signup` | |
| `/dashboard` | Logged in | Portfolio & onramp |
| `/trade` | Logged in | Trading terminal |
| `*` | Public | 404 |

Protected routes redirect to `/auth` and return you after sign-in.

## Local development

```bash
cd frontend
bun install

# Terminal 1 — backend on :3000
cd ../backend && bun run dev

# Terminal 2 — frontend (proxies /api to backend)
bun run dev
```

Open http://localhost:5173

## Production build

```bash
bun run build
bun run preview   # optional: test dist/ locally (still uses /api proxy)
```

Output: `frontend/dist/`

## Deploy

1. Set **`VITE_API_URL`** to your backend origin (no trailing slash), e.g. `https://api.yourdomain.com`
2. Enable **SPA fallback** so `/dashboard` and `/trade` serve `index.html` (included: `vercel.json`, `public/_redirects`)
3. Backend must allow **CORS** from your frontend origin if API is on a different domain

### Vercel

- **Root directory:** `frontend`
- Build command: `bun run build`
- Output directory: `dist`
- Env: `VITE_API_URL=https://your-backend-url` (your Express API, not Vercel)

See `../DEPLOY.md` for full stack setup (backend must allow your Vercel URL in `CORS_ORIGIN`).

### Netlify

Same as Vercel; `public/_redirects` handles SPA routes.

### Same-origin (nginx)

Serve `dist` and reverse-proxy `/api` to the Express backend so `VITE_API_URL` can stay empty.

## Environment

| Variable | Dev | Production |
|----------|-----|------------|
| `VITE_API_URL` | Optional (uses Vite proxy) | **Required** if API is another host |

Copy `.env.example` to `.env.local` for local overrides.
