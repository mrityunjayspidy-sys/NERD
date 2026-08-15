import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface NerdLogoProps {
  size?: number;
  color?: string;
  bgColor?: string;
}

export const NerdLogo: React.FC<NerdLogoProps> = ({
  size = 32,
  color,
  bgColor = 'transparent',
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: bgColor,
          borderRadius: bgColor !== 'transparent' ? Math.round(size * 0.22) : 0,
        },
      ]}
    >
      <Image
        source={require('../../../assets/icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
