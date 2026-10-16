// GI SHOP design tokens — "Modern Kirana".
// Keep in sync with shop-ledger/src/styles/tokens.css (same names, same values).
export const colors = {
  // Brand
  primary: '#0f7a43',
  primaryLight: '#e9f6ee',
  primaryDark: '#0b5e33',
  accent: '#f2a516',        // saffron highlight
  accentLight: '#fdf0cf',
  ink: '#12201a',           // deep ink for text / dark surfaces

  // Status
  secondary: '#666c60',
  success: '#1f9d5a',
  successLight: '#eef8f1',
  danger: '#d93a2f',
  dangerLight: '#fef2f2',
  warning: '#f2a516',
  warningLight: '#fff8e6',
  info: '#0284c7',
  infoLight: '#e0f2fe',

  // Surfaces
  background: '#faf7f0',    // warm cream canvas
  surface: '#ffffff',
  card: '#ffffff',
  border: '#e8e1d0',
  borderDark: '#d5ccb6',
  badgeBg: '#f3eee2',

  // Text
  text: '#12201a',
  textMuted: '#666c60',
  textSecondary: '#4a5148',

  shadow: '#12201a',
};

// Per-role accent. Same system, a different "flavour" for each role.
export const roleAccent = {
  Shopkeeper: { main: '#0f7a43', tint: '#e9f6ee' },
  Cashier: { main: '#0f7a43', tint: '#e9f6ee' },
  Customer: { main: '#d97706', tint: '#fdf0cf' },
  SuperManager: { main: '#3730a3', tint: '#e0e7ff' },
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Motion tokens (ms) — mirrored by --dur-* in the web CSS.
export const motion = { fast: 140, base: 260, slow: 480, stagger: 55 };

export const shadowStyle = {
  shadowColor: '#12201a',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 2,
};

export const shadowLarge = {
  shadowColor: '#12201a',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.14,
  shadowRadius: 22,
  elevation: 6,
};
