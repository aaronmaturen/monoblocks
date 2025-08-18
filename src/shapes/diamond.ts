import type { ShapeDefinition, ShapeData, ToolSettingConfig } from './types'

// Diamond-specific tool settings
export interface DiamondSettings {
  borderStyle: 'single' | 'double' | 'rounded' | 'solid' | 'dashed' | 'heavy' | 'double-single' | 'single-double'
  fillChar: string
  filled: boolean
  showBorder: boolean
  borderColor?: string
  showFill?: boolean
  showShadow?: boolean
  shadow?: boolean
  showText?: boolean
  text?: string
  textAlign?: 'left' | 'center' | 'right'
  textPosition?: 'top' | 'middle' | 'bottom'
  textColor?: string
}

const diamondDefinition: ShapeDefinition = {
  type: 'diamond',
  name: 'Diamond',
  icon: '◆',
  description: 'Draw diamonds with customizable borders and fill',
  
  toolSettings: [
    {
      key: 'borderStyle',
      type: 'select',
      label: 'Border Style',
      default: 'solid',
      options: [
        { value: 'solid', label: 'Solid' },
        { value: 'double', label: 'Double' },
        { value: 'rounded', label: 'Rounded' },
      ],
    },
    {
      key: 'showBorder',
      type: 'checkbox',
      label: 'Show Border',
      default: true,
    },
    {
      key: 'filled',
      type: 'checkbox',
      label: 'Filled',
      default: false,
    },
    {
      key: 'fillChar',
      type: 'text',
      label: 'Fill Character',
      default: '█',
    },
  ] as ToolSettingConfig[],
  
  createPreview: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    settings: Record<string, any>,
    color: string
  ): Map<string, string> => {
    const diamondSettings = settings as DiamondSettings
    return diamondDefinition.draw(startX, startY, endX, endY, diamondSettings)
  },
  
  draw: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    settings: Record<string, any>
  ): Map<string, string> => {
    const diamondSettings = settings as DiamondSettings
    const data = new Map<string, string>()
    
    // Normalize coordinates
    const minX = Math.min(startX, endX)
    const maxX = Math.max(startX, endX)
    const minY = Math.min(startY, endY)
    const maxY = Math.max(startY, endY)
    
    const width = maxX - minX + 1
    const height = maxY - minY + 1
    
    // Calculate center point - for odd widths, this gives us the true center
    const centerX = Math.floor((minX + maxX) / 2)
    const centerY = Math.floor((minY + maxY) / 2)
    
    // If it's a single cell, just place a character
    if (minX === maxX && minY === maxY) {
      data.set(`${minX},${minY}`, diamondSettings.fillChar || '◆')
      return data
    }
    
    // Fill the diamond if requested - only if showFill is true (or not explicitly false for compatibility)
    const shouldFill = diamondSettings.showFill !== false && (diamondSettings.filled || diamondSettings.fillChar)
    
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
      if (diamondSettings.showBorder !== false) {
        // Draw left edge
        if (relY <= halfHeight) {
          data.set(`${leftX},${y}`, '/')
        } else {
          data.set(`${leftX},${y}`, '\\')
        }
        
        // Draw right edge (only if not the same as left - for top/bottom points)
        if (leftX !== rightX) {
          if (relY <= halfHeight) {
            data.set(`${rightX},${y}`, '\\')
          } else {
            data.set(`${rightX},${y}`, '/')
          }
        }
      }
      
      // Fill interior if needed
      if (shouldFill) {
        for (let x = leftX + 1; x < rightX; x++) {
          const fillChar = diamondSettings.fillChar || '█'
          data.set(`${x},${y}`, fillChar)
        }
      }
    }
    
    // Add text if enabled and provided - only if showText checkbox is checked
    if (diamondSettings.showText === true && diamondSettings.text) {
      const textHAlign = diamondSettings.textAlign || 'center'
      const textVAlign = diamondSettings.textPosition || 'middle'
      const text = diamondSettings.text
      
      // Calculate text area (inside diamond)
      const textMinX = centerX - Math.floor(width / 4)
      const textMaxX = centerX + Math.floor(width / 4)
      const textMinY = centerY - Math.floor(height / 4)
      const textMaxY = centerY + Math.floor(height / 4)
      
      const textWidth = textMaxX - textMinX + 1
      const textHeight = textMaxY - textMinY + 1
      
      if (textWidth > 0 && textHeight > 0) {
        // Word wrap the text
        const words = text.split(/\s+/).filter(word => word.length > 0)
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
              lines.push(word.substring(0, textWidth))
              currentLine = ''
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine)
        }
        
        // Limit lines to available height
        const displayLines = lines.slice(0, textHeight)
        
        // Calculate starting Y position based on vertical alignment
        let startY = textMinY
        if (textVAlign === 'middle') {
          startY = textMinY + Math.floor((textHeight - displayLines.length) / 2)
        } else if (textVAlign === 'bottom') {
          startY = textMaxY - displayLines.length + 1
        }
        
        // Place each line of text
        displayLines.forEach((line, lineIndex) => {
          const y = startY + lineIndex
          if (y >= textMinY && y <= textMaxY) {
            // Calculate starting X position based on horizontal alignment
            let startX = textMinX
            if (textHAlign === 'center') {
              startX = textMinX + Math.floor((textWidth - line.length) / 2)
            } else if (textHAlign === 'right') {
              startX = textMaxX - line.length + 1
            }
            
            // Place each character
            for (let i = 0; i < line.length && startX + i <= textMaxX; i++) {
              const x = startX + i
              if (x >= textMinX) {
                data.set(`${x},${y}`, line[i])
              }
            }
          }
        })
      }
    }
    
    // Add shadow if enabled - only if showShadow checkbox is checked
    const shouldShowShadow = diamondSettings.showShadow === true && diamondSettings.shadow
    if (shouldShowShadow) {
      // Add shadow to the right and bottom
      for (let y = minY + 1; y <= maxY + 1; y++) {
        for (let x = minX + 1; x <= maxX + 1; x++) {
          // Calculate if this position would be in shadow
          const shadowRelX = Math.abs(x - 1 - centerX)
          const shadowRelY = Math.abs(y - 1 - centerY)
          const xRadius = Math.floor(width / 2)
          const yRadius = Math.floor(height / 2)
          const shadowNormalizedDist = (shadowRelX / xRadius) + (shadowRelY / yRadius)
          
          if (shadowNormalizedDist <= 1.0 && !data.has(`${x},${y}`)) {
            // Only add shadow where there's no existing diamond
            if (x === maxX + 1 || y === maxY + 1) {
              data.set(`${x},${y}`, '▓') // Shadow character
            }
          }
        }
      }
    }
    
    // IMPORTANT: If nothing is visible, add invisible placeholder data at corners
    // to maintain the shape's position and size for selection/resizing
    if (data.size === 0) {
      // Use empty string as invisible placeholder - it exists but doesn't render
      data.set(`${minX},${minY}`, '')  // Top-left corner
      data.set(`${maxX},${minY}`, '')  // Top-right corner
      data.set(`${minX},${maxY}`, '')  // Bottom-left corner
      data.set(`${maxX},${maxY}`, '')  // Bottom-right corner
    }
    
    return data
  },
  
  regenerate: (shape: ShapeData, newSettings: Record<string, any>): Map<string, string> => {
    const diamondSettings = newSettings as DiamondSettings
    // For regeneration, we need to determine the original bounds
    // Include empty strings (invisible placeholders) but exclude shadow characters
    const positions = Array.from(shape.data.entries())
      .filter(([key, char]) => char !== null && char !== undefined && char !== '▓')
      .map(([key]) => {
        const [x, y] = key.split(',').map(Number)
        return { x, y }
      })
    
    if (positions.length === 0) {
      return new Map()
    }
    
    const minX = Math.min(...positions.map(p => p.x))
    const maxX = Math.max(...positions.map(p => p.x))
    const minY = Math.min(...positions.map(p => p.y))
    const maxY = Math.max(...positions.map(p => p.y))
    
    return diamondDefinition.draw(minX, minY, maxX, maxY, diamondSettings)
  },
  
  validate: (settings: Record<string, any>): boolean => {
    const diamondSettings = settings as DiamondSettings
    // Validate that we have required settings
    if (diamondSettings.borderStyle && !['single', 'solid', 'double', 'rounded', 'dashed', 'heavy', 'double-single', 'single-double'].includes(diamondSettings.borderStyle)) {
      return false
    }
    
    // Validate fill character (should be a single character)
    if (diamondSettings.fillChar && diamondSettings.fillChar.length > 1) {
      return false
    }
    
    return true
  },
  
  getBounds: (shape: ShapeData) => {
    // Include empty strings (invisible placeholders) but exclude shadow characters
    const positions = Array.from(shape.data.entries())
      .filter(([key, char]) => char !== null && char !== undefined && char !== '▓')
      .map(([key]) => {
        const [x, y] = key.split(',').map(Number)
        return { x, y }
      })
    
    if (positions.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }
    
    return {
      minX: Math.min(...positions.map(p => p.x)),
      maxX: Math.max(...positions.map(p => p.x)),
      minY: Math.min(...positions.map(p => p.y)),
      maxY: Math.max(...positions.map(p => p.y)),
    }
  },
}

export default diamondDefinition