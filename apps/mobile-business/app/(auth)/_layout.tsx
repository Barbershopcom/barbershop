import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/lib/session';

/**
 * Layout das telas públicas (login, sem-vínculo).
 * Se já está linkado, redireciona pra área autenticada.
 */
export default function AuthLayout() {
  const { state } = useSession();

  if (state.status === 'linked') {
    return <Redirect href="/inicio" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
