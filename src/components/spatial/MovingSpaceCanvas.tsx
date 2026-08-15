import React, { useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TaskContext';
import { SpatialTaskNode } from './SpatialTaskNode';
import { EmptySpatialSpace } from './EmptySpatialSpace';
import { SpatialHUD } from './SpatialHUD';
import { Task } from '../../types';

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.2;

interface MovingSpaceCanvasProps {
  onSelectTask: (task: Task) => void;
  onAddTask: () => void;
}

export const MovingSpaceCanvas: React.FC<MovingSpaceCanvasProps> = ({
  onSelectTask,
  onAddTask,
}) => {
  const { theme } = useTheme();
  const {
    filteredTasks,
    toggleTaskStatus,
    getSpatialTaskPosition,
    toggleTaskConnection,
    updateTask,
  } = useTasks();

  const [currentZoomState, setCurrentZoomState] = useState(1);
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [selectedTaskForConnection, setSelectedTaskForConnection] = useState<string | null>(null);
  const [livePositions, setLivePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Translation & Scale shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Saved offsets during active gestures
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const updateZoomState = (newScale: number) => {
    setCurrentZoomState(newScale);
  };

  // 1. Pan Gesture (X & Y multi-directional free pan)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // 2. Pinch Gesture (smooth spring-based scaling with bounds)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.min(
        Math.max(savedScale.value * event.scale, MIN_ZOOM),
        MAX_ZOOM
      );
      scale.value = nextScale;
      runOnJS(updateZoomState)(nextScale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // 3. Double-tap to reset view
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      translateX.value = withSpring(0, { damping: 15 });
      translateY.value = withSpring(0, { damping: 15 });
      scale.value = withSpring(1, { damping: 15 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      savedScale.value = 1;
      runOnJS(updateZoomState)(1);
    });

  // Compose simultaneous pan and pinch gestures
  const composedGestures = Gesture.Simultaneous(
    doubleTapGesture,
    Gesture.Simultaneous(panGesture, pinchGesture)
  );

  const resetView = () => {
    translateX.value = withSpring(0, { damping: 15 });
    translateY.value = withSpring(0, { damping: 15 });
    scale.value = withSpring(1, { damping: 15 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    savedScale.value = 1;
    setCurrentZoomState(1);
  };

  const handleToggleConnectMode = () => {
    setIsConnectMode((prev) => {
      if (prev) {
        setSelectedTaskForConnection(null);
      }
      return !prev;
    });
  };

  const handleTaskNodePress = (task: Task) => {
    if (isConnectMode) {
      if (!selectedTaskForConnection) {
        setSelectedTaskForConnection(task.id);
      } else if (selectedTaskForConnection === task.id) {
        setSelectedTaskForConnection(null);
      } else {
        // Toggle link between the two tasks
        toggleTaskConnection(selectedTaskForConnection, task.id);
        setSelectedTaskForConnection(null);
      }
    } else {
      onSelectTask(task);
    }
  };

  const handleNodeDrag = (taskId: string, newX: number, newY: number) => {
    setLivePositions((prev) => ({
      ...prev,
      [taskId]: { x: newX, y: newY },
    }));
  };

  const handleNodeDragEnd = async (taskId: string, finalX: number, finalY: number) => {
    setLivePositions((prev) => ({
      ...prev,
      [taskId]: { x: finalX, y: finalY },
    }));
    await updateTask(taskId, {
      spatial_x: Math.round(finalX),
      spatial_y: Math.round(finalY),
    });
  };

  // Map of task ID to node spatial position
  const taskPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    filteredTasks.forEach((t, idx) => {
      const live = livePositions[t.id];
      if (live) {
        map.set(t.id, live);
      } else {
        map.set(t.id, getSpatialTaskPosition(t, idx, filteredTasks.length));
      }
    });
    return map;
  }, [filteredTasks, getSpatialTaskPosition, livePositions]);

  // Unique connection wire pairs to render
  const connectionLines = useMemo(() => {
    const lines: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      d: string;
      isHeadConnection: boolean;
    }[] = [];
    const visited = new Set<string>();

    const CARD_HALF_W = 110;
    const CARD_HALF_H = 65;

    filteredTasks.forEach((task) => {
      const posA = taskPositions.get(task.id);
      if (!posA || !task.connected_task_ids) return;

      task.connected_task_ids.forEach((connectedId) => {
        const pairKey = [task.id, connectedId].sort().join(':::');
        if (visited.has(pairKey)) return;
        visited.add(pairKey);

        const posB = taskPositions.get(connectedId);
        const taskB = filteredTasks.find((t) => t.id === connectedId);
        if (posB) {
          const rawDx = posB.x - posA.x;
          const rawDy = posB.y - posA.y;

          // Connect from card perimeter edge ports rather than cutting across card content
          let x1 = posA.x;
          let y1 = posA.y;
          let x2 = posB.x;
          let y2 = posB.y;

          if (Math.abs(rawDx) >= Math.abs(rawDy) * 0.7) {
            // Horizontal connection: exit right/left edge port
            if (rawDx > 0) {
              x1 = posA.x + CARD_HALF_W;
              x2 = posB.x - CARD_HALF_W;
            } else {
              x1 = posA.x - CARD_HALF_W;
              x2 = posB.x + CARD_HALF_W;
            }
          } else {
            // Vertical connection: exit bottom/top edge port
            if (rawDy > 0) {
              y1 = posA.y + CARD_HALF_H;
              y2 = posB.y - CARD_HALF_H;
            } else {
              y1 = posA.y - CARD_HALF_H;
              y2 = posB.y + CARD_HALF_H;
            }
          }

          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.hypot(dx, dy);

          // Physical flexible wire cubic bezier with natural gravitational droop
          const sag = Math.min(Math.max(dist * 0.28, 45), 150);
          const tangentLength = Math.max(Math.abs(dx) * 0.45, 50);
          const dirX = dx >= 0 ? 1 : -1;

          const cp1x = x1 + dirX * tangentLength;
          const cp1y = y1 + sag;
          const cp2x = x2 - dirX * tangentLength;
          const cp2y = y2 + sag;

          const isHeadConnection = Boolean(task.is_head_node || taskB?.is_head_node);

          lines.push({
            key: pairKey,
            x1,
            y1,
            x2,
            y2,
            d: `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`,
            isHeadConnection,
          });
        }
      });
    });

    return lines;
  }, [filteredTasks, taskPositions]);

  const canvasAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.canvasWrapper, canvasAnimatedStyle]}>
          {/* Spatial Grid & Orbital Horizon Guides */}
          <Svg
            style={styles.svgBackground}
            width="2400"
            height="2400"
            viewBox="-1200 -1200 2400 2400"
          >
            <Defs>
              <RadialGradient id="centerGlow" cx="0" cy="0" rx="400" ry="400">
                <Stop offset="0%" stopColor={theme.colors.accentLight} stopOpacity="0.8" />
                <Stop offset="100%" stopColor={theme.colors.background} stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Ambient Center Glow (Today Focus Aura) */}
            <Circle cx="0" cy="0" r="350" fill="url(#centerGlow)" />

            {/* Orbit Rings (Chronological Horizons) */}
            <Circle
              cx="0"
              cy="0"
              r="140"
              stroke={theme.colors.canvasGrid}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <Circle
              cx="0"
              cy="0"
              r="280"
              stroke={theme.colors.canvasGrid}
              strokeWidth="1.5"
              strokeDasharray="6 6"
              fill="none"
            />
            <Circle
              cx="0"
              cy="0"
              r="460"
              stroke={theme.colors.canvasGrid}
              strokeWidth="1"
              strokeDasharray="8 8"
              fill="none"
            />
            <Circle
              cx="0"
              cy="0"
              r="680"
              stroke={theme.colors.canvasGrid}
              strokeWidth="1"
              strokeDasharray="10 10"
              fill="none"
            />

            {/* Crosshair coordinate axes */}
            <Line
              x1="-900"
              y1="0"
              x2="900"
              y2="0"
              stroke={theme.colors.canvasGrid}
              strokeWidth="1"
              strokeDasharray="3 6"
            />
            <Line
              x1="0"
              y1="-900"
              x2="0"
              y2="900"
              stroke={theme.colors.canvasGrid}
              strokeWidth="1"
              strokeDasharray="3 6"
            />

            {/* Dynamic Flexible Wire Cable Lines between linked tasks */}
            {connectionLines.map((line) => (
              <React.Fragment key={line.key}>
                {/* 1. Flexible Cable Drop Shadow */}
                <Path
                  d={line.d}
                  stroke="rgba(0, 0, 0, 0.16)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  transform="translate(0, 5)"
                />
                {/* 2. Outer Rubber Cable Sheath */}
                <Path
                  d={line.d}
                  stroke={line.isHeadConnection ? '#D99B00' : theme.colors.textSecondary}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 3. Core Conductor Wire */}
                <Path
                  d={line.d}
                  stroke={line.isHeadConnection ? '#FFB800' : theme.colors.accent}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 4. Active Signal Pulse Stripe */}
                <Path
                  d={line.d}
                  stroke={line.isHeadConnection ? '#FFF9C4' : '#FFFFFF'}
                  strokeWidth="1"
                  strokeDasharray="7 9"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 5. Terminal Connection Jacks at Card Ports */}
                <Circle
                  cx={line.x1}
                  cy={line.y1}
                  r="6"
                  fill={line.isHeadConnection ? '#FFB800' : theme.colors.accent}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <Circle
                  cx={line.x1}
                  cy={line.y1}
                  r="2.5"
                  fill="#FFFFFF"
                />
                <Circle
                  cx={line.x2}
                  cy={line.y2}
                  r="6"
                  fill={line.isHeadConnection ? '#FFB800' : theme.colors.accent}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <Circle
                  cx={line.x2}
                  cy={line.y2}
                  r="2.5"
                  fill="#FFFFFF"
                />
              </React.Fragment>
            ))}
          </Svg>

          {/* Render Spatial Task Nodes */}
          {filteredTasks.length === 0 ? (
            <EmptySpatialSpace onAddTask={onAddTask} />
          ) : (
            filteredTasks.map((task) => {
              const pos = taskPositions.get(task.id) || { x: 0, y: 0 };
              const isSelectedForConn = selectedTaskForConnection === task.id;

              return (
                <SpatialTaskNode
                  key={task.id}
                  task={task}
                  x={pos.x}
                  y={pos.y}
                  zoomScale={currentZoomState}
                  isSelectedForConnection={isSelectedForConn}
                  onPress={handleTaskNodePress}
                  onComplete={toggleTaskStatus}
                  onDrag={handleNodeDrag}
                  onDragEnd={handleNodeDragEnd}
                />
              );
            })
          )}
        </Animated.View>
      </GestureDetector>

      {/* Floating Spatial HUD */}
      <SpatialHUD
        onResetView={resetView}
        onAddTask={onAddTask}
        currentScale={currentZoomState}
        isConnectMode={isConnectMode}
        onToggleConnectMode={handleToggleConnectMode}
        selectedTaskForConnection={selectedTaskForConnection}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  canvasWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgBackground: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -1200,
    marginTop: -1200,
    pointerEvents: 'none',
  },
});
