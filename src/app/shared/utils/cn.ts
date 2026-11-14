import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Teach tailwind-merge about our custom radius tokens so they override each other correctly. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ['control', 'button', 'tile', 'card', 'sheet', 'panel', 'pill'] }],
      shadow: [{ shadow: ['card', 'float', 'cta', 'gold', 'panel', 'sheet'] }],
    },
  },
});

/** Merges Tailwind classes, later classes win. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
