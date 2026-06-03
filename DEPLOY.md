# Deploy PerpCEX (Vercel + API host)

The **frontend** deploys to Vercel. The **backend + Redis + engine** must run on a host that supports long-running processes (Railway, Render, Fly.io, VPS)—not Vercel serverless.

## 1. Backend + engine + Redis

Deploy or run:

| Service | Role |
|---------|------|
| Redis | Command/response streams |
| Engine (`engine/`) | Matching, balances, positions |
| Backend (`backend/`) | REST API on port 3000 |

### Backend env

Copy `backend/.env.example` → `backend/.env`:

```env
DATABASE_URL=...
REDIS_URL=...
JWT_SECRET=...
INCOMING_QUEUE=stream:commands
RESPONSE_QUEUE=stream:responses
PORT=3000
CORS_ORIGIN=https://your-app.vercel.app
```

Set `CORS_ORIGIN` to your Vercel frontend URL (comma-separated for multiple). For local dev, defaults include `http://localhost:5173`.

### API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/signin` | Login |
| GET | `/api/perps/balance?userId=` | Balance from engine |
| GET | `/api/perps/positions?userId=` | Open positions |
| POST | `/api/perps/onramp` | Deposit |
| POST | `/api/perps/order` | Place order (`qty`, `orderType`) |
| POST | `/api/perps/cancel` | Cancel open order |

## 2. Frontend on Vercel

1. Import repo in Vercel
2. **Root Directory:** `frontend`
3. **Build Command:** `bun run build` (or `npm run build`)
4. **Output Directory:** `dist`
5. **Environment variable:**

```env
VITE_API_URL=https://your-backend.example.com
```

No trailing slash. Rebuild after changing env vars.

`vercel.json` and `public/_redirects` are included for SPA routing.

## 3. Smoke test

1. `GET https://your-backend/api/health` → `{ "ok": true }`
2. Open Vercel URL → sign up / sign in
3. Dashboard → onramp → balance updates
4. Trade → place limit order → open orders / positions tabs

## 4. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error in browser | Set `CORS_ORIGIN` on backend to exact Vercel URL |
| API URL not configured banner | Set `VITE_API_URL` on Vercel, redeploy |
| Engine timeout | Ensure engine + Redis are running and queues match |
| Orders fail | Confirm `qty` and `orderType` in order body (backend forwards both) |
