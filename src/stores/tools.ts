import { ref } from 'vue'
import { defineStore } from 'pinia'

export type Tool = 'pan' | 'brush' | 'text' | 'select' | 'eraser' | 'eyedropper' | 'undo' | 'redo' | 'recenter' | 'rectangle' | 'line' | 'reset'

export type TextHorizontalAlign = 'left' | 'center' | 'right'
export type TextVerticalAlign = 'top' | 'middle' | 'bottom'

// Common ASCII drawing characters organized by category
export const ASCII_CHARACTERS = {
  blocks: {
    name: 'Blocks',
    chars: [
      { char: '█', name: 'Full Block', code: 'U+2588' },
      { char: '▊', name: 'Left 3/4 Block', code: 'U+258A' },
      { char: '▌', name: 'Left Half Block', code: 'U+258C' },
      { char: '▐', name: 'Right Half Block', code: 'U+2590' },
      { char: '▀', name: 'Upper Half Block', code: 'U+2580' },
      { char: '▄', name: 'Lower Half Block', code: 'U+2584' },
      { char: '░', name: 'Light Shade', code: 'U+2591' },
      { char: '▒', name: 'Medium Shade', code: 'U+2592' },
      { char: '▓', name: 'Dark Shade', code: 'U+2593' }
    ]
  },
  lines: {
    name: 'Box Drawing',
    chars: [
      { char: '─', name: 'Horizontal', code: 'U+2500' },
      { char: '│', name: 'Vertical', code: 'U+2502' },
      { char: '┌', name: 'Top Left', code: 'U+250C' },
      { char: '┐', name: 'Top Right', code: 'U+2510' },
      { char: '└', name: 'Bottom Left', code: 'U+2514' },
      { char: '┘', name: 'Bottom Right', code: 'U+2518' },
      { char: '├', name: 'Vertical Right', code: 'U+251C' },
      { char: '┤', name: 'Vertical Left', code: 'U+2524' },
      { char: '┬', name: 'Horizontal Down', code: 'U+252C' },
      { char: '┴', name: 'Horizontal Up', code: 'U+2534' },
      { char: '┼', name: 'Cross', code: 'U+253C' }
    ]
  },
  doubleLines: {
    name: 'Double Lines',
    chars: [
      { char: '═', name: 'Double Horizontal', code: 'U+2550' },
      { char: '║', name: 'Double Vertical', code: 'U+2551' },
      { char: '╔', name: 'Double Top Left', code: 'U+2554' },
      { char: '╗', name: 'Double Top Right', code: 'U+2557' },
      { char: '╚', name: 'Double Bottom Left', code: 'U+255A' },
      { char: '╝', name: 'Double Bottom Right', code: 'U+255D' },
      { char: '╠', name: 'Double Vertical Right', code: 'U+2560' },
      { char: '╣', name: 'Double Vertical Left', code: 'U+2563' },
      { char: '╦', name: 'Double Horizontal Down', code: 'U+2566' },
      { char: '╩', name: 'Double Horizontal Up', code: 'U+2569' },
      { char: '╬', name: 'Double Cross', code: 'U+256C' }
    ]
  },
  symbols: {
    name: 'Symbols',
    chars: [
      { char: '●', name: 'Circle', code: 'U+25CF' },
      { char: '○', name: 'White Circle', code: 'U+25CB' },
      { char: '■', name: 'Square', code: 'U+25A0' },
      { char: '□', name: 'White Square', code: 'U+25A1' },
      { char: '▲', name: 'Triangle Up', code: 'U+25B2' },
      { char: '▼', name: 'Triangle Down', code: 'U+25BC' },
      { char: '◆', name: 'Diamond', code: 'U+25C6' },
      { char: '◇', name: 'White Diamond', code: 'U+25C7' },
      { char: '★', name: 'Star', code: 'U+2605' },
      { char: '☆', name: 'White Star', code: 'U+2606' }
    ]
  },
  arrows: {
    name: 'Arrows',
    chars: [
      { char: '←', name: 'Left Arrow', code: 'U+2190' },
      { char: '↑', name: 'Up Arrow', code: 'U+2191' },
      { char: '→', name: 'Right Arrow', code: 'U+2192' },
      { char: '↓', name: 'Down Arrow', code: 'U+2193' },
      { char: '↖', name: 'NW Arrow', code: 'U+2196' },
      { char: '↗', name: 'NE Arrow', code: 'U+2197' },
      { char: '↘', name: 'SE Arrow', code: 'U+2198' },
      { char: '↙', name: 'SW Arrow', code: 'U+2199' },
      { char: '↔', name: 'Left Right', code: 'U+2194' },
      { char: '↕', name: 'Up Down', code: 'U+2195' }
    ]
  },
  classic: {
    name: 'Classic ASCII',
    chars: [
      { char: '#', name: 'Hash', code: 'U+0023' },
      { char: '*', name: 'Asterisk', code: 'U+002A' },
      { char: '+', name: 'Plus', code: 'U+002B' },
      { char: '-', name: 'Minus', code: 'U+002D' },
      { char: '=', name: 'Equals', code: 'U+003D' },
      { char: '/', name: 'Slash', code: 'U+002F' },
      { char: '\\', name: 'Backslash', code: 'U+005C' },
      { char: '|', name: 'Pipe', code: 'U+007C' },
      { char: '_', name: 'Underscore', code: 'U+005F' },
      { char: '.', name: 'Period', code: 'U+002E' },
      { char: '@', name: 'At', code: 'U+0040' },
      { char: '~', name: 'Tilde', code: 'U+007E' }
    ]
  }
}

