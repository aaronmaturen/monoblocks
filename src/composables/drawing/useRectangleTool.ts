import { ref, computed, readonly } from 'vue'
import { useShapesStore } from '@/stores/shapes'
import { useColorStore } from '@/stores/colors'
import { shapeRegistry } from '@/shapes/registry'
import type { RectangleSettings } from '@/shapes/rectangle'

export function useRectangleTool() {
  const shapesStore = useShapesStore()
  const colorStore = useColorStore()
  
  const isDrawing = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const currentX = ref(0)
  const currentY = ref(0)
  
  // Default rectangle settings
  const settings = ref<RectangleSettings>({
    borderStyle: 'solid',
    fillChar: '█',
    filled: false,
    showBorder: true,
  })
  
  const rectangleDefinition = computed(() => {
    return shapeRegistry.get('rectangle')
  })
  
  const previewData = computed(() => {
    if (!isDrawing.value || !rectangleDefinition.value) {
      return new Map<string, string>()
    }
    
    return rectangleDefinition.value.createPreview(
      startX.value,
      startY.value,
      currentX.value,
      currentY.value,
      settings.value,
      colorStore.selectedColor.hex
    )
  })
  
  const startDrawing = (x: number, y: number) => {
    isDrawing.value = true
    startX.value = x
    startY.value = y
    currentX.value = x
    currentY.value = y
  }
  
  const updateDrawing = (x: number, y: number) => {
    if (!isDrawing.value) return
    
    currentX.value = x
    currentY.value = y
  }
  
  const finishDrawing = () => {
    if (!isDrawing.value || !rectangleDefinition.value) return
    
    const finalData = rectangleDefinition.value.draw(
      startX.value,
      startY.value,
      currentX.value,
      currentY.value,
      settings.value
    )
    
    if (finalData.size > 0) {
      shapesStore.addShape(
        'rectangle',
        finalData,
        colorStore.selectedColor.hex,
        `Rectangle ${Date.now()}`,
        settings.value
      )
    }
    
    isDrawing.value = false
  }
  
  const cancelDrawing = () => {
    isDrawing.value = false
  }
  
  const updateSettings = (newSettings: Partial<RectangleSettings>) => {
    settings.value = { ...settings.value, ...newSettings }
  }
  
  return {
    // State
    isDrawing: readonly(isDrawing),
    settings: readonly(settings),
    previewData,
    
    // Actions
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    updateSettings,
  }
}