# NodePress Admin

React admin panel for NodePress — built with Vite, React 19, React Query, and MSW.

## Development

```bash
cd admin
npm install
npm run dev
```

By default the admin runs in **MSW mode**: all API requests are intercepted by MSW
handlers and no backend is needed.

## Environment flags

Copy `.env.example` to `.env.local` and adjust as needed.

| Variable           | Default           | Description                                                                                                                       |
| ------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_USE_MSW`     | `true`            | Set to `"false"` to disable MSW and hit the real backend.                                                                         |
| `VITE_API_URL`     | _(empty)_         | Base URL for API calls. Empty = `window.location.origin` (works with MSW). Set to `http://localhost:3000` for a separate backend. |
| `VITE_ADMIN_TOKEN` | `dev-admin-token` | Bearer token for write operations against the real backend.                                                                       |

## Demo mode (end-to-end with real backend)

```bash
# Terminal 1 — backend with demo hooks
NODEPRESS_DEMO_MODE=true npm run dev

# Terminal 2 — admin pointing at real backend
cd admin
VITE_USE_MSW=false VITE_API_URL=http://localhost:3000 npm run dev
```

The admin will send `Authorization: Bearer dev-admin-token` (or `VITE_ADMIN_TOKEN` if set).
The backend validates against `NODEPRESS_ADMIN_TOKEN`.

## Testing

```bash
# Unit + integration (Vitest)
npm run test

# E2E (Playwright — Chromium)
npm run test:e2e
```

MSW handlers are active by default in Vitest. Playwright uses `page.route` mocks
and blocks the MSW service worker (`serviceWorkers: 'block'`).
