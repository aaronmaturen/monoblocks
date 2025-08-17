import { useCoordinateSystem } from '../canvas/useCoordinateSystem'
import { useLayersStore } from '../../stores/layers'
import { useToastStore } from '../../stores/toast'

export interface ClipboardCallbacks {
  onRender?: () => void
  getCurrentMousePosition?: () => { x: number, y: number } | null
  getCameraPosition?: () => { x: number, y: number }
}

export function useClipboard(callbacks: ClipboardCallbacks = {}) {
  const { worldToGrid, gridToWorld, gridKey, gridWidth, gridHeight } = useCoordinateSystem()
  const layersStore = useLayersStore()
  const toastStore = useToastStore()

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
      toastStore.showToast('No content to copy', 'warning')
      return
    }
    
    // Create a 2D array to represent the content
    const width = maxX - minX + 1
    const height = maxY - minY + 1
    const contentArray: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '))
    
    // Fill the array with characters from all shapes
    for (const shape of visibleShapes) {
      for (const [key, char] of shape.data) {
        if (char && char !== '') {
          const [x, y] = key.split(',').map(Number)
          const relativeX = x - minX
          const relativeY = y - minY
          contentArray[relativeY][relativeX] = char
        }
      }
    }
    
    // Convert to string
    const textContent = contentArray.map(row => row.join('')).join('\n')
    
    // Copy to clipboard
    navigator.clipboard.writeText(textContent).then(() => {
      toastStore.showToast('Content copied to clipboard!', 'success')
    }).catch(err => {
      console.error('Failed to copy content:', err)
      toastStore.showToast('Failed to copy content', 'error')
    })
  }

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    
    const pastedText = e.clipboardData?.getData('text/plain')
    if (!pastedText) return
    
    // Get the current mouse position or use center of viewport
    const mousePos = callbacks.getCurrentMousePosition?.()
    const cameraPos = callbacks.getCameraPosition?.()
    
    let worldPos: { x: number, y: number }
    if (mousePos && mousePos.x && mousePos.y) {
      // Use mouse position if available - this would need screenToWorld conversion
      // For now, fallback to camera position
      worldPos = cameraPos || { x: 0, y: 0 }
    } else {
      worldPos = cameraPos || { x: 0, y: 0 }
    }
    
    // Convert to grid coordinates
    const startGrid = {
      x: Math.floor(worldPos.x / gridWidth),
      y: Math.floor(worldPos.y / gridHeight)
    }
    
    // Split text into lines
    const lines = pastedText.split('\n')
    
    // Create shape data for the pasted text
    const pasteData = new Map<string, string>()
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex]
        if (char !== ' ') { // Only store non-space characters
          const gridX = startGrid.x + charIndex
          const gridY = startGrid.y + lineIndex
          const key = gridKey(gridX, gridY)
          pasteData.set(key, char)
        }
      }
    }
    
    // Add the pasted content as a new shape
    if (pasteData.size > 0) {
      layersStore.addShape('brush', pasteData, '#000000', undefined, {
        character: '' // This is for pasted content, so no specific character
      })
      layersStore.saveToStorage()
      
      toastStore.showToast('Content pasted!', 'success')
      
      // Re-render canvas
      callbacks.onRender?.()
    }
  }

  const setupClipboardListeners = () => {
    window.addEventListener('paste', handlePaste)
    
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }

  const exportToClipboardAsImage = (canvas: HTMLCanvasElement) => {
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
      toastStore.showToast('No content to export', 'warning')
      return
    }
    
    // Calculate the size of the cropped content
    const width = (maxX - minX + 1) * gridWidth
    const height = (maxY - minY + 1) * gridHeight
    
    // Create a temporary canvas for the cropped content
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const tempCtx = tempCanvas.getContext('2d')
    
    if (!tempCtx) return
    
    // Fill with white background
    tempCtx.fillStyle = '#ffffff'
    tempCtx.fillRect(0, 0, width, height)
    
    // Set up text rendering
    const fontSize = gridHeight * 0.7
    tempCtx.font = `${fontSize}px monospace`
    tempCtx.textAlign = 'center'
    tempCtx.textBaseline = 'middle'
    
    // Draw all visible characters in the cropped area
    for (const shape of visibleShapes) {
      for (const [key, char] of shape.data) {
        if (char && char !== '') {
          const [gridX, gridY] = key.split(',').map(Number)
          if (gridX >= minX && gridX <= maxX && gridY >= minY && gridY <= maxY) {
            const x = (gridX - minX) * gridWidth + gridWidth / 2
            const y = (gridY - minY) * gridHeight + gridHeight / 2
            
            tempCtx.fillStyle = shape.color
            tempCtx.fillText(char, x, y)
          }
        }
      }
    }
    
    // Convert canvas to blob and copy to clipboard
    tempCanvas.toBlob((blob) => {
      if (blob) {
        const item = new ClipboardItem({ 'image/png': blob })
        navigator.clipboard.write([item]).then(() => {
          toastStore.showToast('Image copied to clipboard!', 'success')
        }).catch(err => {
          console.error('Failed to copy image:', err)
          toastStore.showToast('Failed to copy image', 'error')
        })
      }
    }, 'image/png')
  }

  return {
    // Functions
    copyToClipboard,
    handlePaste,
    setupClipboardListeners,
    exportToClipboardAsImage,
  }
}