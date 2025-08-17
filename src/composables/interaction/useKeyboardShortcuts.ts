import { useHistoryStore } from '../../stores/history'
import { useShapesStore } from '../../stores/shapes'
import { useToastStore } from '../../stores/toast'

export interface KeyboardShortcutCallbacks {
  onUndo?: () => void
  onRedo?: () => void
  onRender?: () => void
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks = {}) {
  const historyStore = useHistoryStore()
  const shapesStore = useShapesStore()
  const toastStore = useToastStore()

  const checkIsTypingInInput = (): boolean => {
    const activeElement = document.activeElement
    return !!(activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.tagName === 'SELECT' ||
      activeElement.getAttribute('contenteditable') === 'true'
    ))
  }

  const performUndo = () => {
    const success = shapesStore.performUndo()
    if (success) {
      callbacks.onRender?.()
      toastStore.showToast('Undone', 'info')
    } else {
      toastStore.showToast('Nothing to undo', 'warning')
    }
  }

  const performRedo = () => {
    const success = shapesStore.performRedo()
    if (success) {
      callbacks.onRender?.()
      toastStore.showToast('Redone', 'info')
    } else {
      toastStore.showToast('Nothing to redo', 'warning')
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    // Check if the user is typing in an input field
    const isTypingInInput = checkIsTypingInInput()
    
    // Don't handle keyboard shortcuts when typing in input fields
    if (isTypingInInput) {
      return
    }

    // Handle keyboard shortcuts
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault()
      performUndo()
      callbacks.onUndo?.()
    } else if (e.ctrlKey && e.key === 'y') {
      e.preventDefault()
      performRedo()
      callbacks.onRedo?.()
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      // Select all visible shapes
      const visibleShapes = shapesStore.getAllVisibleShapes()
      if (visibleShapes.length > 0) {
        // Clear current selection
        shapesStore.selectShape(null)
        // Select all visible shapes
        for (const shape of visibleShapes) {
          shapesStore.selectShape(shape.id, true) // true for multi-select
        }
        callbacks.onRender?.()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      // Deselect all shapes on Escape key
      shapesStore.selectShape(null)
      callbacks.onRender?.()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      // Delete selected shapes
      const selectedShapes = shapesStore.getSelectedShapes()
      if (selectedShapes.length > 0) {
        let deletedCount = 0
        for (const shape of selectedShapes) {
          shapesStore.deleteShape(shape.id)
          deletedCount++
        }
        
        // Clear selection since all selected shapes were deleted
        shapesStore.selectShape(null)
        
        // shapesStore handles saving automatically
        
        // Force re-render
        callbacks.onRender?.()
        
        // Show confirmation
        const message = deletedCount === 1 ? 'Shape deleted' : `${deletedCount} shapes deleted`
        toastStore.showToast(message, 'success')
      }
    }
  }

  const setupKeyboardListeners = () => {
    window.addEventListener('keydown', handleKeyDown)
  }

  const removeKeyboardListeners = () => {
    window.removeEventListener('keydown', handleKeyDown)
  }

  return {
    // Functions
    handleKeyDown,
    performUndo,
    performRedo,
    checkIsTypingInInput,
    setupKeyboardListeners,
    removeKeyboardListeners,
  }
}