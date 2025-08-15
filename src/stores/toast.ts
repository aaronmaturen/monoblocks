import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  duration: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let nextId = 1

  const showToast = (message: string, type: Toast['type'] = 'success', duration = 3000) => {
    const toast: Toast = {
      id: nextId++,
      message,
      type,
      duration
    }
    
    toasts.value.push(toast)
    
    // Auto-remove after duration
    setTimeout(() => {
      removeToast(toast.id)
    }, duration)
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts,
    showToast,
    removeToast
  }
})