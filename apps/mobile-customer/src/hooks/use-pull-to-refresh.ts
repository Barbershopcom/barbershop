import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const PULL_THRESHOLD = 80;
const PULL_DISTANCE = 120;

export enum PullState {
  Idle = 'idle',
  Pulling = 'pulling',
  Ready = 'ready',
  Refreshing = 'refreshing',
  Finished = 'finished',
}

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
}

interface UsePullToRefreshReturn {
  pullState: PullState;
  isPulling: boolean;
  isRefreshing: boolean;
  translateY: any;
  scale: any;
  opacity: any;
  rotation: any;
  indicatorAnimatedStyle: any;
  onDragStart: () => void;
  onDragUpdate: (translation: number) => void;
  onDragEnd: () => void;
  finishRefresh: () => void;
}

export function usePullToRefresh({
  onRefresh,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullState, setPullState] = useState<PullState>(PullState.Idle);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const isPulling = pullState === PullState.Pulling;
  const isRefreshing =
    pullState === PullState.Refreshing || pullState === PullState.Finished;

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const onDragStart = useCallback(() => {
    if (pullState !== PullState.Idle) return;
    setPullState(PullState.Pulling);
  }, [pullState]);

  const onDragUpdate = useCallback(
    (translation: number) => {
      if (pullState === PullState.Refreshing || pullState === PullState.Finished) {
        return;
      }

      const clampedTranslation = Math.max(0, Math.min(translation, PULL_DISTANCE));
      const progress = clampedTranslation / PULL_THRESHOLD;

      // Atualizar translateY
      translateY.value = clampedTranslation * 0.5;

      // Atualizar scale com easing suave
      const scaleValue = 0.7 + Math.min(progress * 0.3, 0.3);
      scale.value = scaleValue;

      // Atualizar opacity
      opacity.value = Math.min(progress, 1);

      // Rotação suave enquanto puxa
      rotation.value = progress * 360;

      // Mudar estado para Ready se ultrapassar o threshold
      if (clampedTranslation >= PULL_THRESHOLD && pullState === PullState.Pulling) {
        setPullState(PullState.Ready);
      } else if (
        clampedTranslation < PULL_THRESHOLD &&
        pullState === PullState.Ready
      ) {
        setPullState(PullState.Pulling);
      }
    },
    [pullState, translateY, scale, opacity, rotation]
  );

  const onDragEnd = useCallback(async () => {
    if (pullState !== PullState.Ready) {
      // Voltar ao estado idle com animação
      translateY.value = withSpring(0, { damping: 10, mass: 1 });
      scale.value = withSpring(0.7, { damping: 10, mass: 1 });
      opacity.value = withTiming(0, { duration: 200 });
      rotation.value = withSpring(0, { damping: 10, mass: 1 });
      setPullState(PullState.Idle);
      return;
    }

    // User released at ready state - start refresh
    setPullState(PullState.Refreshing);

    // Posicionar o indicador no topo
    translateY.value = withSpring(60, { damping: 12, mass: 1 });
    scale.value = withSpring(1, { damping: 10, mass: 1 });

    try {
      // Executar a função de refresh
      refreshPromiseRef.current = onRefresh();
      await refreshPromiseRef.current;
      setPullState(PullState.Finished);

      // Animação de sucesso - spinner desaparece suavemente
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Voltar ao idle
      translateY.value = withSpring(0, { damping: 10, mass: 1 });
      scale.value = withSpring(0.7, { damping: 10, mass: 1 });
      opacity.value = withTiming(0, { duration: 300 });
      rotation.value = withSpring(0, { damping: 10, mass: 1 });

      setPullState(PullState.Idle);
    } catch (error) {
      // Em caso de erro, também volta ao idle
      console.error('Pull to refresh error:', error);
      translateY.value = withSpring(0, { damping: 10, mass: 1 });
      scale.value = withSpring(0.7, { damping: 10, mass: 1 });
      opacity.value = withTiming(0, { duration: 300 });
      rotation.value = withSpring(0, { damping: 10, mass: 1 });
      setPullState(PullState.Idle);
    }
  }, [pullState, translateY, scale, opacity, rotation, onRefresh]);

  const finishRefresh = useCallback(() => {
    if (pullState === PullState.Refreshing) {
      setPullState(PullState.Finished);
    }
  }, [pullState]);

  return {
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
  };
}
