import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/common/Header';
import { MovingSpaceCanvas } from '../components/spatial/MovingSpaceCanvas';
import { Task } from '../types';

interface MovingSpaceScreenProps {
  onOpenSettings: () => void;
  onSelectTask: (task: Task) => void;
  onAddTask: () => void;
}

export const MovingSpaceScreen: React.FC<MovingSpaceScreenProps> = ({
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