export type RectangleBorderStyle = 'single' | 'double' | 'thick' | 'rounded' | 'dashed' | 'solid'

export type LineStyle = 'single' | 'double' | 'thick' | 'dashed' | 'dotted' | 'arrow'
export type LineEndStyle = 'none' | 'arrow' | 'circle' | 'square'

export const LINE_STYLES = {
  single: { horizontal: '─', vertical: '│', diagonal1: '╱', diagonal2: '╲' },
  double: { horizontal: '═', vertical: '║', diagonal1: '╱', diagonal2: '╲' },
  thick: { horizontal: '━', vertical: '┃', diagonal1: '╱', diagonal2: '╲' },
  dashed: { horizontal: '╌', vertical: '╎', diagonal1: '╱', diagonal2: '╲' },
  dotted: { horizontal: '⋯', vertical: '⋮', diagonal1: '⋯', diagonal2: '⋯' },
  arrow: { horizontal: '─', vertical: '│', diagonal1: '╱', diagonal2: '╲' }
}

export const LINE_END_STYLES = {
  arrow: {
    right: '→', left: '←', up: '↑', down: '↓',
    upRight: '↗', upLeft: '↖', downRight: '↘', downLeft: '↙'
  },
  circle: { all: '●' },
  square: { all: '■' }
}

export const RECTANGLE_BORDER_STYLES = {
  single: {
    name: 'Single Line',
    horizontal: '─',
    vertical: '│',
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘'
  },
  double: {
    name: 'Double Line',
    horizontal: '═',
    vertical: '║',
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝'
  },
  thick: {
    name: 'Thick Line',
    horizontal: '━',
    vertical: '┃',
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛'
  },
  rounded: {
    name: 'Rounded',
    horizontal: '─',
    vertical: '│',
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯'
  },
  dashed: {
    name: 'Dashed',
    horizontal: '╌',
    vertical: '╎',
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘'
  },
  solid: {
    name: 'Solid Block',
    horizontal: '█',
    vertical: '█',
    topLeft: '█',
    topRight: '█',
    bottomLeft: '█',
    bottomRight: '█'
  }
}

