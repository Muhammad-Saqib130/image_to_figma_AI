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

Optionally copy `server/.env.example` to `server/.env` first.

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
