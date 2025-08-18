import { useCoordinateSystem } from '../canvas/useCoordinateSystem'
import { useSelection } from '../interaction/useSelection'
import { useShapesStore } from '../../stores/shapes'
import { useToolStore, RECTANGLE_BORDER_STYLES, LINE_STYLES } from '../../stores/tools'
import { useColorStore } from '../../stores/colors'
import type { DrawingToolState } from '../drawing/useDrawingTools'

export interface RenderCallbacks {
  screenToWorld?: (screenX: number, screenY: number) => { x: number; y: number }
  worldToScreen?: (worldX: number, worldY: number) => { x: number; y: number }
  worldToGrid?: (worldX: number, worldY: number) => { x: number; y: number }
  gridToWorld?: (gridX: number, gridY: number) => { x: number; y: number }
  gridKey?: (gridX: number, gridY: number) => string
}

export function useRenderPipeline(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  camera: { x: number; y: number; zoom: number },
  callbacks: RenderCallbacks = {},
) {
  const { worldToGrid, gridToWorld, gridKey, gridWidth, gridHeight } = useCoordinateSystem()
  const { drawSelectionHighlight } = useSelection()
  const shapesStore = useShapesStore()
  const toolStore = useToolStore()
  const colorStore = useColorStore()

  // Use provided callbacks or default to local coordinate functions
  const screenToWorld =
    callbacks.screenToWorld ||
    ((screenX: number, screenY: number) => {
      return {
        x: (screenX - canvas.width / 2) / camera.zoom + camera.x,
        y: (screenY - canvas.height / 2) / camera.zoom + camera.y,
      }
    })

  const worldToScreen =
    callbacks.worldToScreen ||
    ((worldX: number, worldY: number) => {
      return {
        x: (worldX - camera.x) * camera.zoom + canvas.width / 2,
        y: (worldY - camera.y) * camera.zoom + canvas.height / 2,
      }
    })

  const drawCharacters = (ctx: CanvasRenderingContext2D) => {
    // Calculate visible bounds in world space
    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(canvas.width, canvas.height)

    // Convert to grid bounds
    const startGridX = Math.floor(topLeft.x / gridWidth)
    const endGridX = Math.ceil(bottomRight.x / gridWidth)
    const startGridY = Math.floor(topLeft.y / gridHeight)
    const endGridY = Math.ceil(bottomRight.y / gridHeight)

    // Set up text rendering - font size based on grid height since text is taller than wide
    const fontSize = gridHeight * 0.7 // Adjusted for 1:2 aspect ratio
    ctx.font = `${fontSize}px monospace` // Use generic monospace for consistent character spacing
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Get all visible shapes from shapesStore and sort by zOrder (lowest first, so they render bottom to top)
    const visibleShapes = shapesStore.getAllVisibleShapes().sort((a, b) => a.zOrder - b.zOrder)

    // Draw characters from all visible shapes
    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      for (let gridY = startGridY; gridY <= endGridY; gridY++) {
        const key = gridKey(gridX, gridY)

        // Find the topmost character at this position
        let characterToDraw = ''
        let colorToDraw = '#000000'

        for (const shape of visibleShapes) {
          const character = shape.data.get(key)
          if (character && character !== '') {
            characterToDraw = character

            // Determine which color to use based on character type
            // Box-drawing characters (borders)
            if (/[┌┐└┘─│═║╔╗╚╝╭╮╰╯┏┓┗┛━┃╌╎]/.test(character)) {
              colorToDraw = shape.borderColor || shape.color
            }
            // Shade/block characters (fill)
            else if (/[░▒▓█▄▀▌▐]/.test(character)) {
              colorToDraw = shape.fillColor || shape.color
            }
            // Shadow characters
            else if (character === '▓') {
              colorToDraw = '#808080' // Gray shadow
            }
            // Everything else is text
            else {
              colorToDraw = shape.textColor || shape.color
            }
          }
        }

        if (characterToDraw && characterToDraw !== '') {
          ctx.fillStyle = colorToDraw
          const worldPos = gridToWorld(gridX, gridY)
          // Draw directly at world coordinates - canvas transform handles conversion to screen
          ctx.fillText(characterToDraw, worldPos.x, worldPos.y)
        }
      }
    }
  }

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    // Size grid to match monospace character dimensions (1:2 ratio)
    const lineWidth = 1 / camera.zoom // Keep line width constant in screen space

    // Get computed style for dark mode support
    const computedStyle = getComputedStyle(document.documentElement)
    const gridColor = computedStyle.getPropertyValue('--grid-line').trim()

    ctx.strokeStyle = gridColor || '#c4c3d0'
    ctx.lineWidth = lineWidth

    // Calculate visible bounds in world space
    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(canvas.width, canvas.height)

    // Draw vertical lines (using gridWidth spacing)
    const startX = Math.floor(topLeft.x / gridWidth) * gridWidth
    const endX = Math.ceil(bottomRight.x / gridWidth) * gridWidth
    for (let x = startX; x <= endX; x += gridWidth) {
      ctx.beginPath()
      ctx.moveTo(x, topLeft.y - gridHeight)
      ctx.lineTo(x, bottomRight.y + gridHeight)
      ctx.stroke()
    }

    // Draw horizontal lines (using gridHeight spacing)
    const startY = Math.floor(topLeft.y / gridHeight) * gridHeight
    const endY = Math.ceil(bottomRight.y / gridHeight) * gridHeight
    for (let y = startY; y <= endY; y += gridHeight) {
      ctx.beginPath()
      ctx.moveTo(topLeft.x - gridWidth, y)
      ctx.lineTo(bottomRight.x + gridWidth, y)
      ctx.stroke()
    }
  }

  const drawDiamondPreview = (ctx: CanvasRenderingContext2D, diamondState: DrawingToolState) => {
    if (!diamondState || !diamondState.isDrawing || toolStore.currentTool !== 'diamond') {
      return
    }

    // Use callbacks if provided, otherwise use local functions
    const toGrid = callbacks.worldToGrid || worldToGrid
    const toWorld = callbacks.gridToWorld || gridToWorld

    const startGrid = toGrid(diamondState.startX, diamondState.startY)
    const endGrid = toGrid(diamondState.endX, diamondState.endY)

    // Ensure we have proper min/max coordinates
    const minX = Math.min(startGrid.x, endGrid.x)
    const maxX = Math.max(startGrid.x, endGrid.x)
    const minY = Math.min(startGrid.y, endGrid.y)
    const maxY = Math.max(startGrid.y, endGrid.y)

    const width = maxX - minX + 1
    const height = maxY - minY + 1

    // Calculate center point - for odd widths, this gives us the true center
    const centerX = Math.floor((minX + maxX) / 2)
    const centerY = Math.floor((minY + maxY) / 2)

    // Get preview settings
    const fillChar = toolStore.diamondFillChar || ''
    const showBorder = toolStore.diamondShowBorder !== false
    const showFill = toolStore.diamondShowFill && fillChar

    // Draw diamond preview
    ctx.globalAlpha = 0.5 // Make preview semi-transparent (consistent with rectangle)
    ctx.fillStyle = colorStore.selectedColor.hex
    const fontSize = gridHeight * 0.7 // Use same font size calculation as rectangle
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw the diamond shape
    const halfHeight = Math.floor(height / 2)

    for (let y = minY; y <= maxY; y++) {
      const relY = y - minY

      // Calculate how many characters from center to edge at this row
      let distFromCenter

      if (relY <= halfHeight) {
        // Top half (including middle) - distance increases as we go down
        distFromCenter = relY
      } else {
        // Bottom half - distance decreases as we go down
        distFromCenter = height - relY - 1
      }

      // Calculate actual x positions for the edges
      const leftX = centerX - distFromCenter
      const rightX = centerX + distFromCenter

      // Draw the diamond edges and fill
      if (showBorder) {
        // Draw left edge
        const worldPosLeft = toWorld(leftX, y)
        if (relY <= halfHeight) {
          ctx.fillText('/', worldPosLeft.x, worldPosLeft.y)
        } else {
          ctx.fillText('\\', worldPosLeft.x, worldPosLeft.y)
        }

        // Draw right edge (only if not the same as left - for top/bottom points)
        if (leftX !== rightX) {
          const worldPosRight = toWorld(rightX, y)
          if (relY <= halfHeight) {
            ctx.fillText('\\', worldPosRight.x, worldPosRight.y)
          } else {
            ctx.fillText('/', worldPosRight.x, worldPosRight.y)
          }
        }
      }

      // Fill interior if needed
      if (showFill) {
        for (let x = leftX + 1; x < rightX; x++) {
          const worldPos = toWorld(x, y)
          ctx.fillText(fillChar, worldPos.x, worldPos.y)
        }
      }
    }

    ctx.globalAlpha = 1
  }

  const drawRectanglePreview = (
    ctx: CanvasRenderingContext2D,
    rectangleState: DrawingToolState,
  ) => {
    if (!rectangleState || !rectangleState.isDrawing || toolStore.currentTool !== 'rectangle') {
      return
    }

    // Use callbacks if provided, otherwise use local functions
    const toGrid = callbacks.worldToGrid || worldToGrid
    const toWorld = callbacks.gridToWorld || gridToWorld

    const startGrid = toGrid(rectangleState.startX, rectangleState.startY)
    const endGrid = toGrid(rectangleState.endX, rectangleState.endY)

    // Ensure we have proper min/max coordinates
    const minX = Math.min(startGrid.x, endGrid.x)
    const maxX = Math.max(startGrid.x, endGrid.x)
    const minY = Math.min(startGrid.y, endGrid.y)
    const maxY = Math.max(startGrid.y, endGrid.y)

    // Set up text rendering for preview
    const fontSize = gridHeight * 0.7 // Adjusted for 1:2 aspect ratio
    ctx.font = `${fontSize}px monospace` // Use generic monospace for consistent character spacing
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw shadow preview if enabled
    if (toolStore.rectangleShadow) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)' // Semi-transparent black for shadow preview
      ctx.globalAlpha = 0.3
      const shadowChar = '░'

      // Draw shadow for bottom edge
      for (let x = minX + 1; x <= maxX + 1; x++) {
        const worldPos = toWorld(x, maxY + 1)
        ctx.fillText(shadowChar, worldPos.x, worldPos.y)
      }

      // Draw shadow for right edge
      for (let y = minY + 1; y <= maxY + 1; y++) {
        const worldPos = toWorld(maxX + 1, y)
        ctx.fillText(shadowChar, worldPos.x, worldPos.y)
      }
    }

    // Draw rectangle preview
    ctx.fillStyle = colorStore.selectedColor.hex
    ctx.globalAlpha = 0.5 // Make preview semi-transparent

    const borderStyleKey = toolStore.rectangleBorderStyle || 'single'
    const borderStyle = RECTANGLE_BORDER_STYLES[borderStyleKey]

    if (borderStyle) {
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          let character = ''

          // Determine which character to use based on position
          if (y === minY && x === minX) {
            character = borderStyle.topLeft
          } else if (y === minY && x === maxX) {
            character = borderStyle.topRight
          } else if (y === maxY && x === minX) {
            character = borderStyle.bottomLeft
          } else if (y === maxY && x === maxX) {
            character = borderStyle.bottomRight
          } else if (y === minY) {
            character = borderStyle.horizontal
          } else if (y === maxY) {
            character = borderStyle.horizontal
          } else if (x === minX) {
            character = borderStyle.vertical
          } else if (x === maxX) {
            character = borderStyle.vertical
          } else if (toolStore.rectangleFillChar) {
            character = toolStore.rectangleFillChar
          }

          if (character) {
            const worldPos = toWorld(x, y)
            ctx.fillText(character, worldPos.x, worldPos.y)
          }
        }
      }
    }

    ctx.globalAlpha = 1 // Reset alpha
  }

  const drawTextPreview = (ctx: CanvasRenderingContext2D, textState: DrawingToolState) => {
    if (!textState || !textState.isDrawing || toolStore.currentTool !== 'text') {
      return
    }

    // Use callbacks if provided, otherwise use local functions
    const toGrid = callbacks.worldToGrid || worldToGrid
    const toWorld = callbacks.gridToWorld || gridToWorld

    const startGrid = toGrid(textState.startX, textState.startY)
    const endGrid = toGrid(textState.endX, textState.endY)

    // Ensure we have proper min/max coordinates
    const minX = Math.min(startGrid.x, endGrid.x)
    const maxX = Math.max(startGrid.x, endGrid.x)
    const minY = Math.min(startGrid.y, endGrid.y)
    const maxY = Math.max(startGrid.y, endGrid.y)

    // Set up text rendering for preview
    const fontSize = gridHeight * 0.7
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw border preview
    ctx.fillStyle = colorStore.selectedColor.hex
    ctx.globalAlpha = 0.3 // Make preview semi-transparent

    const borderStyle = RECTANGLE_BORDER_STYLES['single']

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        let character = ''

        if (x === minX && y === minY) {
          character = borderStyle.topLeft
        } else if (x === maxX && y === minY) {
          character = borderStyle.topRight
        } else if (x === minX && y === maxY) {
          character = borderStyle.bottomLeft
        } else if (x === maxX && y === maxY) {
          character = borderStyle.bottomRight
        } else if (y === minY || y === maxY) {
          character = borderStyle.horizontal
        } else if (x === minX || x === maxX) {
          character = borderStyle.vertical
        }

        if (character) {
          const worldPos = toWorld(x, y)
          ctx.fillText(character, worldPos.x, worldPos.y)
        }
      }
    }

    ctx.globalAlpha = 1 // Reset alpha
  }

  const drawLinePreview = (ctx: CanvasRenderingContext2D, lineState: DrawingToolState) => {
    if (!lineState || !lineState.isDrawing || toolStore.currentTool !== 'line') {
      return
    }

    // Use callbacks if provided, otherwise use local functions
    const toGrid = callbacks.worldToGrid || worldToGrid
    const toWorld = callbacks.gridToWorld || gridToWorld

    const startGrid = toGrid(lineState.startX, lineState.startY)
    const endGrid = toGrid(lineState.endX, lineState.endY)

    // Calculate the line direction
    const dx = endGrid.x - startGrid.x
    const dy = endGrid.y - startGrid.y
    const distance = Math.max(Math.abs(dx), Math.abs(dy))

    // Set up text rendering for preview
    const fontSize = gridHeight * 0.7 // Adjusted for 1:2 aspect ratio
    ctx.font = `${fontSize}px monospace`
    ctx.fillStyle = colorStore.selectedColor.hex
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = 0.5 // Make preview semi-transparent

    const lineStyleKey = toolStore.lineStyle || 'single'
    const lineStyle = LINE_STYLES[lineStyleKey]

    if (!lineStyle) {
      return // Exit early if no style found
    }

    if (distance === 0) {
      // Single point
      const worldPos = toWorld(startGrid.x, startGrid.y)
      ctx.fillText('•', worldPos.x, worldPos.y)
    } else {
      // Calculate angle to determine the best character to use
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)
      const absAngle = Math.abs(angle)

      // Draw line
      for (let i = 0; i <= distance; i++) {
        const progress = i / distance
        const x = Math.round(startGrid.x + dx * progress)
        const y = Math.round(startGrid.y + dy * progress)

        let character = '-' // Default to horizontal

        // Select character based on angle
        // Horizontal: -22.5° to 22.5° or 157.5° to 180° or -180° to -157.5°
        if (absAngle <= 22.5 || absAngle >= 157.5) {
          character = lineStyle.horizontal || '-'
        }
        // Vertical: 67.5° to 112.5° or -112.5° to -67.5°
        else if (absAngle >= 67.5 && absAngle <= 112.5) {
          character = lineStyle.vertical || '|'
        }
        // Forward slash: 112.5° to 157.5° or -67.5° to -22.5°
        // This is for lines going from bottom-left to top-right
        else if ((angle > 112.5 && angle <= 157.5) || (angle > -67.5 && angle <= -22.5)) {
          character = lineStyle.diagonal1 || '/'
        }
        // Backslash: 22.5° to 67.5° or -157.5° to -112.5°
        // This is for lines going from top-left to bottom-right
        else if ((angle >= 22.5 && angle < 67.5) || (angle >= -157.5 && angle < -112.5)) {
          character = lineStyle.diagonal2 || '\\'
        }

        const worldPos = toWorld(x, y)
        ctx.fillText(character, worldPos.x, worldPos.y)
      }
    }

    ctx.globalAlpha = 1 // Reset alpha
  }

  // Draw the in-progress pencil stroke
  const drawCurrentPencilStroke = (
    ctx: CanvasRenderingContext2D,
    currentStrokeData: Map<string, string>,
  ) => {
    if (!currentStrokeData || currentStrokeData.size === 0) return

    // Set up text rendering for the stroke
    const fontSize = gridHeight * 0.7
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = colorStore.selectedColor.hex
    ctx.globalAlpha = 0.8 // Slightly transparent to show it's in progress

    // Draw all characters in the current stroke
    for (const [key, character] of currentStrokeData) {
      const [gridX, gridY] = key.split(',').map(Number)
      const worldPos = gridToWorld(gridX, gridY)
      ctx.fillText(character, worldPos.x, worldPos.y)
    }

    ctx.globalAlpha = 1 // Reset alpha
  }

  // Track last mouse position for pencil stroke preview
  let lastPencilPreviewPos: { x: number; y: number } | null = null

  const drawPencilPreview = (
    ctx: CanvasRenderingContext2D,
    mouseWorldX: number,
    mouseWorldY: number,
  ) => {
    if (toolStore.currentTool !== 'pencil') {
      lastPencilPreviewPos = null
      return
    }

    // Use callbacks if provided, otherwise use local functions
    const toGrid = callbacks.worldToGrid || worldToGrid
    const toWorld = callbacks.gridToWorld || gridToWorld

    // Convert mouse position to grid coordinates
    const currentGridPos = toGrid(mouseWorldX, mouseWorldY)

    // Set up text rendering for preview
    const fontSize = gridHeight * 0.7
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw preview of the selected character at mouse position
    ctx.fillStyle = colorStore.selectedColor.hex
    ctx.globalAlpha = 0.3 // Make preview semi-transparent

    // If we have a previous position, interpolate between positions
    if (lastPencilPreviewPos) {
      // Calculate line between last and current position
      const dx = currentGridPos.x - lastPencilPreviewPos.x
      const dy = currentGridPos.y - lastPencilPreviewPos.y
      const distance = Math.max(Math.abs(dx), Math.abs(dy))

      // Draw characters along the interpolated path
      if (distance > 0) {
        for (let i = 0; i <= distance; i++) {
          const progress = i / distance
          const x = Math.round(lastPencilPreviewPos.x + dx * progress)
          const y = Math.round(lastPencilPreviewPos.y + dy * progress)

          const worldPos = toWorld(x, y)
          ctx.fillText(toolStore.selectedCharacter, worldPos.x, worldPos.y)
        }
      } else {
        // Just draw at current position if no movement
        const worldPos = toWorld(currentGridPos.x, currentGridPos.y)
        ctx.fillText(toolStore.selectedCharacter, worldPos.x, worldPos.y)
      }
    } else {
      // No previous position, just draw at current position
      const worldPos = toWorld(currentGridPos.x, currentGridPos.y)
      ctx.fillText(toolStore.selectedCharacter, worldPos.x, worldPos.y)
    }

    // Update last position
    lastPencilPreviewPos = { x: currentGridPos.x, y: currentGridPos.y }

    ctx.globalAlpha = 1 // Reset alpha
  }

  const drawUI = (ctx: CanvasRenderingContext2D) => {
    // Draw zoom and position info
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px monospace' // Use generic monospace for consistent character spacing
    ctx.fillText(`Zoom: ${(camera.zoom * 100).toFixed(1)}%`, 10, 20)
    ctx.fillText(`Position: (${camera.x.toFixed(1)}, ${camera.y.toFixed(1)})`, 10, 40)
  }

  const render = (
    rectangleState?: DrawingToolState,
    diamondState?: DrawingToolState,
    lineState?: DrawingToolState,
    textState?: DrawingToolState,
    mouseWorldX?: number,
    mouseWorldY?: number,
    currentStrokeData?: Map<string, string>,
  ) => {
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn('[RenderPipeline] Canvas has zero dimensions, skipping render')
      return
    }

    // Clear canvas - get computed style for dark mode support
    const computedStyle = getComputedStyle(document.documentElement)
    const canvasBg = computedStyle.getPropertyValue('--canvas-bg').trim()
    ctx.fillStyle = canvasBg || '#fafafb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Save context state and apply camera transform
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(camera.zoom, camera.zoom)
    ctx.translate(-camera.x, -camera.y)

    // Draw infinite grid
    drawGrid(ctx)

    // Draw placed characters
    drawCharacters(ctx)

    // Draw rectangle preview if drawing
    if (rectangleState) {
      drawRectanglePreview(ctx, rectangleState)
    }

    // Draw diamond preview if drawing
    if (diamondState) {
      drawDiamondPreview(ctx, diamondState)
    }

    // Draw line preview if drawing
    if (lineState) {
      drawLinePreview(ctx, lineState)
    }

    // Draw text preview if drawing
    if (textState) {
      drawTextPreview(ctx, textState)
    }

    // Draw current pencil stroke if in progress
    if (currentStrokeData && currentStrokeData.size > 0) {
      drawCurrentPencilStroke(ctx, currentStrokeData)
    }

    // Draw pencil preview at mouse position (only if not currently drawing)
    if (
      mouseWorldX !== undefined &&
      mouseWorldY !== undefined &&
      (!currentStrokeData || currentStrokeData.size === 0)
    ) {
      drawPencilPreview(ctx, mouseWorldX, mouseWorldY)
    }

    // Draw selection highlight
    drawSelectionHighlight(ctx, canvas, camera, screenToWorld)

    // Restore context state
    ctx.restore()

    // Draw UI overlay (in screen space)
    drawUI(ctx)
  }

  const resizeCanvas = (onRender?: () => void) => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    onRender?.() // Re-render after resize
  }

  const setupResizeListener = (onRender?: () => void) => {
    const handleResize = () => resizeCanvas(onRender)
    window.addEventListener('resize', handleResize)
    resizeCanvas(onRender) // Initial resize

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }

  return {
    // Core rendering functions
    render,
    drawCharacters,
    drawGrid,
    drawUI,

    // Preview rendering functions
    drawRectanglePreview,
    drawDiamondPreview,
    drawLinePreview,
    drawTextPreview,
    drawPencilPreview,

    // Canvas management
    resizeCanvas,
    setupResizeListener,
  }
}
