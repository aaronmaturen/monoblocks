import { reactive, ref } from 'vue'
import { useCoordinateSystem } from '../canvas/useCoordinateSystem'
import { useDrawingTools, type DrawingToolState } from '../drawing/useDrawingTools'
import { useSelection } from './useSelection'
import { useToolStore } from '../../stores/tools'
import { useColorStore } from '../../stores/colors'
import { useShapesStore } from '../../stores/shapes'

export interface MouseEventCallbacks {
  onRender?: () => void
  screenToWorld?: (screenX: number, screenY: number) => { x: number; y: number }
  worldToScreen?: (worldX: number, worldY: number) => { x: number; y: number }
  onContextMenu?: (x: number, y: number, shapeId: string | null) => void
}

export interface ShapeDragState {
  isDragging: boolean
  shapeIds: Set<string>
  originalData: Map<string, Map<string, string>> // Map of shapeId to original data
  dragStartX: number
  dragStartY: number
  offsetX: number
  offsetY: number
}

export interface ShapeResizeState {
  isResizing: boolean
  shapeId: string | null
  anchor:
    | 'topLeft'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomRight'
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'start'
    | 'end'
    | null
  originalBounds: any
  startMouseX: number
  startMouseY: number
}

export function useMouseEvents(
  canvas: HTMLCanvasElement,
  callbacks: MouseEventCallbacks = {},
  drawingStates?: {
    rectangleState: DrawingToolState
    diamondState: DrawingToolState
    lineState: DrawingToolState
    textState: DrawingToolState
    currentStrokeData: Map<string, string>
    placeCharacter: (worldX: number, worldY: number, character: string) => void
    eraseAtPosition: (worldX: number, worldY: number, layers: any[]) => void
    drawRectangle: (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
    ) => Map<string, string>
    drawDiamond: (startX: number, startY: number, endX: number, endY: number) => Map<string, string>
    drawLine: (startX: number, startY: number, endX: number, endY: number) => Map<string, string>
    resetPencilTracking?: () => void
  },
) {
  const { worldToGrid, gridToWorld, gridKey } = useCoordinateSystem()

  // Use provided drawing states or create new ones
  const drawingTools = drawingStates || useDrawingTools()
  const {
    rectangleState,
    diamondState,
    lineState,
    textState,
    currentStrokeData,
    placeCharacter,
    eraseAtPosition,
    drawRectangle,
    drawDiamond,
    drawLine,
  } = drawingTools

  const {
    getShapeBounds,
    getAnchorAtPosition,
    checkShapeAtPosition,
    handleShapeSelection,
    getAnchorCursor,
  } = useSelection()

  const toolStore = useToolStore()
  const colorStore = useColorStore()
  const shapesStore = useShapesStore()

  // Track if we're in a pencil stroke to save state once per stroke
  let pencilStrokeStarted = false

  // Shape interaction states
  const shapeDragState = reactive<ShapeDragState>({
    isDragging: false,
    shapeIds: new Set(),
    originalData: new Map(),
    dragStartX: 0,
    dragStartY: 0,
    offsetX: 0,
    offsetY: 0,
  })

  const shapeResizeState = reactive<ShapeResizeState>({
    isResizing: false,
    shapeId: null,
    anchor: null,
    originalBounds: null,
    startMouseX: 0,
    startMouseY: 0,
  })

  const handleMouseDown = (e: MouseEvent, mouse: any, saveCameraState: () => void) => {
    if (toolStore.currentTool === 'pan') {
      mouse.isDragging = true
      mouse.lastX = e.clientX
      mouse.lastY = e.clientY
      canvas.style.cursor = 'grabbing'
    } else if (toolStore.currentTool === 'pencil') {
      // Start new pencil stroke
      currentStrokeData.clear()
      pencilStrokeStarted = true

      // Reset pencil tracking for new stroke
      if (drawingStates && drawingStates.resetPencilTracking) {
        drawingStates.resetPencilTracking()
      }

      mouse.isDragging = true
      // Place character at click position
      if (callbacks.screenToWorld) {
        const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
        placeCharacter(worldPos.x, worldPos.y, toolStore.selectedCharacter)
        callbacks.onRender?.()
      }
    } else if (toolStore.currentTool === 'eraser') {
      mouse.isDragging = true
      // Erase character at click position
      if (callbacks.screenToWorld) {
        const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
        eraseAtPosition(worldPos.x, worldPos.y, shapesStore.getAllShapes())
        callbacks.onRender?.()
      }
    } else if (toolStore.currentTool === 'eyedropper') {
      colorStore.toggleColorSelector()
      // Don't reset to pan - keep the eyedropper tool selected
    } else if (toolStore.currentTool === 'select') {
      // Handle shape selection, dragging, or resizing
      if (callbacks.screenToWorld) {
        const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
        const grid = worldToGrid(worldPos.x, worldPos.y)
        const selectedShape = shapesStore.getSelectedShape()

        // Check if clicking on a resize anchor
        if (
          selectedShape &&
          (selectedShape.type === 'rectangle' ||
            selectedShape.type === 'line' ||
            selectedShape.type === 'text' ||
            selectedShape.type === 'diamond')
        ) {
          const anchor = getAnchorAtPosition(grid.x, grid.y, selectedShape)
          if (anchor) {
            // Start resizing
            shapeResizeState.isResizing = true
            shapeResizeState.shapeId = selectedShape.id
            shapeResizeState.anchor = anchor
            shapeResizeState.originalBounds = getShapeBounds(selectedShape)
            shapeResizeState.startMouseX = grid.x
            shapeResizeState.startMouseY = grid.y
            mouse.isDragging = true
            callbacks.onRender?.()
            return
          }
        }

        // Check if clicking on a shape
        const shape = checkShapeAtPosition(grid.x, grid.y, shapesStore.getAllVisibleShapes())
        const isMultiSelect = e.shiftKey
        const selectedShapes = shapesStore.getSelectedShapes()

        // Check if clicking on any selected shape (to start dragging)
        if (shape && selectedShapes.some((s) => s.id === shape.id) && !isMultiSelect) {
          // Start dragging all selected shapes
          shapeDragState.isDragging = true
          shapeDragState.shapeIds.clear()
          shapeDragState.originalData.clear()

          // Store original data for all selected shapes
          for (const selectedShape of selectedShapes) {
            shapeDragState.shapeIds.add(selectedShape.id)
            shapeDragState.originalData.set(selectedShape.id, new Map(selectedShape.data))
          }

          shapeDragState.dragStartX = grid.x
          shapeDragState.dragStartY = grid.y
          shapeDragState.offsetX = 0
          shapeDragState.offsetY = 0
          mouse.isDragging = true
        } else {
          handleShapeSelection(shape, isMultiSelect)
        }
        callbacks.onRender?.()
      }
    } else if (toolStore.currentTool === 'rectangle') {
      // Start rectangle drawing
      if (callbacks.screenToWorld) {
        const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
        rectangleState.startX = worldPos.x
        rectangleState.startY = worldPos.y
        rectangleState.endX = worldPos.x
        rectangleState.endY = worldPos.y
        rectangleState.isDrawing = true
        mouse.isDragging = true
      }
    } else if (toolStore.currentTool === 'diamond') {
      // Start diamond drawing
      if (callbacks.screenToWorld) {
        const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
        diamondState.startX = worldPos.x
        diamondState.startY = worldPos.y
        diamondState.endX = worldPos.x
        diamondState.endY = worldPos.y
        diamondState.isDrawing = true
        mouse.isDragging = true
      }
    } else if (toolStore.currentTool === 'line') {
      // Start line drawing
      if (callbacks.screenToWorld) {
        const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
        lineState.startX = worldPos.x
        lineState.startY = worldPos.y
        lineState.endX = worldPos.x
        lineState.endY = worldPos.y
        lineState.isDrawing = true
        mouse.isDragging = true
      }
    } else if (toolStore.currentTool === 'text') {
      // Start text box drawing
      if (callbacks.screenToWorld) {
        const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
        textState.startX = worldPos.x
        textState.startY = worldPos.y
        textState.endX = worldPos.x
        textState.endY = worldPos.y
        textState.isDrawing = true
        mouse.isDragging = true
      }
    }
  }

  const handleMouseMove = (
    e: MouseEvent,
    mouse: any,
    camera: any,
    panCamera: (deltaX: number, deltaY: number) => void,
  ) => {
    mouse.x = e.clientX
    mouse.y = e.clientY

    // Trigger render for pencil preview when not dragging
    if (!mouse.isDragging && toolStore.currentTool === 'pencil') {
      callbacks.onRender?.()
    }

    // Update cursor for select tool when hovering over selected shape or anchors
    if (
      !mouse.isDragging &&
      !shapeResizeState.isResizing &&
      toolStore.currentTool === 'select' &&
      callbacks.screenToWorld
    ) {
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      const grid = worldToGrid(worldPos.x, worldPos.y)
      const selectedShape = shapesStore.getSelectedShape()

      if (
        selectedShape &&
        (selectedShape.type === 'rectangle' ||
          selectedShape.type === 'line' ||
          selectedShape.type === 'text' ||
          selectedShape.type === 'image' ||
          selectedShape.type === 'diamond')
      ) {
        const anchor = getAnchorAtPosition(grid.x, grid.y, selectedShape)
        if (anchor) {
          canvas.style.cursor = getAnchorCursor(anchor)
          return
        }
      }

      // Check if hovering over a shape
      const shape = checkShapeAtPosition(grid.x, grid.y, shapesStore.getAllVisibleShapes())
      if (shape) {
        canvas.style.cursor = 'move'
        return
      } else {
        canvas.style.cursor = 'default'
      }
    }

    // Handle dragging behavior
    if (mouse.isDragging && toolStore.currentTool === 'pan') {
      const deltaX = e.clientX - mouse.lastX
      const deltaY = e.clientY - mouse.lastY

      panCamera(deltaX, deltaY)

      mouse.lastX = e.clientX
      mouse.lastY = e.clientY

      callbacks.onRender?.()
    } else if (mouse.isDragging && toolStore.currentTool === 'pencil' && callbacks.screenToWorld) {
      // Continue placing characters while dragging
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      placeCharacter(worldPos.x, worldPos.y, toolStore.selectedCharacter)
      callbacks.onRender?.()
    } else if (mouse.isDragging && toolStore.currentTool === 'eraser' && callbacks.screenToWorld) {
      // Continue erasing while dragging
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      eraseAtPosition(worldPos.x, worldPos.y, shapesStore.getAllShapes())
      callbacks.onRender?.()
    } else if (
      mouse.isDragging &&
      toolStore.currentTool === 'rectangle' &&
      rectangleState.isDrawing &&
      callbacks.screenToWorld
    ) {
      // Update rectangle end position while dragging
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      rectangleState.endX = worldPos.x
      rectangleState.endY = worldPos.y
      callbacks.onRender?.()
    } else if (
      mouse.isDragging &&
      toolStore.currentTool === 'diamond' &&
      diamondState.isDrawing &&
      callbacks.screenToWorld
    ) {
      // Update diamond end position while dragging - enforce 1:1 aspect ratio
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)

      // Calculate the distance from start in both dimensions
      const deltaX = worldPos.x - diamondState.startX
      const deltaY = worldPos.y - diamondState.startY

      // Use the larger absolute delta to maintain square/diamond shape
      const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY))

      // Apply the same distance in both dimensions, preserving the sign
      diamondState.endX = diamondState.startX + (deltaX >= 0 ? maxDelta : -maxDelta)
      diamondState.endY = diamondState.startY + (deltaY >= 0 ? maxDelta : -maxDelta)

      callbacks.onRender?.()
    } else if (
      mouse.isDragging &&
      toolStore.currentTool === 'line' &&
      lineState.isDrawing &&
      callbacks.screenToWorld
    ) {
      // Update line end position while dragging
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      lineState.endX = worldPos.x
      lineState.endY = worldPos.y
      callbacks.onRender?.()
    } else if (
      mouse.isDragging &&
      toolStore.currentTool === 'text' &&
      textState.isDrawing &&
      callbacks.screenToWorld
    ) {
      // Update text box end position while dragging
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      textState.endX = worldPos.x
      textState.endY = worldPos.y
      callbacks.onRender?.()
    } else if (
      mouse.isDragging &&
      toolStore.currentTool === 'select' &&
      shapeResizeState.isResizing &&
      callbacks.screenToWorld
    ) {
      // Resize the selected shape
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      const grid = worldToGrid(worldPos.x, worldPos.y)
      const selectedShape = shapesStore.getSelectedShape()

      if (selectedShape && shapeResizeState.originalBounds) {
        const deltaX = grid.x - shapeResizeState.startMouseX
        const deltaY = grid.y - shapeResizeState.startMouseY
        const originalBounds = shapeResizeState.originalBounds

        if (selectedShape.type === 'rectangle') {
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

          // Regenerate rectangle with new bounds
          // Use proper gridToWorld conversion
          const startWorld = gridToWorld(newMinX, newMinY)
          const endWorld = gridToWorld(newMaxX, newMaxY)
          const newRectangleData = drawRectangle(startWorld.x, startWorld.y, endWorld.x, endWorld.y)
          selectedShape.data = newRectangleData

          callbacks.onRender?.()
        } else if (selectedShape.type === 'diamond') {
          // For diamonds, we only handle edge anchors and maintain 1:1 aspect ratio
          let newMinX = originalBounds.minX
          let newMaxX = originalBounds.maxX
          let newMinY = originalBounds.minY
          let newMaxY = originalBounds.maxY

          const centerX = Math.round((originalBounds.minX + originalBounds.maxX) / 2)
          const centerY = Math.round((originalBounds.minY + originalBounds.maxY) / 2)

          switch (shapeResizeState.anchor) {
            case 'left':
              // Moving left edge - adjust both X and Y to maintain square
              newMinX = originalBounds.minX + deltaX
              const leftDist = centerX - newMinX
              newMaxX = centerX + leftDist
              newMinY = centerY - leftDist
              newMaxY = centerY + leftDist
              break
            case 'right':
              // Moving right edge - adjust both X and Y to maintain square
              newMaxX = originalBounds.maxX + deltaX
              const rightDist = newMaxX - centerX
              newMinX = centerX - rightDist
              newMinY = centerY - rightDist
              newMaxY = centerY + rightDist
              break
            case 'top':
              // Moving top edge - adjust both X and Y to maintain square
              newMinY = originalBounds.minY + deltaY
              const topDist = centerY - newMinY
              newMaxY = centerY + topDist
              newMinX = centerX - topDist
              newMaxX = centerX + topDist
              break
            case 'bottom':
              // Moving bottom edge - adjust both X and Y to maintain square
              newMaxY = originalBounds.maxY + deltaY
              const bottomDist = newMaxY - centerY
              newMinY = centerY - bottomDist
              newMinX = centerX - bottomDist
              newMaxX = centerX + bottomDist
              break
          }

          // Ensure minimum size
          if (newMaxX <= newMinX) {
            newMaxX = newMinX + 1
            newMaxY = newMinY + 1
          }
          if (newMaxY <= newMinY) {
            newMaxY = newMinY + 1
            newMaxX = newMinX + 1
          }

          // Regenerate diamond with new bounds
          const startWorld = gridToWorld(newMinX, newMinY)
          const endWorld = gridToWorld(newMaxX, newMaxY)
          const newDiamondData = drawDiamond(startWorld.x, startWorld.y, endWorld.x, endWorld.y)
          selectedShape.data = newDiamondData

          callbacks.onRender?.()
        }
        // Similar handling for line and text shapes would go here
      }
    } else if (
      mouse.isDragging &&
      toolStore.currentTool === 'select' &&
      shapeDragState.isDragging &&
      callbacks.screenToWorld
    ) {
      // Move all selected shapes
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      const grid = worldToGrid(worldPos.x, worldPos.y)

      // Calculate the offset from the original drag position
      const offsetX = grid.x - shapeDragState.dragStartX
      const offsetY = grid.y - shapeDragState.dragStartY

      // Only update if the offset has changed
      if (offsetX !== shapeDragState.offsetX || offsetY !== shapeDragState.offsetY) {
        shapeDragState.offsetX = offsetX
        shapeDragState.offsetY = offsetY

        // Update all selected shapes' data with the new positions
        const selectedShapes = shapesStore.getSelectedShapes()
        for (const selectedShape of selectedShapes) {
          const originalData = shapeDragState.originalData.get(selectedShape.id)
          if (originalData) {
            // Clear current shape data
            selectedShape.data.clear()

            // Apply offset to all original positions
            for (const [key, char] of originalData) {
              const [origX, origY] = key.split(',').map(Number)
              const newX = origX + offsetX
              const newY = origY + offsetY
              selectedShape.data.set(gridKey(newX, newY), char)
            }
          }
        }

        callbacks.onRender?.()
      }
    }
  }

  const handleMouseUp = (drawLine: any, drawText: any) => {
    // Complete rectangle drawing if we were drawing one
    if (rectangleState.isDrawing && toolStore.currentTool === 'rectangle') {
      const rectangleData = drawRectangle(
        rectangleState.startX,
        rectangleState.startY,
        rectangleState.endX,
        rectangleState.endY,
      )
      const newShape = shapesStore.addShape(
        'rectangle',
        rectangleData,
        colorStore.selectedColor.hex,
        undefined,
        {
          borderStyle: toolStore.rectangleBorderStyle,
          fillChar: toolStore.rectangleFillChar,
          shadow: toolStore.rectangleShadow,
          text: toolStore.rectangleText,
          textAlign: toolStore.rectangleTextAlign,
          textPosition: toolStore.rectangleTextPosition,
          showText: toolStore.rectangleShowText,
          showFill: toolStore.rectangleShowFill,
          showBorder: toolStore.rectangleShowBorder,
          showShadow: toolStore.rectangleShowShadow,
        },
        {
          borderColor: toolStore.rectangleBorderColor,
          fillColor: toolStore.rectangleFillColor,
          textColor: toolStore.rectangleTextColor,
        },
      )
      rectangleState.isDrawing = false

      // Switch to select tool and select the new shape
      toolStore.setTool('select')
      shapesStore.selectShape(newShape.id)

      callbacks.onRender?.()
    }

    // Complete diamond drawing if we were drawing one
    if (diamondState.isDrawing && toolStore.currentTool === 'diamond') {
      const diamondData = drawDiamond(
        diamondState.startX,
        diamondState.startY,
        diamondState.endX,
        diamondState.endY,
      )
      const newShape = shapesStore.addShape(
        'diamond',
        diamondData,
        colorStore.selectedColor.hex,
        undefined,
        {
          borderStyle: toolStore.diamondBorderStyle,
          fillChar: toolStore.diamondFillChar,
          shadow: toolStore.diamondShadow,
          text: toolStore.diamondText,
          textAlign: toolStore.diamondTextAlign,
          textPosition: toolStore.diamondTextPosition,
          showText: toolStore.diamondShowText,
          showFill: toolStore.diamondShowFill,
          showBorder: toolStore.diamondShowBorder,
          showShadow: toolStore.diamondShowShadow,
          borderColor: toolStore.diamondBorderColor,
          fillColor: toolStore.diamondFillColor,
          textColor: toolStore.diamondTextColor,
        },
      )
      diamondState.isDrawing = false

      // Switch to select tool and select the new shape
      toolStore.setTool('select')
      shapesStore.selectShape(newShape.id)

      callbacks.onRender?.()
    }

    // Complete line drawing if we were drawing one
    if (lineState.isDrawing && toolStore.currentTool === 'line') {
      const lineData = drawLine(lineState.startX, lineState.startY, lineState.endX, lineState.endY)
      const newShape = shapesStore.addShape(
        'line',
        lineData,
        colorStore.selectedColor.hex,
        undefined,
        {
          lineStyle: toolStore.lineStyle,
          lineStartStyle: toolStore.lineStartStyle,
          lineEndStyle: toolStore.lineEndStyle,
        },
      )
      lineState.isDrawing = false

      // Switch to select tool and select the new shape
      toolStore.setTool('select')
      shapesStore.selectShape(newShape.id)

      callbacks.onRender?.()
    }

    // Complete text box drawing - create a rectangle with "TEXT" content
    if (textState.isDrawing && toolStore.currentTool === 'text') {
      // Create a rectangle with default "TEXT" content
      const rectangleData = drawRectangle(
        textState.startX,
        textState.startY,
        textState.endX,
        textState.endY,
        {
          borderStyle: 'single',
          fillChar: '',
          shadow: false,
          text: 'TEXT',
          textAlign: 'center',
          textPosition: 'middle',
          showText: true,
          showFill: false,
          showBorder: true,
          showShadow: false,
        },
      )

      const newShape = shapesStore.addShape(
        'rectangle',
        rectangleData,
        colorStore.selectedColor.hex,
        undefined,
        {
          borderStyle: 'single',
          fillChar: '',
          shadow: false,
          text: 'TEXT',
          textAlign: 'center',
          textPosition: 'middle',
          showText: true,
          showFill: false,
          showBorder: true,
          showShadow: false,
        },
        {
          borderColor: colorStore.selectedColor.hex,
          textColor: colorStore.selectedColor.hex,
        },
      )

      textState.isDrawing = false

      // Switch to select tool and select the new shape
      toolStore.setTool('select')
      shapesStore.selectShape(newShape.id)

      callbacks.onRender?.()
    }

    // Complete pencil stroke
    if (pencilStrokeStarted && toolStore.currentTool === 'pencil' && currentStrokeData.size > 0) {
      const newShape = shapesStore.addShape(
        'pencil',
        currentStrokeData,
        colorStore.selectedColor.hex,
        undefined,
        {
          character: toolStore.selectedCharacter,
        },
      )
      currentStrokeData.clear()

      // Reset pencil tracking for next stroke
      if (drawingStates && drawingStates.resetPencilTracking) {
        drawingStates.resetPencilTracking()
      }

      // Switch to select tool and select the new shape
      toolStore.setTool('select')
      shapesStore.selectShape(newShape.id)

      // shapesStore handles saving automatically - no need to call saveToStorage()
    }

    // Complete shape resizing
    if (shapeResizeState.isResizing && toolStore.currentTool === 'select') {
      // Reset resize state
      shapeResizeState.isResizing = false
      shapeResizeState.shapeId = null
      shapeResizeState.anchor = null
      shapeResizeState.originalBounds = null
      shapeResizeState.startMouseX = 0
      shapeResizeState.startMouseY = 0

      // shapesStore handles saving automatically - no need to call saveToStorage()
    }

    // Complete shape dragging
    if (shapeDragState.isDragging && toolStore.currentTool === 'select') {
      // Reset drag state
      shapeDragState.isDragging = false
      shapeDragState.shapeIds.clear()
      shapeDragState.originalData.clear()
      shapeDragState.offsetX = 0
      shapeDragState.offsetY = 0

      // shapesStore handles saving automatically - no need to call saveToStorage()
    }

    pencilStrokeStarted = false
  }

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()

    // Get the shape at the clicked position
    if (callbacks.screenToWorld && callbacks.onContextMenu) {
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)
      const grid = worldToGrid(worldPos.x, worldPos.y)
      const shape = checkShapeAtPosition(grid.x, grid.y, shapesStore.getAllVisibleShapes())

      // If we right-clicked on a shape, select it first
      if (shape) {
        // Select the shape if it's not already selected
        if (!shapesStore.isShapeSelected(shape.id)) {
          shapesStore.selectShape(shape.id, false)
          callbacks.onRender?.()
        }
        callbacks.onContextMenu(e.clientX, e.clientY, shape.id)
      } else {
        // Right-clicked on empty canvas
        callbacks.onContextMenu(e.clientX, e.clientY, null)
      }
    }
  }

  const handleWheel = (
    e: WheelEvent,
    camera: any,
    zoomAt: (worldX: number, worldY: number, zoomFactor: number) => void,
  ) => {
    e.preventDefault()

    // Get mouse position in world coordinates before zoom
    if (callbacks.screenToWorld) {
      const worldPos = callbacks.screenToWorld(e.clientX, e.clientY)

      // Zoom in/out
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      zoomAt(worldPos.x, worldPos.y, zoomFactor)

      callbacks.onRender?.()
    }
  }

  const updateCursor = () => {
    // Special cursor for dragging shapes
    if (shapeDragState.isDragging) {
      canvas.style.cursor = 'move'
      return
    }

    const cursors: Record<string, string> = {
      pan: 'grab',
      pencil: 'crosshair',
      rectangle: 'crosshair',
      line: 'crosshair',
      text: 'crosshair',
      eraser: 'crosshair',
      eyedropper: 'crosshair',
      select: 'default',
      reset: 'pointer',
      undo: 'pointer',
      redo: 'pointer',
    }
    canvas.style.cursor = cursors[toolStore.currentTool] || 'default'
  }

  const setupMouseListeners = (
    mouse: any,
    camera: any,
    panCamera: any,
    zoomAt: any,
    saveCameraState: any,
    drawLine: any,
    drawText: any,
  ) => {
    const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e, mouse, saveCameraState)
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e, mouse, camera, panCamera)
    const mouseUpHandler = () => {
      handleMouseUp(drawLine, drawText)
      mouse.isDragging = false
      updateCursor()
    }
    const wheelHandler = (e: WheelEvent) => handleWheel(e, camera, zoomAt)
    const contextMenuHandler = (e: MouseEvent) => handleContextMenu(e)

    canvas.addEventListener('mousedown', mouseDownHandler)
    canvas.addEventListener('mousemove', mouseMoveHandler)
    canvas.addEventListener('mouseup', mouseUpHandler)
    canvas.addEventListener('mouseleave', mouseUpHandler)
    canvas.addEventListener('wheel', wheelHandler, { passive: false })
    canvas.addEventListener('contextmenu', contextMenuHandler)

    return () => {
      canvas.removeEventListener('mousedown', mouseDownHandler)
      canvas.removeEventListener('mousemove', mouseMoveHandler)
      canvas.removeEventListener('mouseup', mouseUpHandler)
      canvas.removeEventListener('mouseleave', mouseUpHandler)
      canvas.removeEventListener('wheel', wheelHandler)
      canvas.removeEventListener('contextmenu', contextMenuHandler)
    }
  }

  return {
    // State
    shapeDragState,
    shapeResizeState,

    // Functions
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel,
    updateCursor,
    setupMouseListeners,
  }
}
