/** Instructions sent with the screenshot. Keep in sync with shared/src/design.ts. */
export function buildDesignPrompt(width: number, height: number): string {
  return `You are a UI reverse-engineering tool. Recreate the attached screenshot as an editable design.

Return ONLY a JSON object. No markdown, no code fences, no comments, no explanation.

The JSON must match this format exactly:

type Design = {
  name: string        // e.g. "Desktop"
  width: number       // must be ${width}
  height: number      // must be ${height}
  layers: Layer[]     // drawn in order: first = bottom, last = top
}

type Layer = FrameLayer | TextLayer | RectangleLayer | ImageLayer

// Fields on EVERY layer:
//   id: string       unique across the whole design, kebab-case (e.g. "hero-heading")
//   name: string     human-readable (e.g. "Hero heading")
//   type: "frame" | "text" | "rectangle" | "image"
//   x, y: number     position in pixels, RELATIVE TO THE PARENT FRAME (top-level layers: relative to the design)
//   width, height: number  size in pixels, never negative

type FrameLayer = { ...common, type: "frame", fill: HexColor, cornerRadius: number, children: Layer[] }
type TextLayer = { ...common, type: "text", text: string, fontFamily: string, fontWeight: number, fontSize: number, color: HexColor }
type RectangleLayer = { ...common, type: "rectangle", fill: HexColor, cornerRadius: number }
type ImageLayer = { ...common, type: "image", src: string }

type HexColor = string  // "#RRGGBB", or "#RRGGBBAA" for transparency. Never rgb(), names or gradients.

Rules:
- The screenshot is ${width} x ${height} pixels. Measure positions and sizes in those pixels.
- Start with a full-size "background" rectangle at x 0, y 0.
- Use frames to group things that belong together (navbar, buttons, cards, sections). A button is a frame with a text child.
- Every visible piece of text is its own text layer with the exact text from the screenshot. Do not invent or paraphrase text.
- fontWeight is a number like 400, 500, 600 or 700. fontFamily is your best guess of a common font (e.g. "Inter").
- For photos, illustrations, logos and icons, use an image layer with src "placeholder:<short description>".
- For a frame with no visible background, use fill "#00000000".
- Include every field listed for each layer type. Do not add any other fields.`
}

export function buildRetryPrompt(problems: string): string {
  return `Your previous answer was not valid. Problems:
${problems}

Return the complete corrected design as ONLY a JSON object in the same format. No markdown, no explanation.`
}
