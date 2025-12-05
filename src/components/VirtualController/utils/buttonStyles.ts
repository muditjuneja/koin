/**
 * Button styling utilities for virtual controller buttons
 */

import { ButtonType } from '../layouts';

export interface ButtonStyle {
  bg: string;
  text: string;
  border: string;
  shadow: string;
  transform: string;
}

/**
 * Get button styles based on type and pressed state
 */
export function getButtonStyles(
  buttonType: ButtonType,
  isPressed: boolean
): ButtonStyle {
  if (isPressed) {
    return {
      bg: 'bg-retro-primary',
      text: 'text-black',
      border: 'border-white',
      shadow: 'shadow-none',
      transform: 'translate-x-[3px] translate-y-[3px]',
    };
  }

  switch (buttonType) {
    case 'a':
    case 'b':
    case 'c':
      return {
        bg: 'bg-red-600',
        text: 'text-white',
        border: 'border-white',
        shadow: 'shadow-hard',
        transform: '',
      };
    case 'x':
    case 'y':
      return {
        bg: 'bg-blue-600',
        text: 'text-white',
        border: 'border-white',
        shadow: 'shadow-hard',
        transform: '',
      };
    case 'l':
    case 'r':
    case 'start':
    case 'select':
      return {
        bg: 'bg-retro-surface',
        text: 'text-white',
        border: 'border-white',
        shadow: 'shadow-hard',
        transform: '',
      };
    default:
      // D-pad buttons
      return {
        bg: 'bg-black',
        text: 'text-white',
        border: 'border-white',
        shadow: 'shadow-hard',
        transform: '',
      };
  }
}

