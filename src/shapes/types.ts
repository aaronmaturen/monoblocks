import type { Ref } from 'vue'

// Core shape data structure
export interface ShapeData {
  id: string
  type: string
  data: Map<string, string> // grid position -> character
  color: string
  layerId: string
  visible: boolean
  locked: boolean
  selected: boolean
  toolSettings?: Record<string, any>
}

// Tool settings UI configuration
export interface ToolSettingConfig {
  key: string
  type: 'text' | 'select' | 'checkbox' | 'number' | 'color'
  label: string
  default: any
  options?: Array<{ value: string; label: string }> // for select
  min?: number // for number
  max?: number // for number
}

// Shape definition interface
export interface ShapeDefinition {
  // Basic info
  type: string
  name: string
  icon: string
  description: string
  
  // Tool settings configuration
  toolSettings: ToolSettingConfig[]
  
  // Core methods
  createPreview: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    settings: Record<string, any>,
    color: string
  ) => Map<string, string>
  
  draw: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    settings: Record<string, any>
  ) => Map<string, string>
  
  regenerate?: (
    shape: ShapeData,
    newSettings: Record<string, any>
  ) => Map<string, string>
  
  // Interaction handlers
  onMouseDown?: (x: number, y: number, settings: Record<string, any>) => void
  onMouseMove?: (x: number, y: number, settings: Record<string, any>) => void
  onMouseUp?: (x: number, y: number, settings: Record<string, any>) => void
  
  // Optional: custom rendering if needed
  customRender?: (
    ctx: CanvasRenderingContext2D,
    shape: ShapeData,
    worldToScreen: (x: number, y: number) => { x: number; y: number }
  ) => void
  
  // Optional: validation
  validate?: (settings: Record<string, any>) => boolean
  
  // Optional: bounds calculation
  getBounds?: (shape: ShapeData) => {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

// Shape registry type
export interface ShapeRegistry {
  register(definition: ShapeDefinition): void
  get(type: string): ShapeDefinition | undefined
  getAll(): ShapeDefinition[]
  has(type: string): boolean
}