<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue'
import ToolBar from './components/ToolBar.vue'
import ColorSelector from './components/ColorSelector.vue'
import LayersPanel from './components/LayersPanel.vue'
import TrialPopup from './components/TrialPopup.vue'
import AboutModal from './components/AboutModal.vue'
import ToolSettingsPanel from './components/ToolSettingsPanel.vue'
import TextInput from './components/TextInput.vue'
import CharacterPalette from './components/CharacterPalette.vue'
import ToastNotification from './components/ToastNotification.vue'
import { useToolStore, RECTANGLE_BORDER_STYLES, LINE_STYLES, LINE_END_STYLES, type RectangleBorderStyle, type LineStyle, type LineEndStyle } from './stores/tools'
import { useHistoryStore } from './stores/history'
import { useColorStore } from './stores/colors'
import { useLayersStore } from './stores/layers'
import { useAppStore } from './stores/app'
import { useToastStore } from './stores/toast'

const canvasRef = ref<HTMLCanvasElement>()
const aboutModalRef = ref<InstanceType<typeof AboutModal>>()
const textInputRef = ref<InstanceType<typeof TextInput>>()
const toolStore = useToolStore()
const historyStore = useHistoryStore()
const colorStore = useColorStore()
const layersStore = useLayersStore()
const appStore = useAppStore()
const toastStore = useToastStore()

// Camera/viewport state
const camera = reactive({
  x: 0,      // camera position in world space
  y: 0,
  zoom: 1,   // zoom level (1 = 100%, 0.5 = 50%, 2 = 200%)
})

// Camera persistence functions
const saveCameraState = () => {
  try {
    const cameraState = {
      x: camera.x,
      y: camera.y,
      zoom: camera.zoom
    }
    localStorage.setItem('monoblocks-professional-camera', JSON.stringify(cameraState))
  } catch (error) {
    console.warn('Failed to save camera state:', error)
  }
}

const loadCameraState = () => {
  try {
    const stored = localStorage.getItem('monoblocks-professional-camera')
    if (stored) {
      const state = JSON.parse(stored)
      camera.x = state.x || 0
      camera.y = state.y || 0
      camera.zoom = state.zoom || 1
      return true
    }
  } catch (error) {
    console.warn('Failed to load camera state:', error)
  }
  return false
}

// Grid dimensions - 1:2 aspect ratio for proper monospace display
const gridWidth = 10  // Width of each grid cell
const gridHeight = 20 // Height of each grid cell (2x width for monospace fonts)

// Current stroke data for brush/eraser operations
let currentStrokeData = new Map<string, string>()

// Mouse/interaction state
const mouse = reactive({
  x: 0,
  y: 0,
  isDragging: false,
  lastX: 0,
  lastY: 0,
})

// Rectangle tool state
const rectangleState = reactive({
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  isDrawing: false
})

// Line tool state
const lineState = reactive({
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  isDrawing: false
})

// Text tool state
const textState = reactive({
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  isDrawing: false
})

// Shape dragging state
const shapeDragState = reactive({
  isDragging: false,
  shapeId: null as string | null,
  originalData: null as Map<string, string> | null,
  dragStartX: 0,
  dragStartY: 0,
  offsetX: 0, // Grid offset from drag start
  offsetY: 0
})

// Shape resizing state
const shapeResizeState = reactive({
  isResizing: false,
  shapeId: null as string | null,
  anchor: null as 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'left' | 'right' | 'top' | 'bottom' | 'start' | 'end' | null,
  originalBounds: null as { minX: number, maxX: number, minY: number, maxY: number } | null,
  startMouseX: 0,
  startMouseY: 0
})

// Expose functions for template use
const resetView = () => {
  camera.x = 0
  camera.y = 0
  camera.zoom = 1
  saveCameraState() // Save camera state after reset
  if (canvasRef.value) {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (ctx) render()
  }
}

const resetCanvas = () => {
  // Reset layers to default with MONOBLOCK art
  layersStore.resetToDefault()
  
  // Reset camera position and zoom
  camera.x = 0
  camera.y = 0
  camera.zoom = 1
  saveCameraState()
  
  // Re-render the canvas
  if (canvasRef.value) {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (ctx) render()
  }
}

const performUndo = () => {
  // For now, remove the last shape from the active layer
  const activeLayer = layersStore.getActiveLayer()
  if (activeLayer && activeLayer.shapes.length > 0) {
    activeLayer.shapes.pop()
    if (canvasRef.value) {
      const canvas = canvasRef.value
      const ctx = canvas.getContext('2d')
      if (ctx) render()
    }
  }
}

const performRedo = () => {
  // TODO: Implement proper redo with layer history
  if (canvasRef.value) {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (ctx) render()
  }
}

const openAbout = () => {
  if (aboutModalRef.value) {
    aboutModalRef.value.open()
  }
}

// Serialize canvas state to a compact format
const serializeCanvas = () => {
  const visibleShapes = layersStore.getAllVisibleShapes()
  
  // Create a simplified representation of the canvas
  const canvasData = {
    shapes: visibleShapes.map(shape => ({
      t: shape.type.charAt(0), // First char of type (b=brush, r=rectangle, t=text)
      c: shape.color,
      d: Array.from(shape.data.entries()) // Convert Map to array
    }))
  }
  
  // Convert to JSON and compress
  const jsonStr = JSON.stringify(canvasData)
  
  // Use base64url encoding (URL-safe base64)
  const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g,
    (match, p1) => String.fromCharCode(parseInt(p1, 16))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return base64
}

// Deserialize canvas state from hash (for future implementation)
const deserializeCanvas = (hash: string) => {
  try {
    // Add padding if needed
    const padding = (4 - (hash.length % 4)) % 4
    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padding)
    
    const jsonStr = decodeURIComponent(atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''))
    
    const canvasData = JSON.parse(jsonStr)
    
    // Reconstruct shapes
    const shapes = canvasData.shapes.map((s: any) => ({
      type: s.t === 'b' ? 'brush' : s.t === 'r' ? 'rectangle' : 'text',
      color: s.c,
      data: new Map(s.d)
    }))
    
    return shapes
  } catch (error) {
    console.error('Failed to deserialize canvas:', error)
    return null
  }
}

// Generate and copy share link
const shareCanvas = () => {
  const hash = serializeCanvas()
  const baseUrl = window.location.origin + window.location.pathname
  const shareUrl = `${baseUrl}#${hash}`
  
  navigator.clipboard.writeText(shareUrl).then(() => {
    toastStore.showToast('Share link copied to clipboard!', 'success')
  }).catch(err => {
    console.error('Failed to copy share link:', err)
    toastStore.showToast('Failed to copy share link', 'error')
  })
}

