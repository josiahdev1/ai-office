/**
 * Theme Token System for EasyUp Headquarters
 * Supports Coworking (default), Cyberpunk, Dracula, Tokyo Night, Catppuccin, Gruvbox.
 * Modulates room palettes, wall colors, and UI accents via tokens without code forks.
 */

export type ThemeName =
  | 'coworking'
  | 'cyberpunk'
  | 'dracula'
  | 'tokyo_night'
  | 'catppuccin'
  | 'gruvbox'

export interface ThemeTokens {
  id: ThemeName
  name: string
  floorFill: string
  floorGrout: string
  floorStroke: string
  slabEdgeLeft: string
  slabEdgeRight: string
  backWallLeft: string
  backWallRight: string
  wallCapLeft: string
  wallCapRight: string
  backdropBg: string
  accentPrimary: string
  accentSecondary: string
  uiBg: string
  uiBorder: string
  uiText: string
  rugOpacity: number
}

export const OFFICE_THEMES: Record<ThemeName, ThemeTokens> = {
  coworking: {
    id: 'coworking',
    name: 'Coworking (Default)',
    floorFill: '#e2d9c4',
    floorGrout: '#cfc5ae',
    floorStroke: '#b5aa92',
    slabEdgeLeft: '#121620',
    slabEdgeRight: '#181e2b',
    backWallLeft: '#181c26',
    backWallRight: '#1e222d',
    wallCapLeft: '#2e3546',
    wallCapRight: '#333b4e',
    backdropBg: '#080b12',
    accentPrimary: '#38bdf8',
    accentSecondary: '#10b981',
    uiBg: '#0c101a',
    uiBorder: '#1e283d',
    uiText: '#f8fafc',
    rugOpacity: 0.14,
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    floorFill: '#0b0f19',
    floorGrout: '#00f0ff33',
    floorStroke: '#00f0ff',
    slabEdgeLeft: '#05070d',
    slabEdgeRight: '#080c14',
    backWallLeft: '#0f1422',
    backWallRight: '#131b2e',
    wallCapLeft: '#00f0ff',
    wallCapRight: '#ff007f',
    backdropBg: '#030508',
    accentPrimary: '#00f0ff',
    accentSecondary: '#ff007f',
    uiBg: '#080c14',
    uiBorder: '#00f0ff66',
    uiText: '#00f0ff',
    rugOpacity: 0.28,
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    floorFill: '#282a36',
    floorGrout: '#44475a',
    floorStroke: '#6272a4',
    slabEdgeLeft: '#191a21',
    slabEdgeRight: '#21222c',
    backWallLeft: '#21222c',
    backWallRight: '#282a36',
    wallCapLeft: '#bd93f9',
    wallCapRight: '#ff79c6',
    backdropBg: '#1e1f29',
    accentPrimary: '#bd93f9',
    accentSecondary: '#50fa7b',
    uiBg: '#21222c',
    uiBorder: '#6272a4',
    uiText: '#f8f8f2',
    rugOpacity: 0.22,
  },
  tokyo_night: {
    id: 'tokyo_night',
    name: 'Tokyo Night',
    floorFill: '#1a1b26',
    floorGrout: '#24283b',
    floorStroke: '#3b4261',
    slabEdgeLeft: '#13141c',
    slabEdgeRight: '#16161e',
    backWallLeft: '#16161e',
    backWallRight: '#1f2335',
    wallCapLeft: '#7aa2f7',
    wallCapRight: '#bb9af7',
    backdropBg: '#0f1017',
    accentPrimary: '#7aa2f7',
    accentSecondary: '#7dcfff',
    uiBg: '#16161e',
    uiBorder: '#292e42',
    uiText: '#c0caf5',
    rugOpacity: 0.2,
  },
  catppuccin: {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    floorFill: '#1e1e2e',
    floorGrout: '#313244',
    floorStroke: '#45475a',
    slabEdgeLeft: '#11111b',
    slabEdgeRight: '#181825',
    backWallLeft: '#181825',
    backWallRight: '#1e1e2e',
    wallCapLeft: '#cba6f7',
    wallCapRight: '#fab387',
    backdropBg: '#0d0d15',
    accentPrimary: '#cba6f7',
    accentSecondary: '#a6e3a1',
    uiBg: '#181825',
    uiBorder: '#313244',
    uiText: '#cdd6f4',
    rugOpacity: 0.2,
  },
  gruvbox: {
    id: 'gruvbox',
    name: 'Gruvbox Dark',
    floorFill: '#282828',
    floorGrout: '#3c3836',
    floorStroke: '#504945',
    slabEdgeLeft: '#1d2021',
    slabEdgeRight: '#242728',
    backWallLeft: '#1d2021',
    backWallRight: '#282828',
    wallCapLeft: '#fabd2f',
    wallCapRight: '#fe8019',
    backdropBg: '#141617',
    accentPrimary: '#fabd2f',
    accentSecondary: '#8ec07c',
    uiBg: '#1d2021',
    uiBorder: '#3c3836',
    uiText: '#ebdbb2',
    rugOpacity: 0.22,
  },
}
