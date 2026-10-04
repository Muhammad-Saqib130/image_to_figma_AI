// Usage: npm run convert -w server -- <image-path> [--out design.json]
// Sends a screenshot to Gemini and prints the design JSON to stdout.
// Progress messages go to stderr, so stdout can be redirected to a file.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { ApiError } from '@google/genai'
import { DEFAULT_MODEL, InvalidDesignError, screenshotToDesign } from '../ai/screenshotToDesign.js'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string' } },
})

const imagePath = positionals[0]
if (!imagePath) {
  console.error('Usage: npm run convert -w server -- <image-path> [--out design.json]')
  process.exit(1)
}

const apiKey = process.env.AI_API_KEY
if (!apiKey) {
  console.error('AI_API_KEY is not set. Add it to server/.env.')
  process.exit(1)
}

// npm runs workspace scripts from server/, so resolve against where the user ran the command
const fullPath = resolve(process.env.INIT_CWD ?? process.cwd(), imagePath)
const model = process.env.AI_MODEL || DEFAULT_MODEL

try {
  const image = await readFile(fullPath)
  const started = Date.now()
  const design = await screenshotToDesign(image, {
    apiKey,
    model,
    onLog: (message) => console.error(message),
  })
  console.error(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`)

  const json = JSON.stringify(design, null, 2)
  console.log(json)
  if (values.out) {
    const outPath = resolve(process.env.INIT_CWD ?? process.cwd(), values.out)
    await writeFile(outPath, json + '\n')
    console.error(`Saved to ${outPath}`)
  }
} catch (err) {
  if (err instanceof InvalidDesignError) {
    console.error(`${err.message}. Last response:\n${err.lastResponse}`)
  } else if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 400) && /key|auth|credential/i.test(err.message)) {
    console.error(`Gemini rejected AI_API_KEY (HTTP ${err.status}). Check the key in server/.env is current.`)
  } else if (err instanceof ApiError && err.status === 429) {
    console.error('Gemini rate limit or quota reached (HTTP 429). Wait a minute and try again.')
  } else {
    console.error(err instanceof Error ? err.message : err)
  }
  process.exit(1)
}