const copyToClipboard = () => {
  // Get all visible shapes to find content bounds
  const visibleShapes = layersStore.getAllVisibleShapes()
  
  // Find the bounding box of all content
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let hasContent = false
  
  for (const shape of visibleShapes) {
    for (const [key, char] of shape.data) {
      if (char && char !== '') {
        hasContent = true
        const [x, y] = key.split(',').map(Number)
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  if (!hasContent) {
    toastStore.showToast('No content to copy!', 'error')
    return
  }
  
  // Create a 2D array to represent the text grid
  const width = maxX - minX + 1
  const height = maxY - minY + 1
  const textGrid: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '))
  
  // Fill in the characters from all visible shapes
  for (const shape of visibleShapes) {
    for (const [key, char] of shape.data) {
      if (char && char !== '') {
        const [gridX, gridY] = key.split(',').map(Number)
        const x = gridX - minX
        const y = gridY - minY
        if (x >= 0 && x < width && y >= 0 && y < height) {
          textGrid[y][x] = char
        }
      }
    }
  }
  
  // Convert to text, preserving whitespace
  const textLines = textGrid.map(row => {
    // Join the row and trim trailing spaces from each line
    const line = row.join('')
    // Find the last non-space character
    let lastNonSpace = line.length - 1
    while (lastNonSpace >= 0 && line[lastNonSpace] === ' ') {
      lastNonSpace--
    }
    // Return the line trimmed of trailing spaces
    return line.substring(0, lastNonSpace + 1)
  })
  
  // Remove trailing empty lines
  while (textLines.length > 0 && textLines[textLines.length - 1] === '') {
    textLines.pop()
  }
  
  const textContent = textLines.join('\n')
  
  // Copy to clipboard
  navigator.clipboard.writeText(textContent).then(() => {
    toastStore.showToast('Copied to clipboard!', 'success')
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err)
    toastStore.showToast('Failed to copy to clipboard', 'error')
  })
}

const exportToPNG = () => {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Get all visible shapes to find content bounds
  const visibleShapes = layersStore.getAllVisibleShapes()
  
  // Find the bounding box of all content
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let hasContent = false
  
  for (const shape of visibleShapes) {
    for (const [key, char] of shape.data) {
      if (char && char !== '') {
        hasContent = true
        const [x, y] = key.split(',').map(Number)
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  if (!hasContent) {
    toastStore.showToast('No content to export!', 'error')
    return
  }
  
  // Add padding around content (in grid cells)
  const padding = 2
  minX -= padding
  maxX += padding
  minY -= padding
  maxY += padding
  
  // Calculate dimensions
  const width = (maxX - minX + 1) * gridWidth
  const height = (maxY - minY + 1) * gridHeight
  
  // Create a temporary canvas for the cropped content
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')
  
  if (!tempCtx) return
  
  // Fill background
  tempCtx.fillStyle = '#ffffff'
  tempCtx.fillRect(0, 0, width, height)
  
  // Set up text rendering
  const fontSize = gridHeight * 0.7
  tempCtx.font = `${fontSize}px monospace`
  tempCtx.textAlign = 'center'
  tempCtx.textBaseline = 'middle'
  
  // Draw all characters
  for (const shape of visibleShapes) {
    for (const [key, char] of shape.data) {
      if (char && char !== '') {
        const [gridX, gridY] = key.split(',').map(Number)
        if (gridX >= minX && gridX <= maxX && gridY >= minY && gridY <= maxY) {
          // Calculate position relative to cropped area
          const x = (gridX - minX) * gridWidth + gridWidth / 2
          const y = (gridY - minY) * gridHeight + gridHeight / 2
          
          tempCtx.fillStyle = shape.color
          tempCtx.fillText(char, x, y)
        }
      }
    }
  }
  
  // Convert canvas to PNG data URL
  const dataURL = tempCanvas.toDataURL('image/png')
  
  // Create download link
  const link = document.createElement('a')
  link.href = dataURL
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  link.download = `monoblocks_${timestamp}.png`
  
  // Show toast notification
  toastStore.showToast('Downloading PNG...', 'success')
  
  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Handle pasted text
const handlePaste = (e: ClipboardEvent) => {
  e.preventDefault()
  
  const pastedText = e.clipboardData?.getData('text/plain')
  if (!pastedText || !canvasRef.value) return
  
  const canvas = canvasRef.value
  
  // Get the current mouse position or use center of viewport
  const worldPos = mouse.x && mouse.y 
    ? screenToWorld(mouse.x, mouse.y)
    : { x: camera.x, y: camera.y }
  
  // Convert to grid coordinates
  const startGrid = {
    x: Math.floor(worldPos.x / gridWidth),
    y: Math.floor(worldPos.y / gridHeight)
  }
  
  // Split text into lines
  const lines = pastedText.split('\n')
  
  // Create shape data for multi-line text
  const pasteData = new Map<string, string>()
  
  lines.forEach((line, lineIndex) => {
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex]
      if (char && char !== '') { // Skip empty characters
        const key = `${startGrid.x + charIndex},${startGrid.y + lineIndex}`
        pasteData.set(key, char)
      }
    }
  })
  
  if (pasteData.size > 0) {
    // Add pasted content as a shape
    layersStore.addShape('text', pasteData, colorStore.selectedColor.hex, undefined)
    toastStore.showToast('Content pasted!', 'success')
    
    // Re-render canvas
    if (render) render()
  }
}

// Convert screen to world coordinates (will be defined in onMounted)
let screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
// Convert world to screen coordinates (will be defined in onMounted)
let worldToScreen: (worldX: number, worldY: number) => { x: number; y: number }
// Draw text function (will be defined in onMounted)
let drawText: (startWorldX: number, startWorldY: number, endWorldX: number, endWorldY: number, text: string, hAlign?: string, vAlign?: string, showBorder?: boolean) => Map<string, string>

// Handle text confirmation from TextInput component
const handleTextConfirm = (text: string, screenX: number, screenY: number) => {
  if (!canvasRef.value) return
  
  // Use the stored text box bounds
  const textData = drawText(
    textState.startX, 
    textState.startY, 
    textState.endX, 
    textState.endY, 
    text,
    toolStore.textHorizontalAlign,
    toolStore.textVerticalAlign,
    toolStore.textShowBorder
  )
  
  // Add text as a shape to the active layer
  layersStore.addShape('text', textData, colorStore.selectedColor.hex, undefined, {
    content: text,
    horizontalAlign: toolStore.textHorizontalAlign,
    verticalAlign: toolStore.textVerticalAlign,
    showBorder: toolStore.textShowBorder
  })
  
  // Re-render canvas
  if (render) render()
}

// Main render function - will be defined in onMounted
let render: () => void

// Expose render function globally for stores to trigger re-renders
declare global {
  interface Window {
    renderCanvas?: () => void
    regenerateShape?: (shapeId: string) => void
  }
}

onMounted(() => {
  // Check if there's a hash in the URL to load
  if (window.location.hash && window.location.hash.length > 1) {
    const hash = window.location.hash.substring(1)
    const shapes = deserializeCanvas(hash)
    
    if (shapes && shapes.length > 0) {
      // Clear existing canvas
      layersStore.layers[0].shapes = []
      
      // Add deserialized shapes
      shapes.forEach((shape: any) => {
        layersStore.addShape(shape.type, shape.data, shape.color)
      })
      
      toastStore.showToast('Canvas loaded from share link!', 'success')
    }
    
    // Clear the hash from URL
    window.history.replaceState(null, '', window.location.pathname)
  }
  
  // Load camera state from localStorage
  loadCameraState()
  
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Convert screen coordinates to world coordinates
  screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - canvas.width / 2) / camera.zoom + camera.x,
      y: (screenY - canvas.height / 2) / camera.zoom + camera.y
    }
  }

  // Convert world coordinates to screen coordinates
  worldToScreen = (worldX: number, worldY: number) => {
    return {
      x: (worldX - camera.x) * camera.zoom + canvas.width / 2,
      y: (worldY - camera.y) * camera.zoom + canvas.height / 2
    }
  }

  // Convert world coordinates to grid coordinates
  const worldToGrid = (worldX: number, worldY: number) => {
    return {
      x: Math.floor(worldX / gridWidth),
      y: Math.floor(worldY / gridHeight)
    }
  }

  // Convert grid coordinates to world coordinates (center of cell)
  const gridToWorld = (gridX: number, gridY: number) => {
    return {
      x: gridX * gridWidth + gridWidth / 2,
      y: gridY * gridHeight + gridHeight / 2
    }
  }

  // Create a key for the grid data map
  const gridKey = (gridX: number, gridY: number) => `${gridX},${gridY}`

  // Place character at world position (for current stroke)
  const placeCharacter = (worldX: number, worldY: number, character: string) => {
    const grid = worldToGrid(worldX, worldY)
    const key = gridKey(grid.x, grid.y)
    currentStrokeData.set(key, character)
  }

  // Erase character at world position by modifying existing shapes
  const eraseAtPosition = (worldX: number, worldY: number) => {
    const grid = worldToGrid(worldX, worldY)
    const key = gridKey(grid.x, grid.y)
    
    // Go through all layers and remove this position from any shapes
    for (const layer of layersStore.layers) {
      if (!layer.visible) continue
      
      for (const shape of layer.shapes) {
        if (shape.data.has(key)) {
          shape.data.delete(key) // Remove the character at this position
        }
      }
    }
    
    // Clean up any shapes that became empty after erasing
    layersStore.cleanupEmptyShapes()
  }

  // Draw rectangle outline from start to end coordinates (world space)
  const drawRectangle = (startWorldX: number, startWorldY: number, endWorldX: number, endWorldY: number): Map<string, string> => {
    const startGrid = worldToGrid(startWorldX, startWorldY)
    const endGrid = worldToGrid(endWorldX, endWorldY)
    
    // Ensure we have proper min/max coordinates
    const minX = Math.min(startGrid.x, endGrid.x)
    const maxX = Math.max(startGrid.x, endGrid.x)
    const minY = Math.min(startGrid.y, endGrid.y)
    const maxY = Math.max(startGrid.y, endGrid.y)
    
    const rectangleData = new Map<string, string>()
    const borderStyleKey = toolStore.rectangleBorderStyle || 'single'
    const borderStyle = RECTANGLE_BORDER_STYLES[borderStyleKey]
    
    // Fallback to single style if not found
    if (!borderStyle) {
      const fallbackStyle = RECTANGLE_BORDER_STYLES['single']
      return rectangleData // Return empty if still no style found
    }
    
    // Draw shadow if enabled (offset by +1, +1)
    if (toolStore.rectangleShadow) {
      const shadowChar = '░' // Light shade character for shadow
      // Draw shadow for bottom edge
      for (let x = minX + 1; x <= maxX + 1; x++) {
        const key = gridKey(x, maxY + 1)
        rectangleData.set(key, shadowChar)
      }
      // Draw shadow for right edge
      for (let y = minY + 1; y <= maxY + 1; y++) {
        const key = gridKey(maxX + 1, y)
        rectangleData.set(key, shadowChar)
      }
    }
    
    // Draw rectangle outline with proper box-drawing characters
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Determine which character to use based on position
        let character = ''
        
        if (x === minX && y === minY) {
          // Top-left corner
          character = borderStyle.topLeft
        } else if (x === maxX && y === minY) {
          // Top-right corner
          character = borderStyle.topRight
        } else if (x === minX && y === maxY) {
          // Bottom-left corner
          character = borderStyle.bottomLeft
        } else if (x === maxX && y === maxY) {
          // Bottom-right corner
          character = borderStyle.bottomRight
        } else if (y === minY || y === maxY) {
          // Top or bottom edge
          character = borderStyle.horizontal
        } else if (x === minX || x === maxX) {
          // Left or right edge
          character = borderStyle.vertical
        } else if (toolStore.rectangleFillChar && toolStore.rectangleFillChar !== '') {
          // Interior fill (only if fill character is set and not empty)
          character = toolStore.rectangleFillChar
        }
        
        if (character) {
          const key = gridKey(x, y)
          rectangleData.set(key, character)
        }
      }
    }
    
    return rectangleData
  }

  // Draw text within bounds with word wrapping and alignment
  drawText = (startWorldX: number, startWorldY: number, endWorldX: number, endWorldY: number, text: string, hAlign: string = 'left', vAlign: string = 'top', showBorder: boolean = true): Map<string, string> => {
    const startGrid = worldToGrid(startWorldX, startWorldY)
    const endGrid = worldToGrid(endWorldX, endWorldY)
    
    // Ensure we have proper min/max coordinates
    const minX = Math.min(startGrid.x, endGrid.x)
    const maxX = Math.max(startGrid.x, endGrid.x)
    const minY = Math.min(startGrid.y, endGrid.y)
    const maxY = Math.max(startGrid.y, endGrid.y)
    
    const textData = new Map<string, string>()
    
    // Draw border if enabled
    if (showBorder) {
      const borderStyle = RECTANGLE_BORDER_STYLES['single']
      
      // Draw rectangle outline
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
            const key = gridKey(x, y)
            textData.set(key, character)
          }
        }
      }
    }
    
    // Calculate text area (inside border if present)
    const textMinX = showBorder ? minX + 1 : minX
    const textMaxX = showBorder ? maxX - 1 : maxX
    const textMinY = showBorder ? minY + 1 : minY
    const textMaxY = showBorder ? maxY - 1 : maxY
    
    const textWidth = textMaxX - textMinX + 1
    const textHeight = textMaxY - textMinY + 1
    
    if (textWidth <= 0 || textHeight <= 0) return textData
    
    // Word wrap the text
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word
      if (testLine.length <= textWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          // Word is too long, truncate it
          lines.push(word.substring(0, textWidth))
          currentLine = ''
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }
    
    // Limit lines to available height
    const linesToRender = lines.slice(0, textHeight)
    
    // Calculate vertical offset based on alignment
    let startY = textMinY
    if (vAlign === 'middle') {
      startY = textMinY + Math.floor((textHeight - linesToRender.length) / 2)
    } else if (vAlign === 'bottom') {
      startY = textMaxY - linesToRender.length + 1
    }
    
    // Place text lines with horizontal alignment
    linesToRender.forEach((line, lineIndex) => {
      const y = startY + lineIndex
      if (y > textMaxY) return // Skip lines that overflow
      
      let startX = textMinX
      if (hAlign === 'center') {
        startX = textMinX + Math.floor((textWidth - line.length) / 2)
      } else if (hAlign === 'right') {
        startX = textMaxX - line.length + 1
      }
      
      // Place each character
      for (let i = 0; i < line.length && startX + i <= textMaxX; i++) {
        const char = line[i]
        if (char && char !== ' ') { // Skip spaces for cleaner look
          const key = gridKey(startX + i, y)
          textData.set(key, char)
        }
      }
    })
    
    return textData
  }
  
  // Draw line from start to end coordinates (world space)
  const drawLine = (startWorldX: number, startWorldY: number, endWorldX: number, endWorldY: number): Map<string, string> => {
    const startGrid = worldToGrid(startWorldX, startWorldY)
    const endGrid = worldToGrid(endWorldX, endWorldY)
    
    const lineData = new Map<string, string>()
    const lineStyleKey = toolStore.lineStyle || 'single'
    const lineStyle = LINE_STYLES[lineStyleKey]
    
    if (!lineStyle) {
      return lineData // Return empty if no style found
    }
    
    // Calculate the line direction
    const dx = endGrid.x - startGrid.x
    const dy = endGrid.y - startGrid.y
    const distance = Math.max(Math.abs(dx), Math.abs(dy))
    
    if (distance === 0) {
      // Single point
      const key = gridKey(startGrid.x, startGrid.y)
      lineData.set(key, '●')
      return lineData
    }
    
    // Draw the line using Bresenham's algorithm
    const xStep = dx / distance
    const yStep = dy / distance
    
    for (let i = 0; i <= distance; i++) {
      const x = Math.round(startGrid.x + xStep * i)
      const y = Math.round(startGrid.y + yStep * i)
      const key = gridKey(x, y)
      
      // Determine the character based on direction
      let character = ''
      
      if (Math.abs(dx) > Math.abs(dy) * 2) {
        // Mostly horizontal
        character = lineStyle.horizontal
      } else if (Math.abs(dy) > Math.abs(dx) * 2) {
        // Mostly vertical
        character = lineStyle.vertical
      } else if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) {
        // Diagonal down-right or up-left
        character = lineStyle.diagonal2 || '╲'
      } else {
        // Diagonal down-left or up-right
        character = lineStyle.diagonal1 || '╱'
      }
      
      lineData.set(key, character)
    }
    
    // Add end styles if specified
    const startStyle = toolStore.lineStartStyle || 'none'
    const endStyle = toolStore.lineEndStyle || 'arrow'
    
    if (startStyle !== 'none' && LINE_END_STYLES[startStyle]) {
      const key = gridKey(startGrid.x, startGrid.y)
      if (startStyle === 'arrow') {
        // Determine arrow direction based on line direction
        let arrowChar = ''
        if (dx > Math.abs(dy)) arrowChar = LINE_END_STYLES.arrow.left
        else if (dx < -Math.abs(dy)) arrowChar = LINE_END_STYLES.arrow.right
        else if (dy > Math.abs(dx)) arrowChar = LINE_END_STYLES.arrow.up
        else if (dy < -Math.abs(dx)) arrowChar = LINE_END_STYLES.arrow.down
        else if (dx > 0 && dy > 0) arrowChar = LINE_END_STYLES.arrow.upLeft
        else if (dx > 0 && dy < 0) arrowChar = LINE_END_STYLES.arrow.downLeft
        else if (dx < 0 && dy > 0) arrowChar = LINE_END_STYLES.arrow.upRight
        else if (dx < 0 && dy < 0) arrowChar = LINE_END_STYLES.arrow.downRight
        lineData.set(key, arrowChar)
      } else {
        lineData.set(key, LINE_END_STYLES[startStyle].all)
      }
    }
    
    if (endStyle !== 'none' && LINE_END_STYLES[endStyle]) {
      const key = gridKey(endGrid.x, endGrid.y)
      if (endStyle === 'arrow') {
        // Determine arrow direction based on line direction
        let arrowChar = ''
        if (dx > Math.abs(dy)) arrowChar = LINE_END_STYLES.arrow.right
        else if (dx < -Math.abs(dy)) arrowChar = LINE_END_STYLES.arrow.left
        else if (dy > Math.abs(dx)) arrowChar = LINE_END_STYLES.arrow.down
        else if (dy < -Math.abs(dx)) arrowChar = LINE_END_STYLES.arrow.up
        else if (dx > 0 && dy > 0) arrowChar = LINE_END_STYLES.arrow.downRight
        else if (dx > 0 && dy < 0) arrowChar = LINE_END_STYLES.arrow.upRight
        else if (dx < 0 && dy > 0) arrowChar = LINE_END_STYLES.arrow.downLeft
        else if (dx < 0 && dy < 0) arrowChar = LINE_END_STYLES.arrow.upLeft
        lineData.set(key, arrowChar)
      } else {
        lineData.set(key, LINE_END_STYLES[endStyle].all)
      }
    }
    
    return lineData
  }

  // Track if we're in a brush stroke to save state once per stroke
  let brushStrokeStarted = false
  
  // Regenerate shape data when settings change
  const regenerateShape = (shapeId: string) => {
    // Find the shape across all layers
    let targetShape: any = null
    for (const layer of layersStore.layers) {
      const shape = layer.shapes.find((s: any) => s.id === shapeId)
      if (shape) {
        targetShape = shape
        break
      }
    }
    
    if (!targetShape) return
    
    // Only regenerate rectangles and lines (shapes with settings that affect rendering)
    if (targetShape.type === 'rectangle') {
      console.log('Regenerating rectangle', shapeId, 'with settings:', targetShape.toolSettings)
      // For rectangles, we need to find the actual rectangle bounds (excluding shadow)
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      
      // Find bounds by looking for actual rectangle characters (not shadow)
      for (const [key, char] of targetShape.data) {
        // Skip shadow characters when finding bounds
        if (char && char !== '' && char !== '░') {
          const [x, y] = key.split(',').map(Number)
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
      
      // If the rectangle had a shadow, adjust the bounds
      if (targetShape.toolSettings?.shadow) {
        // Shadow adds +1 to right and bottom, so subtract 1 from max bounds
        const shadowExists = targetShape.data.get(`${maxX},${maxY}`) === '░'
        if (shadowExists) {
          maxX -= 1
          maxY -= 1
        }
      }
      
      console.log('Rectangle bounds:', { minX, minY, maxX, maxY })
      
      // Temporarily set tool settings to match shape settings
      const oldBorderStyle = toolStore.rectangleBorderStyle
      const oldFillChar = toolStore.rectangleFillChar
      const oldShadow = toolStore.rectangleShadow
      
      console.log('Setting tool settings:', {
        borderStyle: targetShape.toolSettings?.borderStyle || 'single',
        fillChar: targetShape.toolSettings?.fillChar ?? '',
        shadow: targetShape.toolSettings?.shadow || false
      })
      
      toolStore.setRectangleBorderStyle(targetShape.toolSettings?.borderStyle || 'single')
      toolStore.setRectangleFillChar(targetShape.toolSettings?.fillChar ?? '')
      toolStore.setRectangleShadow(targetShape.toolSettings?.shadow || false)
      
      // Regenerate rectangle data
      const rectangleData = drawRectangle(
        gridToWorld(minX, minY).x,
        gridToWorld(minX, minY).y,
        gridToWorld(maxX, maxY).x,
        gridToWorld(maxX, maxY).y
      )
      
      // Restore tool settings
      toolStore.setRectangleBorderStyle(oldBorderStyle)
      toolStore.setRectangleFillChar(oldFillChar)
      toolStore.setRectangleShadow(oldShadow)
      
      // Update shape data
      targetShape.data.clear()
      for (const [key, char] of rectangleData) {
        targetShape.data.set(key, char)
      }
      
      // Save and render
      layersStore.saveToStorage()
      render()
    } else if (targetShape.type === 'line') {
      const bounds = getShapeBounds(targetShape)
      
      // Temporarily set tool settings to match shape settings
      const oldLineStyle = toolStore.lineStyle
      const oldLineStartStyle = toolStore.lineStartStyle
      const oldLineEndStyle = toolStore.lineEndStyle
      
      toolStore.setLineStyle(targetShape.toolSettings?.lineStyle || 'single')
      toolStore.setLineStartStyle(targetShape.toolSettings?.lineStartStyle || 'none')
      toolStore.setLineEndStyle(targetShape.toolSettings?.lineEndStyle || 'arrow')
      
      // Regenerate line data
      const lineData = drawLine(
        gridToWorld(bounds.minX, bounds.minY).x,
        gridToWorld(bounds.minX, bounds.minY).y,
        gridToWorld(bounds.maxX, bounds.maxY).x,
        gridToWorld(bounds.maxX, bounds.maxY).y
      )
      
      // Restore tool settings
      toolStore.setLineStyle(oldLineStyle)
      toolStore.setLineStartStyle(oldLineStartStyle)
      toolStore.setLineEndStyle(oldLineEndStyle)
      
      // Update shape data
      targetShape.data.clear()
      for (const [key, char] of lineData) {
        targetShape.data.set(key, char)
      }
      
      // Save and render
      layersStore.saveToStorage()
      render()
    } else if (targetShape.type === 'text') {
      // Regenerate text with new settings
      const bounds = getShapeBounds(targetShape)
      
      // For text, we need to exclude the border from bounds if present
      let minX = bounds.minX
      let maxX = bounds.maxX
      let minY = bounds.minY
      let maxY = bounds.maxY
      
      // Check if the text has a border by looking for box drawing characters
      const borderStyle = RECTANGLE_BORDER_STYLES['single']
      const topLeftChar = targetShape.data.get(`${minX},${minY}`)
      if (topLeftChar === borderStyle.topLeft) {
        // Has border, bounds include the border
      }
      
      // Regenerate text data with current settings
      const textData = drawText(
        gridToWorld(minX, minY).x,
        gridToWorld(minX, minY).y,
        gridToWorld(maxX, maxY).x,
        gridToWorld(maxY, maxY).y,
        targetShape.toolSettings?.content || '',
        targetShape.toolSettings?.horizontalAlign || 'left',
        targetShape.toolSettings?.verticalAlign || 'top',
        targetShape.toolSettings?.showBorder ?? true
      )
      
      // Update shape data
      targetShape.data.clear()
      for (const [key, char] of textData) {
        targetShape.data.set(key, char)
      }
      
      // Save and render
      layersStore.saveToStorage()
      render()
    }
  }
  
  // Get bounds of a shape in grid coordinates
  const getShapeBounds = (shape: any) => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    
    for (const [key, char] of shape.data) {
      if (char && char !== '') {
        const [x, y] = key.split(',').map(Number)
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
    
    return { minX, maxX, minY, maxY }
  }
  
  // Draw resize anchors for selected shape
  const drawResizeAnchors = (ctx: CanvasRenderingContext2D, shape: any) => {
    const bounds = getShapeBounds(shape)
    const anchorSize = 8 / camera.zoom // Keep size constant in screen space
    
    ctx.fillStyle = '#007acc'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2 / camera.zoom
    
    // Function to draw a single anchor
    const drawAnchor = (gridX: number, gridY: number) => {
      const worldPos = gridToWorld(gridX, gridY)
      ctx.fillRect(
        worldPos.x - anchorSize/2,
        worldPos.y - anchorSize/2,
        anchorSize,
        anchorSize
      )
      ctx.strokeRect(
        worldPos.x - anchorSize/2,
        worldPos.y - anchorSize/2,
        anchorSize,
        anchorSize
      )
    }
    
    if (shape.type === 'rectangle' || shape.type === 'text') {
      // Corner anchors for rectangles and text boxes - positioned one grid cell outside
      drawAnchor(bounds.minX - 1, bounds.minY - 1) // Top-left
      drawAnchor(bounds.maxX + 1, bounds.minY - 1) // Top-right
      drawAnchor(bounds.minX - 1, bounds.maxY + 1) // Bottom-left
      drawAnchor(bounds.maxX + 1, bounds.maxY + 1) // Bottom-right
      
      // Mid-point anchors for rectangles and text boxes - positioned one grid cell outside
      const midX = Math.round((bounds.minX + bounds.maxX) / 2)
      const midY = Math.round((bounds.minY + bounds.maxY) / 2)
      drawAnchor(bounds.minX - 1, midY) // Left
      drawAnchor(bounds.maxX + 1, midY) // Right
      drawAnchor(midX, bounds.minY - 1) // Top
      drawAnchor(midX, bounds.maxY + 1) // Bottom
    } else if (shape.type === 'line') {
      // End anchors for lines - positioned one grid cell away from endpoints
      // For lines, we need to determine the direction to place anchors
      const dx = bounds.maxX - bounds.minX
      const dy = bounds.maxY - bounds.minY
      
      // Place anchors perpendicular to line direction or diagonally for better visibility
      if (Math.abs(dx) > Math.abs(dy)) {
        // More horizontal line - place anchors above/below
        drawAnchor(bounds.minX, bounds.minY - 1) // Start point
        drawAnchor(bounds.maxX, bounds.maxY - 1) // End point
      } else if (Math.abs(dy) > Math.abs(dx)) {
        // More vertical line - place anchors left/right
        drawAnchor(bounds.minX - 1, bounds.minY) // Start point
        drawAnchor(bounds.maxX - 1, bounds.maxY) // End point
      } else {
        // Diagonal line - place anchors diagonally away
        drawAnchor(bounds.minX - 1, bounds.minY - 1) // Start point
        drawAnchor(bounds.maxX + 1, bounds.maxY + 1) // End point
      }
    }
  }

  // Draw selection highlight for selected shape
  const drawSelectionHighlight = (ctx: CanvasRenderingContext2D) => {
    const selectedShape = layersStore.getSelectedShape()
    if (!selectedShape) return

    // Calculate visible bounds in world space
    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(canvas.width, canvas.height)
    
    // Convert to grid bounds
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

    // Draw highlight around each character in the selected shape
    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      for (let gridY = startGridY; gridY <= endGridY; gridY++) {
        const key = gridKey(gridX, gridY)
        const character = selectedShape.data.get(key)
        
        if (character && character !== '') {
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

    ctx.globalAlpha = 1 // Reset alpha
    
    // Draw resize anchors if select tool is active
    if (toolStore.currentTool === 'select' && (selectedShape.type === 'rectangle' || selectedShape.type === 'line' || selectedShape.type === 'text')) {
      drawResizeAnchors(ctx, selectedShape)
    }
  }

  // Draw rectangle preview while dragging
  const drawRectanglePreview = (ctx: CanvasRenderingContext2D) => {
    if (!rectangleState.isDrawing || toolStore.currentTool !== 'rectangle') {
      return
    }
    
    const startGrid = worldToGrid(rectangleState.startX, rectangleState.startY)
    const endGrid = worldToGrid(rectangleState.endX, rectangleState.endY)
    
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
        const worldX = x * gridWidth
        const worldY = (maxY + 1) * gridHeight
        const screenX = (worldX - camera.x) * camera.zoom + ctx.canvas.width / 2
        const screenY = (worldY - camera.y) * camera.zoom + ctx.canvas.height / 2
        ctx.fillText(shadowChar, screenX + gridWidth * camera.zoom / 2, screenY + gridHeight * camera.zoom / 2)
      }
      
      // Draw shadow for right edge
      for (let y = minY + 1; y <= maxY + 1; y++) {
        const worldX = (maxX + 1) * gridWidth
        const worldY = y * gridHeight
        const screenX = (worldX - camera.x) * camera.zoom + ctx.canvas.width / 2
        const screenY = (worldY - camera.y) * camera.zoom + ctx.canvas.height / 2
        ctx.fillText(shadowChar, screenX + gridWidth * camera.zoom / 2, screenY + gridHeight * camera.zoom / 2)
      }
    }
    
    // Draw rectangle preview
    ctx.fillStyle = colorStore.selectedColor.hex
    ctx.globalAlpha = 0.5 // Make preview semi-transparent
    
    // Draw preview characters in grid cells that would be part of the rectangle outline
    const borderStyleKey = toolStore.rectangleBorderStyle || 'single'
    const borderStyle = RECTANGLE_BORDER_STYLES[borderStyleKey]
    
    // Fallback to single style if not found
    if (!borderStyle) {
      return // Exit early if no style found
    }
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Determine which character to use based on position
        let character = ''
        
        if (x === minX && y === minY) {
          // Top-left corner
          character = borderStyle.topLeft
        } else if (x === maxX && y === minY) {
          // Top-right corner
          character = borderStyle.topRight
        } else if (x === minX && y === maxY) {
          // Bottom-left corner
          character = borderStyle.bottomLeft
        } else if (x === maxX && y === maxY) {
          // Bottom-right corner
          character = borderStyle.bottomRight
        } else if (y === minY || y === maxY) {
          // Top or bottom edge
          character = borderStyle.horizontal
        } else if (x === minX || x === maxX) {
          // Left or right edge
          character = borderStyle.vertical
        } else if (toolStore.rectangleFillChar && toolStore.rectangleFillChar !== '') {
          // Interior fill (only if fill character is set and not empty)
          character = toolStore.rectangleFillChar
        }
        
        if (character) {
          const worldPos = gridToWorld(x, y)
          ctx.fillText(character, worldPos.x, worldPos.y)
        }
      }
    }
    
    ctx.globalAlpha = 1 // Reset alpha
  }

  // Draw text box preview while dragging
  const drawTextPreview = (ctx: CanvasRenderingContext2D) => {
    if (!textState.isDrawing || toolStore.currentTool !== 'text') {
      return
    }
    
    const startGrid = worldToGrid(textState.startX, textState.startY)
    const endGrid = worldToGrid(textState.endX, textState.endY)
    
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
          const worldPos = gridToWorld(x, y)
          ctx.fillText(character, worldPos.x, worldPos.y)
        }
      }
    }
    
    // Draw "TEXT" placeholder in the center
    const centerX = Math.floor((minX + maxX) / 2)
    const centerY = Math.floor((minY + maxY) / 2)
    ctx.globalAlpha = 0.5
    ctx.fillStyle = colorStore.selectedColor.hex
    
    const placeholder = "TEXT"
    const textMinX = toolStore.textShowBorder ? minX + 1 : minX
    const textMaxX = toolStore.textShowBorder ? maxX - 1 : maxX
    const textWidth = textMaxX - textMinX + 1
    
    // Only show placeholder if there's enough room
    if (textWidth >= placeholder.length) {
      for (let i = 0; i < placeholder.length; i++) {
        const worldPos = gridToWorld(centerX - Math.floor(placeholder.length / 2) + i, centerY)
        ctx.fillText(placeholder[i], worldPos.x, worldPos.y)
      }
    }
    
    ctx.globalAlpha = 1 // Reset alpha
  }
  
  // Draw line preview while dragging
  const drawLinePreview = (ctx: CanvasRenderingContext2D) => {
    if (!lineState.isDrawing || toolStore.currentTool !== 'line') {
      return
    }
    
    const startGrid = worldToGrid(lineState.startX, lineState.startY)
    const endGrid = worldToGrid(lineState.endX, lineState.endY)
    
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
      const worldPos = gridToWorld(startGrid.x, startGrid.y)
      ctx.fillText('●', worldPos.x, worldPos.y)
    } else {
      // Draw the line using Bresenham's algorithm
      const xStep = dx / distance
      const yStep = dy / distance
      
      for (let i = 0; i <= distance; i++) {
        const x = Math.round(startGrid.x + xStep * i)
        const y = Math.round(startGrid.y + yStep * i)
        
        // Determine the character based on direction
        let character = ''
        
        if (Math.abs(dx) > Math.abs(dy) * 2) {
          // Mostly horizontal
          character = lineStyle.horizontal
        } else if (Math.abs(dy) > Math.abs(dx) * 2) {
          // Mostly vertical
          character = lineStyle.vertical
        } else if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) {
          // Diagonal down-right or up-left
          character = lineStyle.diagonal2 || '╲'
        } else {
          // Diagonal down-left or up-right
          character = lineStyle.diagonal1 || '╱'
        }
        
        const worldPos = gridToWorld(x, y)
        ctx.fillText(character, worldPos.x, worldPos.y)
      }
      
      // Draw end styles if specified
      const startStyle = toolStore.lineStartStyle || 'none'
      const endStyle = toolStore.lineEndStyle || 'arrow'
      
      if (startStyle !== 'none' && LINE_END_STYLES[startStyle]) {
        const worldPos = gridToWorld(startGrid.x, startGrid.y)
        if (startStyle === 'arrow') {
          let arrowChar = ''
          if (dx > Math.abs(dy)) arrowChar = LINE_END_STYLES.arrow.left
          else if (dx < -Math.abs(dy)) arrowChar = LINE_END_STYLES.arrow.right
          else if (dy > Math.abs(dx)) arrowChar = LINE_END_STYLES.arrow.up
          else if (dy < -Math.abs(dx)) arrowChar = LINE_END_STYLES.arrow.down
          else if (dx > 0 && dy > 0) arrowChar = LINE_END_STYLES.arrow.upLeft
          else if (dx > 0 && dy < 0) arrowChar = LINE_END_STYLES.arrow.downLeft
          else if (dx < 0 && dy > 0) arrowChar = LINE_END_STYLES.arrow.upRight
          else if (dx < 0 && dy < 0) arrowChar = LINE_END_STYLES.arrow.downRight
          ctx.fillText(arrowChar, worldPos.x, worldPos.y)
        } else {
          ctx.fillText(LINE_END_STYLES[startStyle].all, worldPos.x, worldPos.y)
        }
      }
      
      if (endStyle !== 'none' && LINE_END_STYLES[endStyle]) {
        const worldPos = gridToWorld(endGrid.x, endGrid.y)
        if (endStyle === 'arrow') {
          let arrowChar = ''
          if (dx > Math.abs(dy)) arrowChar = LINE_END_STYLES.arrow.right
          else if (dx < -Math.abs(dy)) arrowChar = LINE_END_STYLES.arrow.left
          else if (dy > Math.abs(dx)) arrowChar = LINE_END_STYLES.arrow.down
          else if (dy < -Math.abs(dx)) arrowChar = LINE_END_STYLES.arrow.up
          else if (dx > 0 && dy > 0) arrowChar = LINE_END_STYLES.arrow.downRight
          else if (dx > 0 && dy < 0) arrowChar = LINE_END_STYLES.arrow.upRight
          else if (dx < 0 && dy > 0) arrowChar = LINE_END_STYLES.arrow.downLeft
          else if (dx < 0 && dy < 0) arrowChar = LINE_END_STYLES.arrow.upLeft
          ctx.fillText(arrowChar, worldPos.x, worldPos.y)
        } else {
          ctx.fillText(LINE_END_STYLES[endStyle].all, worldPos.x, worldPos.y)
        }
      }
    }
    
    ctx.globalAlpha = 1 // Reset alpha
  }

  // Mouse event handlers
  // Check if a position is over an anchor
  const getAnchorAtPosition = (gridX: number, gridY: number, shape: any) => {
    if (!shape || (shape.type !== 'rectangle' && shape.type !== 'line' && shape.type !== 'text')) return null
    
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
    } else if (shape.type === 'line') {
      // For lines, anchors are positioned perpendicular to the line direction
      const dx = bounds.maxX - bounds.minX
      const dy = bounds.maxY - bounds.minY
      const isHorizontal = Math.abs(dx) > Math.abs(dy)
      const isVertical = Math.abs(dy) > Math.abs(dx)
      
      if (isHorizontal) {
        // Horizontal line - check positions above/below the endpoints
        if (Math.abs(gridX - bounds.minX) <= tolerance && Math.abs(gridY - (bounds.minY - 1)) <= tolerance) return 'start'
        if (Math.abs(gridX - bounds.maxX) <= tolerance && Math.abs(gridY - (bounds.maxY - 1)) <= tolerance) return 'end'
      } else if (isVertical) {
        // Vertical line - check positions left/right of the endpoints
        if (Math.abs(gridX - (bounds.minX - 1)) <= tolerance && Math.abs(gridY - bounds.minY) <= tolerance) return 'start'
        if (Math.abs(gridX - (bounds.maxX - 1)) <= tolerance && Math.abs(gridY - bounds.maxY) <= tolerance) return 'end'
      } else {
        // Diagonal line - position anchors perpendicular to line direction
        const length = Math.sqrt(dx * dx + dy * dy)
        const perpX = -dy / length
        const perpY = dx / length
        
        // Check start anchor (positioned perpendicular to line)
        const startAnchorX = bounds.minX + Math.round(perpX)
        const startAnchorY = bounds.minY + Math.round(perpY)
        if (Math.abs(gridX - startAnchorX) <= tolerance && Math.abs(gridY - startAnchorY) <= tolerance) return 'start'
        
        // Check end anchor (positioned perpendicular to line)
        const endAnchorX = bounds.maxX + Math.round(perpX)
        const endAnchorY = bounds.maxY + Math.round(perpY)
        if (Math.abs(gridX - endAnchorX) <= tolerance && Math.abs(gridY - endAnchorY) <= tolerance) return 'end'
      }
    }
    
    return null
  }
  
  const handleMouseDown = (e: MouseEvent) => {
    if (toolStore.currentTool === 'pan') {
      mouse.isDragging = true
      mouse.lastX = e.clientX
      mouse.lastY = e.clientY
      canvas.style.cursor = 'grabbing'
    } else if (toolStore.currentTool === 'brush') {
      // Start new brush stroke
      currentStrokeData.clear()
      brushStrokeStarted = true
      
      mouse.isDragging = true
      // Place character at click position
      const worldPos = screenToWorld(e.clientX, e.clientY)
      placeCharacter(worldPos.x, worldPos.y, toolStore.selectedCharacter)
      render()
    } else if (toolStore.currentTool === 'eraser') {
      mouse.isDragging = true
      // Erase character at click position
      const worldPos = screenToWorld(e.clientX, e.clientY)
      eraseAtPosition(worldPos.x, worldPos.y)
      render()
    } else if (toolStore.currentTool === 'eyedropper') {
      colorStore.toggleColorSelector()
      // Don't reset to pan - keep the eyedropper tool selected
    } else if (toolStore.currentTool === 'select') {
      // Handle shape selection, dragging, or resizing
      const worldPos = screenToWorld(e.clientX, e.clientY)
      const grid = worldToGrid(worldPos.x, worldPos.y)
      const selectedShape = layersStore.getSelectedShape()
      
      // Check if clicking on a resize anchor first
      if (selectedShape && (selectedShape.type === 'rectangle' || selectedShape.type === 'line' || selectedShape.type === 'text')) {
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
          render()
          return
        }
      }
      
      // Check if clicking on a shape
      const shape = layersStore.getShapeAtPosition(grid.x, grid.y)
      
      if (shape) {
        layersStore.selectShape(shape.id)
        
        // Check if we're clicking on an already selected shape to start dragging
        const newSelectedShape = layersStore.getSelectedShape()
        if (selectedShape && selectedShape.id === shape.id && newSelectedShape) {
          // Start dragging the selected shape
          shapeDragState.isDragging = true
          shapeDragState.shapeId = shape.id
          shapeDragState.originalData = new Map(newSelectedShape.data) // Store original positions
          shapeDragState.dragStartX = grid.x
          shapeDragState.dragStartY = grid.y
          shapeDragState.offsetX = 0
          shapeDragState.offsetY = 0
          mouse.isDragging = true
        }
      } else {
        layersStore.selectShape(null) // Deselect if clicking empty area
      }
      render()
    } else if (toolStore.currentTool === 'rectangle') {
      // Start rectangle drawing
      const worldPos = screenToWorld(e.clientX, e.clientY)
      rectangleState.startX = worldPos.x
      rectangleState.startY = worldPos.y
      rectangleState.endX = worldPos.x
      rectangleState.endY = worldPos.y
      rectangleState.isDrawing = true
      mouse.isDragging = true
    } else if (toolStore.currentTool === 'line') {
      // Start line drawing
      const worldPos = screenToWorld(e.clientX, e.clientY)
      lineState.startX = worldPos.x
      lineState.startY = worldPos.y
      lineState.endX = worldPos.x
      lineState.endY = worldPos.y
      lineState.isDrawing = true
      mouse.isDragging = true
    } else if (toolStore.currentTool === 'text') {
      // Start text box drawing
      const worldPos = screenToWorld(e.clientX, e.clientY)
      textState.startX = worldPos.x
      textState.startY = worldPos.y
      textState.endX = worldPos.x
      textState.endY = worldPos.y
      textState.isDrawing = true
      mouse.isDragging = true
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
    
    // Update cursor for select tool when hovering over selected shape or anchors
    if (!mouse.isDragging && !shapeResizeState.isResizing && toolStore.currentTool === 'select') {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      const grid = worldToGrid(worldPos.x, worldPos.y)
      const selectedShape = layersStore.getSelectedShape()
      
      if (selectedShape && (selectedShape.type === 'rectangle' || selectedShape.type === 'line' || selectedShape.type === 'text')) {
        // Check if hovering over an anchor
        const anchor = getAnchorAtPosition(grid.x, grid.y, selectedShape)
        if (anchor) {
          // Set cursor based on anchor type
          if (anchor === 'topLeft' || anchor === 'bottomRight') {
            canvas.style.cursor = 'nwse-resize'
          } else if (anchor === 'topRight' || anchor === 'bottomLeft') {
            canvas.style.cursor = 'nesw-resize'
          } else if (anchor === 'left' || anchor === 'right') {
            canvas.style.cursor = 'ew-resize'
          } else if (anchor === 'top' || anchor === 'bottom') {
            canvas.style.cursor = 'ns-resize'
          } else {
            canvas.style.cursor = 'move'
          }
        } else {
          // Check if hovering over the shape itself
          const shape = layersStore.getShapeAtPosition(grid.x, grid.y)
          if (shape && shape.id === selectedShape.id) {
            canvas.style.cursor = 'move'
          } else {
            canvas.style.cursor = 'pointer'
          }
        }
      } else {
        canvas.style.cursor = 'pointer'
      }
    }
    
    if (mouse.isDragging && toolStore.currentTool === 'pan') {
      const deltaX = e.clientX - mouse.lastX
      const deltaY = e.clientY - mouse.lastY
      
      // Pan the camera (move in opposite direction of mouse)
      camera.x -= deltaX / camera.zoom
      camera.y -= deltaY / camera.zoom
      
      mouse.lastX = e.clientX
      mouse.lastY = e.clientY
      
      saveCameraState() // Save camera state after panning
      render()
    } else if (mouse.isDragging && toolStore.currentTool === 'brush') {
      // Continue placing characters while dragging
      const worldPos = screenToWorld(e.clientX, e.clientY)
      placeCharacter(worldPos.x, worldPos.y, toolStore.selectedCharacter)
      render()
    } else if (mouse.isDragging && toolStore.currentTool === 'eraser') {
      // Continue erasing while dragging
      const worldPos = screenToWorld(e.clientX, e.clientY)
      eraseAtPosition(worldPos.x, worldPos.y)
      render()
    } else if (mouse.isDragging && toolStore.currentTool === 'rectangle' && rectangleState.isDrawing) {
      // Update rectangle end position while dragging
      const worldPos = screenToWorld(e.clientX, e.clientY)
      rectangleState.endX = worldPos.x
      rectangleState.endY = worldPos.y
      render()
    } else if (mouse.isDragging && toolStore.currentTool === 'line' && lineState.isDrawing) {
      // Update line end position while dragging
      const worldPos = screenToWorld(e.clientX, e.clientY)
      lineState.endX = worldPos.x
      lineState.endY = worldPos.y
      render()
    } else if (mouse.isDragging && toolStore.currentTool === 'text' && textState.isDrawing) {
      // Update text box end position while dragging
      const worldPos = screenToWorld(e.clientX, e.clientY)
      textState.endX = worldPos.x
      textState.endY = worldPos.y
      render()
    } else if (mouse.isDragging && toolStore.currentTool === 'select' && shapeResizeState.isResizing) {
      // Resize the selected shape
      const worldPos = screenToWorld(e.clientX, e.clientY)
      const grid = worldToGrid(worldPos.x, worldPos.y)
      const selectedShape = layersStore.getSelectedShape()
      
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
          
          // Recreate rectangle with new bounds, preserving tool settings
          const borderStyle = selectedShape.toolSettings?.borderStyle || toolStore.rectangleBorderStyle
          const fillChar = selectedShape.toolSettings?.fillChar ?? toolStore.rectangleFillChar
          const shadow = selectedShape.toolSettings?.shadow || false
          
          // Temporarily set tool settings to match shape settings
          const oldBorderStyle = toolStore.rectangleBorderStyle
          const oldFillChar = toolStore.rectangleFillChar
          const oldShadow = toolStore.rectangleShadow
          
          toolStore.rectangleBorderStyle = borderStyle as RectangleBorderStyle
          toolStore.rectangleFillChar = fillChar
          toolStore.rectangleShadow = shadow
          
          const rectangleData = drawRectangle(
            gridToWorld(newMinX, newMinY).x,
            gridToWorld(newMinX, newMinY).y,
            gridToWorld(newMaxX, newMaxY).x,
            gridToWorld(newMaxX, newMaxY).y
          )
          
          // Restore tool settings
          toolStore.rectangleBorderStyle = oldBorderStyle
          toolStore.rectangleFillChar = oldFillChar
          toolStore.rectangleShadow = oldShadow
          
          // Update shape data
          selectedShape.data.clear()
          for (const [key, char] of rectangleData) {
            selectedShape.data.set(key, char)
          }
          
          render()
        } else if (selectedShape.type === 'line') {
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
          const lineStyle = selectedShape.toolSettings?.lineStyle || toolStore.lineStyle
          const lineStartStyle = selectedShape.toolSettings?.lineStartStyle || toolStore.lineStartStyle
          const lineEndStyle = selectedShape.toolSettings?.lineEndStyle || toolStore.lineEndStyle
          
          // Temporarily set tool settings to match shape settings
          const oldLineStyle = toolStore.lineStyle
          const oldLineStartStyle = toolStore.lineStartStyle
          const oldLineEndStyle = toolStore.lineEndStyle
          
          toolStore.lineStyle = lineStyle as LineStyle
          toolStore.lineStartStyle = lineStartStyle as LineEndStyle
          toolStore.lineEndStyle = lineEndStyle as LineEndStyle
          
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
          selectedShape.data.clear()
          for (const [key, char] of lineData) {
            selectedShape.data.set(key, char)
          }
          
          render()
        } else if (selectedShape.type === 'text') {
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
          const content = selectedShape.toolSettings?.content || ''
          const horizontalAlign = selectedShape.toolSettings?.horizontalAlign || 'left'
          const verticalAlign = selectedShape.toolSettings?.verticalAlign || 'top'
          const showBorder = selectedShape.toolSettings?.showBorder ?? true
          
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
          selectedShape.data.clear()
          for (const [key, char] of textData) {
            selectedShape.data.set(key, char)
          }
          
          render()
        }
      }
    } else if (mouse.isDragging && toolStore.currentTool === 'select' && shapeDragState.isDragging) {
      // Move the selected shape
      const worldPos = screenToWorld(e.clientX, e.clientY)
      const grid = worldToGrid(worldPos.x, worldPos.y)
      
      // Calculate the offset from the original drag position
      const offsetX = grid.x - shapeDragState.dragStartX
      const offsetY = grid.y - shapeDragState.dragStartY
      
      // Only update if the offset has changed
      if (offsetX !== shapeDragState.offsetX || offsetY !== shapeDragState.offsetY) {
        shapeDragState.offsetX = offsetX
        shapeDragState.offsetY = offsetY
        
        // Update the shape's data with the new positions
        const selectedShape = layersStore.getSelectedShape()
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
          
          render()
        }
      }
    }
  }

  const handleMouseUp = () => {
    // Complete rectangle drawing if we were drawing one
    if (rectangleState.isDrawing && toolStore.currentTool === 'rectangle') {
      const rectangleData = drawRectangle(rectangleState.startX, rectangleState.startY, rectangleState.endX, rectangleState.endY)
      layersStore.addShape('rectangle', rectangleData, colorStore.selectedColor.hex, undefined, {
        borderStyle: toolStore.rectangleBorderStyle,
        fillChar: toolStore.rectangleFillChar,
        shadow: toolStore.rectangleShadow
      })
      rectangleState.isDrawing = false
      render()
    }
    
    // Complete line drawing if we were drawing one
    if (lineState.isDrawing && toolStore.currentTool === 'line') {
      const lineData = drawLine(lineState.startX, lineState.startY, lineState.endX, lineState.endY)
      layersStore.addShape('line', lineData, colorStore.selectedColor.hex, undefined, {
        lineStyle: toolStore.lineStyle,
        lineStartStyle: toolStore.lineStartStyle,
        lineEndStyle: toolStore.lineEndStyle
      })
      lineState.isDrawing = false
      render()
    }
    
    // Complete text box drawing and show text input dialog
    if (textState.isDrawing && toolStore.currentTool === 'text') {
      textState.isDrawing = false
      
      // Show text input dialog centered on the text box
      const centerX = (textState.startX + textState.endX) / 2
      const centerY = (textState.startY + textState.endY) / 2
      const screenPos = worldToScreen(centerX, centerY)
      
      if (textInputRef.value) {
        // Store the text box bounds for later use
        toolStore.setTextContent('') // Clear previous content
        textInputRef.value.show(screenPos.x, screenPos.y)
      }
      render()
    }
    
    // Complete brush stroke
    if (brushStrokeStarted && toolStore.currentTool === 'brush' && currentStrokeData.size > 0) {
      layersStore.addShape('brush', currentStrokeData, colorStore.selectedColor.hex, undefined, {
        character: toolStore.selectedCharacter
      })
      currentStrokeData.clear()
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
      
      // Save the new shape size to storage
      layersStore.saveToStorage()
    }
    
    // Complete shape dragging
    if (shapeDragState.isDragging && toolStore.currentTool === 'select') {
      // Reset drag state
      shapeDragState.isDragging = false
      shapeDragState.shapeId = null
      shapeDragState.originalData = null
      shapeDragState.offsetX = 0
      shapeDragState.offsetY = 0
      
      // Save the new shape position to storage
      layersStore.saveToStorage()
    }
    
    mouse.isDragging = false
    brushStrokeStarted = false
    updateCursor()
  }

  const updateCursor = () => {
    // Special cursor for dragging shapes
    if (shapeDragState.isDragging) {
      canvas.style.cursor = 'move'
      return
    }
    
    const cursors = {
      pan: 'grab',
      brush: 'crosshair',
      rectangle: 'crosshair',
      line: 'crosshair',
      text: 'text',
      select: 'pointer',
      eraser: 'crosshair',
      eyedropper: 'crosshair',
      undo: 'pointer',
      redo: 'pointer',
      recenter: 'pointer',
      reset: 'pointer'
    }
    canvas.style.cursor = cursors[toolStore.currentTool] || 'default'
  }

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    
    // Get mouse position in world coordinates before zoom
    const worldPos = screenToWorld(e.clientX, e.clientY)
    
    // Zoom in/out
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    camera.zoom *= zoomFactor
    
    // Clamp zoom to reasonable range
    camera.zoom = Math.max(0.01, Math.min(100, camera.zoom))
    
    // Get mouse position in world coordinates after zoom
    const newWorldPos = screenToWorld(e.clientX, e.clientY)
    
    // Adjust camera position to keep mouse point stationary
    camera.x += worldPos.x - newWorldPos.x
    camera.y += worldPos.y - newWorldPos.y
    
    saveCameraState() // Save camera state after zooming
    render()
  }

  // Draw functions
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
        
        // Also draw current stroke data if we're drawing
        if (currentStrokeData.has(key)) {
          const strokeChar = currentStrokeData.get(key)
          if (strokeChar && strokeChar !== '') {
            characterToDraw = strokeChar
            colorToDraw = colorStore.selectedColor.hex
          }
        }
        
        if (characterToDraw) {
          ctx.fillStyle = colorToDraw
          const worldPos = gridToWorld(gridX, gridY)
          ctx.fillText(characterToDraw, worldPos.x, worldPos.y)
        }
      }
    }
  }

  // Render function
  render = () => {
    // Clear canvas - get computed style for dark mode support
    const computedStyle = getComputedStyle(document.documentElement)
    const canvasBg = computedStyle.getPropertyValue('--canvas-bg').trim()
    ctx.fillStyle = canvasBg || '#fafafb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Save context state
    ctx.save()
    
    // Apply camera transformation
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(camera.zoom, camera.zoom)
    ctx.translate(-camera.x, -camera.y)
    
    // Draw infinite grid
    drawGrid(ctx)
    
    // Draw placed characters
    drawCharacters(ctx)
    
    // Draw rectangle preview if drawing
    drawRectanglePreview(ctx)
    
    // Draw line preview if drawing
    drawLinePreview(ctx)
    
    // Draw text preview if drawing
    drawTextPreview(ctx)
    
    // Draw selection highlight
    drawSelectionHighlight(ctx)
    
    // Draw center point (disabled - removed for cleaner canvas)
    // drawCenter(ctx)
    
    // Restore context state
    ctx.restore()
    
    // Draw UI overlay (in screen space)
    drawUI(ctx)
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

  const drawCenter = (ctx: CanvasRenderingContext2D) => {
    const size = 10 / camera.zoom // Keep size constant in screen space
    
    // Get computed style for dark mode support
    const computedStyle = getComputedStyle(document.documentElement)
    const centerColor = computedStyle.getPropertyValue('--center-marker').trim()
    
    // Set transparency for the origin indicator
    ctx.globalAlpha = 0.3
    
    // Draw center cross
    ctx.strokeStyle = centerColor || '#ff4444'
    ctx.lineWidth = 2 / camera.zoom
    ctx.beginPath()
    ctx.moveTo(-size, 0)
    ctx.lineTo(size, 0)
    ctx.moveTo(0, -size)
    ctx.lineTo(0, size)
    ctx.stroke()
    
    // Draw center circle
    ctx.strokeStyle = centerColor || '#ff4444'
    ctx.beginPath()
    ctx.arc(0, 0, size, 0, Math.PI * 2)
    ctx.stroke()
    
    // Reset alpha
    ctx.globalAlpha = 1
  }

  const drawUI = (ctx: CanvasRenderingContext2D) => {
    // Draw zoom and position info
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px monospace' // Use generic monospace for consistent character spacing
    ctx.fillText(`Zoom: ${(camera.zoom * 100).toFixed(1)}%`, 10, 20)
    ctx.fillText(`Position: (${camera.x.toFixed(1)}, ${camera.y.toFixed(1)})`, 10, 40)
  }

  // Set canvas size to match viewport
  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    render() // Re-render after resize
  }
  
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // Add event listeners
  canvas.addEventListener('mousedown', handleMouseDown)
  canvas.addEventListener('mousemove', handleMouseMove)
  canvas.addEventListener('mouseup', handleMouseUp)
  canvas.addEventListener('mouseleave', handleMouseUp)
  canvas.addEventListener('wheel', handleWheel, { passive: false })
  
  // Watch for tool changes and update cursor
  watch(() => toolStore.currentTool, updateCursor, { immediate: true })
  
  // Watch for layer changes and re-render
  watch(() => layersStore.layers, render, { deep: true })
  
  // Watch for dark mode changes and re-render
  watch(() => appStore.darkMode, render)

  // Keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // Check if the user is typing in an input field
    const activeElement = document.activeElement
    const isTypingInInput = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.tagName === 'SELECT' ||
      activeElement.getAttribute('contenteditable') === 'true'
    )
    
    // Don't handle keyboard shortcuts when typing in input fields
    if (isTypingInInput && e.key !== 'Escape') {
      return
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      performUndo()
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      performRedo()
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && toolStore.currentTool === 'select') {
      // Delete selected shape (only if not typing in an input)
      e.preventDefault()
      const selectedShape = layersStore.getSelectedShape()
      if (selectedShape) {
        // Find which layer contains this shape
        for (const layer of layersStore.layers) {
          const shapeIndex = layer.shapes.findIndex(s => s.id === selectedShape.id)
          if (shapeIndex !== -1) {
            // Delete the shape from the layer
            layer.shapes.splice(shapeIndex, 1)
            // Clear selection
            layersStore.selectShape(null)
            // Save changes
            layersStore.saveToStorage()
            // Re-render
            render()
            // Show confirmation
            toastStore.showToast('Shape deleted', 'success')
            break
          }
        }
      }
    }
  }

  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyDown)
  
  // Add paste event listener
  window.addEventListener('paste', handlePaste)

  // Expose render function globally for stores
  window.renderCanvas = render
  window.regenerateShape = regenerateShape
  
  // Initial render
  render()
})
</script>