export const useToolStore = defineStore('tools', () => {
  const currentTool = ref<Tool>('pan')
  const previousTool = ref<Tool>('pan')
  const selectedCharacter = ref('▊') // Default drawing character
  const showCharacterPalette = ref(false)
  const rectangleBorderStyle = ref<RectangleBorderStyle>('single')
  const rectangleFillChar = ref<string>('') // Empty string means no fill
  const rectangleShadow = ref(false) // Enable/disable shadow for rectangles
  const lineStyle = ref<LineStyle>('single')
  const lineStartStyle = ref<LineEndStyle>('none')
  const lineEndStyle = ref<LineEndStyle>('arrow')
  const editingShapeId = ref<string | null>(null)
  
  // Text tool properties
  const textContent = ref<string>('') // Text content to be placed
  const textHorizontalAlign = ref<TextHorizontalAlign>('left')
  const textVerticalAlign = ref<TextVerticalAlign>('top')
  const textShowBorder = ref(true) // Show border around text box

  const setTool = (tool: Tool) => {
    currentTool.value = tool
    // Unselect any selected shapes when switching tools
    // Keep selection for eyedropper since it's non-destructive
    if (tool !== 'select' && tool !== 'eyedropper') {
      // Lazy import to avoid circular dependency
      import('./layers').then(({ useLayersStore }) => {
        const layersStore = useLayersStore()
        layersStore.selectShape(null)
      })
    }
  }

  const setPreviousTool = (tool: Tool) => {
    previousTool.value = tool
  }

  const returnToPreviousTool = () => {
    currentTool.value = previousTool.value
  }

  const setSelectedCharacter = (char: string) => {
    selectedCharacter.value = char
  }

  const toggleCharacterPalette = () => {
    showCharacterPalette.value = !showCharacterPalette.value
  }

  const hideCharacterPalette = () => {
    showCharacterPalette.value = false
  }

  const setRectangleBorderStyle = (style: RectangleBorderStyle) => {
    rectangleBorderStyle.value = style
  }

  const setRectangleFillChar = (char: string) => {
    rectangleFillChar.value = char
  }

  const setRectangleShadow = (enabled: boolean) => {
    rectangleShadow.value = enabled
  }

  const setLineStyle = (style: LineStyle) => {
    lineStyle.value = style
  }

  const setLineStartStyle = (style: LineEndStyle) => {
    lineStartStyle.value = style
  }

  const setLineEndStyle = (style: LineEndStyle) => {
    lineEndStyle.value = style
  }

  const setEditingShapeId = (shapeId: string | null) => {
    editingShapeId.value = shapeId
  }

  const setTextContent = (content: string) => {
    textContent.value = content
  }

  const setTextHorizontalAlign = (align: TextHorizontalAlign) => {
    textHorizontalAlign.value = align
  }

  const setTextVerticalAlign = (align: TextVerticalAlign) => {
    textVerticalAlign.value = align
  }

  const setTextShowBorder = (show: boolean) => {
    textShowBorder.value = show
  }

  return { 
    currentTool, 
    previousTool, 
    selectedCharacter,
    showCharacterPalette,
    rectangleBorderStyle,
    rectangleFillChar,
    rectangleShadow,
    lineStyle,
    lineStartStyle,
    lineEndStyle,
    editingShapeId,
    textContent,
    textHorizontalAlign,
    textVerticalAlign,
    textShowBorder,
    setTool, 
    setPreviousTool, 
    returnToPreviousTool,
    setSelectedCharacter,
    toggleCharacterPalette,
    hideCharacterPalette,
    setRectangleBorderStyle,
    setRectangleFillChar,
    setRectangleShadow,
    setLineStyle,
    setLineStartStyle,
    setLineEndStyle,
    setEditingShapeId,
    setTextContent,
    setTextHorizontalAlign,
    setTextVerticalAlign,
    setTextShowBorder
  }
})