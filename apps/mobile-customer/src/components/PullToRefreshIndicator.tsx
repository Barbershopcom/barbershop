import React, { useMemo } from 'react';
import { View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PullState } from '@/hooks/use-pull-to-refresh';

interface PullToRefreshIndicatorProps {
  pullState: PullState;
  indicatorAnimatedStyle: any;
  translateY: Reanimated.Animated.Value;
  scale: Reanimated.Animated.Value;
  rotation: Reanimated.Animated.Value;
  opacity: Reanimated.Animated.Value;
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

export const PullToRefreshIndicator = React.memo(
  ({
    pullState,
    indicatorAnimatedStyle,
    translateY,
    scale,
    rotation,
    opacity,
  }: PullToRefreshIndicatorProps) => {
    const isRefreshing = pullState === PullState.Refreshing;

    // SVG Icon renderizado como string (sem depender de bibliotecas pesadas)
    const renderIcon = () => {
      if (isRefreshing) {
        return (
          <View className="h-8 w-8 items-center justify-center">
            <Reanimated.View
              style={[
                {
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
                {
                  transform: [
                    {
                      rotate: rotation.value.toString(),
                    },
                  ],
                },
              ]}
            >
              <ArrowDownIcon />
            </Reanimated.View>
          </View>
        );
      }

      return (
        <View className="h-8 w-8 items-center justify-center">
          <ArrowDownIcon color={
            pullState === PullState.Ready ? '#1a365d' : '#8a8073'
          } />
        </View>
      );
    };

    return (
      <AnimatedView
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 80,
            zIndex: 10,
            justifyContent: 'center',
            alignItems: 'center',
          },
          indicatorAnimatedStyle,
        ]}
      >
        <View
          className={`h-12 w-12 items-center justify-center rounded-full ${
            pullState === PullState.Ready ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          {renderIcon()}
        </View>
      </AnimatedView>
    );
  }
);

PullToRefreshIndicator.displayName = 'PullToRefreshIndicator';

/**
 * SVG Icons inline para evitar depender de bibliotecas pesadas
 * Ícone de seta para baixo com variação de cor
 */
function ArrowDownIcon({ color = '#8a8073' }: { color?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2v16m0 0l-6-6m6 6l6-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
