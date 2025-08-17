import type { ShapeDefinition, ShapeRegistry } from './types'

class ShapeRegistryImpl implements ShapeRegistry {
  private shapes = new Map<string, ShapeDefinition>()
  
  register(definition: ShapeDefinition): void {
    if (this.shapes.has(definition.type)) {
      console.warn(`Shape type "${definition.type}" is already registered`)
    }
    this.shapes.set(definition.type, definition)
  }
  
  get(type: string): ShapeDefinition | undefined {
    return this.shapes.get(type)
  }
  
  getAll(): ShapeDefinition[] {
    return Array.from(this.shapes.values())
  }
  
  has(type: string): boolean {
    return this.shapes.has(type)
  }
}

// Global singleton
export const shapeRegistry = new ShapeRegistryImpl()