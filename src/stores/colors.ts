import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Color {
  name: string
  hex: string
  rgb: { r: number; g: number; b: number }
}

// 4-bit color palette (16 colors)
export const BIT4_COLORS: Color[] = [
  { name: 'Black', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } },
  { name: 'Dark Red', hex: '#800000', rgb: { r: 128, g: 0, b: 0 } },
  { name: 'Dark Green', hex: '#008000', rgb: { r: 0, g: 128, b: 0 } },
  { name: 'Dark Yellow', hex: '#808000', rgb: { r: 128, g: 128, b: 0 } },
  { name: 'Dark Blue', hex: '#000080', rgb: { r: 0, g: 0, b: 128 } },
  { name: 'Dark Magenta', hex: '#800080', rgb: { r: 128, g: 0, b: 128 } },
  { name: 'Dark Cyan', hex: '#008080', rgb: { r: 0, g: 128, b: 128 } },
  { name: 'Light Gray', hex: '#C0C0C0', rgb: { r: 192, g: 192, b: 192 } },
  { name: 'Dark Gray', hex: '#808080', rgb: { r: 128, g: 128, b: 128 } },
  { name: 'Red', hex: '#FF0000', rgb: { r: 255, g: 0, b: 0 } },
  { name: 'Green', hex: '#00FF00', rgb: { r: 0, g: 255, b: 0 } },
  { name: 'Yellow', hex: '#FFFF00', rgb: { r: 255, g: 255, b: 0 } },
  { name: 'Blue', hex: '#0000FF', rgb: { r: 0, g: 0, b: 255 } },
  { name: 'Magenta', hex: '#FF00FF', rgb: { r: 255, g: 0, b: 255 } },
  { name: 'Cyan', hex: '#00FFFF', rgb: { r: 0, g: 255, b: 255 } },
  { name: 'White', hex: '#FFFFFF', rgb: { r: 255, g: 255, b: 255 } }
]

export const useColorStore = defineStore('colors', () => {
  const selectedColor = ref<Color>(BIT4_COLORS[0]) // Start with black
  const isColorSelectorVisible = ref(false)

  const setSelectedColor = (color: Color) => {
    selectedColor.value = color
  }

  const toggleColorSelector = () => {
    isColorSelectorVisible.value = !isColorSelectorVisible.value
  }

  const hideColorSelector = () => {
    isColorSelectorVisible.value = false
  }

  const showColorSelector = () => {
    isColorSelectorVisible.value = true
  }

  return {
    selectedColor,
    isColorSelectorVisible,
    setSelectedColor,
    toggleColorSelector,
    hideColorSelector,
    showColorSelector,
    colors: BIT4_COLORS
  }
})