export const colors = {
  primary: '#6C5CE7',
  primaryLight: '#8B7BF0',
  accent: '#FFD300',
  accentDark: '#E6BE00',

  bgPrimary: '#0f1025',
  bgSecondary: '#1a1b3e',
  bgCard: '#1e2048',
  bgCardHover: '#252763',
  bgInput: '#252763',
  bgModal: '#161738',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A3BD',
  textMuted: '#6B6F8D',
  textInverse: '#0f1025',

  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.15)',

  border: '#2a2c54',
  borderLight: '#353768',
  divider: '#1e2048',

  statusPending: '#F59E0B',
  statusProcessing: '#3B82F6',
  statusShipped: '#8B5CF6',
  statusDelivered: '#10B981',
  statusCancelled: '#EF4444',
  statusReturned: '#F97316',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
