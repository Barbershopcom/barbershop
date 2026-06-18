import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { PullState } from '@/hooks/use-pull-to-refresh';

interface PullToRefreshIndicatorProps {
  pullState: PullState;
  indicatorAnimatedStyle: any;
  translateY: any;
  scale: any;
  rotation: any;
  opacity: any;
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

    const renderIcon = () => {
      const color = pullState === PullState.Ready ? '#1a365d' : '#8a8073';

      if (isRefreshing) {
        return (
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
            <ArrowDownIcon color={color} />
          </Reanimated.View>
        );
      }

      return <ArrowDownIcon color={color} />;
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
          style={{
            width: 48,
            height: 48,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 24,
            backgroundColor: pullState === PullState.Ready ? '#dbeafe' : '#f3f4f6',
          }}
        >
          {renderIcon()}
        </View>
      </AnimatedView>
    );
  }
);

PullToRefreshIndicator.displayName = 'PullToRefreshIndicator';

function ArrowDownIcon({ color = '#8a8073' }: { color?: string }) {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2v16m0 0l-6-6m6 6l6-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
