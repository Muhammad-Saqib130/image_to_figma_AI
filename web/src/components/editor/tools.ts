import type { ComponentType, SVGProps } from 'react'
import { FrameIcon, ImageIcon, PointerIcon, RectangleIcon, TypeIcon } from '../icons'

export type Tool = 'select' | 'frame' | 'text' | 'image' | 'rectangle'

export const TOOLS: { id: Tool; label: string; shortcut: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'select', label: 'Select', shortcut: 'V', Icon: PointerIcon },
  { id: 'frame', label: 'Frame', shortcut: 'F', Icon: FrameIcon },
  { id: 'text', label: 'Text', shortcut: 'T', Icon: TypeIcon },
  { id: 'image', label: 'Image', shortcut: 'I', Icon: ImageIcon },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', Icon: RectangleIcon },
]
