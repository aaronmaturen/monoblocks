import type { ShapeDefinition, ShapeData, ToolSettingConfig } from './types'

// Rectangle-specific tool settings
export interface RectangleSettings {
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

// ASCII character sets for different border styles
const BORDER_CHARS = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
  },
  solid: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  },
  dashed: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '┄',
    vertical: '┆',
  },
  heavy: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
  },
  'double-single': {
    topLeft: '╒',
    topRight: '╕',
    bottomLeft: '╘',
    bottomRight: '╛',
    horizontal: '═',
    vertical: '│',
  },
  'single-double': {
    topLeft: '╓',
    topRight: '╖',
    bottomLeft: '╙',
    bottomRight: '╜',
    horizontal: '─',
    vertical: '║',
  },
}

const rectangleDefinition: ShapeDefinition = {
  type: 'rectangle',
  name: 'Rectangle',
  icon: '▭',
  description: 'Draw rectangles with customizable borders and fill',
  
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
    const rectSettings = settings as RectangleSettings
    return rectangleDefinition.draw(startX, startY, endX, endY, rectSettings)
  },
  
  draw: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    settings: Record<string, any>
  ): Map<string, string> => {
    const rectSettings = settings as RectangleSettings
    const data = new Map<string, string>()
    
    // Normalize coordinates
    const minX = Math.min(startX, endX)
    const maxX = Math.max(startX, endX)
    const minY = Math.min(startY, endY)
    const maxY = Math.max(startY, endY)
    
    // Get the appropriate border characters
    const borderStyle = rectSettings.borderStyle || 'single'
    const chars = BORDER_CHARS[borderStyle] || BORDER_CHARS.single
    
    // If it's a single cell, just place a character
    if (minX === maxX && minY === maxY) {
      data.set(`${minX},${minY}`, rectSettings.fillChar || '█')
      return data
    }
    
    // Fill the rectangle if requested - only if showFill is true (or not explicitly false for compatibility)
    const shouldFill = rectSettings.showFill !== false && (rectSettings.filled || rectSettings.fillChar)
    if (shouldFill) {
      const fillChar = rectSettings.fillChar || '█'
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          data.set(`${x},${y}`, fillChar)
        }
      }
    }
    
    // Draw border if requested
    if (rectSettings.showBorder !== false) {
      // Handle single row or column rectangles
      if (minY === maxY) {
        // Single horizontal line
        for (let x = minX; x <= maxX; x++) {
          data.set(`${x},${minY}`, chars.horizontal)
        }
      } else if (minX === maxX) {
        // Single vertical line
        for (let y = minY; y <= maxY; y++) {
          data.set(`${minX},${y}`, chars.vertical)
        }
      } else {
        // Full rectangle
        // Top and bottom borders
        for (let x = minX + 1; x < maxX; x++) {
          data.set(`${x},${minY}`, chars.horizontal) // Top
          data.set(`${x},${maxY}`, chars.horizontal) // Bottom
        }
        
        // Left and right borders
        for (let y = minY + 1; y < maxY; y++) {
          data.set(`${minX},${y}`, chars.vertical) // Left
          data.set(`${maxX},${y}`, chars.vertical) // Right
        }
        
        // Corners
        data.set(`${minX},${minY}`, chars.topLeft)
        data.set(`${maxX},${minY}`, chars.topRight)
        data.set(`${minX},${maxY}`, chars.bottomLeft)
        data.set(`${maxX},${maxY}`, chars.bottomRight)
      }
    }
    
    // Add text if enabled and provided - only if showText checkbox is checked
    if (rectSettings.showText === true && rectSettings.text) {
      const textHAlign = rectSettings.textAlign || 'center'
      const textVAlign = rectSettings.textPosition || 'middle'
      const text = rectSettings.text
      
      // Calculate text area (inside border if present)
      const textMinX = rectSettings.showBorder !== false ? minX + 1 : minX
      const textMaxX = rectSettings.showBorder !== false ? maxX - 1 : maxX
      const textMinY = rectSettings.showBorder !== false ? minY + 1 : minY
      const textMaxY = rectSettings.showBorder !== false ? maxY - 1 : maxY
      
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
    const shouldShowShadow = rectSettings.showShadow === true && rectSettings.shadow
    if (shouldShowShadow) {
      for (let y = minY + 1; y <= maxY + 1; y++) {
        for (let x = minX + 1; x <= maxX + 1; x++) {
          // Only add shadow where there's no existing rectangle
          if (x === maxX + 1 || y === maxY + 1) {
            const key = `${x},${y}`
            if (!data.has(key)) {
              data.set(key, '▓') // Shadow character
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
    const rectSettings = newSettings as RectangleSettings
    // For regeneration, we need to determine the original bounds
    // Include empty strings (invisible placeholders) but exclude shadow characters
    const positions = Array.from(shape.data.entries())
      .filter(([key, char]) => (char !== null && char !== undefined && char !== '▓') || char === '')
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
    
    return rectangleDefinition.draw(minX, minY, maxX, maxY, rectSettings)
  },
  
  validate: (settings: Record<string, any>): boolean => {
    const rectSettings = settings as RectangleSettings
    // Validate that we have required settings
    if (rectSettings.borderStyle && !['single', 'solid', 'double', 'rounded', 'dashed', 'heavy', 'double-single', 'single-double'].includes(rectSettings.borderStyle)) {
      return false
    }
    
    // Validate fill character (should be a single character)
    if (rectSettings.fillChar && rectSettings.fillChar.length > 1) {
      return false
    }
    
    return true
  },
  
  getBounds: (shape: ShapeData) => {
    // Include empty strings (invisible placeholders) but exclude shadow characters
    const positions = Array.from(shape.data.entries())
      .filter(([key, char]) => (char !== null && char !== undefined && char !== '▓') || char === '')
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

export default rectangleDefinition