<template>
  <canvas ref="canvasRef" class="main-canvas"></canvas>
  <ToolBar @recenter="resetView" @undo="performUndo" @redo="performRedo" @reset="resetCanvas" @about="openAbout" @export="exportToPNG" @copy="copyToClipboard" @share="shareCanvas" />
  <ColorSelector />
  <CharacterPalette />
  <LayersPanel @shapesChanged="render" />
  <ToolSettingsPanel />
  <TextInput ref="textInputRef" @confirm="handleTextConfirm" @cancel="" />
  <TrialPopup />
  <AboutModal ref="aboutModalRef" />
  <ToastNotification />
</template>

<style>
/* Global CSS Variables */
:root {
  /* Typography */
  --ui-font-family: Bahnschrift, 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed, sans-serif;
  --mono-font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
  
  /* UI Colors */
  --bg-primary: rgba(255, 255, 255, 0.95);
  --bg-secondary: rgba(247, 247, 247, 0.8);
  --bg-hover: #f0f0f0;
  --bg-active: #007acc;
  --bg-active-hover: #005a9e;
  
  /* Border & Outline Colors */
  --border-light: #e1e1e1;
  --border-active: #007acc;
  
  /* Text Colors */
  --text-primary: #333;
  --text-secondary: #666;
  --text-muted: #999;
  --text-white: white;
  
  /* Canvas & Grid Colors */
  --canvas-bg: #fafafb;
  --grid-line: #c4c3d0;
  --center-marker: #ff4444;
  --selection-highlight: #007acc;
  
  /* Shadow & Effects */
  --shadow-light: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.15);
  --backdrop-blur: blur(8px);
  
  /* Tool Icon Colors - Fun Palette */
  --icon-undo: #6366f1;      /* Indigo */
  --icon-redo: #8b5cf6;      /* Purple */
  --icon-recenter: #06b6d4;  /* Cyan */
  --icon-reset: #dc2626;     /* Red */
  --icon-pan: #10b981;       /* Emerald */
  --icon-select: #059669;    /* Green */
  --icon-brush: #f59e0b;     /* Amber */
  --icon-rectangle: #ef4444; /* Red */
  --icon-line: #3b82f6;      /* Blue */
  --icon-text: #8b5cf6;      /* Purple */
  --icon-eraser: #ec4899;    /* Pink */
  --icon-palette: #f97316;   /* Orange */
  
  /* Layer Panel Colors */
  --layer-bg-selected: rgba(0, 122, 204, 0.1);
  --layer-bg-selected-hover: rgba(0, 122, 204, 0.15);
  --shape-bg: rgba(247, 247, 247, 0.5);
  --shape-bg-hover: rgba(240, 240, 240, 0.8);
  --shape-bg-selected: rgba(0, 122, 204, 0.1);
  --shape-bg-selected-hover: rgba(0, 122, 204, 0.15);
  
  /* Color Selector */
  --color-swatch-border: #ddd;
  --color-swatch-border-hover: #007acc;
  --delete-hover-bg: #ffe6e6;
  --delete-hover-text: #d32f2f;
}

