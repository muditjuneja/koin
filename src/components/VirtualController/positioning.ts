/**
 * Positioning adjustments for virtual controller buttons
 * Layouts define base positions; this module applies minor runtime adjustments.
 */

import { ButtonConfig } from './layouts';

export interface PositioningContext {
  isFullscreen: boolean;
}

/**
 * Apply minor adjustments to button config
 * Currently: enlarge buttons slightly in fullscreen mode
 */
export function adjustButtonPosition(
  config: ButtonConfig,
  context: PositioningContext
): ButtonConfig {
  const sizeMultiplier = context.isFullscreen ? 1.1 : 1.0;

  return {
    ...config,
    size: Math.floor(config.size * sizeMultiplier),
  };
}
