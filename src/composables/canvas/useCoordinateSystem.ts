export interface GridCoordinate {
  x: number
  y: number
}

export interface WorldCoordinate {
  x: number
  y: number
}

export function useCoordinateSystem() {
  // Grid dimensions - 1:2 aspect ratio for proper monospace display
  const gridWidth = 10   // Width of each grid cell
  const gridHeight = 20  // Height of each grid cell (2x width for monospace fonts)

  // Convert world coordinates to grid coordinates
  const worldToGrid = (worldX: number, worldY: number): GridCoordinate => {
    return {
      x: Math.floor(worldX / gridWidth),
      y: Math.floor(worldY / gridHeight)
    }
  }

  // Convert grid coordinates to world coordinates (center of cell)
  const gridToWorld = (gridX: number, gridY: number): WorldCoordinate => {
    return {
      x: gridX * gridWidth + gridWidth / 2,
      y: gridY * gridHeight + gridHeight / 2
    }
  }

  // Create a key for the grid data map
  const gridKey = (gridX: number, gridY: number): string => `${gridX},${gridY}`

  // Snap world coordinates to grid
  const snapToGrid = (worldX: number, worldY: number): WorldCoordinate => {
    const grid = worldToGrid(worldX, worldY)
    return gridToWorld(grid.x, grid.y)
  }

  // Get grid bounds for a world space rectangle
  const getGridBounds = (worldX1: number, worldY1: number, worldX2: number, worldY2: number) => {
    const grid1 = worldToGrid(worldX1, worldY1)
    const grid2 = worldToGrid(worldX2, worldY2)
    
    return {
      minX: Math.min(grid1.x, grid2.x),
      maxX: Math.max(grid1.x, grid2.x),
      minY: Math.min(grid1.y, grid2.y),
      maxY: Math.max(grid1.y, grid2.y)
    }
  }

  // Check if a world point is within grid bounds
  const isWithinGridBounds = (worldX: number, worldY: number, bounds: { minX: number, maxX: number, minY: number, maxY: number }): boolean => {
    const grid = worldToGrid(worldX, worldY)
    return grid.x >= bounds.minX && grid.x <= bounds.maxX && 
           grid.y >= bounds.minY && grid.y <= bounds.maxY
  }

  // Get the distance between two grid points
  const getGridDistance = (gridX1: number, gridY1: number, gridX2: number, gridY2: number): number => {
    return Math.max(Math.abs(gridX2 - gridX1), Math.abs(gridY2 - gridY1))
  }

  // Get all grid points along a line between two grid coordinates
  const getGridLine = (startGridX: number, startGridY: number, endGridX: number, endGridY: number): GridCoordinate[] => {
    const points: GridCoordinate[] = []
    const dx = Math.abs(endGridX - startGridX)
    const dy = Math.abs(endGridY - startGridY)
    const distance = Math.max(dx, dy)
    
    if (distance === 0) {
      points.push({ x: startGridX, y: startGridY })
      return points
    }
    
    const xStep = (endGridX - startGridX) / distance
    const yStep = (endGridY - startGridY) / distance
    
    for (let i = 0; i <= distance; i++) {
      const x = Math.round(startGridX + xStep * i)
      const y = Math.round(startGridY + yStep * i)
      points.push({ x, y })
    }
    
    return points
  }

  // Get all grid points within a rectangle
  const getGridRectangle = (minGridX: number, minGridY: number, maxGridX: number, maxGridY: number): GridCoordinate[] => {
    const points: GridCoordinate[] = []
    
    for (let y = minGridY; y <= maxGridY; y++) {
      for (let x = minGridX; x <= maxGridX; x++) {
        points.push({ x, y })
      }
    }
    
    return points
  }

  return {
    // Constants
    gridWidth,
    gridHeight,
    
    // Core coordinate conversion functions
    worldToGrid,
    gridToWorld,
    gridKey,
    
    // Utility functions
    snapToGrid,
    getGridBounds,
    isWithinGridBounds,
    getGridDistance,
    getGridLine,
    getGridRectangle,
  }
}