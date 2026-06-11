import type { CouponDto, CreateCouponInput } from '@barbearia/schemas';
import { Plus, Tag, Ticket, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Header, initialsOf } from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

type DiscountType = 'percent' | 'fixed';

function describeDiscount(c: CouponDto): string {
  return c.discountType === 'percent'
    ? `${(c.discountValue / 100).toFixed(c.discountValue % 100 === 0 ? 0 : 2)}% OFF`
    : `R$ ${(c.discountValue / 100).toFixed(2)} OFF`;
}

export default function CuponsScreen() {
  const { state } = useSession();
  const [items, setItems] = useState<CouponDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // form
  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('percent');
  const [value, setValue] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      setItems(await api.get<CouponDto[]>('/admin/coupons'));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar cupons');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state.status !== 'linked') return null;

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function create() {
    setFormError(null);
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 3) {
      setFormError('Código precisa de ao menos 3 caracteres.');
      return;
    }
    const num = Number(value.replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) {
      setFormError('Informe um valor de desconto válido.');
      return;
    }
    // percent: usuário digita % → basis points; fixed: reais → centavos.
    const discountValue = type === 'percent' ? Math.round(num * 100) : Math.round(num * 100);
    if (type === 'percent' && discountValue > 10000) {
      setFormError('Percentual não pode passar de 100%.');
      return;
    }
    const max = maxRedemptions.trim() ? Number(maxRedemptions) : undefined;
    if (max !== undefined && (!Number.isInteger(max) || max <= 0)) {
      setFormError('Limite de usos deve ser um inteiro positivo.');
      return;
    }

    setSaving(true);
    try {
      const body: CreateCouponInput = {
        code: trimmedCode,
        discountType: type,
        discountValue,
        ...(max !== undefined ? { maxRedemptions: max } : {}),
      };
      await api.post<CouponDto>('/admin/coupons', body);
      setCode('');
      setValue('');
      setMaxRedemptions('');
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível criar o cupom.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: CouponDto) {
    try {
      await api.patch<CouponDto>(`/admin/coupons/${c.id}`, { isActive: !c.isActive });
      await refresh();
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível atualizar.');
    }
  }

  function confirmRemove(c: CouponDto) {
    Alert.alert('Remover cupom?', `${c.code} — ${describeDiscount(c)}`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          api
            .delete(`/admin/coupons/${c.id}`)
            .then(() => refresh())
            .catch((err) =>
              Alert.alert(
                'Erro',
                err instanceof ApiError ? err.message : 'Não foi possível remover.',
              ),
            );
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-background-muted">
      <Header
        caption="Cupons"
        title="Promoções"
        avatarInitial={initialsOf(state.employee.displayName)}
      />

      <ScrollView
        className="flex-1 rounded-t-3xl bg-background"
        contentContainerClassName="px-6 py-6 pb-32 gap-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1a365d" />
        }
      >
        <Text className="text-xs text-foreground-muted">
          Crie códigos de desconto pros clientes aplicarem no agendamento.
        </Text>

        {/* Form */}
        <View className="gap-3 rounded-lg border border-border bg-background-muted p-4">
          <Text className="text-sm font-semibold text-foreground">Novo cupom</Text>

          <View className="gap-1">
            <Text className="text-xs text-foreground-muted">Código</Text>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="DESCONTO10"
              placeholderTextColor="#8a8073"
              editable={!saving}
              maxLength={32}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs text-foreground-muted">Tipo de desconto</Text>
            <View className="flex-row gap-2">
              <TypePill label="Percentual (%)" active={type === 'percent'} onPress={() => setType('percent')} />
              <TypePill label="Valor (R$)" active={type === 'fixed'} onPress={() => setType('fixed')} />
            </View>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 gap-1">
              <Text className="text-xs text-foreground-muted">
                {type === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}
              </Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                placeholder={type === 'percent' ? '10' : '15,00'}
                placeholderTextColor="#8a8073"
                editable={!saving}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-xs text-foreground-muted">Limite de usos (opcional)</Text>
              <TextInput
                value={maxRedemptions}
                onChangeText={(v) => setMaxRedemptions(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="ilimitado"
                placeholderTextColor="#8a8073"
                editable={!saving}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </View>
          </View>

          {formError ? (
            <Text className="text-sm text-destructive" accessibilityRole="alert">
              {formError}
            </Text>
          ) : null}

          <Pressable
            onPress={create}
            disabled={saving}
            className="mt-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-3 active:opacity-80 disabled:opacity-40"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Plus size={16} color="white" />
                <Text className="text-base font-bold text-white">Criar cupom</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Lista */}
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Cupons
          </Text>
          {loadError ? (
            <Text className="text-sm text-destructive">{loadError}</Text>
          ) : items === null ? (
            <View className="items-center py-6">
              <ActivityIndicator color="#1a365d" />
            </View>
          ) : items.length === 0 ? (
            <View className="items-center gap-2 py-8">
              <Ticket size={28} color="#8a8073" strokeWidth={1.5} />
              <Text className="text-sm text-foreground-muted">Nenhum cupom criado.</Text>
            </View>
          ) : (
            items.map((c) => (
              <View
                key={c.id}
                className="flex-row items-center gap-3 rounded-lg border border-border bg-background p-4"
              >
                <View className="h-10 w-10 items-center justify-center rounded-md bg-background-muted">
                  <Tag size={18} color="#1a365d" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{c.code}</Text>
                  <Text className="text-xs text-foreground-muted">
                    {describeDiscount(c)}
                    {c.maxRedemptions !== null
                      ? ` · ${c.timesRedeemed}/${c.maxRedemptions} usados`
                      : ` · ${c.timesRedeemed} usados`}
                  </Text>
                </View>
                <Switch value={c.isActive} onValueChange={() => toggleActive(c)} />
                <Pressable
                  onPress={() => confirmRemove(c)}
                  className="h-9 w-9 items-center justify-center rounded-md active:opacity-60"
                  accessibilityLabel="Remover cupom"
                >
                  <Trash2 size={16} color="#8a8073" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TypePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-md border px-3 py-2 ${
        active ? 'border-primary bg-primary/10' : 'border-border bg-background'
      }`}
    >
      <Text className={`text-sm font-medium ${active ? 'text-primary' : 'text-foreground-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
