import { reactive } from 'vue'
import { useCoordinateSystem } from '../canvas/useCoordinateSystem'
import { useToolStore, RECTANGLE_BORDER_STYLES, LINE_STYLES, LINE_END_STYLES } from '../../stores/tools'

export interface DrawingToolState {
  startX: number
  startY: number
  endX: number
  endY: number
  isDrawing: boolean
}

export function useDrawingTools() {
  const { worldToGrid, gridToWorld, gridKey } = useCoordinateSystem()
  const toolStore = useToolStore()

  // Preview states for each tool
  const rectangleState = reactive<DrawingToolState>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isDrawing: false
  })

  const diamondState = reactive<DrawingToolState>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isDrawing: false
  })

  const lineState = reactive<DrawingToolState>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isDrawing: false
  })

  const textState = reactive<DrawingToolState>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isDrawing: false
  })

  // Current stroke data for brush/eraser operations
  const currentStrokeData = new Map<string, string>()
  
  // Track last brush position for interpolation
  let lastBrushPosition: { x: number, y: number } | null = null

  // Place character at world position (for current stroke)
  const placeCharacter = (worldX: number, worldY: number, character: string) => {
    const grid = worldToGrid(worldX, worldY)
    
    // If we have a previous position, interpolate between positions
    if (lastBrushPosition) {
      const dx = grid.x - lastBrushPosition.x
      const dy = grid.y - lastBrushPosition.y
      const distance = Math.max(Math.abs(dx), Math.abs(dy))
      
      // Fill in all blocks along the path
      if (distance > 0) {
        for (let i = 0; i <= distance; i++) {
          const progress = i / distance
          const x = Math.round(lastBrushPosition.x + dx * progress)
          const y = Math.round(lastBrushPosition.y + dy * progress)
          const key = gridKey(x, y)
          currentStrokeData.set(key, character)
        }
      } else {
        // No movement, just place at current position
        const key = gridKey(grid.x, grid.y)
        currentStrokeData.set(key, character)
      }
    } else {
      // First position, just place character
      const key = gridKey(grid.x, grid.y)
      currentStrokeData.set(key, character)
    }
    
    // Update last position
    lastBrushPosition = { x: grid.x, y: grid.y }
  }
  
  // Reset brush tracking when stroke ends
  const resetBrushTracking = () => {
    lastBrushPosition = null
  }

  // Erase character at world position by modifying existing shapes
  const eraseAtPosition = (worldX: number, worldY: number, shapes: any[]) => {
    const grid = worldToGrid(worldX, worldY)
    const key = gridKey(grid.x, grid.y)
    
    // Go through all shapes and remove this position
    for (const shape of shapes) {
      if (shape.visible === false) continue
      
      if (shape.data && shape.data.has && shape.data.has(key)) {
        shape.data.delete(key) // Remove the character at this position
      }
    }
  }

  // Draw rectangle outline from start to end coordinates (world space)
  const drawRectangle = (startWorldX: number, startWorldY: number, endWorldX: number, endWorldY: number, customSettings?: any): Map<string, string> => {
    const startGrid = worldToGrid(startWorldX, startWorldY)
    const endGrid = worldToGrid(endWorldX, endWorldY)
    
    // Ensure we have proper min/max coordinates
    const minX = Math.min(startGrid.x, endGrid.x)
    const maxX = Math.max(startGrid.x, endGrid.x)
    const minY = Math.min(startGrid.y, endGrid.y)
    const maxY = Math.max(startGrid.y, endGrid.y)
    
    const rectangleData = new Map<string, string>()
    
    // Get rectangle style settings (use custom settings if provided, otherwise fall back to tool store)
    const borderStyleKey = customSettings?.borderStyle || toolStore.rectangleBorderStyle || 'single'
    const borderStyle = RECTANGLE_BORDER_STYLES[borderStyleKey as keyof typeof RECTANGLE_BORDER_STYLES]
    const fillChar = customSettings?.fillChar !== undefined ? customSettings.fillChar : (toolStore.rectangleFillChar || '')
    const shadow = customSettings?.shadow !== undefined ? customSettings.shadow : (toolStore.rectangleShadow || false)
    const text = customSettings?.text !== undefined ? customSettings.text : (toolStore.rectangleText || '')
    
    // Check if features are enabled (use custom settings if provided, otherwise fall back to tool store)
    const showText = customSettings?.showText !== undefined ? customSettings.showText : toolStore.rectangleShowText
    const showFill = customSettings?.showFill !== undefined ? customSettings.showFill : toolStore.rectangleShowFill
    const showBorder = customSettings?.showBorder !== undefined ? customSettings.showBorder : toolStore.rectangleShowBorder
    // Shadow requires BOTH the section checkbox (showShadow) AND the shadow toggle to be true
    const showShadow = (customSettings?.showShadow !== undefined ? customSettings.showShadow : toolStore.rectangleShowShadow) && 
                       (customSettings?.shadow !== undefined ? customSettings.shadow : toolStore.rectangleShadow)
    
    if (!borderStyle) {
      return rectangleData // Return empty if no style found
    }
    
    // Get text settings (use custom settings if provided, otherwise fall back to tool store)
    const textAlign = customSettings?.textAlign || toolStore.rectangleTextAlign || 'center'
    const textPosition = customSettings?.textPosition || toolStore.rectangleTextPosition || 'middle'
    
    // Calculate text position if text is provided and enabled
    let textLines: string[] = []
    let textStartY = 0
    if (text && showText) {
      // Calculate available space inside rectangle (excluding borders)
      const innerWidth = maxX - minX - 1
      const innerHeight = maxY - minY - 1
      
      if (innerWidth > 0 && innerHeight > 0) {
        // Split text into lines that fit within the rectangle
        textLines = []
        const words = text.split(' ')
        let currentLine = ''
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          if (testLine.length <= innerWidth) {
            currentLine = testLine
          } else {
            if (currentLine) textLines.push(currentLine)
            currentLine = word
          }
        }
        if (currentLine) textLines.push(currentLine)
        
        // Limit lines to available height
        textLines = textLines.slice(0, innerHeight)
        
        // Calculate vertical position based on textPosition
        if (textPosition === 'top') {
          textStartY = minY + 1
        } else if (textPosition === 'bottom') {
          textStartY = maxY - textLines.length
        } else { // middle
          textStartY = minY + 1 + Math.floor((innerHeight - textLines.length) / 2)
        }
      }
    }
    
    // Draw the rectangle border
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let character = ''
        
        // Determine which character to use based on position
        const isBorderPosition = (y === minY || y === maxY || x === minX || x === maxX)
        
        if (isBorderPosition && showBorder) {
          // Draw border if enabled
          if (y === minY && x === minX) {
            character = borderStyle.topLeft
          } else if (y === minY && x === maxX) {
            character = borderStyle.topRight
          } else if (y === maxY && x === minX) {
            character = borderStyle.bottomLeft
          } else if (y === maxY && x === maxX) {
            character = borderStyle.bottomRight
          } else if (y === minY || y === maxY) {
            character = borderStyle.horizontal
          } else if (x === minX || x === maxX) {
            character = borderStyle.vertical
          }
        } else if (!isBorderPosition) {
          // Interior of rectangle
          let isTextPosition = false
          
          // Check if this position should have text
          if (textLines.length > 0) {
            const textLineIndex = y - textStartY
            if (textLineIndex >= 0 && textLineIndex < textLines.length) {
              const line = textLines[textLineIndex]
              let lineStartX = minX + 1
              
              // Calculate horizontal alignment
              if (textAlign === 'center') {
                lineStartX = minX + 1 + Math.floor(((maxX - minX - 1) - line.length) / 2)
              } else if (textAlign === 'right') {
                lineStartX = maxX - line.length
              } // else 'left', keep lineStartX as is
              
              const charIndex = x - lineStartX
              
              if (charIndex >= 0 && charIndex < line.length) {
                character = line[charIndex]
                isTextPosition = true
              }
            }
          }
          
          // If not a text position, use fill character if fill is enabled
          if (!isTextPosition && showFill && fillChar && fillChar !== '') {
            character = fillChar
          }
        }
        
        if (character) {
          const key = gridKey(x, y)
          rectangleData.set(key, character)
        }
      }
    }
    
    // Add shadow if enabled
    if (showShadow) {
      for (let y = minY + 1; y <= maxY + 1; y++) {
        for (let x = minX + 1; x <= maxX + 1; x++) {
          // Only add shadow where there's no existing rectangle
          if (x === maxX + 1 || y === maxY + 1) {
            const key = gridKey(x, y)
            if (!rectangleData.has(key)) {
              rectangleData.set(key, '▓') // Shadow character
            }
          }
        }
      }
    }
    
    return rectangleData
  }

  // Draw diamond shape from start to end coordinates (world space)
  const drawDiamond = (startWorldX: number, startWorldY: number, endWorldX: number, endWorldY: number, customSettings?: any): Map<string, string> => {
    const startGrid = worldToGrid(startWorldX, startWorldY)
    const endGrid = worldToGrid(endWorldX, endWorldY)
    
    // Ensure we have proper min/max coordinates
    const minX = Math.min(startGrid.x, endGrid.x)
    const maxX = Math.max(startGrid.x, endGrid.x)
    const minY = Math.min(startGrid.y, endGrid.y)
    const maxY = Math.max(startGrid.y, endGrid.y)
    
    const diamondData = new Map<string, string>()
    
    // Get diamond settings (use custom settings if provided, otherwise fall back to tool store)
    const fillChar = customSettings?.fillChar !== undefined ? customSettings.fillChar : (toolStore.diamondFillChar || '')
    const shadow = customSettings?.shadow !== undefined ? customSettings.shadow : (toolStore.diamondShadow || false)
    const text = customSettings?.text !== undefined ? customSettings.text : (toolStore.diamondText || '')
    
    // Check if features are enabled (use custom settings if provided, otherwise fall back to tool store)
    const showText = customSettings?.showText !== undefined ? customSettings.showText : toolStore.diamondShowText
    const showFill = customSettings?.showFill !== undefined ? customSettings.showFill : toolStore.diamondShowFill
    const showBorder = customSettings?.showBorder !== undefined ? customSettings.showBorder : toolStore.diamondShowBorder
    // Shadow requires BOTH the section checkbox (showShadow) AND the shadow toggle to be true
    const showShadow = (customSettings?.showShadow !== undefined ? customSettings.showShadow : toolStore.diamondShowShadow) && 
                       (customSettings?.shadow !== undefined ? customSettings.shadow : toolStore.diamondShadow)
    
    const width = maxX - minX + 1
    const height = maxY - minY + 1
    
    // Calculate center point - for odd widths, this gives us the true center
    const centerX = Math.floor((minX + maxX) / 2)
    const centerY = Math.floor((minY + maxY) / 2)
    
    // If it's a single cell, just place a character
    if (minX === maxX && minY === maxY) {
      diamondData.set(gridKey(minX, minY), fillChar || '◆')
      return diamondData
    }
    
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
        if (relY <= halfHeight) {
          diamondData.set(gridKey(leftX, y), '/')
        } else {
          diamondData.set(gridKey(leftX, y), '\\')
        }
        
        // Draw right edge (only if not the same as left - for top/bottom points)
        if (leftX !== rightX) {
          if (relY <= halfHeight) {
            diamondData.set(gridKey(rightX, y), '\\')
          } else {
            diamondData.set(gridKey(rightX, y), '/')
          }
        }
      }
      
      // Fill interior if needed
      if (showFill && fillChar) {
        for (let x = leftX + 1; x < rightX; x++) {
          diamondData.set(gridKey(x, y), fillChar)
        }
      }
    }
    
    // Add text if enabled
    if (showText && text) {
      const textAlign = customSettings?.textAlign || toolStore.diamondTextAlign || 'center'
      const textPosition = customSettings?.textPosition || toolStore.diamondTextPosition || 'middle'
      
      // Calculate text area (smaller area inside diamond)
      const textWidth = Math.max(1, Math.floor(width / 2))
      const textHeight = Math.max(1, Math.floor(height / 2))
      const textMinX = centerX - Math.floor(textWidth / 2)
      const textMaxX = centerX + Math.floor(textWidth / 2)
      const textMinY = centerY - Math.floor(textHeight / 2)
      const textMaxY = centerY + Math.floor(textHeight / 2)
      
      // Simple text placement at center
      const textLines = text.split('\n')
      const startY = textPosition === 'middle' ? centerY - Math.floor(textLines.length / 2) :
                    textPosition === 'bottom' ? textMaxY - textLines.length + 1 : textMinY
      
      textLines.forEach((line, i) => {
        const y = startY + i
        if (y >= textMinY && y <= textMaxY) {
          const startX = textAlign === 'center' ? centerX - Math.floor(line.length / 2) :
                        textAlign === 'right' ? textMaxX - line.length + 1 : textMinX
          
          for (let j = 0; j < line.length; j++) {
            const x = startX + j
            if (x >= textMinX && x <= textMaxX) {
              const key = gridKey(x, y)
              // Only place text where diamond exists
              if (diamondData.has(key) || (!showBorder && !showFill)) {
                diamondData.set(key, line[j])
              }
            }
          }
        }
      })
    }
    
    // Add shadow if enabled
    if (showShadow) {
      for (let y = minY + 1; y <= maxY + 1; y++) {
        for (let x = minX + 1; x <= maxX + 1; x++) {
          // Calculate if this position would be in shadow
          const shadowRelX = Math.abs(x - 1 - centerX)
          const shadowRelY = Math.abs(y - 1 - centerY)
          const xRadius = width / 2
          const yRadius = height / 2
          const shadowNormalizedDist = (shadowRelX / xRadius) + (shadowRelY / yRadius)
          
          if (shadowNormalizedDist <= 1.0 && !diamondData.has(gridKey(x, y))) {
            // Only add shadow where there's no existing diamond
            if (x === maxX + 1 || y === maxY + 1) {
              diamondData.set(gridKey(x, y), '▓') // Shadow character
            }
          }
        }
      }
    }
    
    // If nothing is visible, add invisible placeholder data at corners
    if (diamondData.size === 0) {
      diamondData.set(gridKey(minX, minY), '')  // Top corner
      diamondData.set(gridKey(maxX, minY), '')  // Right corner
      diamondData.set(gridKey(minX, maxY), '')  // Bottom corner
      diamondData.set(gridKey(maxX, maxY), '')  // Left corner
    }
    
    return diamondData
  }

  // Draw text within bounds with word wrapping and alignment
  const drawText = (startWorldX: number, startWorldY: number, endWorldX: number, endWorldY: number, text: string, hAlign: string = 'left', vAlign: string = 'top', showBorder: boolean = true): Map<string, string> => {
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
      
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          let character = ''
          
          if (y === minY && x === minX) {
            character = borderStyle.topLeft
          } else if (y === minY && x === maxX) {
            character = borderStyle.topRight
          } else if (y === maxY && x === minX) {
            character = borderStyle.bottomLeft
          } else if (y === maxY && x === maxX) {
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
    
    if (textWidth <= 0 || textHeight <= 0) {
      return textData // Not enough space for text
    }
    
    // Word wrap the text
    const words = text.split(/\s+/).filter(word => word.length > 0)
    const lines: string[] = []
    let currentLine = ''
    
    for (const word of words) {
      // Check if adding this word would exceed the line width
      const testLine = currentLine ? currentLine + ' ' + word : word
      if (testLine.length <= textWidth) {
        currentLine = testLine
      } else {
        // Start a new line
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          // Word is too long for the line - truncate it
          lines.push(word.substring(0, textWidth))
          currentLine = ''
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    // Trim lines to fit within the text height
    const visibleLines = lines.slice(0, textHeight)
    
    // Calculate vertical alignment offset
    let startY = textMinY
    if (vAlign === 'center') {
      startY = textMinY + Math.floor((textHeight - visibleLines.length) / 2)
    } else if (vAlign === 'bottom') {
      startY = textMaxY - visibleLines.length + 1
    }
    
    // Draw the text lines
    visibleLines.forEach((line, lineIndex) => {
      const y = startY + lineIndex
      if (y > textMaxY) return // Don't draw beyond bounds
      
      // Calculate horizontal alignment offset
      let startX = textMinX
      if (hAlign === 'center') {
        startX = textMinX + Math.floor((textWidth - line.length) / 2)
      } else if (hAlign === 'right') {
        startX = textMaxX - line.length + 1
      }
      
      // Draw each character in the line
      for (let i = 0; i < line.length && startX + i <= textMaxX; i++) {
        const char = line[i]
        if (char !== ' ') { // Don't draw spaces as actual characters
          const key = gridKey(startX + i, y)
          textData.set(key, char)
        }
      }
    })
    
    return textData
  }
  
  // Draw line from start to end coordinates (world space)
  const drawLine = (startWorldX: number, startWorldY: number, endWorldX: number, endWorldY: number, customSettings?: any): Map<string, string> => {
    const startGrid = worldToGrid(startWorldX, startWorldY)
    const endGrid = worldToGrid(endWorldX, endWorldY)
    
    const lineData = new Map<string, string>()
    
    // Get line style settings (use custom settings if provided, otherwise fall back to tool store)
    const lineStyleKey = customSettings?.lineStyle || toolStore.lineStyle || 'single'
    const lineStyle = LINE_STYLES[lineStyleKey as keyof typeof LINE_STYLES]
    
    if (!lineStyle) {
      return lineData // Return empty if no style found
    }
    
    // Calculate the line direction
    const dx = endGrid.x - startGrid.x
    const dy = endGrid.y - startGrid.y
    const distance = Math.max(Math.abs(dx), Math.abs(dy))
    
    if (distance === 0) {
      // Single point line
      const key = gridKey(startGrid.x, startGrid.y)
      lineData.set(key, lineStyle.horizontal || '•')
      return lineData
    }
    
    // Calculate angle to determine the best character to use
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const absAngle = Math.abs(angle)
    
    // Draw the line segments
    for (let i = 0; i <= distance; i++) {
      const x = Math.round(startGrid.x + (dx * i) / distance)
      const y = Math.round(startGrid.y + (dy * i) / distance)
      const key = gridKey(x, y)
      
      let character = '-' // Default to horizontal
      
      // Select character based on angle
      // Horizontal: -22.5° to 22.5° or 157.5° to 180° or -180° to -157.5°
      if ((absAngle <= 22.5) || (absAngle >= 157.5)) {
        character = lineStyle.horizontal || '-'
      }
      // Vertical: 67.5° to 112.5° or -112.5° to -67.5°
      else if ((absAngle >= 67.5) && (absAngle <= 112.5)) {
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
      
      lineData.set(key, character)
    }
    
    // Add line end styles (use custom settings if provided, otherwise fall back to tool store)
    const startStyle = customSettings?.lineStartStyle || toolStore.lineStartStyle || 'none'
    const endStyle = customSettings?.lineEndStyle || toolStore.lineEndStyle || 'arrow'
    
    if (startStyle !== 'none' && LINE_END_STYLES[startStyle as keyof typeof LINE_END_STYLES]) {
      const key = gridKey(startGrid.x, startGrid.y)
      const styleObj = LINE_END_STYLES[startStyle as keyof typeof LINE_END_STYLES] as any
      const startChar = styleObj.all || styleObj.left || '•'
      lineData.set(key, startChar)
    }
    
    if (endStyle !== 'none' && LINE_END_STYLES[endStyle as keyof typeof LINE_END_STYLES]) {
      const key = gridKey(endGrid.x, endGrid.y)
      const styleObj = LINE_END_STYLES[endStyle as keyof typeof LINE_END_STYLES] as any
      const endChar = styleObj.all || styleObj.right || '→'
      lineData.set(key, endChar)
    }
    
    return lineData
  }

  return {
    // Tool states
    rectangleState,
    diamondState,
    lineState,
    textState,
    currentStrokeData,
    
    // Drawing functions
    drawRectangle,
    drawDiamond,
    drawLine,
    drawText,
    placeCharacter,
    eraseAtPosition,
    resetBrushTracking,
  }
}