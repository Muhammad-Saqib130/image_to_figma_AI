import { z } from 'zod'

/** #RGB, #RRGGBB or #RRGGBBAA */
export const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Must be a hex color like #1A2B3C')

/**
 * Fields every layer has. x/y are relative to the parent frame
 * (or to the design itself for top-level layers).
 */
const baseLayerShape = {
  id: z.string().min(1),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
}

export const TextLayerSchema = z.object({
  ...baseLayerShape,
  type: z.literal('text'),
  text: z.string(),
  fontFamily: z.string().min(1),
  fontWeight: z.number().int().min(1).max(1000),
  fontSize: z.number().positive(),
  color: HexColorSchema,
})

export const RectangleLayerSchema = z.object({
  ...baseLayerShape,
  type: z.literal('rectangle'),
  fill: HexColorSchema,
  cornerRadius: z.number().nonnegative(),
})

export const ImageLayerSchema = z.object({
  ...baseLayerShape,
  type: z.literal('image'),
  /** URL or data URI */
  src: z.string().min(1),
})

export type TextLayer = z.infer<typeof TextLayerSchema>
export type RectangleLayer = z.infer<typeof RectangleLayerSchema>
export type ImageLayer = z.infer<typeof ImageLayerSchema>

// Written by hand because the type refers to itself (frames contain layers),
// which zod can't infer on its own
export type FrameLayer = Omit<RectangleLayer, 'type'> & {
  type: 'frame'
  /** Child positions are relative to this frame */
  children: Layer[]
}

export type Layer = FrameLayer | TextLayer | RectangleLayer | ImageLayer
export type LayerType = Layer['type']

export const FrameLayerSchema = z.object({
  ...baseLayerShape,
  type: z.literal('frame'),
  fill: HexColorSchema,
  cornerRadius: z.number().nonnegative(),
  get children(): z.ZodArray<z.ZodType<Layer>> {
    return z.array(LayerSchema)
  },
})

export const LayerSchema: z.ZodType<Layer> = z.discriminatedUnion('type', [
  FrameLayerSchema,
  TextLayerSchema,
  RectangleLayerSchema,
  ImageLayerSchema,
])

/** A design is one top-level frame (e.g. "Desktop", 1440 x 900) containing layers. */
export const DesignSchema = z
  .object({
    name: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    layers: z.array(LayerSchema),
  })
  .superRefine((design, ctx) => {
    // Layer ids must be unique across the whole tree
    const seen = new Set<string>()
    const visit = (layers: Layer[], path: (string | number)[]) => {
      layers.forEach((layer, i) => {
        if (seen.has(layer.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate layer id "${layer.id}"`,
            path: [...path, i, 'id'],
          })
        }
        seen.add(layer.id)
        if (layer.type === 'frame') visit(layer.children, [...path, i, 'children'])
      })
    }
    visit(design.layers, ['layers'])
  })

export type Design = z.infer<typeof DesignSchema>
