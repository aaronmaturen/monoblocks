import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'

// Define types locally to avoid circular imports
interface Shape {
  id: string
  type: 'pencil' | 'rectangle' | 'text' | 'line'
  data: Map<string, string>
  color: string
  name: string
  timestamp: number
  groupId?: string
  order?: number
  visible?: boolean
  toolSettings?: any
}

interface Group {
  id: string
  name: string
  visible: boolean
  order: number
  expanded?: boolean
}

interface CanvasState {
  shapes: Shape[]
  groups: Group[]
  selectedShapeId: string | null
  selectedShapeIds: Set<string>
}

export const useHistoryStore = defineStore('history', () => {
  const undoStack = ref<CanvasState[]>([])
  const redoStack = ref<CanvasState[]>([])
  const maxHistorySize = 50

  const saveState = (
    shapes: Shape[],
    groups: Group[],
    selectedShapeId: string | null,
    selectedShapeIds: Set<string>,
  ) => {
    // Clone the current state
    const stateCopy: CanvasState = {
      shapes: shapes.map((shape) => ({
        ...shape,
        data: new Map(shape.data), // Deep clone the Map
      })),
      groups: groups.map((group) => ({ ...group })),
      selectedShapeId,
      selectedShapeIds: new Set(selectedShapeIds),
    }

    // Add to undo stack
    undoStack.value.push(stateCopy)

    // Clear redo stack when new action is performed
    redoStack.value = []

    // Limit history size
    if (undoStack.value.length > maxHistorySize) {
      undoStack.value.shift()
    }
  }

  const undo = (): CanvasState | null => {
    if (undoStack.value.length === 0) return null

    const previousState = undoStack.value.pop()!
    return previousState
  }

  const redo = (): CanvasState | null => {
    if (redoStack.value.length === 0) return null

    const nextState = redoStack.value.pop()!
    return nextState
  }

  const canUndo = () => undoStack.value.length > 0
  const canRedo = () => redoStack.value.length > 0

  const pushToRedoStack = (state: CanvasState) => {
    const stateCopy: CanvasState = {
      shapes: state.shapes.map((shape) => ({
        ...shape,
        data: new Map(shape.data),
      })),
      groups: state.groups.map((group) => ({ ...group })),
      selectedShapeId: state.selectedShapeId,
      selectedShapeIds: new Set(state.selectedShapeIds),
    }
    redoStack.value.push(stateCopy)
  }

  const clear = () => {
    undoStack.value = []
    redoStack.value = []
  }

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    pushToRedoStack,
    clear,
  }
})
