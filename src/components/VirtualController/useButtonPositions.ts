/**
 * Hook to manage custom button positions (for draggable buttons)
 * Persists to localStorage with separate storage for landscape and portrait
 */

import { useState, useEffect, useCallback } from 'react';
import { ButtonType } from './layouts';

export type ButtonPositions = Partial<Record<ButtonType, { x: number; y: number }>>;

interface StoredPositions {
  landscape: ButtonPositions;
  portrait: ButtonPositions;
}

const STORAGE_KEY = 'virtual-button-positions';

export function useButtonPositions() {
  const [landscapePositions, setLandscapePositions] = useState<ButtonPositions>({});
  const [portraitPositions, setPortraitPositions] = useState<ButtonPositions>({});

  // Load positions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredPositions = JSON.parse(stored);
        // Handle migration from old format (single positions object)
        if (parsed.landscape && parsed.portrait) {
          setLandscapePositions(parsed.landscape);
          setPortraitPositions(parsed.portrait);
        } else {
          // Old format - treat as landscape positions
          setLandscapePositions(parsed as any);
        }
      }
    } catch (e) {
      console.error('Failed to load button positions:', e);
    }
  }, []);

  // Save position for a button (orientation-specific)
  const savePosition = useCallback((
    buttonType: ButtonType,
    x: number,
    y: number,
    isLandscape: boolean
  ) => {
    if (isLandscape) {
      setLandscapePositions((prev) => {
        const updated = { ...prev, [buttonType]: { x, y } };
        try {
          const stored: StoredPositions = {
            landscape: updated,
            portrait: portraitPositions,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch (e) {
          console.error('Failed to save button position:', e);
        }
        return updated;
      });
    } else {
      setPortraitPositions((prev) => {
        const updated = { ...prev, [buttonType]: { x, y } };
        try {
          const stored: StoredPositions = {
            landscape: landscapePositions,
            portrait: updated,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch (e) {
          console.error('Failed to save button position:', e);
        }
        return updated;
      });
    }
  }, [landscapePositions, portraitPositions]);

  // Get position for a button (orientation-specific)
  const getPosition = useCallback((
    buttonType: ButtonType,
    isLandscape: boolean
  ): { x: number; y: number } | null => {
    const positions = isLandscape ? landscapePositions : portraitPositions;
    return positions[buttonType] || null;
  }, [landscapePositions, portraitPositions]);

  // Reset all positions
  const resetPositions = useCallback(() => {
    setLandscapePositions({});
    setPortraitPositions({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset button positions:', e);
    }
  }, []);

  return {
    landscapePositions,
    portraitPositions,
    savePosition,
    getPosition,
    resetPositions,
  };
}

