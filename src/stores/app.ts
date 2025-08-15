import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const showTrialPopup = ref(true)
  const showAboutModal = ref(false)
  const trialDaysUsed = ref(42)
  const darkMode = ref(false)
  
  // Load dark mode preference from localStorage
  const loadDarkMode = () => {
    const stored = localStorage.getItem('monoblocks-dark-mode')
    if (stored !== null) {
      darkMode.value = stored === 'true'
      applyDarkMode(darkMode.value)
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      darkMode.value = prefersDark
      applyDarkMode(darkMode.value)
    }
  }
  
  // Apply dark mode to document
  const applyDarkMode = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }
  
  // Toggle dark mode
  function toggleDarkMode() {
    darkMode.value = !darkMode.value
  }
  
  // Watch for dark mode changes and persist
  watch(darkMode, (newValue) => {
    localStorage.setItem('monoblocks-dark-mode', String(newValue))
    applyDarkMode(newValue)
  })
  
  function dismissTrialPopup() {
    showTrialPopup.value = false
  }

  function resetTrialPopup() {
    showTrialPopup.value = true
  }
  
  function openAboutModal() {
    showAboutModal.value = true
  }
  
  function closeAboutModal() {
    showAboutModal.value = false
  }
  
  // Initialize dark mode on store creation
  loadDarkMode()

  return { 
    showTrialPopup, 
    showAboutModal,
    trialDaysUsed,
    darkMode,
    dismissTrialPopup,
    resetTrialPopup,
    openAboutModal,
    closeAboutModal,
    toggleDarkMode,
    loadDarkMode
  }
})