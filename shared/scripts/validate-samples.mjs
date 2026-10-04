// Checks that every sample design is valid, and that invalid designs are rejected.
// Run with: npm test -w shared
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { DesignSchema } from '../dist/index.js'

const samplesDir = new URL('../samples/', import.meta.url)
const samples = readdirSync(samplesDir).filter((f) => f.endsWith('.json'))
assert.ok(samples.length > 0, 'no sample files found')

for (const file of samples) {
  const result = DesignSchema.safeParse(JSON.parse(readFileSync(new URL(file, samplesDir), 'utf8')))
  if (!result.success) {
    console.error(`✗ ${file}\n${result.error.message}`)
    process.exit(1)
  }
  console.log(`✓ ${file} is valid`)
}

const sample = JSON.parse(readFileSync(new URL('landing-page.json', samplesDir), 'utf8'))

/** Finds a layer by id anywhere in the tree */
function find(layers, id) {
  for (const layer of layers) {
    if (layer.id === id) return layer
    const nested = layer.children && find(layer.children, id)
    if (nested) return nested
  }
}

const invalid = {
  'bad hex color': (d) => (find(d.layers, 'background').fill = 'red'),
  'unknown layer type': (d) => (find(d.layers, 'background').type = 'circle'),
  'text missing fontSize': (d) => delete find(d.layers, 'hero-heading').fontSize,
  'image missing src': (d) => delete find(d.layers, 'nav-logo-mark').src,
  'frame missing children': (d) => delete find(d.layers, 'navbar').children,
  'negative width': (d) => (find(d.layers, 'hero-subtext').width = -1),
  'duplicate id in nested frame': (d) => (find(d.layers, 'feature-card-2-title').id = 'hero-heading'),
  'invalid deeply nested child': (d) => (find(d.layers, 'feature-card-3-icon').cornerRadius = -4),
}

for (const [label, mutate] of Object.entries(invalid)) {
  const design = structuredClone(sample)
  mutate(design)
  const result = DesignSchema.safeParse(design)
  assert.equal(result.success, false, `expected "${label}" to be rejected`)
  const issue = result.error.issues[0]
  console.log(`✓ rejects ${label}: ${issue.message} (at ${issue.path.join('.')})`)
}
