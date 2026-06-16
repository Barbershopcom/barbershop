import React, { useCallback, useMemo } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

interface PullToRefreshProps extends Omit<ScrollViewProps, 'onScroll'> {
  /**
   * Função chamada quando o usuário faz pull-to-refresh
   */
  onRefresh: () => Promise<void>;

  /**
   * Se está em estado de carregamento
   */
  refreshing?: boolean;

  /**
   * Distância mínima para triggerar refresh (default: 80)
   */
  threshold?: number;

  /**
   * Callback quando o scroll atinge o topo
   */
  onScrollBeginDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

  /**
   * Conteúdo do scroll
   */
  children: React.ReactNode;
}

const AnimatedScrollView =
  Reanimated.createAnimatedComponent(ScrollView);

// Componente Pull-to-Refresh customizado e premium
// Features: Animações Reanimated v3, estados visuais, ScrollView/FlatList, 60fps, Safe Area
export const PullToRefresh = React.memo(
  ({
    onRefresh,
    refreshing = false,
    threshold = 80,
    onScrollBeginDrag,
    children,
    ...scrollViewProps
  }: PullToRefreshProps) => {
    const {
      pullState,
      isPulling,
      isRefreshing,
      translateY,
      scale,
      opacity,
      rotation,
      indicatorAnimatedStyle,
      onDragStart,
      onDragUpdate,
      onDragEnd,
      finishRefresh,
    } = usePullToRefresh({
      onRefresh,
    });

    // Track scroll position
    const scrollOffset = Reanimated.useSharedValue(0);
    const isAtTop = Reanimated.useSharedValue(false);

    const handleScrollBeginDrag = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;

        // Só permitir pull-to-refresh se estiver no topo
        if (offsetY <= 0) {
          onDragStart();
        }

        onScrollBeginDrag?.(event);
      },
      [onDragStart, onScrollBeginDrag]
    );

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        scrollOffset.value = offsetY;
        isAtTop.value = offsetY <= 0;
      },
      [scrollOffset, isAtTop]
    );

    // Gesture para capturar o drag
    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .onUpdate((event) => {
            // Só processar se estiver no topo
            if (isAtTop.value && event.translationY > 0) {
              runOnJS(onDragUpdate)(event.translationY);
            }
          })
          .onEnd(() => {
            if (isAtTop.value) {
              runOnJS(onDragEnd)();
            }
          }),
      [isAtTop, onDragUpdate, onDragEnd]
    );

    return (
      <GestureDetector gesture={panGesture}>
        <View className="relative flex-1">
          {/* Indicador de Pull-to-Refresh */}
          <PullToRefreshIndicator
            pullState={pullState}
            indicatorAnimatedStyle={indicatorAnimatedStyle}
            translateY={translateY}
            scale={scale}
            rotation={rotation}
            opacity={opacity}
          />

          {/* ScrollView */}
          <AnimatedScrollView
            {...scrollViewProps}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator
          >
            {children}
          </AnimatedScrollView>
        </View>
      </GestureDetector>
    );
  }
);

PullToRefresh.displayName = 'PullToRefresh';
