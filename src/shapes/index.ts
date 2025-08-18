import { shapeRegistry } from './registry'
import rectangleDefinition from './rectangle'
import diamondDefinition from './diamond'

// Register all shape definitions
export function registerAllShapes() {
  shapeRegistry.register(rectangleDefinition)
  shapeRegistry.register(diamondDefinition)

  // Add more shapes here as they're implemented:
  // shapeRegistry.register(lineDefinition)
  // shapeRegistry.register(textDefinition)
  // shapeRegistry.register(pencilDefinition)
}

// Re-export for convenience
export { shapeRegistry }
export type { ShapeDefinition, ShapeData, ToolSettingConfig } from './types'
