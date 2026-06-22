import { Stack } from 'expo-router';

export default function AgendamentoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="barbeiro" />
      <Stack.Screen name="data-hora" />
      <Stack.Screen name="dados" />
      <Stack.Screen name="pagamento" />
      <Stack.Screen name="pix" />
      <Stack.Screen name="sucesso" />
    </Stack>
  );
}
