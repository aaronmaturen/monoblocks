import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const showTrialPopup = ref(true)
  const showAboutModal = ref(false)
  const trialDaysUsed = ref(42)
  
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

  return { 
    showTrialPopup, 
    showAboutModal,
    trialDaysUsed,
    dismissTrialPopup,
    resetTrialPopup,
    openAboutModal,
    closeAboutModal
  }
})