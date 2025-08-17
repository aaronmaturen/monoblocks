import { computed } from 'vue'
import { useCoordinateSystem } from '../canvas/useCoordinateSystem'
import { useShapesStore, type Shape } from '../../stores/shapes'
import { useToolStore } from '../../stores/tools'

export interface ShapeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type AnchorType = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'left' | 'right' | 'top' | 'bottom' | 'start' | 'end'

export function useSelection() {
  const { worldToGrid, gridToWorld, gridKey } = useCoordinateSystem()
  const shapesStore = useShapesStore()
  const toolStore = useToolStore()

  // Get currently selected shapes
  const selectedShapes = computed(() => shapesStore.getSelectedShapes())

  // Get bounds of a shape in grid coordinates
  const getShapeBounds = (shape: Shape): ShapeBounds => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    
    for (const [key, char] of shape.data) {
      // Include empty strings (invisible placeholders) but exclude shadow characters
      // Empty strings maintain bounds but don't render
      if ((char !== null && char !== undefined && char !== '▓') || char === '') {
        const [x, y] = key.split(',').map(Number)
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
    
    return { minX, maxX, minY, maxY }
  }

  // Check if a position is over an anchor
  const getAnchorAtPosition = (gridX: number, gridY: number, shape: Shape): AnchorType | null => {
    if (!shape || (shape.type !== 'rectangle' && shape.type !== 'line' && shape.type !== 'text' && shape.type !== 'diamond')) return null
    
    const bounds = getShapeBounds(shape)
    const tolerance = 0.5 // Grid units tolerance for clicking anchors (reduced since anchors are now outside)
    
    if (shape.type === 'rectangle' || shape.type === 'text') {
      const midX = Math.round((bounds.minX + bounds.maxX) / 2)
      const midY = Math.round((bounds.minY + bounds.maxY) / 2)
      
      // Check corners (anchors are now one grid cell outside)
      if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'topLeft'
      if (Math.abs(gridX - (bounds.maxX + 1)) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'topRight'
      if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - (bounds.maxY + 1)) <= tolerance) return 'bottomLeft'
      if (Math.abs(gridX - (bounds.maxX + 1)) <= tolerance && Math.abs(gridY - (bounds.maxY + 1)) <= tolerance) return 'bottomRight'
      
      // Check edges (anchors are now one grid cell outside)
      if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - midY) <= tolerance) return 'left'
      if (Math.abs(gridX - (bounds.maxX + 1)) <= tolerance && Math.abs(gridY - midY) <= tolerance) return 'right'
      if (Math.abs(gridX - midX) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'top'
      if (Math.abs(gridX - midX) <= tolerance && Math.abs(gridY - (bounds.maxY + 1)) <= tolerance) return 'bottom'
    } else if (shape.type === 'diamond') {
      const midX = Math.round((bounds.minX + bounds.maxX) / 2)
      const midY = Math.round((bounds.minY + bounds.maxY) / 2)
      
      // For diamonds, only check edge anchors (no corners)
      if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - midY) <= tolerance) return 'left'
      if (Math.abs(gridX - (bounds.maxX + 1)) <= tolerance && Math.abs(gridY - midY) <= tolerance) return 'right'
      if (Math.abs(gridX - midX) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'top'
      if (Math.abs(gridX - midX) <= tolerance && Math.abs(gridY - (bounds.maxY + 1)) <= tolerance) return 'bottom'
    } else if (shape.type === 'line') {
      // For lines, anchors are at the start and end points, slightly offset
      if (bounds.minX === bounds.maxX) {
        // Vertical line
        if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - bounds.minY) <= tolerance) return 'start'
        if (Math.abs(gridX - (bounds.maxX + 1)) <= tolerance && Math.abs(gridY - bounds.maxY) <= tolerance) return 'end'
      } else if (bounds.minY === bounds.maxY) {
        // Horizontal line
        if (Math.abs(gridX - bounds.minX) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'start'
        if (Math.abs(gridX - bounds.maxX) <= tolerance && Math.abs(gridY - (bounds.maxY + 1)) <= tolerance) return 'end'
      } else {
        // Diagonal line - place anchors diagonally away
        if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'start'
        if (Math.abs(gridX - (bounds.maxX + 1)) <= tolerance && Math.abs(gridY - (bounds.maxY + 1)) <= tolerance) return 'end'
      }
    } else if (shape.type === 'image') {
      // For images, only corner anchors (no edge anchors)
      if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'topLeft'
      if (Math.abs(gridX - (bounds.maxX + 1)) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'topRight'
      if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - (bounds.maxY + 1)) <= tolerance) return 'bottomLeft'
      if (Math.abs(gridX - (bounds.maxX + 1)) <= tolerance && Math.abs(gridY - (bounds.maxY + 1)) <= tolerance) return 'bottomRight'
    }
    
    return null
  }

  // Draw resize anchors for selected shape
  const drawResizeAnchors = (ctx: CanvasRenderingContext2D, shape: Shape, camera: { zoom: number }) => {
    const bounds = getShapeBounds(shape)
    const anchorSize = 8 / camera.zoom // Keep size constant in screen space
    
    ctx.fillStyle = '#007acc'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2 / camera.zoom
    
    // Function to draw a single anchor
    const drawAnchor = (gridX: number, gridY: number) => {
      const worldPos = gridToWorld(gridX, gridY)
      ctx.fillRect(
        worldPos.x - anchorSize / 2,
        worldPos.y - anchorSize / 2,
        anchorSize,
        anchorSize
      )
      ctx.strokeRect(
        worldPos.x - anchorSize / 2,
        worldPos.y - anchorSize / 2,
        anchorSize,
        anchorSize
      )
    }
    
    if (shape.type === 'rectangle' || shape.type === 'text') {
      const midX = Math.round((bounds.minX + bounds.maxX) / 2)
      const midY = Math.round((bounds.minY + bounds.maxY) / 2)
      
      // Corner anchors (positioned one grid cell outside the shape)
      drawAnchor(bounds.minX - 1, bounds.minY - 1) // Top-left
      drawAnchor(bounds.maxX + 1, bounds.minY - 1) // Top-right
      drawAnchor(bounds.minX - 1, bounds.maxY + 1) // Bottom-left
      drawAnchor(bounds.maxX + 1, bounds.maxY + 1) // Bottom-right
      
      // Edge anchors (positioned one grid cell outside the shape)
      drawAnchor(bounds.minX - 1, midY) // Left
      drawAnchor(bounds.maxX + 1, midY) // Right
      drawAnchor(midX, bounds.minY - 1) // Top
      drawAnchor(midX, bounds.maxY + 1) // Bottom
    } else if (shape.type === 'diamond') {
      const midX = Math.round((bounds.minX + bounds.maxX) / 2)
      const midY = Math.round((bounds.minY + bounds.maxY) / 2)
      
      // For diamonds, only show edge anchors (no corners)
      // Edge anchors (positioned one grid cell outside the shape)
      drawAnchor(bounds.minX - 1, midY) // Left
      drawAnchor(bounds.maxX + 1, midY) // Right
      drawAnchor(midX, bounds.minY - 1) // Top
      drawAnchor(midX, bounds.maxY + 1) // Bottom
    } else if (shape.type === 'line') {
      // For lines, show anchors at start and end points
      if (bounds.minX === bounds.maxX) {
        // Vertical line
        drawAnchor(bounds.minX - 1, bounds.minY) // Start point
        drawAnchor(bounds.maxX + 1, bounds.maxY) // End point
      } else if (bounds.minY === bounds.maxY) {
        // Horizontal line
        drawAnchor(bounds.minX, bounds.minY - 1) // Start point
        drawAnchor(bounds.maxX, bounds.maxY + 1) // End point
      } else {
        // Diagonal line - place anchors diagonally away
        drawAnchor(bounds.minX - 1, bounds.minY - 1) // Start point
        drawAnchor(bounds.maxX + 1, bounds.maxY + 1) // End point
      }
    } else if (shape.type === 'image') {
      // For images, only show corner anchors
      drawAnchor(bounds.minX - 1, bounds.minY - 1) // Top left
      drawAnchor(bounds.maxX + 1, bounds.minY - 1) // Top right
      drawAnchor(bounds.minX - 1, bounds.maxY + 1) // Bottom left
      drawAnchor(bounds.maxX + 1, bounds.maxY + 1) // Bottom right
    }
  }

  // Draw selection highlight for selected shapes
  const drawSelectionHighlight = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, camera: { x: number, y: number, zoom: number }, screenToWorld: (screenX: number, screenY: number) => { x: number, y: number }) => {
    const shapes = selectedShapes.value
    if (shapes.length === 0) return

    // Calculate visible bounds in world space
    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(canvas.width, canvas.height)
    
    // Convert to grid bounds
    const { gridWidth, gridHeight } = useCoordinateSystem()
    const startGridX = Math.floor(topLeft.x / gridWidth)
    const endGridX = Math.ceil(bottomRight.x / gridWidth)
    const startGridY = Math.floor(topLeft.y / gridHeight)
    const endGridY = Math.ceil(bottomRight.y / gridHeight)

    // Get computed style for dark mode support
    const computedStyle = getComputedStyle(document.documentElement)
    const selectionColor = computedStyle.getPropertyValue('--selection-highlight').trim()
    
    // Set up selection highlight style
    ctx.strokeStyle = selectionColor || '#007acc'
    ctx.lineWidth = 2 / camera.zoom
    ctx.globalAlpha = 0.8

    // Draw highlight around each character in all selected shapes
    for (const selectedShape of shapes) {
      // For shapes with only invisible placeholders, draw outline around bounds
      const bounds = getShapeBounds(selectedShape)
      let hasVisibleContent = false
      
      // Check if shape has any visible content
      for (const [key, char] of selectedShape.data) {
        if (char && char !== '' && char !== '▓') {
          hasVisibleContent = true
          break
        }
      }
      
      if (!hasVisibleContent && bounds.minX !== Infinity) {
        // Draw outline around the entire shape bounds for invisible shapes
        const topLeft = gridToWorld(bounds.minX, bounds.minY)
        const bottomRight = gridToWorld(bounds.maxX + 1, bounds.maxY + 1)
        
        ctx.strokeRect(
          topLeft.x - gridWidth / 2,
          topLeft.y - gridHeight / 2,
          bottomRight.x - topLeft.x,
          bottomRight.y - topLeft.y
        )
      } else {
        // Draw highlight around each visible character
        for (let gridX = startGridX; gridX <= endGridX; gridX++) {
          for (let gridY = startGridY; gridY <= endGridY; gridY++) {
            const key = gridKey(gridX, gridY)
            const character = selectedShape.data.get(key)
            
            if (character && character !== '' && character !== '▓') {
              const worldPos = gridToWorld(gridX, gridY)
              const halfWidth = gridWidth / 2
              const halfHeight = gridHeight / 2
              
              ctx.strokeRect(
                worldPos.x - halfWidth,
                worldPos.y - halfHeight,
                gridWidth,
                gridHeight
              )
            }
          }
        }
      }
    }

    ctx.globalAlpha = 1 // Reset alpha
    
    // Draw resize anchors only if single shape is selected
    const primaryShape = shapesStore.getSelectedShape()
    if (toolStore.currentTool === 'select' && shapes.length === 1 && primaryShape && 
        (primaryShape.type === 'rectangle' || primaryShape.type === 'line' || primaryShape.type === 'text' || primaryShape.type === 'diamond')) {
      drawResizeAnchors(ctx, primaryShape, camera)
    }
  }

  // Check if a shape exists at the given grid position
  const checkShapeAtPosition = (gridX: number, gridY: number, shapes: Shape[]): Shape | null => {
    const key = gridKey(gridX, gridY)
    
    // Check from topmost shape to bottom (reverse order for proper selection)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i]
      const character = shape.data.get(key)
      // Check for any character including empty strings (invisible placeholders)
      // but not shadow characters
      if (character !== undefined && character !== null && character !== '▓') {
        // For shapes with only invisible placeholders, check if click is within bounds
        if (character === '') {
          const bounds = getShapeBounds(shape)
          if (gridX >= bounds.minX && gridX <= bounds.maxX && 
              gridY >= bounds.minY && gridY <= bounds.maxY) {
            return shape
          }
        } else {
          // Regular visible character - select directly
          return shape
        }
      }
    }
    
    return null
  }

  // Handle multi-select logic (shift-click)
  const handleShapeSelection = (shape: Shape | null, isMultiSelect: boolean) => {
    if (shape) {
      shapesStore.selectShape(shape.id)
    } else if (!isMultiSelect) {
      shapesStore.clearSelection() // Deselect if clicking empty area (only if not multi-selecting)
    }
  }

  // Get cursor style for anchor hover
  const getAnchorCursor = (anchor: AnchorType): string => {
    switch (anchor) {
      case 'topLeft':
      case 'bottomRight':
        return 'nwse-resize'
      case 'topRight':
      case 'bottomLeft':
        return 'nesw-resize'
      case 'left':
      case 'right':
        return 'ew-resize'
      case 'top':
      case 'bottom':
        return 'ns-resize'
      case 'start':
      case 'end':
        return 'move'
      default:
        return 'default'
    }
  }

  return {
    // State
    selectedShapes,
    
    // Functions
    getShapeBounds,
    getAnchorAtPosition,
    checkShapeAtPosition,
    drawResizeAnchors,
    drawSelectionHighlight,
    handleShapeSelection,
    getAnchorCursor,
  }
}