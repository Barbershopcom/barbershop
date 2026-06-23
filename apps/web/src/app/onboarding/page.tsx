'use client';

import {
  brazilianStates,
  type CreateTenantOnboardingInput,
  createTenantOnboardingSchema,
} from '@barbearia/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Seal } from '@/components/ui/seal';
import { api, ApiError } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepFilled, setCepFilled] = useState(false);
  // Texto cru exibido no campo de slug (como o usuário digita: maiúsculas,
  // espaços). O valor salvo em tenant.slug é o resultado slugificado.
  const [slugDisplay, setSlugDisplay] = useState('');

  // Conta do dono: o onboarding cria a conta (Supabase) + a barbearia num
  // fluxo só. Se já houver sessão, escondemos os campos de conta.
  // null = ainda verificando; true/false = resultado.
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, []);

  const form = useForm<CreateTenantOnboardingInput>({
    resolver: zodResolver(createTenantOnboardingSchema),
    defaultValues: {
      tenant: { slug: '', name: '', timezone: 'America/Sao_Paulo' },
      organization: { name: '', description: '', logoUrl: '' },
      location: {
        name: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: 'RJ',
        postalCode: '',
        country: 'BR',
      },
      barbershop: { name: '', description: '', lateCancelFeePct: 15 },
    },
    mode: 'onBlur',
  });

  function generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function handleCepLookup(cep: string) {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;

    setCepLoading(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepError('CEP não encontrado');
        setCepFilled(false);
        return;
      }

      const opts = { shouldValidate: true, shouldDirty: true };
      form.setValue('location.addressLine1', data.logradouro || '', opts);
      form.setValue(
        'location.addressLine2',
        (data.bairro || '') + (data.complemento ? ` - ${data.complemento}` : ''),
        opts,
      );
      form.setValue('location.city', data.localidade || '', opts);
      form.setValue('location.state', data.uf || 'RJ', opts);
      setCepFilled(true);
    } catch (err) {
      setCepError('Erro ao buscar CEP. Preencha manualmente.');
      setCepFilled(false);
    } finally {
      setCepLoading(false);
    }
  }

  async function onSubmit(values: CreateTenantOnboardingInput) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Sem sessão: cria a conta no Supabase antes de criar a barbearia.
      if (!hasSession) {
        const email = accountEmail.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setSubmitError('Informe um email válido para criar sua conta.');
          return;
        }
        if (accountPassword.length < 6) {
          setSubmitError('A senha deve ter pelo menos 6 caracteres.');
          return;
        }
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password: accountPassword,
        });
        if (error) {
          setSubmitError(error.message);
          return;
        }
        // Sem session = projeto exige confirmação de email. Não dá pra
        // criar a barbearia ainda (o POST iria dar 401).
        if (!data.session) {
          setSubmitError(
            'Conta criada! Confirme seu email (verifique a caixa de entrada) e depois entre em /login para criar sua barbearia.',
          );
          return;
        }
        setHasSession(true);
      }

      // Limpa campos opcionais vazios antes de enviar
      const payload = {
        ...values,
        organization: {
          ...values.organization,
          description: values.organization.description?.trim() || undefined,
          logoUrl: values.organization.logoUrl?.trim() || undefined,
        },
        location: {
          ...values.location,
          addressLine2: values.location.addressLine2?.trim() || undefined,
        },
        barbershop: {
          ...values.barbershop,
          description: values.barbershop.description?.trim() || undefined,
        },
      };
      await api.post('/onboarding/tenant', payload);
      router.replace('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Erro inesperado ao criar a barbearia.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Rail navy (desktop) — Seal + passos + stripe barber-pole. */}
      <aside className="relative hidden w-80 shrink-0 overflow-hidden bg-primary p-10 text-papel lg:flex lg:flex-col">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: 'repeating-linear-gradient(-45deg, #fff 0 16px, transparent 16px 36px)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <Seal size={40} />
          <b className="font-display text-2xl tracking-wider text-papel">NAVALHA</b>
        </div>
        <div className="relative mt-12">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-dourado">
            Quase lá
          </span>
          <h2 className="mt-3 font-display text-4xl uppercase leading-none tracking-wide">
            Monte sua barbearia em minutos.
          </h2>
          <p className="mt-4 font-serif text-base italic text-papel/75">
            Preencha os dados abaixo e já saia com a página de agendamento no ar. Dá pra ajustar
            tudo depois.
          </p>
        </div>
        <div
          className="relative mt-auto h-[7px] rounded-full"
          style={{
            background:
              'repeating-linear-gradient(-45deg, #bf212f 0 13px, #fffcf5 13px 26px, #1a365d 26px 39px, #fffcf5 39px 52px)',
          }}
        />
      </aside>

      {/* Conteúdo */}
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
            Cadastro
          </span>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Cadastre sua barbearia
          </h1>
          <p className="font-serif text-sm italic text-muted-foreground">
            Você pode ajustar tudo depois.
          </p>
        </div>

        <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            // Surface silent validation failures que poderiam acontecer em
            // campos sem input visível (ex: default '' em field com .url()).
            const flat = Object.entries(errors)
              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
              .join(' · ');
            setSubmitError(`Validação falhou — ${flat}`);
          })}
          className="space-y-6"
        >
          {hasSession === false ? (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
                  Sua conta
                </h2>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account-email">Email</Label>
                    <Input
                      id="account-email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-password">Senha</Label>
                    <Input
                      id="account-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="mínimo 6 caracteres"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* --- Identificação & marca --- */}
              <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
                  Identificação
                </h2>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="tenant.slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug (URL pública)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Barbearia do Jajá"
                                name={field.name}
                                ref={field.ref}
                                value={slugDisplay}
                                onChange={(e) => {
                                  setSlugDisplay(e.target.value);
                                  form.setValue(
                                    'tenant.slug',
                                    generateSlugFromName(e.target.value),
                                    { shouldValidate: true },
                                  );
                                }}
                                onBlur={field.onBlur}
                              />
                            </FormControl>
                            <FormDescription>
                              Vai virar appbarbeariab.com/b/{field.value || 'seu-slug'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tenant.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome de fantasia</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Barbearia do Jajá"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setSlugDisplay(e.target.value);
                                  form.setValue(
                                    'tenant.slug',
                                    generateSlugFromName(e.target.value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="organization.name"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Nome da marca</FormLabel>
                            <FormControl>
                              <Input placeholder="Barbearia do Jajá" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </div>
              </section>

              {/* --- Endereço --- */}
              <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
                  Endereço
                </h2>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-6">
                      <FormField
                        control={form.control}
                        name="location.name"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-3">
                            <FormLabel>Apelido da unidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Matriz / Filial Centro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location.addressLine1"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-3">
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua, número" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location.addressLine2"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-6">
                            <FormLabel>Complemento (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Sala, andar, ponto de referência" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location.city"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={cepFilled} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location.state"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-1">
                            <FormLabel>UF</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                                disabled={cepFilled}
                              >
                                {brazilianStates.map((uf) => (
                                  <option key={uf} value={uf}>
                                    {uf}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location.postalCode"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-3">
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="00000-000"
                                  {...field}
                                  onChange={(e) => {
                                    const formatted = e.target.value
                                      .replace(/\D/g, '')
                                      .slice(0, 8)
                                      .replace(/(\d{5})(\d{3})/, '$1-$2');
                                    field.onChange(formatted);
                                    if (formatted.replace(/-/g, '').length === 8) {
                                      handleCepLookup(formatted);
                                    }
                                  }}
                                />
                                {cepLoading && (
                                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                                )}
                              </div>
                            </FormControl>
                            {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </div>
              </section>

              {/* --- Sua barbearia --- */}
              <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
                  Sua barbearia
                </h2>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="barbershop.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da barbearia</FormLabel>
                            <FormControl>
                              <Input placeholder="Barbearia do Jajá — Unidade 1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="barbershop.lateCancelFeePct"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Multa de cancelamento tardio (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                {...field}
                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormDescription>
                              % do valor do serviço cobrada quando o cliente cancela com menos de 24h. Padrão: 15%.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </div>
              </section>
            </CardContent>
          </Card>

          {submitError ? (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-base">Não foi possível criar</CardTitle>
                <CardDescription className="text-destructive">{submitError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting
                ? 'Criando…'
                : hasSession === false
                  ? 'Criar conta e barbearia'
                  : 'Criar barbearia'}
            </Button>
          </div>
        </form>
        </Form>
      </main>
    </div>
  );
}
