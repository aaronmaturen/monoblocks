import { ref, reactive, watch, readonly } from 'vue'
import { defineStore } from 'pinia'
import { shapeRegistry } from '@/shapes/registry'
import type { ShapeData } from '@/shapes/types'

// Enhanced shape interface for the new architecture
export interface Shape extends ShapeData {
  id: string
  type: string
  data: Map<string, string>
  color: string // Legacy/primary color for backward compatibility
  borderColor?: string // Separate border color
  fillColor?: string // Separate fill color
  textColor?: string // Separate text color
  name: string
  zOrder: number // Replace layer-based ordering with z-order
  visible: boolean
  locked: boolean
  selected: boolean
  timestamp: number
  toolSettings?: Record<string, any>
  toolColors?: Record<string, any>
  groupId?: string // Optional grouping
}

// Group interface for organizing shapes
export interface ShapeGroup {
  id: string
  name: string
  visible: boolean
  expanded: boolean
  order: number
}

// Event types for the event system
export type ShapeEvent = 
  | { type: 'shape:added'; shape: Shape }
  | { type: 'shape:removed'; shapeId: string }
  | { type: 'shape:updated'; shape: Shape; changes: Partial<Shape> }
  | { type: 'shape:reordered'; shapes: Shape[] }
  | { type: 'shape:selected'; shapeIds: string[] }
  | { type: 'shape:cleared' }
  | { type: 'group:created'; group: ShapeGroup }
  | { type: 'group:removed'; groupId: string }
  | { type: 'group:updated'; group: ShapeGroup }
  | { type: 'render:required' }
  | { type: 'selection:changed'; selectedIds: string[] }

export type ShapeEventListener = (event: ShapeEvent) => void

