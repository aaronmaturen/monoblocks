<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToolStore, RECTANGLE_BORDER_STYLES } from '../stores/tools'
import { useShapesStore } from '../stores/shapes'
import { useColorStore } from '../stores/colors'
import { useDrawingTools } from '../composables/drawing/useDrawingTools'

const toolStore = useToolStore()
const shapesStore = useShapesStore()
const colorStore = useColorStore()
const { drawRectangle, drawDiamond } = useDrawingTools()

const selectedShape = computed(() => shapesStore.getSelectedShape())
const selectedShapes = computed(() => shapesStore.getSelectedShapes())
const hasMultipleShapesSelected = computed(() => selectedShapes.value.length > 1)

const toolDisplayNames: Record<string, string> = {
  pan: 'Pan Tool',
  brush: 'Brush Tool',
  rectangle: 'Rectangle Tool',
  diamond: 'Diamond Tool',
  line: 'Line Tool',
  text: 'Text Tool',
  select: 'Select Tool',
  eraser: 'Eraser Tool',
  eyedropper: 'Eyedropper Tool',
  undo: 'Undo',
  redo: 'Redo',
  recenter: 'Recenter View',
}

const currentToolName = computed(() => {
  // If we have a selected shape, show we're editing it
  if (selectedShape.value) {
    return `Edit ${toolDisplayNames[selectedShape.value.type] || selectedShape.value.type}`
  }
  return toolDisplayNames[toolStore.currentTool] || toolStore.currentTool
})

// Determine which tool panel to show - either current tool or selected shape's type
const activeToolType = computed(() => {
  // Always show shape settings if a shape is selected
  if (selectedShape.value) {
    return selectedShape.value.type
  }
  return toolStore.currentTool
})

// Check if we're editing an existing shape or creating a new one
const isEditingShape = computed(() => {
  return selectedShape.value !== null
})

const hasSettings = computed(() => {
  return ['brush', 'rectangle', 'diamond', 'line', 'text'].includes(activeToolType.value)
})

// Hide the entire panel for pan, eraser, eyedropper tools (and select when nothing is selected)
const showPanel = computed(() => {
  // Never show for these tools
  if (toolStore.currentTool === 'pan') return false
  if (toolStore.currentTool === 'eraser') return false
  if (toolStore.currentTool === 'eyedropper') return false
  
  // For select tool, only show if something is selected
  if (toolStore.currentTool === 'select') {
    return selectedShape.value !== null || hasMultipleShapesSelected.value
  }
  
  // Show for all other tools (brush, rectangle, diamond, line, text)
  return true
})

// Collapsible sections state
const collapsedSections = ref<Record<string, boolean>>({
  text: false,
  fill: false,
  border: false,
  shadow: true, // Start shadow collapsed
  size: false,
  lineStyle: false,
  endpoints: false,
  lineColor: false,
  lineSize: false,
})

const toggleSection = (section: string) => {
  collapsedSections.value[section] = !collapsedSections.value[section]
}

// Universal update function that updates either tool settings or shape settings
const updateSetting = (settingName: string, value: any) => {
  if (isEditingShape.value && selectedShape.value) {
    // Update the selected shape's settings
    const newSettings = {
      ...selectedShape.value.toolSettings,
      [settingName]: value
    }
    shapesStore.updateShapeSettings(selectedShape.value.id, newSettings)
    // Regenerate the shape with new settings
    shapesStore.regenerateShape(selectedShape.value.id)
  } else {
    // Update the tool store for new shapes based on tool type and setting
    const toolType = activeToolType.value
    
    // Rectangle settings
    if (toolType === 'rectangle') {
      switch (settingName) {
        case 'borderStyle': toolStore.setRectangleBorderStyle(value); break;
        case 'fillChar': toolStore.setRectangleFillChar(value); break;
        case 'showText': toolStore.setRectangleShowText(value); break;
        case 'text': toolStore.setRectangleText(value); break;
        case 'textAlign': toolStore.setRectangleTextAlign(value); break;
        case 'textPosition': toolStore.setRectangleTextPosition(value); break;
        case 'textColor': toolStore.setRectangleTextColor(value); break;
        case 'showFill': toolStore.setRectangleShowFill(value); break;
        case 'showBorder': toolStore.setRectangleShowBorder(value); break;
        case 'showShadow': toolStore.setRectangleShowShadow(value); break;
        case 'shadow': toolStore.setRectangleShadow(value); break;
      }
    }
    // Diamond settings
    else if (toolType === 'diamond') {
      switch (settingName) {
        case 'borderStyle': toolStore.setDiamondBorderStyle(value); break;
        case 'fillChar': toolStore.setDiamondFillChar(value); break;
        case 'showText': toolStore.setDiamondShowText(value); break;
        case 'text': toolStore.setDiamondText(value); break;
        case 'textAlign': toolStore.setDiamondTextAlign(value); break;
        case 'textPosition': toolStore.setDiamondTextPosition(value); break;
        case 'textColor': toolStore.setDiamondTextColor(value); break;
        case 'showFill': toolStore.setDiamondShowFill(value); break;
        case 'showBorder': toolStore.setDiamondShowBorder(value); break;
        case 'showShadow': toolStore.setDiamondShowShadow(value); break;
        case 'shadow': toolStore.setDiamondShadow(value); break;
      }
    }
    // Line settings
    else if (toolType === 'line') {
      switch (settingName) {
        case 'lineStyle': toolStore.setLineStyle(value); break;
        case 'lineStartStyle': toolStore.setLineStartStyle(value); break;
        case 'lineEndStyle': toolStore.setLineEndStyle(value); break;
      }
    }
    // Text settings
    else if (toolType === 'text') {
      switch (settingName) {
        case 'horizontalAlign': toolStore.setTextHorizontalAlign(value); break;
        case 'verticalAlign': toolStore.setTextVerticalAlign(value); break;
        case 'showBorder': toolStore.setTextShowBorder(value); break;
      }
    }
    // Brush settings
    else if (toolType === 'brush') {
      if (settingName === 'character') {
        toolStore.setSelectedCharacter(value);
      }
    }
  }
}

// Computed properties for line settings
const lineSettings = computed(() => {
  if (isEditingShape.value && selectedShape.value?.type === 'line') {
    return {
      lineStyle: selectedShape.value.toolSettings?.lineStyle || 'single',
      lineStartStyle: selectedShape.value.toolSettings?.lineStartStyle || 'none',
      lineEndStyle: selectedShape.value.toolSettings?.lineEndStyle || 'none',
    }
  }
  return {
    lineStyle: toolStore.lineStyle || 'single',
    lineStartStyle: toolStore.lineStartStyle || 'none',
    lineEndStyle: toolStore.lineEndStyle || 'none',
  }
})

// Computed properties for text settings
const textSettings = computed(() => {
  if (isEditingShape.value && selectedShape.value?.type === 'text') {
    return {
      content: selectedShape.value.toolSettings?.content || '',
      horizontalAlign: selectedShape.value.toolSettings?.horizontalAlign || 'left',
      verticalAlign: selectedShape.value.toolSettings?.verticalAlign || 'top',
      showBorder: selectedShape.value.toolSettings?.showBorder ?? true,
    }
  }
  return {
    content: '',
    horizontalAlign: toolStore.textHorizontalAlign || 'left',
    verticalAlign: toolStore.textVerticalAlign || 'top',
    showBorder: toolStore.textShowBorder ?? true,
  }
})

