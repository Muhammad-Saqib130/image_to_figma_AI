# Image to Figma AI

Monorepo (npm workspaces) with three packages:

- **`web/`** — React + Vite + TypeScript + Tailwind CSS (v4)
- **`server/`** — Node + Express + TypeScript
- **`shared/`** — `@framecopy/shared`: the design/layer format (zod schemas + types) used by both apps

## Requirements

- Node.js 20.19+ (or 22.12+)

## Getting started

```bash
# Install everything (run once, from the repo root). This also builds shared/.
npm install
```

Run each app in its own terminal, from the repo root:

```bash
# Terminal 1 — API on http://localhost:4000
npm run dev:server

# Terminal 2 — web app on http://localhost:5173
npm run dev:web
```

Before starting the server, copy `server/.env.example` to `server/.env` and paste
your AI API key after `AI_API_KEY=`. `.env` is git-ignored, so the key stays on your machine.

In development, the web app proxies `/api/*` requests to the server, so
`fetch('/api/health')` from the frontend reaches Express.

## Scripts

Root: `npm run build` builds all packages, `npm test` validates the sample designs.

| Folder   | Command         | Description                         |
| -------- | --------------- | ----------------------------------- |
| `shared` | `npm run build` | Compile the schema to `shared/dist` |
| `shared` | `npm run dev`   | Rebuild on change (while editing)   |
| `web`    | `npm run dev`   | Start Vite dev server               |
| `web`    | `npm run build` | Type-check and build to `web/dist`  |
| `server` | `npm run dev`   | Start server with auto-reload (tsx) |
| `server` | `npm run build` | Compile TypeScript to `server/dist` |
| `server` | `npm start`     | Run the compiled server             |

## Design format (`shared/`)

A design is one frame (e.g. `"Desktop"`, 1440 × 900) containing a tree of layers.

| Layer type  | Fields (on top of `id`, `name`, `type`, `x`, `y`, `width`, `height`) |
| ----------- | --------------------------------------------------------------------- |
| `text`      | `text`, `fontFamily`, `fontWeight`, `fontSize`, `color`                |
| `rectangle` | `fill`, `cornerRadius`                                                 |
| `frame`     | `fill`, `cornerRadius`, `children` (nested layers)                     |
| `image`     | `src` (URL or data URI)                                                |

- Child `x`/`y` are relative to their parent frame.
- Colors are hex: `#RGB`, `#RRGGBB` or `#RRGGBBAA`.
- Layer `id`s must be unique across the whole design.

```ts
import { DesignSchema, type Design } from '@framecopy/shared'

const design: Design = DesignSchema.parse(json) // throws if invalid
```

Example: [`shared/samples/landing-page.json`](shared/samples/landing-page.json)
(navbar, hero heading, subtext, button and three feature cards).

> After changing `shared/src`, run `npm run build -w shared` (or keep
> `npm run dev -w shared` running) so web and server pick up the changes.

## Screenshot → design script

Sends a screenshot to Gemini (vision) and prints the design JSON. Needs
`AI_API_KEY` in `server/.env`. Run from the repo root:

```bash
npm run convert -w server -- path/to/screenshot.png
npm run convert -w server -- path/to/screenshot.png --out design.json   # also save to a file
```

The prompt asks for ONLY JSON in the shared layer format. The answer is
validated with zod (plus a check that its size matches the image); if it's
invalid, the model is shown the problems and asked once more. Progress goes to
stderr, the JSON to stdout. Set `AI_MODEL` in `.env` to use another Gemini model.

If Gemini is busy (HTTP 503) or rate-limited (HTTP 429), the call is retried up
to 4 times, waiting 2s, 5s, 10s and 20s. If the model is still overloaded (503)
after that and `GEMINI_FALLBACK_MODEL` is set in `.env`, that model is tried
once. Other errors (e.g. 401 bad key, 404 unknown model) fail immediately.

## API

### `POST /api/convert`

Accepts one image as `multipart/form-data` in the `image` field
(PNG, JPG or WEBP, max 20 MB). The file type is verified from the file's
bytes, not just its name or declared type. The server then sends it to Gemini
(same code as the script above) and returns the design:
`{ "ok": true, "design": { ... } }`.

```bash
curl -F image=@screenshot.png http://localhost:4000/api/convert
```

| Status | When                                                   |
| ------ | ------------------------------------------------------ |
| 200    | `{ "ok": true, "design": {...} }`                      |
| 400    | No file, more than one file, or wrong field            |
| 413    | File larger than 20 MB                                 |
| 415    | Not a PNG, JPG or WEBP image                           |
| 429    | Gemini rate limit, still hit after retries             |
| 500    | Missing/rejected `AI_API_KEY`, or another server error |
| 502    | Gemini returned an invalid design twice                |
| 503    | Gemini overloaded, even after retries (and fallback)   |

Errors return `{ "ok": false, "error": "<message>" }`, with a message that is
safe to show on the page.

## Web app flow

1. Choose a screenshot on the home page and click **Convert to Design**.
2. The button shows **Uploading…** (with progress), then **Recreating…** while
   the server waits for Gemini. Errors appear under the image with a **Try again** button.
3. On success the app opens **`/editor`** with the design (a read-only preview
   plus the JSON). The latest design is kept for the browser tab, so refreshing
   `/editor` still works.

### Testing without a real Gemini key

The Gemini SDK reads `GOOGLE_GEMINI_BASE_URL`, so you can point the server at a
local fake Gemini API for testing:
`GOOGLE_GEMINI_BASE_URL=http://localhost:8099 npm run dev:server`.
