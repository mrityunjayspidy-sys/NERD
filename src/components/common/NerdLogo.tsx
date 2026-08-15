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
  bgColor = 'transparent',
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="nerdLetterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color} stopOpacity="0.95" />
          </LinearGradient>
        </Defs>

        {/* Clean rounded background tile if specified */}
        {bgColor !== 'transparent' && (
          <Rect x="0" y="0" width="100" height="100" rx="20" fill={bgColor} />
        )}

        {/* Left pointed arch blade */}
        <Path
          d="M 27 10 C 17 32 17 68 27 90 C 37 72 40 48 40 32 C 40 20 36 13 27 10 Z"
          fill="url(#nerdLetterGrad)"
        />

        {/* Center sharp diagonal stroke */}
        <Path
          d="M 27 16 C 35 28 47 48 73 90 L 63 90 C 44 56 34 36 27 16 Z"
          fill="url(#nerdLetterGrad)"
        />

        {/* Right pointed arch blade */}
        <Path
          d="M 73 10 C 64 13 60 20 60 32 C 60 48 63 72 73 90 C 83 68 83 32 73 10 Z"
          fill="url(#nerdLetterGrad)"
        />
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