// Computed properties for brush settings
const brushSettings = computed(() => {
  if (isEditingShape.value && selectedShape.value?.type === 'brush') {
    return {
      character: selectedShape.value.toolSettings?.character || toolStore.selectedCharacter
    }
  }
  return {
    character: toolStore.selectedCharacter
  }
})

// Computed properties for rectangle settings - read from shape if editing, tool if creating
const rectangleSettings = computed(() => {
  if (isEditingShape.value && selectedShape.value?.type === 'rectangle') {
    return {
      borderStyle: selectedShape.value.toolSettings?.borderStyle || 'single',
      fillChar: selectedShape.value.toolSettings?.fillChar || '',
      showText: selectedShape.value.toolSettings?.showText ?? false,
      text: selectedShape.value.toolSettings?.text || '',
      textAlign: selectedShape.value.toolSettings?.textAlign || 'center',
      textPosition: selectedShape.value.toolSettings?.textPosition || 'middle',
      textColor: selectedShape.value.toolSettings?.textColor || colorStore.selectedColor.hex,
      showFill: selectedShape.value.toolSettings?.showFill ?? true,
      showBorder: selectedShape.value.toolSettings?.showBorder ?? true,
      showShadow: selectedShape.value.toolSettings?.showShadow ?? false,
      shadow: selectedShape.value.toolSettings?.shadow ?? false,
    }
  }
  // Return tool settings for new rectangles
  return {
    borderStyle: toolStore.rectangleBorderStyle || 'single',
    fillChar: toolStore.rectangleFillChar || '',
    showText: toolStore.rectangleShowText ?? false,
    text: toolStore.rectangleText || '',
    textAlign: toolStore.rectangleTextAlign || 'center',
    textPosition: toolStore.rectangleTextPosition || 'middle',
    textColor: toolStore.rectangleTextColor || colorStore.selectedColor.hex,
    showFill: toolStore.rectangleShowFill ?? true,
    showBorder: toolStore.rectangleShowBorder ?? true,
    showShadow: toolStore.rectangleShowShadow ?? false,
    shadow: toolStore.rectangleShadow ?? false,
  }
})

// Computed properties for diamond settings - read from shape if editing, tool if creating
const diamondSettings = computed(() => {
  if (isEditingShape.value && selectedShape.value?.type === 'diamond') {
    return {
      borderStyle: selectedShape.value.toolSettings?.borderStyle || 'single',
      fillChar: selectedShape.value.toolSettings?.fillChar || '',
      showText: selectedShape.value.toolSettings?.showText ?? false,
      text: selectedShape.value.toolSettings?.text || '',
      textAlign: selectedShape.value.toolSettings?.textAlign || 'center',
      textPosition: selectedShape.value.toolSettings?.textPosition || 'middle',
      textColor: selectedShape.value.toolSettings?.textColor || colorStore.selectedColor.hex,
      showFill: selectedShape.value.toolSettings?.showFill ?? true,
      showBorder: selectedShape.value.toolSettings?.showBorder ?? true,
      showShadow: selectedShape.value.toolSettings?.showShadow ?? false,
      shadow: selectedShape.value.toolSettings?.shadow ?? false,
    }
  }
  // Return tool settings for new diamonds
  return {
    borderStyle: toolStore.diamondBorderStyle || 'single',
    fillChar: toolStore.diamondFillChar || '',
    showText: toolStore.diamondShowText ?? false,
    text: toolStore.diamondText || '',
    textAlign: toolStore.diamondTextAlign || 'center',
    textPosition: toolStore.diamondTextPosition || 'middle',
    textColor: toolStore.diamondTextColor || colorStore.selectedColor.hex,
    showFill: toolStore.diamondShowFill ?? true,
    showBorder: toolStore.diamondShowBorder ?? true,
    showShadow: toolStore.diamondShowShadow ?? false,
    shadow: toolStore.diamondShadow ?? false,
  }
})

// Helper function to show border preview
const getBorderPreview = () => {
  const borderStyle = rectangleSettings.value.borderStyle as keyof typeof RECTANGLE_BORDER_STYLES
  const style = RECTANGLE_BORDER_STYLES[borderStyle]
  if (!style) return '┌─┐\n│ │\n└─┘' // Fallback preview
  const fillChar = rectangleSettings.value.fillChar || ' '
  return `${style.topLeft}${style.horizontal}${style.horizontal}${style.horizontal}${style.topRight}
${style.vertical}${fillChar}${fillChar}${fillChar}${style.vertical}
${style.vertical}${fillChar}${fillChar}${fillChar}${style.vertical}
${style.bottomLeft}${style.horizontal}${style.horizontal}${style.horizontal}${style.bottomRight}`
}

// Track which color we're currently editing
const currentColorTarget = ref<'border' | 'fill' | 'text' | 'general'>('general')
const pendingColorUpdate = ref<((color: string) => void) | null>(null)

// Handle color selection for different color properties
const openColorPickerFor = (target: 'border' | 'fill' | 'text' | 'general') => {
  currentColorTarget.value = target
  
  // Set up the pending color update based on target
  if (selectedShape.value) {
    const shapeId = selectedShape.value.id
    switch (target) {
      case 'border':
        pendingColorUpdate.value = (color: string) => {
          shapesStore.updateShapeBorderColor(shapeId, color)
          shapesStore.regenerateShape(shapeId)
        }
        break
      case 'fill':
        pendingColorUpdate.value = (color: string) => {
          shapesStore.updateShapeFillColor(shapeId, color)
          shapesStore.regenerateShape(shapeId)
        }
        break
      case 'text':
        pendingColorUpdate.value = (color: string) => {
          shapesStore.updateShapeTextColor(shapeId, color)
          shapesStore.regenerateShape(shapeId)
        }
        break
      default:
        pendingColorUpdate.value = (color: string) => {
          shapesStore.updateShapeColor(shapeId, color)
          shapesStore.regenerateShape(shapeId)
        }
    }
  } else {
    // For tool settings (new shapes)
    switch (target) {
      case 'border':
        pendingColorUpdate.value = (color: string) => {
          toolStore.setRectangleBorderColor(color)
        }
        break
      case 'fill':
        pendingColorUpdate.value = (color: string) => {
          toolStore.setRectangleFillColor(color)
        }
        break
      case 'text':
        pendingColorUpdate.value = (color: string) => {
          toolStore.setRectangleTextColor(color)
        }
        break
      default:
        pendingColorUpdate.value = null
    }
  }
  
  // Open the color selector
  if (colorStore.toggleColorSelector) {
    colorStore.toggleColorSelector()
  }
}

// Handle color selection for selected shape (legacy compatibility)
const openColorPaletteForShape = () => {
  openColorPickerFor('general')
}

// Watch for when color selector is closed with a selection
watch(() => colorStore.isColorSelectorVisible, (isOpen, wasOpen) => {
  if (isOpen === false && wasOpen === true) {
    const updateFn = pendingColorUpdate.value
    if (updateFn) {
      // Color selector was just closed, apply the pending update
      updateFn(colorStore.selectedColor.hex)
      pendingColorUpdate.value = null
    }
  }
})

