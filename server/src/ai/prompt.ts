/** Positions and sizes are requested on this grid and converted to pixels on the server */
export const GRID = 1000

/** Instructions sent with the screenshot. Keep in sync with shared/src/design.ts. */
export function buildDesignPrompt(width: number, height: number): string {
  const pxPerUnitX = (width / GRID).toFixed(3)
  const pxPerUnitY = (height / GRID).toFixed(3)

  return `You are a precise UI reverse-engineering tool. Recreate the attached screenshot as an editable design made of layers.

Return ONLY a JSON object. No markdown, no code fences, no comments, no explanation.

## Coordinates: use a 0-${GRID} grid

Measure x, y, width and height on a 0-${GRID} grid, the same way you return bounding boxes:
- x and width: 0 = left edge of the screenshot, ${GRID} = right edge.
- y and height: 0 = top edge of the screenshot, ${GRID} = bottom edge.
- The two axes are scaled separately (the screenshot is ${width} x ${height} pixels, so 1 unit = ${pxPerUnitX} px horizontally and ${pxPerUnitY} px vertically).
- Children of a frame use the same grid units, measured from the frame's top-left corner.
- fontSize and cornerRadius are NOT on the grid: give them in real pixels of the ${width} x ${height} screenshot.

## Format

type Design = {
  name: string        // e.g. "Desktop", "Mobile", "Resume"
  width: ${GRID}
  height: ${GRID}
  layers: Layer[]     // drawn in order: first = bottom, last = top
}

type Layer = FrameLayer | TextLayer | RectangleLayer | ImageLayer

// Fields on EVERY layer:
//   id: string       unique across the whole design, kebab-case (e.g. "about-heading")
//   name: string     human-readable (e.g. "About heading")
//   type: "frame" | "text" | "rectangle" | "image"
//   x, y, width, height: number   grid units (see above), never negative

type FrameLayer = { ...common, type: "frame", fill: HexColor, cornerRadius: number, children: Layer[] }
type TextLayer = { ...common, type: "text", text: string, fontFamily: string, fontWeight: number, fontSize: number, color: HexColor }
type RectangleLayer = { ...common, type: "rectangle", fill: HexColor, cornerRadius: number }
type ImageLayer = { ...common, type: "image", src: string }

type HexColor = string  // "#RRGGBB", or "#RRGGBBAA" for transparency. Never rgb(), names or gradients.

## Rules

Text:
- Include EVERY piece of visible text, however small: headings, labels, list items, dates, footers, percentages. Never skip, merge away, summarize or paraphrase text. Copy it character for character.
- Each list item / bullet point is its own text layer. Include the bullet character (e.g. "• ") at the start of its text if one is shown.
- A paragraph can be one text layer. Where a line wraps in the screenshot, put "\\n" at that point so the line breaks match.
- A text layer's box must tightly fit the text as it appears: x/y = top-left of the first letter's line, width = the widest line, height = all its lines.
- fontWeight is a number (300, 400, 500, 600, 700, 800). Guess fontFamily from the letter shapes (e.g. "Poppins", "Montserrat", "Inter", "Roboto", "Open Sans", "Lato").

Shapes:
- Start with a full-size "background" rectangle at x 0, y 0, width ${GRID}, height ${GRID}.
- Every visible coloured area is a rectangle or frame: sidebars, columns, cards, banners, buttons.
- Thin lines (dividers, underlines below headings, borders drawn as lines) are rectangles with their real thickness, e.g. a 3 px line is height ${(3 / Number(pxPerUnitY)).toFixed(1)} on the grid.
- Use frames to group things that belong together (navbar, sidebar, card, button). A button is a frame with a text child. For a frame with no visible background, use fill "#00000000".

Images:
- Photos, avatars, logos, icons and illustrations are image layers with src "placeholder:<short description>".
- Give each image layer a tight box around just the picture. The server cuts that exact area out of the screenshot, so the box must not include surrounding text.

Before answering, check that every text in the screenshot appears in your layers, and that layers line up with the screenshot.
Include every field listed for each layer type. Do not add any other fields.`
}

export function buildRetryPrompt(problems: string): string {
  return `Your previous answer was not valid. Problems:
${problems}

Return the complete corrected design as ONLY a JSON object in the same format (0-${GRID} grid coordinates). No markdown, no explanation.`
}
