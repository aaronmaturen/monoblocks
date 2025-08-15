<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <i :class="['fa-thumbprint', 'fa-light', getIconClass(toast.type)]"></i>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore, type Toast } from '@/stores/toast'

const toastStore = useToastStore()

const getIconClass = (type: Toast['type']) => {
  switch (type) {
    case 'success':
      return 'fa-thumbs-up'
    case 'error':
      return 'fa-thumbs-down'
    case 'info':
      return 'fa-thumbtack'
    default:
      return 'fa-thumbtack'
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: var(--shadow-medium);
  backdrop-filter: var(--backdrop-blur);
  font-size: 14px;
  font-weight: 500;
  min-width: 200px;
  max-width: 400px;
  pointer-events: auto;
}

.toast i {
  font-size: 18px;
}

.toast-success {
  border-color: #10b981;
  background: rgba(255, 255, 255, 0.98);
}

.toast-success i {
  color: #10b981;
}

.toast-error {
  border-color: #ef4444;
  background: rgba(255, 255, 255, 0.98);
}

.toast-error i {
  color: #ef4444;
}

.toast-info {
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.98);
}

.toast-info i {
  color: #3b82f6;
}

.toast-message {
  color: var(--text-primary);
}

/* Animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .toast-container {
    left: 10px;
    right: 10px;
    transform: none;
  }

  .toast {
    width: 100%;
    max-width: none;
  }
}
</style>
