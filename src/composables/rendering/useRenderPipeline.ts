import { useCoordinateSystem } from '../canvas/useCoordinateSystem'
import { useSelection } from '../interaction/useSelection'
import { useLayersStore } from '../../stores/layers'
import { useToolStore, RECTANGLE_BORDER_STYLES, LINE_STYLES } from '../../stores/tools'
import { useColorStore } from '../../stores/colors'
import type { DrawingToolState } from '../drawing/useDrawingTools'

export interface RenderCallbacks {
  screenToWorld?: (screenX: number, screenY: number) => { x: number, y: number }
  worldToScreen?: (worldX: number, worldY: number) => { x: number, y: number }
  worldToGrid?: (worldX: number, worldY: number) => { x: number, y: number }
  gridToWorld?: (gridX: number, gridY: number) => { x: number, y: number }
  gridKey?: (gridX: number, gridY: number) => string
}

export function useRenderPipeline(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  camera: { x: number, y: number, zoom: number },
  callbacks: RenderCallbacks = {}
) {
  const { worldToGrid, gridToWorld, gridKey, gridWidth, gridHeight } = useCoordinateSystem()
  const { drawSelectionHighlight } = useSelection()
  const layersStore = useLayersStore()
  const toolStore = useToolStore()
  const colorStore = useColorStore()

  // Use provided callbacks or default to local coordinate functions
  const screenToWorld = callbacks.screenToWorld || ((screenX: number, screenY: number) => {
    return {
      x: (screenX - canvas.width / 2) / camera.zoom + camera.x,
      y: (screenY - canvas.height / 2) / camera.zoom + camera.y
    }
  })
  
  const worldToScreen = callbacks.worldToScreen || ((worldX: number, worldY: number) => {
    return {
      x: (worldX - camera.x) * camera.zoom + canvas.width / 2,
      y: (worldY - camera.y) * camera.zoom + canvas.height / 2
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
    
    // Get all visible shapes from layers
    const visibleShapes = layersStore.getAllVisibleShapes()
    
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
            colorToDraw = shape.color
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

  const drawRectanglePreview = (ctx: CanvasRenderingContext2D, rectangleState: DrawingToolState) => {
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
      // Draw line
      for (let i = 0; i <= distance; i++) {
        const progress = i / distance
        const x = Math.round(startGrid.x + dx * progress)
        const y = Math.round(startGrid.y + dy * progress)
        
        let character = lineStyle.horizontal
        if (Math.abs(dx) > Math.abs(dy)) {
          character = lineStyle.horizontal
        } else if (Math.abs(dy) > Math.abs(dx)) {
          character = lineStyle.vertical
        } else {
          character = lineStyle.diagonal1 || lineStyle.horizontal
        }
        
        const worldPos = toWorld(x, y)
        ctx.fillText(character, worldPos.x, worldPos.y)
      }
    }
    
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
    lineState?: DrawingToolState, 
    textState?: DrawingToolState
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
    
    // Draw line preview if drawing
    if (lineState) {
      drawLinePreview(ctx, lineState)
    }
    
    // Draw text preview if drawing
    if (textState) {
      drawTextPreview(ctx, textState)
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
    drawLinePreview,
    drawTextPreview,
    
    // Canvas management
    resizeCanvas,
    setupResizeListener,
  }
}