<script setup lang="ts">
import { ref } from 'vue'

// Import components
import DrawingCanvas from './components/canvas/DrawingCanvas.vue'
import ToolBar from './components/ToolBar.vue'
import ColorSelector from './components/ColorSelector.vue'
import LayersPanel from './components/LayersPanel.vue'
import TrialPopup from './components/TrialPopup.vue'
import AboutModal from './components/AboutModal.vue'
import ToolSettingsPanel from './components/ToolSettingsPanel.vue'
import TextInput from './components/TextInput.vue'
import CharacterPalette from './components/CharacterPalette.vue'
import ToastNotification from './components/ToastNotification.vue'

// Import stores
import { useToolStore } from './stores/tools'

// Import stores for app-level state
import { useAppStore } from './stores/app'

// Component refs
const drawingCanvasRef = ref<InstanceType<typeof DrawingCanvas>>()
const aboutModalRef = ref<InstanceType<typeof AboutModal>>()
const textInputRef = ref<InstanceType<typeof TextInput>>()

// Initialize stores
const appStore = useAppStore()

// Event handlers that delegate to DrawingCanvas
const handleRecenter = () => {
  drawingCanvasRef.value?.resetView()
}

const handleUndo = () => {
  drawingCanvasRef.value?.performUndo()
}

const handleRedo = () => {
  drawingCanvasRef.value?.performRedo()
}

const handleReset = () => {
  drawingCanvasRef.value?.resetCanvas()
}

const handleAbout = () => {
  aboutModalRef.value?.open()
}

const handleExport = () => {
  drawingCanvasRef.value?.exportToPNG()
}

const handleCopy = () => {
  drawingCanvasRef.value?.copyToClipboard()
}

const handleShare = () => {
  drawingCanvasRef.value?.shareCanvas()
}

const handleShapesChanged = () => {
  drawingCanvasRef.value?.render()
}

const handleShowTextInput = (screenX: number, screenY: number) => {
  textInputRef.value?.show(screenX, screenY)
}

const handleTextConfirm = (text: string, x: number, y: number) => {
  // Get text settings from the tool store
  const toolStore = useToolStore()
  const hAlign = toolStore.textHorizontalAlign || 'left'
  const vAlign = toolStore.textVerticalAlign || 'top'
  const showBorder = toolStore.textShowBorder ?? true
  
  drawingCanvasRef.value?.handleTextConfirm(text, hAlign, vAlign, showBorder)
}

const handleTextCancel = () => {
  // Text input was cancelled, no action needed
}
</script>

<template>
  <!-- Main drawing canvas -->
  <DrawingCanvas 
    ref="drawingCanvasRef"
    @show-text-input="handleShowTextInput"
  />
  
  <!-- UI Components -->
  <ToolBar 
    @recenter="handleRecenter" 
    @undo="handleUndo" 
    @redo="handleRedo" 
    @reset="handleReset" 
    @about="handleAbout" 
    @export="handleExport" 
    @copy="handleCopy" 
    @share="handleShare" 
  />
  
  <ColorSelector />
  <CharacterPalette />
  
  <LayersPanel @shapesChanged="handleShapesChanged" />
  <ToolSettingsPanel />
  
  <!-- Modal and Input Components -->
  <TextInput 
    ref="textInputRef" 
    @confirm="handleTextConfirm" 
    @cancel="handleTextCancel" 
  />
  
  <TrialPopup />
  <AboutModal ref="aboutModalRef" />
  <ToastNotification />
</template>

<style>
/* Global CSS Variables */
:root {
  /* Typography */
  --ui-font-family: Bahnschrift, 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed, sans-serif;
  --mono-font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
  
  /* UI Colors */
  --bg-primary: rgba(255, 255, 255, 0.95);
  --bg-secondary: rgba(247, 247, 247, 0.8);
  --bg-hover: #f0f0f0;
  --bg-active: #007acc;
  --bg-active-hover: #005a9e;
  
  /* Border & Outline Colors */
  --border-light: #e1e1e1;
  --border-active: #007acc;
  
  /* Text Colors */
  --text-primary: #333;
  --text-secondary: #666;
  --text-muted: #999;
  --text-white: white;
  
  /* Canvas & Grid Colors */
  --canvas-bg: #fafafb;
  --grid-line: #c4c3d0;
  --center-marker: #ff4444;
  --selection-highlight: #007acc;
  
  /* Shadow & Effects */
  --shadow-light: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.15);
  --backdrop-blur: blur(8px);
  
  /* Tool Icon Colors - Fun Palette */
  --icon-undo: #6366f1;      /* Indigo */
  --icon-redo: #8b5cf6;      /* Purple */
  --icon-recenter: #06b6d4;  /* Cyan */
  --icon-reset: #dc2626;     /* Red */
  --icon-pan: #10b981;       /* Emerald */
  --icon-select: #059669;    /* Green */
  --icon-brush: #f59e0b;     /* Amber */
  --icon-rectangle: #ef4444; /* Red */
  --icon-line: #3b82f6;      /* Blue */
  --icon-text: #8b5cf6;      /* Purple */
  --icon-eraser: #ec4899;    /* Pink */
  --icon-palette: #f97316;   /* Orange */
  
  /* Layer Panel Colors */
  --layer-bg-selected: rgba(0, 122, 204, 0.1);
  --layer-bg-selected-hover: rgba(0, 122, 204, 0.15);
  --shape-bg: rgba(247, 247, 247, 0.5);
  --shape-bg-hover: rgba(240, 240, 240, 0.8);
  --shape-bg-selected: rgba(0, 122, 204, 0.1);
  --shape-bg-selected-hover: rgba(0, 122, 204, 0.15);
  
  /* Color Selector */
  --color-swatch-border: #ddd;
  --color-swatch-border-hover: #007acc;
  --delete-hover-bg: #ffe6e6;
  --delete-hover-text: #d32f2f;
}

/* Dark Mode */
[data-theme="dark"] {
  /* UI Colors */
  --bg-primary: rgba(30, 30, 30, 0.95);
  --bg-secondary: rgba(40, 40, 40, 0.8);
  --bg-hover: #3a3a3a;
  --bg-active: #0e7ecf;
  --bg-active-hover: #0969b5;
  
  /* Border & Outline Colors */
  --border-light: #444;
  --border-active: #0e7ecf;
  
  /* Text Colors */
  --text-primary: #e0e0e0;
  --text-secondary: #b0b0b0;
  --text-muted: #808080;
  --text-white: white;
  
  /* Canvas & Grid Colors */
  --canvas-bg: #1a1a1a;
  --grid-line: #333;
  --center-marker: #ff6666;
  --selection-highlight: #0e7ecf;
  
  /* Shadow & Effects */
  --shadow-light: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.6);
  
  /* Layer Panel Colors */
  --layer-bg-selected: rgba(14, 126, 207, 0.2);
  --layer-bg-selected-hover: rgba(14, 126, 207, 0.3);
  --shape-bg: rgba(60, 60, 60, 0.5);
  --shape-bg-hover: rgba(70, 70, 70, 0.8);
  --shape-bg-selected: rgba(14, 126, 207, 0.2);
  --shape-bg-selected-hover: rgba(14, 126, 207, 0.3);
  
  /* Color Selector */
  --color-swatch-border: #555;
  --color-swatch-border-hover: #0e7ecf;
  --delete-hover-bg: #4a2020;
  --delete-hover-text: #ff6666;
}

/* Global font application */
body, html {
  font-family: var(--ui-font-family);
}

/* Ensure all UI elements use the UI font */
* {
  font-family: inherit;
}
</style>