'use client';

import {
  brazilianStates,
  type CreateTenantOnboardingInput,
  createTenantOnboardingSchema,
} from '@barbearia/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Seal } from '@/components/ui/seal';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepFilled, setCepFilled] = useState(false);

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
      barbershop: { name: '', description: '' },
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

  /**
   * Transforma o que o usuário digita no campo de slug ao vivo: minúsculas,
   * espaços viram hífen, remove inválidos. NÃO tira hífen das pontas aqui
   * (senão "barbearia do " não vira "barbearia-do" ao continuar digitando);
   * a limpeza das pontas acontece no onBlur via generateSlugFromName.
   */
  function liveSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
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

      form.setValue('location.addressLine1', data.logradouro || '');
      form.setValue('location.addressLine2', (data.bairro || '') + (data.complemento ? ` - ${data.complemento}` : ''));
      form.setValue('location.city', data.localidade || '');
      form.setValue('location.state', data.uf || 'RJ');
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
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-destructive">
            Cadastro
          </span>
          <h1 className="font-display text-4xl uppercase tracking-wide text-foreground">
            Cadastre sua barbearia
          </h1>
          <p className="font-serif text-sm italic text-muted-foreground">
            Algumas informações pra deixar tudo pronto. Você pode ajustar depois.
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
          <Card>
            <CardContent className="pt-6">
              <Accordion
                type="multiple"
                defaultValue={['tenant', 'organization', 'location', 'barbershop']}
              >
                {/* --- Tenant --- */}
                <AccordionItem value="tenant">
                  <AccordionTrigger>Identificação</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="tenant.slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug (URL pública)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="barbearia-do-jaja"
                                {...field}
                                onChange={(e) => field.onChange(liveSlug(e.target.value))}
                                onBlur={() => {
                                  const cleaned = generateSlugFromName(field.value);
                                  if (cleaned !== field.value) {
                                    form.setValue('tenant.slug', cleaned, {
                                      shouldValidate: true,
                                    });
                                  }
                                  field.onBlur();
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Vai virar barbearia.app/b/{field.value || 'seu-slug'}
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
                                  const slug = generateSlugFromName(e.target.value);
                                  if (slug) {
                                    form.setValue('tenant.slug', slug);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* --- Organization --- */}
                <AccordionItem value="organization">
                  <AccordionTrigger>Marca</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="organization.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da marca</FormLabel>
                            <FormControl>
                              <Input placeholder="Barbearia do Jajá" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="organization.description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição (opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Conta um pouco sobre sua barbearia…"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* --- Location --- */}
                <AccordionItem value="location">
                  <AccordionTrigger>Endereço</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="location.name"
                        render={({ field }) => (
                          <FormItem>
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
                          <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua, número" {...field} disabled={cepFilled} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location.addressLine2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Sala, andar, ponto de referência" {...field} disabled={cepFilled} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name="location.city"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
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
                            <FormItem>
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
                      </div>
                      <FormField
                        control={form.control}
                        name="location.postalCode"
                        render={({ field }) => (
                          <FormItem>
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
                  </AccordionContent>
                </AccordionItem>

                {/* --- Barbershop --- */}
                <AccordionItem value="barbershop">
                  <AccordionTrigger>Unidade operacional</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="barbershop.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da barbearia</FormLabel>
                            <FormControl>
                              <Input placeholder="Barbearia do Jajá — Unidade 1" {...field} />
                            </FormControl>
                            <FormDescription>
                              Pode ser igual ao nome da marca se for unidade única.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="barbershop.description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição (opcional)</FormLabel>
                            <FormControl>
                              <Textarea rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
              {submitting ? 'Criando…' : 'Criar barbearia'}
            </Button>
          </div>
        </form>
        </Form>
      </main>
    </div>
  );
}
