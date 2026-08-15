import { useWindowDimensions } from 'react-native';

export interface ResponsiveLayout {
  width: number;
  height: number;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  contentMaxWidth: number;
}

export function useResponsive(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  const isDesktop = width >= 860;
  const isTablet = width >= 600 && width < 860;
  const isMobile = width < 600;

  const contentMaxWidth = isDesktop ? 1160 : isTablet ? 720 : '100%';

  return {
    width,
    height,
    isDesktop,
    isTablet,
    isMobile,
    contentMaxWidth: typeof contentMaxWidth === 'number' ? contentMaxWidth : width,
  };
}
