import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/common/Header';
import { MovingSpaceCanvas } from '../components/spatial/MovingSpaceCanvas';
import { Task } from '../types';

interface HomeScreenProps {
  onOpenSettings: () => void;
  onSelectTask: (task: Task) => void;
  onAddTask: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenSettings,
  onSelectTask,
  onAddTask,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header onOpenSettings={onOpenSettings} />
      <MovingSpaceCanvas
        onSelectTask={onSelectTask}
        onAddTask={onAddTask}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
