import { reactive } from 'vue'
import { useCoordinateSystem } from '../canvas/useCoordinateSystem'
import { useSelection, type AnchorType, type ShapeBounds } from './useSelection'
import { useDrawingTools } from '../drawing/useDrawingTools'
import { useShapesStore, type Shape } from '../../stores/shapes'
import { useToolStore } from '../../stores/tools'

export interface ShapeDragState {
  isDragging: boolean
  shapeId: string | null
  originalData: Map<string, string> | null
  dragStartX: number
  dragStartY: number
  offsetX: number
  offsetY: number
}

export interface ShapeResizeState {
  isResizing: boolean
  shapeId: string | null
  anchor: AnchorType | null
  originalBounds: ShapeBounds | null
  startMouseX: number
  startMouseY: number
}

export function useShapeManipulation() {
  const { worldToGrid, gridToWorld, gridKey } = useCoordinateSystem()
  const { getShapeBounds } = useSelection()
  const { drawRectangle, drawLine, drawText } = useDrawingTools()
  const shapesStore = useShapesStore()
  const toolStore = useToolStore()

  // Shape dragging state
  const shapeDragState = reactive<ShapeDragState>({
    isDragging: false,
    shapeId: null,
    originalData: null,
    dragStartX: 0,
    dragStartY: 0,
    offsetX: 0,
    offsetY: 0
  })

  // Shape resizing state
  const shapeResizeState = reactive<ShapeResizeState>({
    isResizing: false,
    shapeId: null,
    anchor: null,
    originalBounds: null,
    startMouseX: 0,
    startMouseY: 0
  })

  // Start dragging a shape
  const startShapeDrag = (shape: Shape, gridX: number, gridY: number) => {
    shapeDragState.isDragging = true
    shapeDragState.shapeId = shape.id
    shapeDragState.originalData = new Map(shape.data) // Store original positions
    shapeDragState.dragStartX = gridX
    shapeDragState.dragStartY = gridY
    shapeDragState.offsetX = 0
    shapeDragState.offsetY = 0
  }

  // Start resizing a shape
  const startShapeResize = (shape: Shape, anchor: AnchorType, gridX: number, gridY: number) => {
    shapeResizeState.isResizing = true
    shapeResizeState.shapeId = shape.id
    shapeResizeState.anchor = anchor
    shapeResizeState.originalBounds = getShapeBounds(shape)
    shapeResizeState.startMouseX = gridX
    shapeResizeState.startMouseY = gridY
  }

  // Update shape position during drag
  const updateShapeDrag = (gridX: number, gridY: number) => {
    if (!shapeDragState.isDragging || !shapeDragState.originalData) return

    // Calculate the offset from the original drag position
    const offsetX = gridX - shapeDragState.dragStartX
    const offsetY = gridY - shapeDragState.dragStartY

    // Only update if the offset has changed
    if (offsetX !== shapeDragState.offsetX || offsetY !== shapeDragState.offsetY) {
      shapeDragState.offsetX = offsetX
      shapeDragState.offsetY = offsetY

      // Update the shape's data with the new positions
      const selectedShape = shapesStore.getSelectedShape()
      if (selectedShape && shapeDragState.originalData) {
        // Clear current shape data
        selectedShape.data.clear()

        // Apply offset to all original positions
        for (const [key, char] of shapeDragState.originalData) {
          const [origX, origY] = key.split(',').map(Number)
          const newX = origX + offsetX
          const newY = origY + offsetY
          const newKey = `${newX},${newY}`
          selectedShape.data.set(newKey, char)
        }
      }
    }
  }

  // Update shape size during resize
  const updateShapeResize = (gridX: number, gridY: number) => {
    if (!shapeResizeState.isResizing || !shapeResizeState.originalBounds) return

    const selectedShape = shapesStore.getSelectedShape()
    if (!selectedShape) return

    const deltaX = gridX - shapeResizeState.startMouseX
    const deltaY = gridY - shapeResizeState.startMouseY
    const originalBounds = shapeResizeState.originalBounds

    if (selectedShape.type === 'rectangle') {
      updateRectangleResize(selectedShape, deltaX, deltaY, originalBounds)
    } else if (selectedShape.type === 'line') {
      updateLineResize(selectedShape, deltaX, deltaY, originalBounds)
    } else if (selectedShape.type === 'text') {
      updateTextResize(selectedShape, deltaX, deltaY, originalBounds)
    } else if (selectedShape.type === 'image') {
      updateImageResize(selectedShape, deltaX, deltaY, originalBounds)
    }
  }

  // Update rectangle during resize
  const updateRectangleResize = (shape: Shape, deltaX: number, deltaY: number, originalBounds: ShapeBounds) => {
    // Calculate new bounds based on which anchor is being dragged
    let newMinX = originalBounds.minX
    let newMaxX = originalBounds.maxX
    let newMinY = originalBounds.minY
    let newMaxY = originalBounds.maxY

    switch (shapeResizeState.anchor) {
      case 'topLeft':
        newMinX = originalBounds.minX + deltaX
        newMinY = originalBounds.minY + deltaY
        break
      case 'topRight':
        newMaxX = originalBounds.maxX + deltaX
        newMinY = originalBounds.minY + deltaY
        break
      case 'bottomLeft':
        newMinX = originalBounds.minX + deltaX
        newMaxY = originalBounds.maxY + deltaY
        break
      case 'bottomRight':
        newMaxX = originalBounds.maxX + deltaX
        newMaxY = originalBounds.maxY + deltaY
        break
      case 'left':
        newMinX = originalBounds.minX + deltaX
        break
      case 'right':
        newMaxX = originalBounds.maxX + deltaX
        break
      case 'top':
        newMinY = originalBounds.minY + deltaY
        break
      case 'bottom':
        newMaxY = originalBounds.maxY + deltaY
        break
    }

    // Ensure minimum size
    if (newMaxX <= newMinX) newMaxX = newMinX + 1
    if (newMaxY <= newMinY) newMaxY = newMinY + 1

    // Recreate rectangle with new bounds, preserving ALL tool settings including checkboxes
    const rectangleData = drawRectangle(
      gridToWorld(newMinX, newMinY).x,
      gridToWorld(newMinX, newMinY).y,
      gridToWorld(newMaxX, newMaxY).x,
      gridToWorld(newMaxY, newMaxY).y,
      {
        borderStyle: shape.toolSettings?.borderStyle || 'single',
        fillChar: shape.toolSettings?.fillChar ?? '',
        shadow: shape.toolSettings?.shadow ?? false,
        text: shape.toolSettings?.text ?? '',
        textAlign: shape.toolSettings?.textAlign || 'center',
        textPosition: shape.toolSettings?.textPosition || 'middle',
        // Include the checkbox states
        showText: shape.toolSettings?.showText ?? false,
        showFill: shape.toolSettings?.showFill ?? true,
        showBorder: shape.toolSettings?.showBorder ?? true,
        showShadow: shape.toolSettings?.showShadow ?? false
      }
    )

    // Update shape data
    shape.data.clear()
    for (const [key, char] of rectangleData) {
      shape.data.set(key, char)
    }
  }

  // Update line during resize
  const updateLineResize = (shape: Shape, deltaX: number, deltaY: number, originalBounds: ShapeBounds) => {
    // For lines, update start or end point
    let startX = originalBounds.minX
    let startY = originalBounds.minY
    let endX = originalBounds.maxX
    let endY = originalBounds.maxY

    if (shapeResizeState.anchor === 'start') {
      startX = originalBounds.minX + deltaX
      startY = originalBounds.minY + deltaY
    } else if (shapeResizeState.anchor === 'end') {
      endX = originalBounds.maxX + deltaX
      endY = originalBounds.maxY + deltaY
    }

    // Recreate line with new endpoints, preserving tool settings
    const lineStyle = shape.toolSettings?.lineStyle || toolStore.lineStyle
    const lineStartStyle = shape.toolSettings?.lineStartStyle || toolStore.lineStartStyle
    const lineEndStyle = shape.toolSettings?.lineEndStyle || toolStore.lineEndStyle

    // Temporarily set tool settings to match shape settings
    const oldLineStyle = toolStore.lineStyle
    const oldLineStartStyle = toolStore.lineStartStyle
    const oldLineEndStyle = toolStore.lineEndStyle

    toolStore.lineStyle = lineStyle as any
    toolStore.lineStartStyle = lineStartStyle as any
    toolStore.lineEndStyle = lineEndStyle as any

    const lineData = drawLine(
      gridToWorld(startX, startY).x,
      gridToWorld(startX, startY).y,
      gridToWorld(endX, endY).x,
      gridToWorld(endX, endY).y
    )

    // Restore tool settings
    toolStore.lineStyle = oldLineStyle
    toolStore.lineStartStyle = oldLineStartStyle
    toolStore.lineEndStyle = oldLineEndStyle

    // Update shape data
    shape.data.clear()
    for (const [key, char] of lineData) {
      shape.data.set(key, char)
    }
  }

  // Update text during resize
  const updateTextResize = (shape: Shape, deltaX: number, deltaY: number, originalBounds: ShapeBounds) => {
    // Calculate new bounds based on which anchor is being dragged
    let newMinX = originalBounds.minX
    let newMaxX = originalBounds.maxX
    let newMinY = originalBounds.minY
    let newMaxY = originalBounds.maxY

    switch (shapeResizeState.anchor) {
      case 'topLeft':
        newMinX = originalBounds.minX + deltaX
        newMinY = originalBounds.minY + deltaY
        break
      case 'topRight':
        newMaxX = originalBounds.maxX + deltaX
        newMinY = originalBounds.minY + deltaY
        break
      case 'bottomLeft':
        newMinX = originalBounds.minX + deltaX
        newMaxY = originalBounds.maxY + deltaY
        break
      case 'bottomRight':
        newMaxX = originalBounds.maxX + deltaX
        newMaxY = originalBounds.maxY + deltaY
        break
      case 'left':
        newMinX = originalBounds.minX + deltaX
        break
      case 'right':
        newMaxX = originalBounds.maxX + deltaX
        break
      case 'top':
        newMinY = originalBounds.minY + deltaY
        break
      case 'bottom':
        newMaxY = originalBounds.maxY + deltaY
        break
    }

    // Ensure minimum size
    if (newMaxX <= newMinX) newMaxX = newMinX + 1
    if (newMaxY <= newMinY) newMaxY = newMinY + 1

    // Recreate text box with new bounds, preserving tool settings
    const content = shape.toolSettings?.content || ''
    const horizontalAlign = shape.toolSettings?.horizontalAlign || 'left'
    const verticalAlign = shape.toolSettings?.verticalAlign || 'top'
    const showBorder = shape.toolSettings?.showBorder ?? true

    const textData = drawText(
      gridToWorld(newMinX, newMinY).x,
      gridToWorld(newMinX, newMinY).y,
      gridToWorld(newMaxX, newMaxY).x,
      gridToWorld(newMaxX, newMaxY).y,
      content,
      horizontalAlign,
      verticalAlign,
      showBorder
    )

    // Update shape data
    shape.data.clear()
    for (const [key, char] of textData) {
      shape.data.set(key, char)
    }
  }

  // Update image during resize - images maintain their aspect ratio and content
  const updateImageResize = (shape: Shape, deltaX: number, deltaY: number, originalBounds: ShapeBounds) => {
    // For images, we scale the content proportionally
    // Images can only be resized from corners to maintain aspect ratio
    const originalWidth = originalBounds.maxX - originalBounds.minX + 1
    const originalHeight = originalBounds.maxY - originalBounds.minY + 1
    
    let newMinX = originalBounds.minX
    let newMaxX = originalBounds.maxX
    let newMinY = originalBounds.minY
    let newMaxY = originalBounds.maxY
    
    // Only allow corner resizing for images to maintain aspect ratio
    switch (shapeResizeState.anchor) {
      case 'topLeft':
        newMinX = originalBounds.minX + deltaX
        newMinY = originalBounds.minY + deltaY
        break
      case 'topRight':
        newMaxX = originalBounds.maxX + deltaX
        newMinY = originalBounds.minY + deltaY
        break
      case 'bottomLeft':
        newMinX = originalBounds.minX + deltaX
        newMaxY = originalBounds.maxY + deltaY
        break
      case 'bottomRight':
        newMaxX = originalBounds.maxX + deltaX
        newMaxY = originalBounds.maxY + deltaY
        break
      default:
        // Don't allow edge resizing for images
        return
    }
    
    // Ensure minimum size
    if (newMaxX <= newMinX) newMaxX = newMinX + 1
    if (newMaxY <= newMinY) newMaxY = newMinY + 1
    
    // Get the original text content
    const originalText = shape.toolSettings?.originalText || ''
    const lines = originalText.split('\n')
    
    // Calculate scaling factors
    const newWidth = newMaxX - newMinX + 1
    const newHeight = newMaxY - newMinY + 1
    const scaleX = newWidth / originalWidth
    const scaleY = newHeight / originalHeight
    
    // Recreate the image data at the new size
    // For simplicity, we'll use nearest-neighbor scaling
    shape.data.clear()
    
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        // Map back to original coordinates
        const origY = Math.floor(y / scaleY)
        const origX = Math.floor(x / scaleX)
        
        if (origY < lines.length && origX < lines[origY].length) {
          const char = lines[origY][origX]
          if (char && char !== ' ') {
            const gridX = newMinX + x
            const gridY = newMinY + y
            const key = gridKey(gridX, gridY)
            shape.data.set(key, char)
          }
        }
      }
    }
  }

  // Regenerate shape data with current tool settings
  const regenerateShapeData = (shape: Shape) => {
    if (shape.type === 'rectangle') {
      const bounds = getShapeBounds(shape)

      // Regenerate rectangle data with shape's settings
      const rectangleData = drawRectangle(
        gridToWorld(bounds.minX, bounds.minY).x,
        gridToWorld(bounds.minX, bounds.minY).y,
        gridToWorld(bounds.maxX, bounds.maxY).x,
        gridToWorld(bounds.maxY, bounds.maxY).y,
        {
          borderStyle: shape.toolSettings?.borderStyle || 'single',
          fillChar: shape.toolSettings?.fillChar ?? '',
          shadow: shape.toolSettings?.shadow ?? false,
          text: shape.toolSettings?.text ?? '',
          textAlign: shape.toolSettings?.textAlign || 'center',
          textPosition: shape.toolSettings?.textPosition || 'middle',
          // Include the checkbox states - these control whether features are rendered
          showText: shape.toolSettings?.showText ?? false,
          showFill: shape.toolSettings?.showFill ?? true,
          showBorder: shape.toolSettings?.showBorder ?? true,
          showShadow: shape.toolSettings?.showShadow ?? false
        }
      )

      // Update shape data
      shape.data.clear()
      for (const [key, char] of rectangleData) {
        shape.data.set(key, char)
      }
    } else if (shape.type === 'line') {
      const bounds = getShapeBounds(shape)

      // Temporarily set tool settings to match shape settings
      const oldLineStyle = toolStore.lineStyle
      const oldLineStartStyle = toolStore.lineStartStyle
      const oldLineEndStyle = toolStore.lineEndStyle

      toolStore.setLineStyle((shape.toolSettings?.lineStyle as any) || 'single')
      toolStore.setLineStartStyle((shape.toolSettings?.lineStartStyle as any) || 'none')
      toolStore.setLineEndStyle((shape.toolSettings?.lineEndStyle as any) || 'arrow')

      // Regenerate line data
      const lineData = drawLine(
        gridToWorld(bounds.minX, bounds.minY).x,
        gridToWorld(bounds.minX, bounds.minY).y,
        gridToWorld(bounds.maxX, bounds.maxY).x,
        gridToWorld(bounds.maxY, bounds.maxY).y
      )

      // Restore tool settings
      toolStore.setLineStyle(oldLineStyle)
      toolStore.setLineStartStyle(oldLineStartStyle)
      toolStore.setLineEndStyle(oldLineEndStyle)

      // Update shape data
      shape.data.clear()
      for (const [key, char] of lineData) {
        shape.data.set(key, char)
      }
    } else if (shape.type === 'text') {
      // Regenerate text with new settings
      const bounds = getShapeBounds(shape)

      // Recreate text box with current settings
      const textData = drawText(
        gridToWorld(bounds.minX, bounds.minY).x,
        gridToWorld(bounds.minX, bounds.minY).y,
        gridToWorld(bounds.maxX, bounds.maxY).x,
        gridToWorld(bounds.maxY, bounds.maxY).y,
        shape.toolSettings?.content || '',
        shape.toolSettings?.horizontalAlign || 'left',
        shape.toolSettings?.verticalAlign || 'top',
        shape.toolSettings?.showBorder ?? true
      )

      // Update shape data
      shape.data.clear()
      for (const [key, char] of textData) {
        shape.data.set(key, char)
      }
    }
  }

  // Complete drag operation
  const completeDrag = () => {
    if (shapeDragState.isDragging) {
      shapeDragState.isDragging = false
      shapeDragState.shapeId = null
      shapeDragState.originalData = null
      shapeDragState.offsetX = 0
      shapeDragState.offsetY = 0
      
      // shapesStore handles saving automatically - no need to call saveToStorage()
    }
  }

  // Complete resize operation
  const completeResize = () => {
    if (shapeResizeState.isResizing) {
      shapeResizeState.isResizing = false
      shapeResizeState.shapeId = null
      shapeResizeState.anchor = null
      shapeResizeState.originalBounds = null
      shapeResizeState.startMouseX = 0
      shapeResizeState.startMouseY = 0
      
      // shapesStore handles saving automatically - no need to call saveToStorage()
    }
  }

  return {
    // State
    shapeDragState,
    shapeResizeState,
    
    // Functions
    startShapeDrag,
    startShapeResize,
    updateShapeDrag,
    updateShapeResize,
    regenerateShapeData,
    completeDrag,
    completeResize,
  }
}