# Pull-to-Refresh Customizado Premium

Componente React Native de Pull-to-Refresh com animações premium, usando Reanimated v3 e Gesture Handler.

## 📋 Arquitetura

```
src/
├── hooks/
│   └── use-pull-to-refresh.ts        # Hook que gerencia lógica + animações
├── components/
│   ├── PullToRefresh.tsx             # Componente principal wrapper
│   └── PullToRefreshIndicator.tsx    # Indicador visual animado
```

## 🚀 Como Usar

### Basic Usage

```tsx
import { PullToRefresh } from '@/components/PullToRefresh';

export default function HomeScreen() {
  async function handleRefresh() {
    await api.get('/public/discover');
    await api.get('/public/promotions');
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <View>
        {/* Seu conteúdo aqui */}
      </View>
    </PullToRefresh>
  );
}
```

### Com mais opções

```tsx
<PullToRefresh
  onRefresh={handleRefresh}
  refreshing={isLoading}
  threshold={80}
  scrollEventThrottle={16}
  showsVerticalScrollIndicator={true}
  onScrollBeginDrag={handleScrollStart}
>
  <ScrollView contentContainerClassName="pb-6">
    {/* conteúdo */}
  </ScrollView>
</PullToRefresh>
```

## 🎨 Estados Visuais

O componente passa por 5 estados:

1. **Idle** - Tela em repouso
   - Ícone invisível (opacity: 0)
   - Escala: 0.7
   - Nada acontece

2. **Pulling** - Usuário está puxando (< threshold)
   - Ícone aparece gradualmente
   - Escala cresce de 0.7 a 1.0
   - Rotação acompanha o movimento
   - Cor: cinza (#8a8073)

3. **Ready** - Ultrapassou threshold, pronto para refresh
   - Ícone muda de cor (azul #1a365d)
   - Fundo fica azul claro
   - Feedback visual de "solte para atualizar"

4. **Refreshing** - Executando onRefresh()
   - Ícone fica animado girando
   - Posicionado no topo (translateY: 60)
   - Aguardando Promise resolver

5. **Finished** - onRefresh() completo
   - Animação suave de retorno
   - Volta ao estado Idle

## 📐 Técnicas de Animação

### Reanimated v3 Features Usadas

- **useSharedValue**: Valores animados compartilhados entre JS e nativo
- **useAnimatedStyle**: Estilo derivado de valores compartilhados
- **withSpring**: Animação suave com efeito de mola
- **withTiming**: Animação linear com duração customizada
- **useAnimatedReaction**: Reações a mudanças de valores
- **runOnJS**: Executar funções JS de callbacks do worklet

### Interpolação

```ts
// Exemplo: scale cresce conforme o usuário puxa
const scaleValue = 0.7 + Math.min(progress * 0.3, 0.3);
scale.value = scaleValue;

// Rotação acompanha o pull
rotation.value = progress * 360;
```

## ⚡ Performance

### Otimizações aplicadas

1. **React.memo** - Componente não re-renderiza desnecessariamente
2. **useMemo** - Gesture criado uma única vez
3. **Worklet** - Animações rodam no thread nativo (60fps)
4. **ScrollEventThrottle** - Eventos de scroll limitados a 16ms
5. **runOnJS** - Apenas funções necessárias rodam em JS

### Métricas esperadas

- Scroll fluido: 60fps
- Animações: 60fps
- Sem jank ou flicker
- Memory: ~2-3MB com componente

## 🎯 Threshold e Distância

```ts
const PULL_THRESHOLD = 80;     // px necessários para triggerar
const PULL_DISTANCE = 120;     // px máximo de drag
```

- Usuário precisa puxar 80px para ativar refresh
- Máximo de drag é 120px (mais puxa, não faz diferença)
- Customizável via prop `threshold`

## 🔧 Customizações Avançadas

### Mudar cores

Edit `PullToRefreshIndicator.tsx`:

```tsx
// Cor do fundo quando ready
bg-blue-100  // customize aqui

// Cor do ícone
color={pullState === PullState.Ready ? '#1a365d' : '#8a8073'}
```

### Mudar ícone

A função `ArrowDownIcon()` renderiza um SVG inline. Customize o SVG conforme necessário.

### Ajustar animações

Edit `use-pull-to-refresh.ts`:

```ts
// Spring damping (quanto mais baixo, mais "bouncy")
withSpring(0, { damping: 10, mass: 1 })

// Timing easing
withTiming(0, { duration: 200, easing: Easing.ease })
```

## ⚠️ Edge Cases

### 1. Scroll nested (FlatList inside PullToRefresh)

```tsx
<PullToRefresh onRefresh={handleRefresh}>
  <FlatList
    scrollEnabled={true}
    nestedScrollEnabled={true}
    data={items}
    renderItem={({item}) => <Card item={item} />}
  />
</PullToRefresh>
```

### 2. SafeArea

O componente já respeita SafeArea via `useSafeAreaInsets()` na tela pai.

### 3. Scroll em repouso

Apenas permite pull-to-refresh quando `contentOffset.y <= 0` (no topo).

### 4. Múltiplos rapidamente

Se usuario faz pull 2x rápido, o segundo é ignorado até voltar a Idle.

## 🐛 Debug

Para ver os estados em tempo real, add logging:

```ts
const onDragUpdate = useCallback((translation: number) => {
  console.log('Pull state:', pullState, 'Translation:', translation);
  // ... resto do código
}, [pullState]);
```

## 📱 Teste em dispositivos

```bash
# iOS
expo start --ios

# Android
expo start --android

# Web (não funciona, PullToRefresh é mobile-only)
```

## 🎬 Próximos passos

- [ ] Adicionar haptic feedback (vibração)
- [ ] Suportar múltiplos temas (dark mode)
- [ ] Refactor em componente do admin também
- [ ] Cache request batching