/* Dark Mode */
[data-theme="dark"] {
  /* UI Colors */
  --bg-primary: rgba(30, 30, 30, 0.95);
  --bg-secondary: rgba(40, 40, 40, 0.8);
  --bg-hover: #3a3a3a;
  --bg-active: #0e7ecf;
  --bg-active-hover: #0969b5;
  
  /* Border & Outline Colors */
  --border-light: #444;
  --border-active: #0e7ecf;
  
  /* Text Colors */
  --text-primary: #e0e0e0;
  --text-secondary: #b0b0b0;
  --text-muted: #808080;
  --text-white: white;
  
  /* Canvas & Grid Colors */
  --canvas-bg: #1a1a1a;
  --grid-line: #333;
  --center-marker: #ff6666;
  --selection-highlight: #0e7ecf;
  
  /* Shadow & Effects */
  --shadow-light: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.6);
  
  /* Layer Panel Colors */
  --layer-bg-selected: rgba(14, 126, 207, 0.2);
  --layer-bg-selected-hover: rgba(14, 126, 207, 0.3);
  --shape-bg: rgba(60, 60, 60, 0.5);
  --shape-bg-hover: rgba(70, 70, 70, 0.8);
  --shape-bg-selected: rgba(14, 126, 207, 0.2);
  --shape-bg-selected-hover: rgba(14, 126, 207, 0.3);
  
  /* Color Selector */
  --color-swatch-border: #555;
  --color-swatch-border-hover: #0e7ecf;
  --delete-hover-bg: #4a2020;
  --delete-hover-text: #ff6666;
}

/* Global font application */
body, html {
  font-family: var(--ui-font-family);
}

/* Ensure all UI elements use the UI font */
* {
  font-family: inherit;
}
</style>

<style scoped>
.main-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
}
</style>
