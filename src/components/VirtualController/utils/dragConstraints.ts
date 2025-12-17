/**
 * Shared drag constraint utilities for virtual controller elements
 */

export interface DragConstraintParams {
  newXPercent: number;
  newYPercent: number;
  elementSize: number;
  containerWidth: number;
  containerHeight: number;
}

export interface ConstrainedPosition {
  x: number;
  y: number;
}

/**
 * Constrain a dragged element to stay within viewport bounds
 * Allows edge-to-edge positioning while keeping element visible
 */
export function constrainToViewport({
  newXPercent,
  newYPercent,
  elementSize,
  containerWidth,
  containerHeight,
}: DragConstraintParams): ConstrainedPosition {
  // Calculate margins based on element size relative to container
  const xMargin = (elementSize / 2 / containerWidth) * 100;
  const yMargin = (elementSize / 2 / containerHeight) * 100;

  return {
    x: Math.max(xMargin, Math.min(100 - xMargin, newXPercent)),
    y: Math.max(yMargin, Math.min(100 - yMargin, newYPercent)),
  };
}
