import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'

export interface Shape {
  id: string
  type: 'brush' | 'rectangle' | 'text' | 'line'
  data: Map<string, string> // Grid positions and characters
  color: string
  name: string
  timestamp: number
  groupId?: string // Optional group membership
  order: number // Display order
  visible: boolean // Individual visibility
  toolSettings?: {
    // Rectangle-specific settings
    borderStyle?: string
    fillChar?: string
    shadow?: boolean
    text?: string
    textAlign?: string
    textPosition?: string
    textColor?: string
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

export interface Group {
  id: string
  name: string
  visible: boolean
  order: number
  expanded: boolean // For UI display
}

// Legacy Layer interface for migration
export interface Layer {
  id: string
  name: string
  visible: boolean
  shapes: Shape[]
  order: number
}

export const useLayersStore = defineStore('layers', () => {
  // New flat structure
  const shapes = ref<Shape[]>([])
  const groups = ref<Group[]>([])
  
  // Legacy layers for backward compatibility during migration
  const layers = ref<Layer[]>([])
  const activeLayerId = ref<string | null>(null)
  
  // Selection state
  const selectedShapeId = ref<string | null>(null)
  const selectedShapeIds = ref<Set<string>>(new Set())
  
  // ID generators
  let nextLayerId = 1
  let nextShapeId = 1
  let nextGroupId = 1
  
  // History management - temporarily disabled to fix circular dependency
  const saveCurrentState = () => {
    // Temporarily disabled - will be re-enabled with proper architecture
    return
  }

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
        order: 0, // First shape
        visible: true,
        groupId: undefined,
      }
      defaultLayer.shapes.push(artShape)
      // Also add to flat shapes array for new structure
      shapes.value.push(artShape)
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

  // Rebuild layers structure from shapes and groups (for backward compatibility)
  const rebuildLayersFromShapesAndGroups = () => {
    layers.value = []
    
    // Create a default layer if there are ungrouped shapes
    const ungroupedShapes = shapes.value.filter(shape => !shape.groupId)
    if (ungroupedShapes.length > 0 || groups.value.length === 0) {
      const defaultLayer: Layer = {
        id: 'layer-1',
        name: 'Layer 1',
        shapes: ungroupedShapes.map(shape => ({
          id: shape.id,
          type: shape.type,
          data: new Map(shape.data),
          color: shape.color,
          name: shape.name,
          timestamp: shape.timestamp,
          toolSettings: shape.toolSettings,
          order: shape.order,
          visible: shape.visible,
          groupId: shape.groupId
        })),
        visible: true,
        order: 0
      }
      layers.value.push(defaultLayer)
      activeLayerId.value = defaultLayer.id
    }
    
    // Create layers from groups
    groups.value.forEach((group, index) => {
      const groupShapes = shapes.value.filter(shape => shape.groupId === group.id)
      const layer: Layer = {
        id: `layer-${index + 2}`,
        name: group.name,
        shapes: groupShapes.map(shape => ({
          id: shape.id,
          type: shape.type,
          data: new Map(shape.data),
          color: shape.color,
          name: shape.name,
          timestamp: shape.timestamp,
          toolSettings: shape.toolSettings,
          order: shape.order,
          visible: shape.visible,
          groupId: shape.groupId
        })),
        visible: group.visible,
        order: group.order
      }
      layers.value.push(layer)
      
      // Set first layer as active if no active layer yet
      if (!activeLayerId.value) {
        activeLayerId.value = layer.id
      }
    })
    
    // Ensure we have at least one layer
    if (layers.value.length === 0) {
      createDefaultLayer()
    }
  }

  // Save state to localStorage
  const saveToStorage = () => {
    try {
      const state = {
        // New format
        shapes: shapes.value.map((shape) => ({
          ...shape,
          data: Array.from(shape.data.entries()), // Convert Map to array for JSON
        })),
        groups: groups.value,
        nextShapeId,
        nextGroupId,
        // Keep legacy layers for now to maintain compatibility
        layers: layers.value.map((layer) => ({
          ...layer,
          shapes: layer.shapes.map((shape) => ({
            ...shape,
            data: Array.from(shape.data.entries()),
          })),
        })),
        activeLayerId: activeLayerId.value,
        nextLayerId,
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

        // Check if this is the new format (has shapes array at root)
        if (state.shapes && Array.isArray(state.shapes)) {
          // New format - load shapes and groups directly
          shapes.value = state.shapes.map((shape: any) => ({
            ...shape,
            data: new Map(shape.data),
          }))
          groups.value = state.groups || []
          nextShapeId = state.nextShapeId || 1
          nextGroupId = state.nextGroupId || 1
          
          // Rebuild layers from shapes and groups for backward compatibility
          rebuildLayersFromShapesAndGroups()
        } else if (state.layers) {
          // Old format - migrate from layers to shapes/groups
          migrateFromLayers(state)
        }

        return true // Successfully loaded
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error)
    }
    return false // No data or failed to load
  }

  // Migrate from old layer-based structure to new flat structure
  const migrateFromLayers = (state: any) => {
    shapes.value = []
    groups.value = []
    let shapeOrder = 0

    // Convert each layer to a group (if it has shapes)
    state.layers.forEach((layer: any) => {
      if (layer.shapes && layer.shapes.length > 0) {
        // Create a group for this layer
        const groupId = `group-${nextGroupId++}`
        groups.value.push({
          id: groupId,
          name: layer.name,
          visible: layer.visible,
          order: layer.order,
          expanded: true
        })

        // Convert shapes and assign to group
        layer.shapes.forEach((shape: any) => {
          shapes.value.push({
            ...shape,
            data: new Map(shape.data),
            groupId: groupId,
            order: shapeOrder++,
            visible: layer.visible // Inherit layer visibility
          })
        })
      }
    })

    // Maintain backward compatibility - keep layers for now
    layers.value = state.layers.map((layer: any) => ({
      ...layer,
      shapes: layer.shapes.map((shape: any) => ({
        ...shape,
        data: new Map(shape.data),
      })),
    }))

    activeLayerId.value = state.activeLayerId
    nextLayerId = state.nextLayerId || 1
    nextShapeId = state.nextShapeId || 1
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
    // Save current state before adding shape
    saveCurrentState()
    
    // Ensure we have at least one layer
    if (layers.value.length === 0) {
      createDefaultLayer()
    }
    
    // Ensure we have an active layer
    let activeLayer = getActiveLayer()
    if (!activeLayer) {
      // Set the first layer as active if no active layer
      if (layers.value.length > 0) {
        activeLayerId.value = layers.value[0].id
        activeLayer = layers.value[0]
      } else {
        return null as any
      }
    }

    const shape: Shape = {
      id: `shape-${nextShapeId++}`,
      type,
      data: new Map(data), // Create a copy of the data
      color,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${nextShapeId - 1}`,
      timestamp: Date.now(),
      order: shapes.value.length, // Add order for new flat structure
      visible: true, // Default to visible
      groupId: undefined, // No group by default
      toolSettings
    }

    // Add to legacy layer structure for backward compatibility
    activeLayer.shapes.push(shape)
    
    // Add to new flat shapes array
    shapes.value.push(shape)
    
    saveToStorage() // Auto-save when shape is added
    return shape
  }

  const deleteShape = (layerId: string, shapeId: string) => {
    // Save current state before deleting
    saveCurrentState()
    
    // Find the shape to get its group info before deletion
    const shapeToDelete = shapes.value.find(s => s.id === shapeId)
    const groupId = shapeToDelete?.groupId
    
    // Delete from layers structure (for backward compatibility)
    const layer = layers.value.find((layer) => layer.id === layerId)
    if (layer) {
      const index = layer.shapes.findIndex((shape) => shape.id === shapeId)
      if (index !== -1) {
        layer.shapes.splice(index, 1)
      }
    }
    
    // Delete from flat shapes array (primary storage)
    const shapeIndex = shapes.value.findIndex((s) => s.id === shapeId)
    if (shapeIndex !== -1) {
      shapes.value.splice(shapeIndex, 1)
    }
    
    // Clear selection if the deleted shape was selected
    if (selectedShapeId.value === shapeId) {
      selectedShapeId.value = null
    }
    selectedShapeIds.value.delete(shapeId)
    
    // Check if the group is now empty and delete it if so
    if (groupId) {
      const remainingShapesInGroup = shapes.value.filter(s => s.groupId === groupId)
      if (remainingShapesInGroup.length === 0) {
        // Find the group to get its name before deletion
        const groupToDelete = groups.value.find(g => g.id === groupId)
        const groupName = groupToDelete?.name
        
        // Delete the empty group
        const groupIndex = groups.value.findIndex(g => g.id === groupId)
        if (groupIndex !== -1) {
          groups.value.splice(groupIndex, 1)
        }
        
        // Also remove the corresponding layer if it exists
        if (groupName) {
          const layerIndex = layers.value.findIndex(l => l.name === groupName)
          if (layerIndex !== -1) {
            layers.value.splice(layerIndex, 1)
          }
        }
        
        // Rebuild layers structure to ensure consistency
        rebuildLayersFromShapesAndGroups()
      }
    }
    
    saveToStorage() // Auto-save when shape is deleted
  }

  const getAllVisibleShapes = (): Shape[] => {
    // Use the flat shapes array with visibility filtering
    return shapes.value
      .filter((shape) => shape.visible !== false)
      .sort((a, b) => {
        // First sort by group order (if both shapes are in groups)
        if (a.groupId && b.groupId) {
          const groupA = groups.value.find(g => g.id === a.groupId)
          const groupB = groups.value.find(g => g.id === b.groupId)
          if (groupA && groupB && groupA.order !== groupB.order) {
            return groupA.order - groupB.order
          }
        }
        // If one has a group and the other doesn't, group comes after ungrouped
        if (a.groupId && !b.groupId) return 1
        if (!a.groupId && b.groupId) return -1
        
        // Finally sort by shape order within the same context
        return (a.order || 0) - (b.order || 0)
      })
      .map(shape => ({
        id: shape.id,
        type: shape.type,
        data: new Map(shape.data),
        color: shape.color,
        name: shape.name,
        timestamp: shape.timestamp,
        toolSettings: shape.toolSettings,
        order: shape.order,
        visible: shape.visible,
        groupId: shape.groupId
      }))
  }

  const renameLayer = (layerId: string, newName: string) => {
    const layer = layers.value.find((layer) => layer.id === layerId)
    if (layer) {
      layer.name = newName
      saveToStorage() // Auto-save when layer is renamed
    }
  }

  const selectShape = (shapeId: string | null, multiSelect: boolean = false) => {
    if (!multiSelect) {
      // Single select - clear all and select one
      selectedShapeIds.value.clear()
      selectedShapeId.value = shapeId
      if (shapeId) {
        selectedShapeIds.value.add(shapeId)
      }
    } else if (shapeId) {
      // Multi-select - toggle selection
      if (selectedShapeIds.value.has(shapeId)) {
        selectedShapeIds.value.delete(shapeId)
        // Update primary selection
        if (selectedShapeId.value === shapeId) {
          const remaining = Array.from(selectedShapeIds.value)
          selectedShapeId.value = remaining.length > 0 ? remaining[0] : null
        }
      } else {
        selectedShapeIds.value.add(shapeId)
        // Set as primary if no primary selection
        if (!selectedShapeId.value) {
          selectedShapeId.value = shapeId
        }
      }
    }
  }

  const getSelectedShape = (): Shape | null => {
    for (const layer of layers.value) {
      const shape = layer.shapes.find((shape) => shape.id === selectedShapeId.value)
      if (shape) return shape
    }
    return null
  }

  const getSelectedShapes = (): Shape[] => {
    const shapes: Shape[] = []
    for (const layer of layers.value) {
      for (const shape of layer.shapes) {
        if (selectedShapeIds.value.has(shape.id)) {
          shapes.push(shape)
        }
      }
    }
    return shapes
  }

  const isShapeSelected = (shapeId: string): boolean => {
    return selectedShapeIds.value.has(shapeId)
  }

  const clearSelection = () => {
    selectedShapeId.value = null
    selectedShapeIds.value.clear()
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
    // Clear all layers and shapes
    layers.value = []
    shapes.value = []
    groups.value = []
    activeLayerId.value = null
    selectedShapeId.value = null
    selectedShapeIds.value.clear()
    nextLayerId = 1
    nextShapeId = 1
    nextGroupId = 1

    // Create default layer with ASCII art
    createDefaultLayer(true)
    saveToStorage()
  }

  // Group selected shapes
  const groupShapes = (name?: string): Group | null => {
    const selectedShapesList = Array.from(selectedShapeIds.value)
    if (selectedShapesList.length < 2) return null // Need at least 2 shapes to group

    const groupId = `group-${nextGroupId++}`
    const group: Group = {
      id: groupId,
      name: name || `Group ${nextGroupId - 1}`,
      visible: true,
      order: groups.value.length,
      expanded: true
    }
    
    groups.value.push(group)
    
    // Update shapes to belong to this group
    shapes.value.forEach(shape => {
      if (selectedShapesList.includes(shape.id)) {
        shape.groupId = groupId
      }
    })
    
    // Also update shapes in legacy layers structure for compatibility
    layers.value.forEach(layer => {
      layer.shapes.forEach(shape => {
        if (selectedShapesList.includes(shape.id)) {
          (shape as any).groupId = groupId
        }
      })
    })
    
    saveToStorage()
    return group
  }

  // Ungroup shapes in selected group
  const ungroupShapes = (groupId: string) => {
    // Remove group assignment from shapes
    shapes.value.forEach(shape => {
      if (shape.groupId === groupId) {
        delete shape.groupId
      }
    })
    
    // Also update shapes in legacy layers structure
    layers.value.forEach(layer => {
      layer.shapes.forEach(shape => {
        if ((shape as any).groupId === groupId) {
          delete (shape as any).groupId
        }
      })
    })
    
    // Remove the group
    const index = groups.value.findIndex(g => g.id === groupId)
    if (index !== -1) {
      groups.value.splice(index, 1)
    }
    
    saveToStorage()
  }

  // Get shapes in a group
  const getShapesInGroup = (groupId: string): Shape[] => {
    return shapes.value.filter(shape => shape.groupId === groupId)
  }

  // Get ungrouped shapes
  const getUngroupedShapes = (): Shape[] => {
    return shapes.value.filter(shape => !shape.groupId)
  }

  // Toggle group visibility
  const toggleGroupVisibility = (groupId: string) => {
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      group.visible = !group.visible
      // Update visibility of shapes in the group
      shapes.value.forEach(shape => {
        if (shape.groupId === groupId) {
          shape.visible = group.visible
        }
      })
      saveToStorage()
    }
  }

  // Toggle group expansion in UI
  const toggleGroupExpanded = (groupId: string) => {
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      group.expanded = !group.expanded
      saveToStorage()
    }
  }

  return {
    // New flat structure
    shapes,
    groups,
    // Legacy layers for compatibility
    layers,
    activeLayerId,
    selectedShapeId,
    selectedShapeIds,
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
    getSelectedShapes,
    isShapeSelected,
    clearSelection,
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
    // Group functions
    groupShapes,
    ungroupShapes,
    getShapesInGroup,
    getUngroupedShapes,
    toggleGroupVisibility,
    deleteGroup: (groupId: string) => {
      // Save current state before deleting
      saveCurrentState()
      
      // Delete all shapes in the group
      shapes.value = shapes.value.filter(shape => shape.groupId !== groupId)
      
      // Delete from layers structure too
      for (const layer of layers.value) {
        layer.shapes = layer.shapes.filter(shape => 
          !shapes.value.some(s => s.id === shape.id && s.groupId === groupId)
        )
      }
      
      // Remove the group
      const index = groups.value.findIndex(g => g.id === groupId)
      if (index !== -1) {
        groups.value.splice(index, 1)
      }
      
      saveToStorage()
    },
    
    // Undo/Redo functions - temporarily simplified
    performUndo: () => {
      // Temporarily disabled - will be re-enabled with proper architecture
      return false
    },
    
    performRedo: () => {
      // Temporarily disabled - will be re-enabled with proper architecture
      return false
    },
    
    canUndo: () => false,
    canRedo: () => false,
    toggleGroupExpanded,
  }
})
