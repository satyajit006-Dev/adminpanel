import type { ThemePreset } from '../types/apparel';

export interface ThemePresetOption {
  id: ThemePreset;
  name: string;
  subtitle: string;
  sidebarHex: string;
  accentHex: string;
  canvasHex: string;
  darkAccentHex: string;
  darkCanvasHex: string;
}

export const THEME_PRESETS: ThemePresetOption[] = [
  {
    id: 'indigo',
    name: 'Midnight Indigo',
    subtitle: 'Deep architectural navy & royal indigo',
    sidebarHex: '#131836',
    accentHex: '#3730A3',
    canvasHex: '#F4F6FA',
    darkAccentHex: '#818CF8',
    darkCanvasHex: '#090C1A',
  },
  {
    id: 'pine',
    name: 'Pine Atelier',
    subtitle: 'Botanical forest green & crisp alabaster',
    sidebarHex: '#0E241E',
    accentHex: '#14532D',
    canvasHex: '#F4F6F5',
    darkAccentHex: '#34D399',
    darkCanvasHex: '#08110E',
  },
  {
    id: 'burgundy',
    name: 'Oxblood Couture',
    subtitle: 'Editorial plum-burgundy & pearl neutral',
    sidebarHex: '#251018',
    accentHex: '#881337',
    canvasHex: '#F7F5F6',
    darkAccentHex: '#FB7185',
    darkCanvasHex: '#12090C',
  },
  {
    id: 'slate',
    name: 'Classic Slate',
    subtitle: 'Original monochrome cool slate',
    sidebarHex: '#0F172A',
    accentHex: '#0F172A',
    canvasHex: '#F8FAFC',
    darkAccentHex: '#F1F5F9',
    darkCanvasHex: '#0B0F17',
  },
];
