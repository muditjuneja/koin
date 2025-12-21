/**
 * Utilities for viewport and fullscreen detection
 */

/**
 * Check if document is in fullscreen mode (all vendor prefixes)
 */
export function isFullscreen(): boolean {
  const doc = document as any;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Get all fullscreen change event names (for all vendor prefixes)
 */
export function getFullscreenEventNames(): string[] {
  return [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange',
  ];
}

/**
 * Setup fullscreen change listener with all vendor prefixes
 * Returns cleanup function
 */
export function setupFullscreenListener(
  callback: () => void
): () => void {
  const eventNames = getFullscreenEventNames();
  eventNames.forEach((eventName) => {
    document.addEventListener(eventName, callback);
  });

  return () => {
    eventNames.forEach((eventName) => {
      document.removeEventListener(eventName, callback);
    });
  };
}

/**
 * Request fullscreen on an element (with vendor prefixes)
 * Falls back gracefully if not supported
 */
export async function enterFullscreen(element: HTMLElement): Promise<boolean> {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Fullscreen request failed:', err);
    return false;
  }
}

/**
 * Exit fullscreen mode (with vendor prefixes)
 */
export async function exitFullscreenMode(): Promise<boolean> {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Exit fullscreen failed:', err);
    return false;
  }
}

/**
 * Toggle fullscreen mode on an element
 * Returns whether fullscreen is now active (or should be visually simulated)
 */
export async function toggleFullscreen(element: HTMLElement): Promise<boolean> {
  if (isFullscreen()) {
    const exited = await exitFullscreenMode();
    return exited ? false : isFullscreen();
  } else {
    const entered = await enterFullscreen(element);
    // If native fullscreen worked, return true; otherwise caller should use visual fallback
    return entered;
  }
}

/**
 * Detect if device is mobile
 * Uses multiple heuristics for reliable detection
 */
export function isMobileDevice(): boolean {
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Use matchMedia for pointer type (most reliable)
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  // Use visual viewport if available (more accurate on mobile)
  const width = window.visualViewport?.width || window.innerWidth;
  const isSmallScreen = width < 768;

  // Check user agent for mobile devices
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Mobile if has touch AND (coarse pointer OR small screen OR mobile UA)
  return hasTouch && (hasCoarsePointer || isSmallScreen || isMobileUA);
}

/**
 * Get current viewport dimensions
 * Uses visual viewport API if available (better for mobile with keyboard/address bar)
 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.visualViewport?.width || window.innerWidth,
    height: window.visualViewport?.height || window.innerHeight,
  };
}

/**
 * Get current screen orientation
 * Uses viewport dimensions to determine orientation
 */
export function getCurrentOrientation(): 'portrait' | 'landscape' {
  const { width, height } = getViewportSize();
  const dimensionBased = width > height ? 'landscape' : 'portrait';

  // Use Screen Orientation API if available (modern standard)
  if (window.screen?.orientation?.type) {
    const type = window.screen.orientation.type;
    const apiBased = type.includes('landscape') ? 'landscape' : 'portrait';

    // HYBRID CHECK: If API and dimensions disagree, trust dimensions
    // This handles iOS Portrait Upside Down where the browser stays in landscape
    // but the physical screen shows portrait content
    if (apiBased !== dimensionBased) {
      return dimensionBased;
    }
    return apiBased;
  }

  // Fallback for iOS (window.orientation is deprecated but standard on iOS)
  // 0 and 180 are portrait, 90 and -90 are landscape
  if (typeof window.orientation !== 'undefined') {
    const angle = Number(window.orientation);
    const apiBased = Math.abs(angle) === 90 ? 'landscape' : 'portrait';

    // Same hybrid check
    if (apiBased !== dimensionBased) {
      return dimensionBased;
    }
    return apiBased;
  }

  // Fallback to dimensions only
  return dimensionBased;
}

/**
 * Get current screen orientation from container dimensions
 * More reliable than window dimensions during transitions
 */
export function getOrientationFromContainer(container: HTMLElement): 'portrait' | 'landscape' {
  const rect = container.getBoundingClientRect();
  return rect.width > rect.height ? 'landscape' : 'portrait';
}

/**
 * Create an orientation change handler with iOS-specific timing
 * Handles duplicate events and waits for layout updates
 * 
 * @param callback - Function to call when orientation changes
 * @param checkReady - Optional function to check if layout is ready (returns true when ready)
 * @param maxRafs - Maximum number of RAF attempts (default: 3)
 * @returns Handler function to attach to orientationchange event
 */
export function createOrientationChangeHandler(
  callback: () => void,
  checkReady?: () => boolean,
  maxRafs: number = 3
): () => void {
  return () => {
    // REMOVED: Don't check getCurrentOrientation() immediately here.
    // On iOS/Android, window dimensions might not have updated yet when the event fires.
    // If we compare current (stale) vs last (stale), they might be equal, causing us to return early
    // and miss the actual update that happens ms later.
    // Instead, we ALWAYS proceed to the RAF loop to wait for the layout to settle/change.

    // iOS Safari: orientationchange fires before layout is updated
    // Use multiple RAFs to wait for layout, with a fallback timeout
    let rafCount = 0;

    const tryCallback = () => {
      rafCount++;

      // If checkReady is provided, use it to verify layout is ready
      if (checkReady && !checkReady()) {
        // If layout not ready and we haven't tried too many times, try again
        if (rafCount < maxRafs) {
          requestAnimationFrame(tryCallback);
        } else {
          // Fallback: force callback after a short delay (iOS edge case)
          setTimeout(callback, 100);
        }
        return;
      }

      // Layout is ready (or no check provided), execute callback
      callback();
    };

    // Start with a small delay to let iOS start the transition
    setTimeout(() => {
      requestAnimationFrame(tryCallback);
    }, 50);
  };
}