const regenerateShape = (shapeId: string) => {
  shapesStore.regenerateShape(shapeId)
}

// Calculate shape dimensions
const getShapeDimensions = (shape: any) => {
  if (!shape || !shape.data || shape.data.size === 0) {
    return { width: 0, height: 0 }
  }
  
  const keys = Array.from(shape.data.keys())
  const coords = keys.map(key => {
    const [x, y] = (key as string).split(',').map(Number)
    return { x, y }
  })
  
  const minX = Math.min(...coords.map(c => c.x))
  const maxX = Math.max(...coords.map(c => c.x))
  const minY = Math.min(...coords.map(c => c.y))
  const maxY = Math.max(...coords.map(c => c.y))
  
  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1
  }
}

// Resize shape to specific dimensions
const resizeShape = (shapeId: string, newWidth: number, newHeight: number) => {
  const shape = shapesStore.getSelectedShape()
  if (!shape || shape.id !== shapeId) return
  
  // Get current dimensions
  const currentDims = getShapeDimensions(shape)
  if (currentDims.width === 0 || currentDims.height === 0) return
  
  // For rectangles, we need to regenerate with new dimensions
  if (shape.type === 'rectangle') {
    const keys = Array.from(shape.data.keys())
    const coords = keys.map(key => {
      const [x, y] = (key as string).split(',').map(Number)
      return { x, y }
    })
    
    const minX = Math.min(...coords.map(c => c.x))
    const minY = Math.min(...coords.map(c => c.y))
    
    // Convert grid coordinates to world coordinates for the new size
    const startWorldX = minX * 10 + 5
    const startWorldY = minY * 20 + 10
    const endWorldX = (minX + newWidth - 1) * 10 + 5
    const endWorldY = (minY + newHeight - 1) * 20 + 10
    
    // Use the drawRectangle function with the shape's settings
    const newData = drawRectangle(startWorldX, startWorldY, endWorldX, endWorldY, {
      borderStyle: shape.toolSettings?.borderStyle || 'single',
      fillChar: shape.toolSettings?.fillChar || '',
      shadow: shape.toolSettings?.shadow || false,
      text: shape.toolSettings?.text || '',
      textAlign: shape.toolSettings?.textAlign || 'center',
      textPosition: shape.toolSettings?.textPosition || 'middle',
      // Include the checkbox states
      showText: shape.toolSettings?.showText,
      showFill: shape.toolSettings?.showFill,
      showBorder: shape.toolSettings?.showBorder,
      showShadow: shape.toolSettings?.showShadow
    })
    
    shape.data = newData
    
    // shapesStore handles saving and rendering automatically
  }
}

