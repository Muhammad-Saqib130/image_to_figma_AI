# Image to Figma AI

Monorepo with two apps:

- **`web/`** — React + Vite + TypeScript + Tailwind CSS (v4)
- **`server/`** — Node + Express + TypeScript

## Requirements

- Node.js 20.19+ (or 22.12+)

## Getting started

```bash
# Install dependencies
cd server && npm install
cd ../web && npm install
```

Run each app in its own terminal:

```bash
# Terminal 1 — API on http://localhost:4000
cd server
cp .env.example .env   # optional
npm run dev

# Terminal 2 — web app on http://localhost:5173
cd web
npm run dev
```

In development, the web app proxies `/api/*` requests to the server, so
`fetch('/api/health')` from the frontend reaches Express.

## Scripts

| Folder   | Command         | Description                         |
| -------- | --------------- | ----------------------------------- |
| `web`    | `npm run dev`   | Start Vite dev server               |
| `web`    | `npm run build` | Type-check and build to `web/dist`  |
| `server` | `npm run dev`   | Start server with auto-reload (tsx) |
| `server` | `npm run build` | Compile TypeScript to `server/dist` |
| `server` | `npm start`     | Run the compiled server             |

## API

### `POST /api/convert`

Accepts one image as `multipart/form-data` in the `image` field
(PNG, JPG or WEBP, max 20 MB). The file type is verified from the file's
bytes, not just its name or declared type. Currently returns `{ "ok": true }`.

```bash
curl -F image=@screenshot.png http://localhost:4000/api/convert
```

| Status | When                                        |
| ------ | ------------------------------------------- |
| 200    | `{ "ok": true }`                            |
| 400    | No file, more than one file, or wrong field |
| 413    | File larger than 20 MB                      |
| 415    | Not a PNG, JPG or WEBP image                |

Errors return `{ "ok": false, "error": "<message>" }`.
