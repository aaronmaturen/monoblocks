import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'

export interface Shape {
  id: string
  type: 'brush' | 'rectangle' | 'text' | 'line'
  data: Map<string, string> // Grid positions and characters
  color: string
  name: string
  timestamp: number
  toolSettings?: {
    // Rectangle-specific settings
    borderStyle?: string
    fillChar?: string
    shadow?: boolean
    // Line-specific settings
    lineStyle?: string
    lineStartStyle?: string
    lineEndStyle?: string
    // Brush-specific settings
    character?: string
    // Text-specific settings
    content?: string
    horizontalAlign?: string
    verticalAlign?: string
    showBorder?: boolean
  }
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  shapes: Shape[]
  order: number
}

export const useLayersStore = defineStore('layers', () => {
  const layers = ref<Layer[]>([])
  const activeLayerId = ref<string | null>(null)
  const selectedShapeId = ref<string | null>(null)
  let nextLayerId = 1
  let nextShapeId = 1

  // LocalStorage keys
  const STORAGE_KEY = 'monoblocks-professional-layers'
  const CAMERA_STORAGE_KEY = 'monoblocks-professional-camera'

  // Create MONOBLOCK ASCII art data
  const createMonoblockArt = (): Map<string, string> => {
    const art = [
      '███╗   ███╗ ██████╗ ███╗   ██╗ ██████╗ ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗',
      '████╗ ████║██╔═══██╗████╗  ██║██╔═══██╗██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝',
      '██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║██║ ██║ ██║     ██║   ██║██║     █████╔╝ ',
      '██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║██║  ██║██║     ██║   ██║██║     ██╔═██╗ ',
      '██║ ╚═╝ ██║╚██████╔╝██║ ╚████║╚██████╔╝██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗',
      '╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝',
      '',
      '       M O N O S P A C E   C R E A T I V I T Y',
      '        Enterprise-grade Grid-based Workflows',
    ]

    const shapeData = new Map<string, string>()
    const startX = -42 // Center horizontally (roughly half the width)
    const startY = -5 // Center vertically

    art.forEach((line, y) => {
      for (let x = 0; x < line.length; x++) {
        const char = line[x]
        if (char && char !== ' ') {
          const gridX = startX + x
          const gridY = startY + y
          shapeData.set(`${gridX},${gridY}`, char)
        }
      }
    })

    return shapeData
  }

  // Create initial default layer
  const createDefaultLayer = (includeArt = true) => {
    const defaultLayer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      shapes: [],
      order: 1,
    }

    // Add MONOBLOCK art as the first shape if requested
    if (includeArt) {
      const artData = createMonoblockArt()
      const artShape: Shape = {
        id: `shape-${nextShapeId++}`,
        type: 'text',
        data: artData,
        color: '#333333',
        name: 'MONOBLOCK Logo',
        timestamp: Date.now(),
      }
      defaultLayer.shapes.push(artShape)
    }

    layers.value.push(defaultLayer)
    activeLayerId.value = defaultLayer.id
    nextLayerId = 2
  }

  // Initialize with default layer if none exist
  const ensureDefaultLayer = () => {
    if (layers.value.length === 0) {
      createDefaultLayer()
    }
  }

  // Save state to localStorage
  const saveToStorage = () => {
    try {
      const state = {
        layers: layers.value.map((layer) => ({
          ...layer,
          shapes: layer.shapes.map((shape) => ({
            ...shape,
            data: Array.from(shape.data.entries()), // Convert Map to array for JSON
          })),
        })),
        activeLayerId: activeLayerId.value,
        nextLayerId,
        nextShapeId,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  // Load state from localStorage
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const state = JSON.parse(stored)

        // Restore layers with Map conversion
        layers.value = state.layers.map((layer: any) => ({
          ...layer,
          shapes: layer.shapes.map((shape: any) => ({
            ...shape,
            data: new Map(shape.data), // Convert array back to Map
          })),
        }))

        activeLayerId.value = state.activeLayerId
        nextLayerId = state.nextLayerId || 1
        nextShapeId = state.nextShapeId || 1

        return true // Successfully loaded
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error)
    }
    return false // No data or failed to load
  }

  // Clear localStorage
  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(CAMERA_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }

  // Try to load from storage first, otherwise create default layer
  if (!loadFromStorage()) {
    ensureDefaultLayer()
  }

  const getActiveLayer = (): Layer | null => {
    return layers.value.find((layer) => layer.id === activeLayerId.value) || null
  }

  const addLayer = (name?: string): Layer => {
    const layer: Layer = {
      id: `layer-${nextLayerId++}`,
      name: name || `Layer ${nextLayerId - 1}`,
      visible: true,
      shapes: [],
      order: layers.value.length + 1,
    }
    layers.value.push(layer)
    saveToStorage() // Auto-save when layer is added
    return layer
  }

  const deleteLayer = (layerId: string) => {
    if (layers.value.length <= 1) return // Don't delete the last layer

    const index = layers.value.findIndex((layer) => layer.id === layerId)
    if (index !== -1) {
      layers.value.splice(index, 1)

      // If we deleted the active layer, set a new active layer
      if (activeLayerId.value === layerId) {
        activeLayerId.value =
          layers.value[Math.max(0, index - 1)]?.id || layers.value[0]?.id || null
      }
      saveToStorage() // Auto-save when layer is deleted
    }
  }

  const setActiveLayer = (layerId: string) => {
    if (layers.value.find((layer) => layer.id === layerId)) {
      activeLayerId.value = layerId
      saveToStorage() // Auto-save when active layer changes
    }
  }

  const toggleLayerVisibility = (layerId: string) => {
    const layer = layers.value.find((layer) => layer.id === layerId)
    if (layer) {
      layer.visible = !layer.visible
      saveToStorage() // Auto-save when layer visibility changes
    }
  }

  const addShape = (
    type: Shape['type'],
    data: Map<string, string>,
    color: string,
    name?: string,
    toolSettings?: Shape['toolSettings']
  ): Shape => {
    const activeLayer = getActiveLayer()
    if (!activeLayer) return null as any

    const shape: Shape = {
      id: `shape-${nextShapeId++}`,
      type,
      data: new Map(data), // Create a copy of the data
      color,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${nextShapeId - 1}`,
      timestamp: Date.now(),
      toolSettings
    }

    activeLayer.shapes.push(shape)
    saveToStorage() // Auto-save when shape is added
    return shape
  }

  const deleteShape = (layerId: string, shapeId: string) => {
    const layer = layers.value.find((layer) => layer.id === layerId)
    if (layer) {
      const index = layer.shapes.findIndex((shape) => shape.id === shapeId)
      if (index !== -1) {
        layer.shapes.splice(index, 1)
        saveToStorage() // Auto-save when shape is deleted
      }
    }
  }

  const getAllVisibleShapes = (): Shape[] => {
    return layers.value
      .filter((layer) => layer.visible)
      .sort((a, b) => a.order - b.order)
      .flatMap((layer) => layer.shapes)
  }

  const renameLayer = (layerId: string, newName: string) => {
    const layer = layers.value.find((layer) => layer.id === layerId)
    if (layer) {
      layer.name = newName
      saveToStorage() // Auto-save when layer is renamed
    }
  }

  const selectShape = (shapeId: string | null) => {
    selectedShapeId.value = shapeId
  }

  const getSelectedShape = (): Shape | null => {
    for (const layer of layers.value) {
      const shape = layer.shapes.find((shape) => shape.id === selectedShapeId.value)
      if (shape) return shape
    }
    return null
  }

  const getShapeAtPosition = (gridX: number, gridY: number): Shape | null => {
    const key = `${gridX},${gridY}`

    // Check layers in reverse order (top to bottom)
    const visibleLayers = layers.value
      .filter((layer) => layer.visible)
      .sort((a, b) => b.order - a.order)

    for (const layer of visibleLayers) {
      // Check shapes in reverse order (newest first)
      for (let i = layer.shapes.length - 1; i >= 0; i--) {
        const shape = layer.shapes[i]
        if (shape.data.has(key)) {
          const char = shape.data.get(key)
          if (char && char !== '') {
            return shape
          }
        }
      }
    }
    return null
  }

  // Clean up any shapes that have become empty (no characters left)
  const cleanupEmptyShapes = () => {
    for (const layer of layers.value) {
      layer.shapes = layer.shapes.filter((shape) => shape.data.size > 0)
    }
    saveToStorage()
  }

  // Update shape color
  const updateShapeColor = (shapeId: string, newColor: string) => {
    for (const layer of layers.value) {
      const shape = layer.shapes.find((s) => s.id === shapeId)
      if (shape) {
        shape.color = newColor
        saveToStorage()
        // Trigger render if available
        if (window.renderCanvas) window.renderCanvas()
        return true
      }
    }
    return false
  }

  // Update shape name
  const updateShapeName = (shapeId: string, newName: string) => {
    for (const layer of layers.value) {
      const shape = layer.shapes.find((s) => s.id === shapeId)
      if (shape) {
        shape.name = newName
        saveToStorage()
        return true
      }
    }
    return false
  }

  // Update shape tool settings
  const updateShapeSettings = (shapeId: string, settings: Shape['toolSettings']) => {
    for (const layer of layers.value) {
      const shape = layer.shapes.find((s) => s.id === shapeId)
      if (shape) {
        shape.toolSettings = { ...shape.toolSettings, ...settings }
        saveToStorage()
        
        // For rectangles and lines, regenerate the shape data when settings change
        if ((shape.type === 'rectangle' || shape.type === 'line') && window.regenerateShape) {
          window.regenerateShape(shapeId)
        } else if (window.renderCanvas) {
          // For other shapes, just re-render
          window.renderCanvas()
        }
        return true
      }
    }
    return false
  }

  // Reorder layers
  const reorderLayers = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    
    const [movedLayer] = layers.value.splice(fromIndex, 1)
    layers.value.splice(toIndex, 0, movedLayer)
    
    // Update order property for all layers
    layers.value.forEach((layer, index) => {
      layer.order = index + 1
    })
    
    saveToStorage()
  }
  
  // Reorder shapes within a layer
  const reorderShapes = (layerId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    
    const layer = layers.value.find(l => l.id === layerId)
    if (!layer) return
    
    const [movedShape] = layer.shapes.splice(fromIndex, 1)
    layer.shapes.splice(toIndex, 0, movedShape)
    
    saveToStorage()
  }
  
  // Move layer up in order (towards front)
  const moveLayerUp = (layerId: string) => {
    const index = layers.value.findIndex(l => l.id === layerId)
    if (index > 0) {
      reorderLayers(index, index - 1)
    }
  }
  
  // Move layer down in order (towards back)
  const moveLayerDown = (layerId: string) => {
    const index = layers.value.findIndex(l => l.id === layerId)
    if (index < layers.value.length - 1) {
      reorderLayers(index, index + 1)
    }
  }
  
  // Move shape up within its layer (towards front)
  const moveShapeUp = (layerId: string, shapeId: string) => {
    const layer = layers.value.find(l => l.id === layerId)
    if (!layer) return
    
    const index = layer.shapes.findIndex(s => s.id === shapeId)
    if (index > 0) {
      reorderShapes(layerId, index, index - 1)
    }
  }
  
  // Move shape down within its layer (towards back)
  const moveShapeDown = (layerId: string, shapeId: string) => {
    const layer = layers.value.find(l => l.id === layerId)
    if (!layer) return
    
    const index = layer.shapes.findIndex(s => s.id === shapeId)
    if (index < layer.shapes.length - 1) {
      reorderShapes(layerId, index, index + 1)
    }
  }

  // Reset to initial state with MONOBLOCK art
  const resetToDefault = () => {
    // Clear all layers
    layers.value = []
    activeLayerId.value = null
    selectedShapeId.value = null
    nextLayerId = 1
    nextShapeId = 1

    // Create default layer with ASCII art
    createDefaultLayer(true)
    saveToStorage()
  }

  return {
    layers,
    activeLayerId,
    selectedShapeId,
    getActiveLayer,
    addLayer,
    deleteLayer,
    setActiveLayer,
    toggleLayerVisibility,
    addShape,
    deleteShape,
    getAllVisibleShapes,
    renameLayer,
    selectShape,
    getSelectedShape,
    getShapeAtPosition,
    saveToStorage,
    loadFromStorage,
    clearStorage,
    cleanupEmptyShapes,
    updateShapeColor,
    updateShapeName,
    updateShapeSettings,
    reorderLayers,
    reorderShapes,
    moveLayerUp,
    moveLayerDown,
    moveShapeUp,
    moveShapeDown,
    resetToDefault,
  }
})
