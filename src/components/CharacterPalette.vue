<template>
  <Transition name="slide">
    <div v-if="isVisible" class="character-palette">
      <div class="palette-header">
        <h3>Character Palette</h3>
        <button class="close-btn" @click="hide">
          <i class="fa-thumbprint fa-light fa-xmark"></i>
        </button>
      </div>
      
      <div class="current-character">
        <span class="label">Current:</span>
        <span class="character-display">{{ toolStore.selectedCharacter }}</span>
        <span class="character-name">{{ getCharacterName(toolStore.selectedCharacter) }}</span>
      </div>

      <div class="palette-content">
        <div v-for="(category, key) in ASCII_CHARACTERS" :key="key" class="character-category">
          <h4>{{ category.name }}</h4>
          <div class="character-grid">
            <button
              v-for="charData in category.chars"
              :key="charData.code"
              :class="['character-btn', { active: toolStore.selectedCharacter === charData.char }]"
              @click="selectCharacter(charData.char)"
              :title="`${charData.name} (${charData.code})`"
            >
              {{ charData.char }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToolStore, ASCII_CHARACTERS } from '@/stores/tools'

const toolStore = useToolStore()

const isVisible = computed(() => toolStore.showCharacterPalette)

const selectCharacter = (char: string) => {
  toolStore.setSelectedCharacter(char)
  // Close the palette after selection
  toolStore.hideCharacterPalette()
}

const hide = () => {
  toolStore.hideCharacterPalette()
}

const getCharacterName = (char: string) => {
  for (const category of Object.values(ASCII_CHARACTERS)) {
    const found = category.chars.find(c => c.char === char)
    if (found) return found.name
  }
  return 'Custom'
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.character-palette {
  position: fixed;
  right: 320px; /* Position to the left of the ToolSettingsPanel (280px + 40px gap) */
  top: 20px;
  width: 320px;
  max-height: calc(100vh - 40px);
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-medium);
  backdrop-filter: var(--backdrop-blur);
  z-index: 999;
  display: flex;
  flex-direction: column;
}

.palette-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.palette-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: var(--text-primary);
}

.current-character {
  padding: 12px 16px;
  background: rgba(0, 122, 204, 0.05);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-character .label {
  font-size: 14px;
  color: var(--text-secondary);
}

.character-display {
  font-size: 24px;
  font-family: var(--mono-font-family);
  background: white;
  border: 2px solid var(--border-active);
  border-radius: 6px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.character-name {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.palette-content {
  overflow-y: auto;
  padding: 16px;
  flex: 1;
}

.character-category {
  margin-bottom: 20px;
}

.character-category:last-child {
  margin-bottom: 0;
}

.character-category h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.character-btn {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-light);
  background: white;
  border-radius: 6px;
  font-size: 20px;
  font-family: var(--mono-font-family);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.character-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-active);
  transform: scale(1.05);
}

.character-btn.active {
  background: var(--bg-active);
  color: white;
  border-color: var(--bg-active);
}

.character-btn.active:hover {
  background: var(--bg-active-hover);
  border-color: var(--bg-active-hover);
}

/* Scrollbar styling */
.palette-content::-webkit-scrollbar {
  width: 6px;
}

.palette-content::-webkit-scrollbar-track {
  background: transparent;
}

.palette-content::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.palette-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .character-palette {
    right: 10px;
    left: 10px;
    width: auto;
  }
  
  .character-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>