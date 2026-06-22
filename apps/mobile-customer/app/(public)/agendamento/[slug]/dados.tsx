import type { MyCustomerProfile } from '@barbearia/schemas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ApiError } from '@/lib/api';
import { useBooking } from '@/lib/booking-context';
import { toE164 } from '@/lib/format';
import { useSession } from '@/lib/session';

/**
 * Passo "Confirmar seus dados" — entre data-hora e pagamento.
 *
 * Pré-preenche nome/telefone do perfil do cliente (GET /me/customer) e o
 * email da sessão. O POST de booking exige nome + telefone E.164; aqui
 * eles são capturados (1ª vez) e persistidos no perfil (PATCH) pra reuso.
 */
export default function DadosScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const booking = useBooking();
  const session = useSession();

  const sessionEmail =
    session.state.status === 'authenticated'
      ? session.state.session.user.email ?? null
      : null;
  const isAuthenticated = session.state.status === 'authenticated';

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-preenche do perfil (se logado) + sessão.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (booking.state.customerEmail || sessionEmail) {
        setEmail(booking.state.customerEmail ?? sessionEmail ?? '');
      }
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        const profile = await api.get<MyCustomerProfile>('/me/customer');
        if (cancelled) return;
        if (profile.displayName && profile.displayName !== 'Cliente') {
          setName(profile.displayName);
        }
        if (profile.phoneE164) setPhone(profile.phoneE164);
        if (profile.email) setEmail((prev) => prev || profile.email!);
      } catch {
        // Sem perfil ainda — segue com campos vazios pra captura.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Informe seu nome completo.');
      return;
    }
    const e164 = toE164(phone);
    if (!e164) {
      setError('Telefone inválido. Ex: (11) 99999-9999.');
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Email inválido.');
      return;
    }

    setBusy(true);
    try {
      // Persiste no perfil pra reuso (só se logado). Best-effort: se falhar,
      // o booking ainda segue com os dados em memória.
      if (isAuthenticated) {
        try {
          await api.patch('/me/customer', {
            displayName: trimmedName,
            phoneE164: e164,
          });
        } catch (err) {
          if (!(err instanceof ApiError)) throw err;
        }
      }
      booking.setCustomer(trimmedName, e164, trimmedEmail || null);
      router.push(`/(public)/agendamento/${encodeURIComponent(slug)}/pagamento`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      {/* Header */}
      <View className="border-b border-border bg-card px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1a365d" />
          </Pressable>
          <Text className="font-display text-lg font-bold uppercase">AGENDAR</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView contentContainerClassName="p-6 pb-24">
        <View className="mb-6">
          <Text className="font-display text-lg font-bold uppercase text-foreground">
            SEUS DADOS
          </Text>
          <Text className="mt-1 font-serif text-sm italic text-foreground-muted">
            Pra confirmar a reserva e te avisar
          </Text>
        </View>

        <View className="gap-4">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-foreground">Seu nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="João da Silva"
              placeholderTextColor="#8a8073"
              editable={!busy}
              className="rounded-md border border-border bg-card px-3 py-2.5 text-base text-foreground"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-foreground">Telefone (WhatsApp)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              placeholderTextColor="#8a8073"
              editable={!busy}
              className="rounded-md border border-border bg-card px-3 py-2.5 text-base text-foreground"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-foreground">
              Email <Text className="text-xs text-foreground-muted">(opcional)</Text>
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="voce@email.com"
              placeholderTextColor="#8a8073"
              editable={!busy}
              className="rounded-md border border-border bg-card px-3 py-2.5 text-base text-foreground"
            />
          </View>

          {error ? (
            <View className="rounded-md bg-red-50 px-3 py-2">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
        <Pressable
          onPress={handleContinue}
          disabled={busy}
          className={`items-center justify-center rounded-lg py-4 ${
            busy ? 'bg-foreground-muted/30' : 'bg-navy active:opacity-80'
          }`}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-display text-base font-bold text-white">
              Ir para pagamento →
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
