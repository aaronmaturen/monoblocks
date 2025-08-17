declare global {
  interface Window {
    renderCanvas?: () => void
    regenerateShape?: (shape: any) => void
  }
}

export {}