// Alignment functions for multiple shapes
const alignShapes = (
  alignment: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom',
) => {
  const shapes = selectedShapes.value
  if (shapes.length < 2) return

  // Get bounds for all selected shapes
  const bounds = shapes.map((shape) => {
    let minX = Infinity,
      maxX = -Infinity
    let minY = Infinity,
      maxY = -Infinity

    for (const [key] of shape.data) {
      const [x, y] = key.split(',').map(Number)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }

    return { shape, minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
  })

  // Find alignment targets
  const allMinX = Math.min(...bounds.map((b) => b.minX))
  const allMaxX = Math.max(...bounds.map((b) => b.maxX))
  const allMinY = Math.min(...bounds.map((b) => b.minY))
  const allMaxY = Math.max(...bounds.map((b) => b.maxY))
  const centerX = Math.floor((allMinX + allMaxX) / 2)
  const centerY = Math.floor((allMinY + allMaxY) / 2)

  // Apply alignment
  bounds.forEach(({ shape, minX, maxX, minY, maxY, width, height }) => {
    let offsetX = 0
    let offsetY = 0

    switch (alignment) {
      case 'left':
        offsetX = allMinX - minX
        break
      case 'center-horizontal':
        offsetX = centerX - Math.floor((minX + maxX) / 2)
        break
      case 'right':
        offsetX = allMaxX - maxX
        break
      case 'top':
        offsetY = allMinY - minY
        break
      case 'center-vertical':
        offsetY = centerY - Math.floor((minY + maxY) / 2)
        break
      case 'bottom':
        offsetY = allMaxY - maxY
        break
    }

    // Apply offset to shape data
    if (offsetX !== 0 || offsetY !== 0) {
      const newData = new Map<string, string>()
      for (const [key, value] of shape.data) {
        const [x, y] = key.split(',').map(Number)
        newData.set(`${x + offsetX},${y + offsetY}`, value)
      }
      shape.data = newData
    }
  })

  // shapesStore handles saving and rendering automatically
}
</script>

<template>
  <!-- Drawer panel - always visible when there are settings -->
  <Transition name="drawer-slide">
    <div v-if="showPanel" class="tool-settings-drawer">
      <div class="drawer-header">
        <span class="drawer-title">Tool Settings</span>
      </div>

      <div class="drawer-content">
        <!-- Multi-selection alignment tools -->
        <div v-if="hasMultipleShapesSelected" class="alignment-section">
          <div class="section-label">Align Objects</div>
          <div class="alignment-buttons">
            <button class="align-btn" @click="alignShapes('left')" title="Align left">
              <i class="fa-sharp fa-duotone fa-objects-align-left"></i>
            </button>
            <button
              class="align-btn"
              @click="alignShapes('center-horizontal')"
              title="Align center horizontal"
            >
              <i class="fa-sharp fa-duotone fa-objects-align-center-horizontal"></i>
            </button>
            <button class="align-btn" @click="alignShapes('right')" title="Align right">
              <i class="fa-sharp fa-duotone fa-objects-align-right"></i>
            </button>
            <button class="align-btn" @click="alignShapes('top')" title="Align top">
              <i class="fa-sharp fa-duotone fa-objects-align-top"></i>
            </button>
            <button
              class="align-btn"
              @click="alignShapes('center-vertical')"
              title="Align center vertical"
            >
              <i class="fa-sharp fa-duotone fa-objects-align-center-vertical"></i>
            </button>
            <button class="align-btn" @click="alignShapes('bottom')" title="Align bottom">
              <i class="fa-sharp fa-duotone fa-objects-align-bottom"></i>
            </button>
          </div>
          <div class="info-text" style="margin-top: 8px">
            {{ selectedShapes.length }} shapes selected
          </div>
        </div>

        <!-- Tool-specific settings -->
        <div v-if="hasSettings && !hasMultipleShapesSelected" class="settings-section">
          <!-- Brush Tool Settings -->
          <div v-if="activeToolType === 'brush'" class="tool-settings">

            <!-- Name field for selected shapes -->
            <div v-if="selectedShape" class="setting-item">
              <label>Name</label>
              <input
                type="text"
                :value="selectedShape.name"
                @input="
                  (e) =>
                    selectedShape &&
                    shapesStore.updateShapeName(
                      selectedShape.id,
                      (e.target as HTMLInputElement).value,
                    )
                "
                class="text-input"
              />
            </div>

            <div class="setting-item">
              <label>Character</label>
              <template v-if="selectedShape">
                <input
                  type="text"
                  class="fill-input"
                  :value="selectedShape.toolSettings?.character || '█'"
                  @input="
                    (e) =>
                      selectedShape &&
                      shapesStore.updateShapeSettings(selectedShape.id, {
                        character: (e.target as HTMLInputElement).value,
                      })
                  "
                  placeholder="Drawing character"
                  maxlength="1"
                />
              </template>
              <template v-else>
                <button
                  class="character-selector-btn"
                  @click="toolStore.toggleCharacterPalette()"
                  :title="`Current character: ${toolStore.selectedCharacter}`"
                >
                  <span class="character-display">{{ toolStore.selectedCharacter }}</span>
                  <i class="fa-thumbprint fa-light fa-chevron-down"></i>
                </button>
              </template>
            </div>

            <div class="setting-item">
              <label>Color</label>
              <div
                class="color-preview"
                :style="{
                  backgroundColor: selectedShape
                    ? selectedShape.color
                    : colorStore.selectedColor.hex,
                }"
                @click="
                  selectedShape ? openColorPaletteForShape() : colorStore.toggleColorSelector()
                "
                title="Click to change color"
              >
                {{ selectedShape ? selectedShape.color : colorStore.selectedColor.hex }}
              </div>
            </div>

            <!-- Shape dimensions for selected shapes -->
            <div v-if="selectedShape" class="setting-item">
              <label>Size</label>
              <div class="size-inputs">
                <div class="size-input-group">
                  <span class="size-label">W:</span>
                  <input
                    type="number"
                    :value="getShapeDimensions(selectedShape).width"
                    @change="(e) => {
                      const newWidth = parseInt((e.target as HTMLInputElement).value)
                      const height = getShapeDimensions(selectedShape).height
                      if (newWidth > 0 && selectedShape) {
                        resizeShape(selectedShape.id, newWidth, height)
                      }
                    }"
                    min="3"
                    max="100"
                    class="size-input"
                  />
                </div>
                <div class="size-input-group">
                  <span class="size-label">H:</span>
                  <input
                    type="number"
                    :value="getShapeDimensions(selectedShape).height"
                    @change="(e) => {
                      const newHeight = parseInt((e.target as HTMLInputElement).value)
                      const width = getShapeDimensions(selectedShape).width
                      if (newHeight > 0 && selectedShape) {
                        resizeShape(selectedShape.id, width, newHeight)
                      }
                    }"
                    min="3"
                    max="100"
                    class="size-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Rectangle Tool Settings -->
          <div v-if="activeToolType === 'rectangle'" class="tool-settings">

            <!-- Name field for selected shapes -->
            <div v-if="selectedShape" class="setting-item">
              <label>Name</label>
              <input
                type="text"
                :value="selectedShape.name"
                @input="
                  (e) =>
                    selectedShape &&
                    shapesStore.updateShapeName(
                      selectedShape.id,
                      (e.target as HTMLInputElement).value,
                    )
                "
                class="text-input"
              />
            </div>

            <!-- Border Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('border')">
                <input
                  type="checkbox"
                  class="section-checkbox"
                  :checked="rectangleSettings.showBorder"
                  @click.stop
                  @change="(e) => { e.stopPropagation(); updateSetting('showBorder', (e.target as HTMLInputElement).checked) }"
                />
                <span class="section-title">Border</span>
                <span class="section-toggle">{{ collapsedSections.border ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.border" class="section-content">
                <div class="setting-item">
                  <label>Style</label>
                  <select
                    class="select-input"
                    :value="rectangleSettings.borderStyle"
                    @change="(e) => updateSetting('borderStyle', (e.target as HTMLSelectElement).value)"
                  >
                    <option value="single">Single Line</option>
                    <option value="double">Double Line</option>
                    <option value="thick">Thick Line</option>
                    <option value="rounded">Rounded</option>
                    <option value="dashed">Dashed</option>
                    <option value="solid">Solid Block</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>Color</label>
                  <div
                    class="color-preview"
                    :style="{
                      backgroundColor: selectedShape
                        ? (selectedShape.borderColor || selectedShape.color)
                        : toolStore.rectangleBorderColor,
                    }"
                    @click="() => openColorPickerFor('border')"
                    title="Click to change border color"
                  >
                    {{ selectedShape ? (selectedShape.borderColor || selectedShape.color) : toolStore.rectangleBorderColor }}
                  </div>
                </div>
                <div v-if="!selectedShape" class="setting-item">
                  <label>Preview</label>
                  <div class="border-preview">
                    <pre class="preview-box">{{ getBorderPreview() }}</pre>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fill Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('fill')">
                <input
                  type="checkbox"
                  class="section-checkbox"
                  :checked="rectangleSettings.showFill"
                  @click.stop
                  @change="(e) => { e.stopPropagation(); updateSetting('showFill', (e.target as HTMLInputElement).checked) }"
                />
                <span class="section-title">Fill</span>
                <span class="section-toggle">{{ collapsedSections.fill ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.fill" class="section-content">
                <div class="setting-item">
                  <label>Character</label>
                  <div class="fill-preset-options">
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '')"
                      :class="{ active: rectangleSettings.fillChar === '' }"
                      title="No fill (empty)"
                    >
                      <span style="font-family: monospace">&nbsp;</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '░')"
                      :class="{ active: rectangleSettings.fillChar === '░' }"
                      title="Light shade (25%)"
                    >
                      <span style="font-family: monospace">░</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '▒')"
                      :class="{ active: rectangleSettings.fillChar === '▒' }"
                      title="Medium shade (50%)"
                    >
                      <span style="font-family: monospace">▒</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '▓')"
                      :class="{ active: rectangleSettings.fillChar === '▓' }"
                      title="Dark shade (75%)"
                    >
                      <span style="font-family: monospace">▓</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '█')"
                      :class="{ active: rectangleSettings.fillChar === '█' }"
                      title="Solid (100%)"
                    >
                      <span style="font-family: monospace">█</span>
                    </button>
                  </div>
                  <div class="fill-custom-input">
                    <input
                      type="text"
                      class="fill-input"
                      :value="rectangleSettings.fillChar"
                      @input="(e) => updateSetting('fillChar', (e.target as HTMLInputElement).value)"
                      placeholder="Custom character (or leave empty)"
                      maxlength="1"
                    />
                  </div>
                </div>
                <div class="setting-item">
                  <label>Color</label>
                  <div
                    class="color-preview"
                    :style="{
                      backgroundColor: selectedShape
                        ? (selectedShape.fillColor || selectedShape.color)
                        : toolStore.rectangleFillColor,
                    }"
                    @click="() => openColorPickerFor('fill')"
                    title="Click to change fill color"
                  >
                    {{ selectedShape ? (selectedShape.fillColor || selectedShape.color) : toolStore.rectangleFillColor }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Shadow Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('shadow')">
                <input
                  type="checkbox"
                  class="section-checkbox"
                  :checked="rectangleSettings.showShadow"
                  @click.stop
                  @change="(e) => { e.stopPropagation(); const checked = (e.target as HTMLInputElement).checked; updateSetting('showShadow', checked); updateSetting('shadow', checked) }"
                />
                <span class="section-title">Shadow</span>
                <span class="section-toggle">{{ collapsedSections.shadow ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.shadow" class="section-content">
                <div class="setting-item">
                  <div class="checkbox-wrapper">
                    <input
                      type="checkbox"
                      class="checkbox-input"
                      :checked="rectangleSettings.shadow"
                      @change="(e) => updateSetting('shadow', (e.target as HTMLInputElement).checked)"
                    />
                    <span class="checkbox-label">{{
                      selectedShape ? 'Has drop shadow' : 'Add drop shadow'
                    }}</span>
                  </div>
                </div>
                <!-- Future: shadow color, character, x/y offset -->
              </div>
            </div>

            <!-- Text Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('text')">
                <input
                  type="checkbox"
                  class="section-checkbox"
                  :checked="rectangleSettings.showText"
                  @click.stop
                  @change="(e) => { e.stopPropagation(); updateSetting('showText', (e.target as HTMLInputElement).checked) }"
                />
                <span class="section-title">Text</span>
                <span class="section-toggle">{{ collapsedSections.text ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.text" class="section-content">
                <div class="setting-item">
                  <label>Content</label>
                  <input
                    type="text"
                    class="text-input"
                    :value="rectangleSettings.text"
                    @input="(e) => updateSetting('text', (e.target as HTMLInputElement).value)"
                    placeholder="Text inside rectangle"
                  />
                </div>
                <div class="setting-item">
                  <label>Alignment</label>
                  <div class="button-group">
                    <button
                      class="align-option-btn"
                      :class="{ active: rectangleSettings.textAlign === 'left' }"
                      @click="updateSetting('textAlign', 'left')"
                      title="Align left"
                    >
                      Left
                    </button>
                    <button
                      class="align-option-btn"
                      :class="{ active: rectangleSettings.textAlign === 'center' }"
                      @click="updateSetting('textAlign', 'center')"
                      title="Align center"
                    >
                      Center
                    </button>
                    <button
                      class="align-option-btn"
                      :class="{ active: rectangleSettings.textAlign === 'right' }"
                      @click="updateSetting('textAlign', 'right')"
                      title="Align right"
                    >
                      Right
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>Position</label>
                  <div class="button-group">
                    <button
                      class="align-option-btn"
                      :class="{ active: rectangleSettings.textPosition === 'top' }"
                      @click="updateSetting('textPosition', 'top')"
                      title="Position top"
                    >
                      Top
                    </button>
                    <button
                      class="align-option-btn"
                      :class="{ active: rectangleSettings.textPosition === 'middle' }"
                      @click="updateSetting('textPosition', 'middle')"
                      title="Position middle"
                    >
                      Middle
                    </button>
                    <button
                      class="align-option-btn"
                      :class="{ active: rectangleSettings.textPosition === 'bottom' }"
                      @click="updateSetting('textPosition', 'bottom')"
                      title="Position bottom"
                    >
                      Bottom
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>Color</label>
                  <div
                    class="color-preview"
                    :style="{
                      backgroundColor: selectedShape
                        ? (selectedShape.textColor || selectedShape.color)
                        : toolStore.rectangleTextColor
                    }"
                    @click="() => openColorPickerFor('text')"
                    title="Click to change text color"
                  >
                    {{ selectedShape ? (selectedShape.textColor || selectedShape.color) : toolStore.rectangleTextColor }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Size Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('size')">
                <span class="section-title">Size</span>
                <span class="section-toggle">{{ collapsedSections.size ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.size" class="section-content">
                <div class="setting-item">
                  <label>Dimensions</label>
                  <div class="size-inputs">
                    <div class="size-input-group">
                      <span class="size-label">Width:</span>
                      <input
                        type="number"
                        :value="selectedShape ? getShapeDimensions(selectedShape).width : 10"
                        @change="(e) => {
                          const newWidth = parseInt((e.target as HTMLInputElement).value)
                          if (selectedShape) {
                            const height = getShapeDimensions(selectedShape).height
                            if (newWidth > 0) {
                              resizeShape(selectedShape.id, newWidth, height)
                            }
                          }
                        }"
                        min="3"
                        max="100"
                        class="size-input"
                        :disabled="!selectedShape"
                      />
                    </div>
                    <div class="size-input-group">
                      <span class="size-label">Height:</span>
                      <input
                        type="number"
                        :value="selectedShape ? getShapeDimensions(selectedShape).height : 10"
                        @change="(e) => {
                          const newHeight = parseInt((e.target as HTMLInputElement).value)
                          if (selectedShape) {
                            const width = getShapeDimensions(selectedShape).width
                            if (newHeight > 0) {
                              resizeShape(selectedShape.id, width, newHeight)
                            }
                          }
                        }"
                        min="3"
                        max="100"
                        class="size-input"
                        :disabled="!selectedShape"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Diamond Tool Settings -->
          <div v-if="activeToolType === 'diamond'" class="tool-settings">
            <!-- Name field for selected shapes -->
            <div v-if="selectedShape" class="setting-item">
              <label>Name</label>
              <input
                type="text"
                :value="selectedShape.name"
                @input="
                  (e) =>
                    selectedShape &&
                    shapesStore.updateShapeName(
                      selectedShape.id,
                      (e.target as HTMLInputElement).value,
                    )
                "
                class="text-input"
              />
            </div>
            <!-- Border Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('border')">
                <input
                  type="checkbox"
                  class="section-checkbox"
                  :checked="diamondSettings.showBorder"
                  @click.stop
                  @change="(e) => { e.stopPropagation(); updateSetting('showBorder', (e.target as HTMLInputElement).checked) }"
                />
                <span class="section-title">Border</span>
                <span class="section-toggle">{{ collapsedSections.border ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.border" class="section-content">
                <div class="setting-item">
                  <label>Color</label>
                  <div
                    class="color-preview"
                    :style="{
                      backgroundColor: selectedShape
                        ? (selectedShape.borderColor || selectedShape.color)
                        : colorStore.selectedColor.hex,
                    }"
                    @click="() => openColorPickerFor('border')"
                    title="Click to change border color"
                  >
                    {{ selectedShape ? (selectedShape.borderColor || selectedShape.color) : colorStore.selectedColor.hex }}
                  </div>
                </div>
              </div>
            </div>
            <!-- Fill Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('fill')">
                <input
                  type="checkbox"
                  class="section-checkbox"
                  :checked="diamondSettings.showFill"
                  @click.stop
                  @change="(e) => { e.stopPropagation(); updateSetting('showFill', (e.target as HTMLInputElement).checked) }"
                />
                <span class="section-title">Fill</span>
                <span class="section-toggle">{{ collapsedSections.fill ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.fill" class="section-content">
                <div class="setting-item">
                  <label>Character</label>
                  <div class="fill-preset-options">
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '')"
                      :class="{ active: diamondSettings.fillChar === '' }"
                      title="No fill (empty)"
                    >
                      <span style="font-family: monospace">&nbsp;</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '░')"
                      :class="{ active: diamondSettings.fillChar === '░' }"
                      title="Light shade (25%)"
                    >
                      <span style="font-family: monospace">░</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '▒')"
                      :class="{ active: diamondSettings.fillChar === '▒' }"
                      title="Medium shade (50%)"
                    >
                      <span style="font-family: monospace">▒</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '▓')"
                      :class="{ active: diamondSettings.fillChar === '▓' }"
                      title="Dark shade (75%)"
                    >
                      <span style="font-family: monospace">▓</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '█')"
                      :class="{ active: diamondSettings.fillChar === '█' }"
                      title="Solid (100%)"
                    >
                      <span style="font-family: monospace">█</span>
                    </button>
                    <button
                      class="fill-preset-btn"
                      @click="updateSetting('fillChar', '◆')"
                      :class="{ active: diamondSettings.fillChar === '◆' }"
                      title="Diamond"
                    >
                      <span style="font-family: monospace">◆</span>
                    </button>
                  </div>
                  <div class="fill-custom-input">
                    <input
                      type="text"
                      class="fill-input"
                      :value="diamondSettings.fillChar"
                      @input="(e) => updateSetting('fillChar', (e.target as HTMLInputElement).value)"
                      placeholder="Custom character (or leave empty)"
                      maxlength="1"
                    />
                  </div>
                </div>
                <div class="setting-item">
                  <label>Color</label>
                  <div
                    class="color-preview"
                    :style="{
                      backgroundColor: selectedShape
                        ? (selectedShape.fillColor || selectedShape.color)
                        : colorStore.selectedColor.hex,
                    }"
                    @click="() => openColorPickerFor('fill')"
                    title="Click to change fill color"
                  >
                    {{ selectedShape ? (selectedShape.fillColor || selectedShape.color) : colorStore.selectedColor.hex }}
                  </div>
                </div>
              </div>
            </div>
            <!-- Text Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('text')">
                <input
                  type="checkbox"
                  class="section-checkbox"
                  :checked="diamondSettings.showText"
                  @click.stop
                  @change="(e) => { e.stopPropagation(); updateSetting('showText', (e.target as HTMLInputElement).checked) }"
                />
                <span class="section-title">Text</span>
                <span class="section-toggle">{{ collapsedSections.text ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.text" class="section-content">
                <div class="setting-item">
                  <label>Content</label>
                  <input
                    type="text"
                    class="text-input"
                    :value="diamondSettings.text"
                    @input="(e) => updateSetting('text', (e.target as HTMLInputElement).value)"
                    placeholder="Text inside diamond"
                  />
                </div>
                <div class="setting-item">
                  <label>Alignment</label>
                  <div class="button-group">
                    <button
                      class="align-option-btn"
                      :class="{ active: diamondSettings.textAlign === 'left' }"
                      @click="updateSetting('textAlign', 'left')"
                      title="Align left"
                    >
                      Left
                    </button>
                    <button
                      class="align-option-btn"
                      :class="{ active: diamondSettings.textAlign === 'center' }"
                      @click="updateSetting('textAlign', 'center')"
                      title="Align center"
                    >
                      Center
                    </button>
                    <button
                      class="align-option-btn"
                      :class="{ active: diamondSettings.textAlign === 'right' }"
                      @click="updateSetting('textAlign', 'right')"
                      title="Align right"
                    >
                      Right
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>Position</label>
                  <div class="button-group">
                    <button
                      class="align-option-btn"
                      :class="{ active: diamondSettings.textPosition === 'top' }"
                      @click="updateSetting('textPosition', 'top')"
                      title="Position top"
                    >
                      Top
                    </button>
                    <button
                      class="align-option-btn"
                      :class="{ active: diamondSettings.textPosition === 'middle' }"
                      @click="updateSetting('textPosition', 'middle')"
                      title="Position middle"
                    >
                      Middle
                    </button>
                    <button
                      class="align-option-btn"
                      :class="{ active: diamondSettings.textPosition === 'bottom' }"
                      @click="updateSetting('textPosition', 'bottom')"
                      title="Position bottom"
                    >
                      Bottom
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>Color</label>
                  <div
                    class="color-preview"
                    :style="{
                      backgroundColor: selectedShape
                        ? (selectedShape.textColor || selectedShape.color)
                        : toolStore.diamondTextColor
                    }"
                    @click="() => openColorPickerFor('text')"
                    title="Click to change text color"
                  >
                    {{ selectedShape ? (selectedShape.textColor || selectedShape.color) : toolStore.diamondTextColor }}
                  </div>
                </div>
              </div>
            </div>
            <!-- Shadow Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('shadow')">
                <input
                  type="checkbox"
                  class="section-checkbox"
                  :checked="diamondSettings.showShadow"
                  @click.stop
                  @change="(e) => { e.stopPropagation(); const checked = (e.target as HTMLInputElement).checked; updateSetting('showShadow', checked); updateSetting('shadow', checked) }"
                />
                <span class="section-title">Shadow</span>
                <span class="section-toggle">{{ collapsedSections.shadow ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.shadow" class="section-content">
                <div class="setting-item">
                  <div class="checkbox-wrapper">
                    <input
                      type="checkbox"
                      class="checkbox-input"
                      :checked="diamondSettings.shadow"
                      @change="(e) => updateSetting('shadow', (e.target as HTMLInputElement).checked)"
                    />
                    <span class="checkbox-label">{{
                      selectedShape ? 'Has drop shadow' : 'Add drop shadow'
                    }}</span>
                  </div>
                </div>
                <!-- Future: shadow color, character, x/y offset -->
              </div>
            </div>

            <!-- Size Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('size')">
                <span class="section-title">Size</span>
                <span class="section-toggle">{{ collapsedSections.size ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.size" class="section-content">
                <div class="setting-item">
                  <label>Dimensions</label>
                  <div class="size-inputs">
                    <div class="size-input-group">
                      <span class="size-label">Width:</span>
                      <input
                        type="number"
                        :value="selectedShape ? getShapeDimensions(selectedShape).width : 10"
                        @change="(e) => {
                          const newWidth = parseInt((e.target as HTMLInputElement).value)
                          if (selectedShape) {
                            const height = getShapeDimensions(selectedShape).height
                            if (newWidth > 0) {
                              resizeShape(selectedShape.id, newWidth, height)
                            }
                          }
                        }"
                        min="3"
                        max="100"
                        class="size-input"
                        :disabled="!selectedShape"
                      />
                    </div>
                    <div class="size-input-group">
                      <span class="size-label">Height:</span>
                      <input
                        type="number"
                        :value="selectedShape ? getShapeDimensions(selectedShape).height : 10"
                        @change="(e) => {
                          const newHeight = parseInt((e.target as HTMLInputElement).value)
                          if (selectedShape) {
                            const width = getShapeDimensions(selectedShape).width
                            if (newHeight > 0) {
                              resizeShape(selectedShape.id, width, newHeight)
                            }
                          }
                        }"
                        min="3"
                        max="100"
                        class="size-input"
                        :disabled="!selectedShape"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Line Tool Settings -->
          <div v-if="activeToolType === 'line'" class="tool-settings">

            <!-- Name field for selected shapes -->
            <div v-if="selectedShape" class="setting-item">
              <label>Name</label>
              <input
                type="text"
                :value="selectedShape.name"
                @input="
                  (e) =>
                    selectedShape &&
                    shapesStore.updateShapeName(
                      selectedShape.id,
                      (e.target as HTMLInputElement).value,
                    )
                "
                class="text-input"
              />
            </div>

            <!-- Line Style Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('lineStyle')">
                <span class="section-title">Line Style</span>
                <span class="section-toggle">{{ collapsedSections.lineStyle ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.lineStyle" class="section-content">
                <div class="setting-item">
                  <label>Style</label>
                  <select
                    class="select-input"
                    :value="
                      selectedShape
                        ? selectedShape.toolSettings?.lineStyle || 'single'
                        : toolStore.lineStyle || 'single'
                    "
                    @change="
                      (e) =>
                        selectedShape
                          ? shapesStore.updateShapeSettings(selectedShape.id, {
                              lineStyle: (e.target as HTMLSelectElement).value,
                            })
                          : toolStore.setLineStyle &&
                            toolStore.setLineStyle((e.target as HTMLSelectElement).value as any)
                    "
                  >
                    <option value="single">Single ─│/\</option>
                    <option value="double">Double ═║</option>
                    <option value="thick">Thick ━┃</option>
                    <option value="dashed">Dashed ╌╎</option>
                    <option value="dotted">Dotted ···</option>
                    <option value="arrow">Arrow →</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Line Endpoints Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('endpoints')">
                <span class="section-title">Endpoints</span>
                <span class="section-toggle">{{ collapsedSections.endpoints ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.endpoints" class="section-content">
                <div class="setting-item">
                  <label>Start</label>
                  <select
                    class="select-input"
                    :value="
                      selectedShape
                        ? selectedShape.toolSettings?.lineStartStyle || 'none'
                        : toolStore.lineStartStyle || 'none'
                    "
                    @change="
                      (e) =>
                        selectedShape
                          ? shapesStore.updateShapeSettings(selectedShape.id, {
                              lineStartStyle: (e.target as HTMLSelectElement).value,
                            })
                          : toolStore.setLineStartStyle &&
                            toolStore.setLineStartStyle((e.target as HTMLSelectElement).value as any)
                    "
                  >
                    <option value="none">None</option>
                    <option value="arrow">← Arrow</option>
                    <option value="circle">○ Circle</option>
                    <option value="square">□ Square</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>End</label>
                  <select
                    class="select-input"
                    :value="
                      selectedShape
                        ? selectedShape.toolSettings?.lineEndStyle || 'arrow'
                        : toolStore.lineEndStyle || 'arrow'
                    "
                    @change="
                      (e) =>
                        selectedShape
                          ? shapesStore.updateShapeSettings(selectedShape.id, {
                              lineEndStyle: (e.target as HTMLSelectElement).value,
                            })
                          : toolStore.setLineEndStyle &&
                            toolStore.setLineEndStyle((e.target as HTMLSelectElement).value as any)
                    "
                  >
                    <option value="none">None</option>
                    <option value="arrow">Arrow →</option>
                    <option value="circle">Circle ○</option>
                    <option value="square">Square □</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Color Section -->
            <div class="section-group">
              <div class="section-header" @click="toggleSection('lineColor')">
                <span class="section-title">Color</span>
                <span class="section-toggle">{{ collapsedSections.lineColor ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.lineColor" class="section-content">
                <div class="setting-item">
                  <div
                    class="color-preview"
                    :style="{
                      backgroundColor: selectedShape
                        ? selectedShape.color
                        : colorStore.selectedColor.hex,
                    }"
                    @click="
                      selectedShape ? openColorPaletteForShape() : colorStore.toggleColorSelector()
                    "
                    title="Click to change color"
                  >
                    {{ selectedShape ? selectedShape.color : colorStore.selectedColor.hex }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Size Section for selected shapes -->
            <div v-if="selectedShape" class="section-group">
              <div class="section-header" @click="toggleSection('lineSize')">
                <span class="section-title">Size</span>
                <span class="section-toggle">{{ collapsedSections.lineSize ? '▶' : '▼' }}</span>
              </div>
              <div v-show="!collapsedSections.lineSize" class="section-content">
                <div class="setting-item">
                  <div class="size-inputs">
                    <div class="size-input-group">
                      <span class="size-label">W:</span>
                      <input
                        type="number"
                        :value="getShapeDimensions(selectedShape).width"
                        @change="(e) => {
                          const newWidth = parseInt((e.target as HTMLInputElement).value)
                          const height = getShapeDimensions(selectedShape).height
                          if (newWidth > 0 && selectedShape) {
                            resizeShape(selectedShape.id, newWidth, height)
                          }
                        }"
                        min="3"
                        max="100"
                        class="size-input"
                      />
                    </div>
                    <div class="size-input-group">
                      <span class="size-label">H:</span>
                      <input
                        type="number"
                        :value="getShapeDimensions(selectedShape).height"
                        @change="(e) => {
                          const newHeight = parseInt((e.target as HTMLInputElement).value)
                          const width = getShapeDimensions(selectedShape).width
                          if (newHeight > 0 && selectedShape) {
                            resizeShape(selectedShape.id, width, newHeight)
                          }
                        }"
                        min="3"
                        max="100"
                        class="size-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Text Tool Settings -->
          <div v-if="activeToolType === 'text'" class="tool-settings">

            <!-- Name field for selected shapes -->
            <div v-if="selectedShape" class="setting-item">
              <label>Name</label>
              <input
                type="text"
                :value="selectedShape.name"
                @input="
                  (e) =>
                    selectedShape &&
                    shapesStore.updateShapeName(
                      selectedShape.id,
                      (e.target as HTMLInputElement).value,
                    )
                "
                class="text-input"
              />
            </div>

            <!-- Content field for selected shapes -->
            <div v-if="selectedShape" class="setting-item">
              <label>Content</label>
              <textarea
                :value="selectedShape.toolSettings?.content || ''"
                @input="
                  (e) => {
                    selectedShape &&
                      shapesStore.updateShapeSettings(selectedShape.id, {
                        ...selectedShape.toolSettings,
                        content: (e.target as HTMLTextAreaElement).value,
                      })
                    if (selectedShape) regenerateShape(selectedShape.id)
                  }
                "
                class="text-area"
                rows="3"
                placeholder="Enter text content..."
              />
            </div>

            <!-- Content field for new text (not used since we get it from dialog) -->
            <div v-if="!selectedShape" class="setting-item">
              <label>Instructions</label>
              <div class="info-text">Draw a box, then enter text content</div>
            </div>

            <div class="setting-item">
              <label>Horizontal Align</label>
              <select
                class="select-input"
                :value="
                  selectedShape
                    ? selectedShape.toolSettings?.horizontalAlign || 'left'
                    : toolStore.textHorizontalAlign
                "
                @change="
                  (e) => {
                    if (selectedShape) {
                      selectedShape &&
                        shapesStore.updateShapeSettings(selectedShape.id, {
                          ...selectedShape.toolSettings,
                          horizontalAlign: (e.target as HTMLSelectElement).value,
                        })
                      if (selectedShape) regenerateShape(selectedShape.id)
                    } else {
                      toolStore.setTextHorizontalAlign &&
                        toolStore.setTextHorizontalAlign(
                          (e.target as HTMLSelectElement).value as any,
                        )
                    }
                  }
                "
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div class="setting-item">
              <label>Vertical Align</label>
              <select
                class="select-input"
                :value="
                  selectedShape
                    ? selectedShape.toolSettings?.verticalAlign || 'top'
                    : toolStore.textVerticalAlign
                "
                @change="
                  (e) => {
                    if (selectedShape) {
                      selectedShape &&
                        shapesStore.updateShapeSettings(selectedShape.id, {
                          ...selectedShape.toolSettings,
                          verticalAlign: (e.target as HTMLSelectElement).value,
                        })
                      if (selectedShape) regenerateShape(selectedShape.id)
                    } else {
                      toolStore.setTextVerticalAlign &&
                        toolStore.setTextVerticalAlign((e.target as HTMLSelectElement).value as any)
                    }
                  }
                "
              >
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>

            <div class="setting-item">
              <label>Border</label>
              <div class="checkbox-wrapper">
                <input
                  type="checkbox"
                  class="checkbox-input"
                  :checked="
                    selectedShape
                      ? (selectedShape.toolSettings?.showBorder ?? true)
                      : toolStore.textShowBorder
                  "
                  @change="
                    (e) => {
                      if (selectedShape) {
                        selectedShape &&
                          shapesStore.updateShapeSettings(selectedShape.id, {
                            ...selectedShape.toolSettings,
                            showBorder: (e.target as HTMLInputElement).checked,
                          })
                        if (selectedShape) regenerateShape(selectedShape.id)
                      } else {
                        toolStore.setTextShowBorder &&
                          toolStore.setTextShowBorder((e.target as HTMLInputElement).checked)
                      }
                    }
                  "
                />
                <span class="checkbox-label">{{
                  selectedShape ? 'Has border' : 'Show border'
                }}</span>
              </div>
            </div>

            <div class="setting-item">
              <label>Color</label>
              <div
                class="color-preview"
                :style="{
                  backgroundColor: selectedShape
                    ? selectedShape.color
                    : colorStore.selectedColor.hex,
                }"
                @click="
                  selectedShape ? openColorPaletteForShape() : colorStore.toggleColorSelector()
                "
                title="Click to change color"
              >
                {{ selectedShape ? selectedShape.color : colorStore.selectedColor.hex }}
              </div>
            </div>

            <!-- Shape dimensions for selected shapes -->
            <div v-if="selectedShape" class="setting-item">
              <label>Size</label>
              <div class="size-inputs">
                <div class="size-input-group">
                  <span class="size-label">W:</span>
                  <input
                    type="number"
                    :value="getShapeDimensions(selectedShape).width"
                    @change="(e) => {
                      const newWidth = parseInt((e.target as HTMLInputElement).value)
                      const height = getShapeDimensions(selectedShape).height
                      if (newWidth > 0 && selectedShape) {
                        resizeShape(selectedShape.id, newWidth, height)
                      }
                    }"
                    min="3"
                    max="100"
                    class="size-input"
                  />
                </div>
                <div class="size-input-group">
                  <span class="size-label">H:</span>
                  <input
                    type="number"
                    :value="getShapeDimensions(selectedShape).height"
                    @change="(e) => {
                      const newHeight = parseInt((e.target as HTMLInputElement).value)
                      const width = getShapeDimensions(selectedShape).width
                      if (newHeight > 0 && selectedShape) {
                        resizeShape(selectedShape.id, width, newHeight)
                      }
                    }"
                    min="3"
                    max="100"
                    class="size-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No settings message -->
        <div v-if="!hasSettings && !hasMultipleShapesSelected" class="no-settings">
          <p>Select a tool or shape to view settings</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Drawer panel */
.tool-settings-drawer {
  position: fixed;
  right: 0;
  top: 20px;
  bottom: 20px;
  width: 300px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-light);
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: var(--backdrop-blur);
}

/* Drawer header */
.drawer-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.drawer-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Drawer content */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Animations */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tool-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-settings > .setting-item {
  padding: 0 24px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.section-content .setting-item {
  padding-left: 0;
}

.setting-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.character-selector-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.character-selector-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-active);
}

.character-selector-btn .character-display {
  font-size: 20px;
  font-family: var(--mono-font-family);
  min-width: 24px;
  text-align: center;
}

.character-selector-btn i {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
}

.text-input {
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 13px;
  background: white;
  transition: all 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

/* Collapsible sections */
.section-group {
  border-bottom: 1px solid var(--border-light);
  padding: 0 24px;
}

.section-group:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease;
}

.section-header:hover {
  opacity: 0.7;
}

.section-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.section-toggle {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
  margin-left: auto;
}

.section-content {
  padding: 0 0 12px 0;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Size input styles */
.size-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.size-input-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.size-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 50px;
}

.size-input {
  flex: 1;
  max-width: 100px;
  padding: 4px 8px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 13px;
  background: white;
  transition: all 0.2s ease;
}

.size-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.size-input:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.size-input::-webkit-inner-spin-button,
.size-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.size-input[type="number"] {
  -moz-appearance: textfield;
}

.text-area {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 13px;
  font-family: var(--mono-font-family);
  background: white;
  transition: all 0.2s ease;
  resize: vertical;
  min-height: 60px;
}

.text-area:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}

.select-input {
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-input:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.range-input {
  width: 100%;
  cursor: pointer;
}

.color-preview {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  font-size: 12px;
  font-family: var(--mono-font-family);
  color: white;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-preview:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.info-text {
  font-size: 13px;
  color: var(--text-primary);
  padding: 6px 0;
}

.no-settings {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 24px;
  color: var(--text-muted);
  font-size: 13px;
}

/* Scrollbar styling for drawer */
.drawer-content::-webkit-scrollbar {
  width: 6px;
}

.drawer-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.drawer-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.drawer-content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Border preview styles */
.border-preview {
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-box {
  font-family: var(--mono-font-family);
  font-size: 16px;
  line-height: 1.2;
  margin: 0;
  color: var(--text-primary);
  white-space: pre;
}

/* Fill options styles */
.button-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.align-option-btn {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: white;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.align-option-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-active);
}

.align-option-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.fill-preset-options {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.fill-custom-input {
  margin-top: 8px;
}

.fill-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 14px;
  font-family: var(--mono-font-family);
  background: white;
  text-align: center;
  transition: all 0.2s ease;
}

.fill-input:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.fill-preset-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  font-family: var(--mono-font-family);
  transition: all 0.2s ease;
  min-width: 45px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fill-preset-btn span {
  font-family: var(--mono-font-family);
  font-size: 18px;
  line-height: 1;
}

.fill-preset-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-active);
}

.fill-preset-btn.active {
  background: var(--bg-active);
  color: white;
  border-color: var(--bg-active);
}

.fill-preset-btn.active:hover {
  background: var(--bg-active-hover);
  border-color: var(--bg-active-hover);
}

/* Alignment section styles */
.alignment-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 20px;
}

.alignment-buttons {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.align-btn {
  padding: 8px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

.align-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-active);
  transform: scale(1.05);
}

.align-btn:active {
  transform: scale(0.95);
}

.align-btn i {
  font-size: 16px;
  color: var(--text-secondary);
}

.align-btn:hover i {
  color: var(--text-primary);
}
</style>
