import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface NerdLogoProps {
  size?: number;
  color?: string;
  bgColor?: string;
}

export const NerdLogo: React.FC<NerdLogoProps> = ({
  size = 32,
  color = '#111111',
  bgColor = '#FFFFFF',
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="nerdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color} stopOpacity="0.88" />
          </LinearGradient>
        </Defs>

        {/* Clean rounded background tile if specified */}
        {bgColor !== 'transparent' && (
          <Rect x="0" y="0" width="100" height="100" rx="16" fill={bgColor} />
        )}

        {/* Left vertical border */}
        <Rect x="12" y="14" width="7" height="72" fill="url(#nerdGrad)" />

        {/* Left bottom horizontal border */}
        <Rect x="12" y="79" width="48" height="7" fill="url(#nerdGrad)" />

        {/* Left sharp diagonal stroke */}
        <Path
          d="M 12 14 L 60 79 L 52 84 L 12 30 Z"
          fill="url(#nerdGrad)"
        />

        {/* Right solid vertical block / column */}
        <Rect x="60" y="14" width="28" height="72" rx="3" fill="url(#nerdGrad)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