export const useShapesStore = defineStore('shapes', () => {
  // Core state
  const shapes = ref<Shape[]>([])
  const groups = ref<ShapeGroup[]>([])
  const selectedShapeIds = ref<Set<string>>(new Set())
  
  // Event system
  const eventListeners = ref<ShapeEventListener[]>([])
  
  // ID generators
  let nextShapeId = 1
  let nextGroupId = 1
  
  // Shape type counters for naming
  const shapeTypeCounters = reactive<Record<string, number>>({
    rectangle: 1,
    diamond: 1,
    line: 1,
    text: 1,
    pencil: 1,
  })
  
  // Event system
  const addEventListener = (listener: ShapeEventListener) => {
    eventListeners.value.push(listener)
    // Return unsubscribe function
    return () => {
      const index = eventListeners.value.indexOf(listener)
      if (index > -1) {
        eventListeners.value.splice(index, 1)
      }
    }
  }
  
  const emit = (event: ShapeEvent) => {
    // Emit to all listeners
    eventListeners.value.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in shape event listener:', error)
      }
    })
  }
  
  // Auto-save to localStorage
  const STORAGE_KEY = 'ascii-editor-shapes'
  
  const saveToStorage = () => {
    try {
      const state = {
        shapes: shapes.value.map(shape => ({
          ...shape,
          data: Array.from(shape.data.entries()), // Convert Map to array for JSON
          selected: false // Don't persist selection state
        })),
        groups: groups.value,
        nextShapeId,
        nextGroupId,
        shapeTypeCounters: { ...shapeTypeCounters }, // Save shape type counters
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save shapes to localStorage:', error)
    }
  }
  
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const state = JSON.parse(stored)
        
        shapes.value = (state.shapes || []).map((shape: any) => ({
          ...shape,
          data: new Map(shape.data), // Convert array back to Map
          selected: false // Reset selection state
        }))
        
        groups.value = state.groups || []
        nextShapeId = state.nextShapeId || 1
        nextGroupId = state.nextGroupId || 1
        
        // Restore shape type counters
        if (state.shapeTypeCounters) {
          Object.assign(shapeTypeCounters, state.shapeTypeCounters)
        }
        
        return true
      }
    } catch (error) {
      console.warn('Failed to load shapes from localStorage:', error)
    }
    return false
  }
  
  // Core shape operations
  const addShape = (
    type: string,
    data: Map<string, string>,
    color: string,
    name?: string,
    toolSettings?: Record<string, any>,
    colors?: { borderColor?: string; fillColor?: string; textColor?: string }
  ): Shape => {
    // Get and increment the counter for this shape type
    if (!shapeTypeCounters[type]) {
      shapeTypeCounters[type] = 1
    }
    const typeCounter = shapeTypeCounters[type]++
    
    const shape: Shape = {
      id: `shape-${nextShapeId++}`,
      type,
      data: new Map(data), // Copy the data
      color,
      borderColor: colors?.borderColor || color,
      fillColor: colors?.fillColor || color,
      textColor: colors?.textColor || color,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${typeCounter}`,
      zOrder: getNextZOrder(),
      visible: true,
      locked: false,
      selected: false,
      timestamp: Date.now(),
      toolSettings: toolSettings ? { ...toolSettings } : undefined,
      layerId: 'default', // For compatibility
    }
    
    shapes.value.push(shape)
    saveToStorage()
    
    emit({ type: 'shape:added', shape })
    emit({ type: 'render:required' })
    
    return shape
  }
  
  const removeShape = (shapeId: string) => {
    const index = shapes.value.findIndex(s => s.id === shapeId)
    if (index === -1) return false
    
    shapes.value.splice(index, 1)
    selectedShapeIds.value.delete(shapeId)
    saveToStorage()
    
    emit({ type: 'shape:removed', shapeId })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const updateShape = (shapeId: string, changes: Partial<Shape>) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    // Apply changes
    Object.assign(shape, changes)
    
    // Special handling for data changes (ensure it's a Map)
    if (changes.data && !(changes.data instanceof Map)) {
      shape.data = new Map(changes.data as any)
    }
    
    saveToStorage()
    
    emit({ type: 'shape:updated', shape, changes })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const getShape = (shapeId: string): Shape | undefined => {
    return shapes.value.find(s => s.id === shapeId)
  }
  
  const getAllShapes = (): Shape[] => {
    return [...shapes.value] // Return copy to prevent external mutations
  }
  
  const getVisibleShapes = (): Shape[] => {
    return shapes.value
      .filter(shape => {
        // Check shape visibility
        if (!shape.visible) return false
        
        // Check group visibility if shape is in a group
        if (shape.groupId) {
          const group = groups.value.find(g => g.id === shape.groupId)
          if (group && !group.visible) return false
        }
        
        return true
      })
      .sort((a, b) => a.zOrder - b.zOrder) // Sort by z-order
  }
  
  const getNextZOrder = (): number => {
    if (shapes.value.length === 0) return 0
    return Math.max(...shapes.value.map(s => s.zOrder)) + 1
  }
  
  // Z-order management
  const moveToFront = (shapeId: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    shape.zOrder = getNextZOrder()
    saveToStorage()
    
    emit({ type: 'shape:reordered', shapes: [...shapes.value] })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const moveToBack = (shapeId: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    const minZOrder = Math.min(...shapes.value.map(s => s.zOrder))
    shape.zOrder = minZOrder - 1
    saveToStorage()
    
    emit({ type: 'shape:reordered', shapes: [...shapes.value] })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const moveForward = (shapeId: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    const sortedShapes = [...shapes.value].sort((a, b) => a.zOrder - b.zOrder)
    const currentIndex = sortedShapes.findIndex(s => s.id === shapeId)
    
    if (currentIndex < sortedShapes.length - 1) {
      const nextShape = sortedShapes[currentIndex + 1]
      const tempZOrder = shape.zOrder
      shape.zOrder = nextShape.zOrder
      nextShape.zOrder = tempZOrder
      
      saveToStorage()
      
      emit({ type: 'shape:reordered', shapes: [...shapes.value] })
      emit({ type: 'render:required' })
      
      return true
    }
    
    return false
  }
  
  const moveBackward = (shapeId: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    const sortedShapes = [...shapes.value].sort((a, b) => a.zOrder - b.zOrder)
    const currentIndex = sortedShapes.findIndex(s => s.id === shapeId)
    
    if (currentIndex > 0) {
      const prevShape = sortedShapes[currentIndex - 1]
      const tempZOrder = shape.zOrder
      shape.zOrder = prevShape.zOrder
      prevShape.zOrder = tempZOrder
      
      saveToStorage()
      
      emit({ type: 'shape:reordered', shapes: [...shapes.value] })
      emit({ type: 'render:required' })
      
      return true
    }
    
    return false
  }
  
  // Selection management
  const selectShape = (shapeId: string | null, addToSelection = false) => {
    if (!shapeId) return
    
    if (!addToSelection) {
      // Clear current selection
      shapes.value.forEach(shape => shape.selected = false)
      selectedShapeIds.value.clear()
    }
    
    const shape = shapes.value.find(s => s.id === shapeId)
    if (shape) {
      shape.selected = true
      selectedShapeIds.value.add(shapeId)
    }
    
    emit({ type: 'shape:selected', shapeIds: Array.from(selectedShapeIds.value) })
    emit({ type: 'render:required' })
  }
  
  const deselectShape = (shapeId: string | null) => {
    if (!shapeId) return
    
    const shape = shapes.value.find(s => s.id === shapeId)
    if (shape) {
      shape.selected = false
      selectedShapeIds.value.delete(shapeId)
    }
    
    emit({ type: 'shape:selected', shapeIds: Array.from(selectedShapeIds.value) })
    emit({ type: 'render:required' })
  }
  
  const clearSelection = () => {
    shapes.value.forEach(shape => shape.selected = false)
    selectedShapeIds.value.clear()
    
    emit({ type: 'shape:selected', shapeIds: [] })
    emit({ type: 'render:required' })
  }
  
  const getSelectedShapes = (): Shape[] => {
    return shapes.value.filter(shape => shape.selected)
  }
  
  const getSelectedShape = (): Shape | null => {
    if (selectedShapeIds.value.size === 1) {
      const shapeId = Array.from(selectedShapeIds.value)[0]
      return shapes.value.find(s => s.id === shapeId) || null
    }
    return null
  }
  
  const getAllVisibleShapes = (): Shape[] => {
    return shapes.value.filter(shape => shape.visible !== false)
  }
  
  const isShapeSelected = (shapeId: string): boolean => {
    return selectedShapeIds.value.has(shapeId)
  }
  
  // Group management
  const createGroup = (name: string, shapeIds: string[]): ShapeGroup => {
    const group: ShapeGroup = {
      id: `group-${nextGroupId++}`,
      name,
      visible: true,
      expanded: true,
      order: groups.value.length
    }
    
    groups.value.push(group)
    
    // Assign shapes to group
    shapeIds.forEach(shapeId => {
      const shape = shapes.value.find(s => s.id === shapeId)
      if (shape) {
        shape.groupId = group.id
      }
    })
    
    saveToStorage()
    
    emit({ type: 'group:created', group })
    emit({ type: 'render:required' })
    
    return group
  }
  
  const removeGroup = (groupId: string) => {
    const index = groups.value.findIndex(g => g.id === groupId)
    if (index === -1) return false
    
    // Remove group assignment from shapes
    shapes.value.forEach(shape => {
      if (shape.groupId === groupId) {
        delete shape.groupId
      }
    })
    
    groups.value.splice(index, 1)
    saveToStorage()
    
    emit({ type: 'group:removed', groupId })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const updateGroup = (groupId: string, changes: Partial<ShapeGroup>) => {
    const group = groups.value.find(g => g.id === groupId)
    if (!group) return false
    
    Object.assign(group, changes)
    saveToStorage()
    
    emit({ type: 'group:updated', group })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const getShapesInGroup = (groupId: string): Shape[] => {
    return shapes.value.filter(shape => shape.groupId === groupId)
  }
  
  const getUngroupedShapes = (): Shape[] => {
    return shapes.value.filter(shape => !shape.groupId)
  }
  
  // Utility functions
  const getShapeAtPosition = (gridX: number, gridY: number): Shape | null => {
    const key = `${gridX},${gridY}`
    
    // Check shapes in reverse z-order (top to bottom)
    const visibleShapes = getVisibleShapes().reverse()
    
    for (const shape of visibleShapes) {
      if (shape.data.has(key)) {
        const char = shape.data.get(key)
        if (char && char !== '') {
          return shape
        }
      }
    }
    
    return null
  }
  
  const regenerateShape = (shapeId: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    const shapeDefinition = shapeRegistry.get(shape.type)
    if (!shapeDefinition || !shapeDefinition.regenerate) return false
    
    try {
      const newData = shapeDefinition.regenerate(shape, shape.toolSettings || {})
      shape.data = newData
      
      saveToStorage()
      
      emit({ type: 'shape:updated', shape, changes: { data: newData } })
      emit({ type: 'render:required' })
      
      return true
    } catch (error) {
      console.error('Failed to regenerate shape:', error)
      return false
    }
  }
  
  // Shape property update methods
  const updateShapeColor = (shapeId: string, color: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    const oldColor = shape.color
    shape.color = color
    // Also update specific colors if they match the old color (for backward compatibility)
    if (shape.borderColor === oldColor) shape.borderColor = color
    if (shape.fillColor === oldColor) shape.fillColor = color
    if (shape.textColor === oldColor) shape.textColor = color
    
    saveToStorage()
    
    emit({ type: 'shape:updated', shape, changes: { color } })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const updateShapeBorderColor = (shapeId: string, color: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    shape.borderColor = color
    saveToStorage()
    
    emit({ type: 'shape:updated', shape, changes: { borderColor: color } })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const updateShapeFillColor = (shapeId: string, color: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    shape.fillColor = color
    saveToStorage()
    
    emit({ type: 'shape:updated', shape, changes: { fillColor: color } })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const updateShapeTextColor = (shapeId: string, color: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    shape.textColor = color
    saveToStorage()
    
    emit({ type: 'shape:updated', shape, changes: { textColor: color } })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const updateShapeName = (shapeId: string, name: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    const oldName = shape.name
    shape.name = name
    
    saveToStorage()
    
    emit({ type: 'shape:updated', shape, changes: { name } })
    emit({ type: 'render:required' })
    
    return true
  }
  
  const updateShapeSettings = (shapeId: string, settings: Record<string, any>) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    shape.toolSettings = { ...shape.toolSettings, ...settings }
    
    saveToStorage()
    
    emit({ type: 'shape:updated', shape, changes: { toolSettings: shape.toolSettings } })
    emit({ type: 'render:required' })
    
    return true
  }
  
  // Undo/Redo operations (placeholders for now)
  const performUndo = () => {
    console.log('Undo operation not implemented yet')
    return false
  }
  
  const performRedo = () => {
    console.log('Redo operation not implemented yet')
    return false
  }
  
  // Alias for removeShape for compatibility
  const deleteShape = (shapeId: string) => {
    return removeShape(shapeId)
  }

  // Duplicate a shape
  const duplicateShape = (shapeId: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return null
    
    // Create a new shape with the same data but offset by 2 grid cells
    const newData = new Map<string, string>()
    for (const [key, value] of shape.data) {
      const [x, y] = key.split(',').map(Number)
      newData.set(`${x + 2},${y + 2}`, value)
    }
    
    // Don't pass a name - let addShape generate a new one with the proper counter
    const newShape = addShape(
      shape.type,
      newData,
      shape.color,
      undefined, // Let addShape generate the name
      { ...shape.toolSettings },
      {
        borderColor: shape.borderColor,
        fillColor: shape.fillColor,
        textColor: shape.textColor
      }
    )
    
    return newShape
  }

  // Bring shape to front (highest z-order)
  const bringToFront = (shapeId: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    const maxZOrder = Math.max(...shapes.value.map(s => s.zOrder))
    shape.zOrder = maxZOrder + 1
    
    saveToStorage()
    emit({ type: 'shape:updated', shape, changes: { zOrder: shape.zOrder } })
    emit({ type: 'render:required' })
    
    return true
  }

  // Send shape to back (lowest z-order)
  const sendToBack = (shapeId: string) => {
    const shape = shapes.value.find(s => s.id === shapeId)
    if (!shape) return false
    
    const minZOrder = Math.min(...shapes.value.map(s => s.zOrder))
    shape.zOrder = minZOrder - 1
    
    // Normalize z-orders to prevent negative values
    const sortedShapes = shapes.value.sort((a, b) => a.zOrder - b.zOrder)
    sortedShapes.forEach((s, index) => {
      s.zOrder = index + 1
    })
    
    saveToStorage()
    emit({ type: 'shape:updated', shape, changes: { zOrder: shape.zOrder } })
    emit({ type: 'render:required' })
    
    return true
  }

  // Select all shapes
  const selectAll = () => {
    selectedShapeIds.value.clear()
    shapes.value.forEach(shape => {
      selectedShapeIds.value.add(shape.id)
    })
    
    emit({ type: 'selection:changed', selectedIds: Array.from(selectedShapeIds.value) })
    emit({ type: 'render:required' })
  }

  const clearAllShapes = () => {
    console.log('[ShapesStore] clearAllShapes called, current shapes:', shapes.value.length)
    shapes.value = []
    groups.value = []
    selectedShapeIds.value.clear()
    
    // Reset ID counters so shapes start from 1 again
    nextShapeId = 1
    nextGroupId = 1
    
    // Reset shape type counters
    Object.keys(shapeTypeCounters).forEach(key => {
      shapeTypeCounters[key] = 1
    })
    
    saveToStorage()
    
    emit({ type: 'shape:cleared' })
    emit({ type: 'render:required' })
    console.log('[ShapesStore] Shapes cleared, emitted events')
  }
  
  // Initialize from storage
  loadFromStorage()
  
  // Auto-save when shapes change
  watch(shapes, saveToStorage, { deep: true })
  watch(groups, saveToStorage, { deep: true })
  
  return {
    // State
    shapes: readonly(shapes),
    groups: readonly(groups),
    selectedShapeIds: readonly(selectedShapeIds),
    
    // Event system
    addEventListener,
    emit,
    
    // Shape operations
    addShape,
    removeShape,
    deleteShape,
    duplicateShape,
    updateShape,
    updateShapeColor,
    updateShapeBorderColor,
    updateShapeFillColor,
    updateShapeTextColor,
    updateShapeName,
    updateShapeSettings,
    getShape,
    getAllShapes,
    getVisibleShapes,
    bringToFront,
    sendToBack,
    selectAll,
    
    // Z-order management
    moveToFront,
    moveToBack,
    moveForward,
    moveBackward,
    
    // Selection
    selectShape,
    deselectShape,
    clearSelection,
    getSelectedShapes,
    getSelectedShape,
    getAllVisibleShapes,
    isShapeSelected,
    
    // Groups
    createGroup,
    removeGroup,
    updateGroup,
    getShapesInGroup,
    getUngroupedShapes,
    
    // Undo/Redo
    performUndo,
    performRedo,
    
    // Utilities
    getShapeAtPosition,
    regenerateShape,
    clearAllShapes,
    
    // Storage
    saveToStorage,
    loadFromStorage,
  }
})