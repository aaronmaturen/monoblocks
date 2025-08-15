import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'

type GridState = Map<string, string>

export const useHistoryStore = defineStore('history', () => {
  const undoStack = ref<GridState[]>([])
  const redoStack = ref<GridState[]>([])
  const maxHistorySize = 100

  const saveState = (currentState: GridState) => {
    // Clone the current state
    const stateCopy = new Map(currentState)
    
    // Add to undo stack
    undoStack.value.push(stateCopy)
    
    // Clear redo stack when new action is performed
    redoStack.value = []
    
    // Limit history size
    if (undoStack.value.length > maxHistorySize) {
      undoStack.value.shift()
    }
  }

  const undo = (): GridState | null => {
    if (undoStack.value.length === 0) return null
    
    const previousState = undoStack.value.pop()!
    return previousState
  }

  const redo = (): GridState | null => {
    if (redoStack.value.length === 0) return null
    
    const nextState = redoStack.value.pop()!
    return nextState
  }

  const canUndo = () => undoStack.value.length > 0
  const canRedo = () => redoStack.value.length > 0

  const pushToRedoStack = (state: GridState) => {
    redoStack.value.push(new Map(state))
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
    clear
  }
})