'use client';

import {
  brazilianStates,
  type CreateTenantOnboardingInput,
  createTenantOnboardingSchema,
} from '@barbearia/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        state: 'SP',
        postalCode: '',
        country: 'BR',
      },
      barbershop: { name: '', description: '' },
    },
    mode: 'onBlur',
  });

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Cadastre sua barbearia</h1>
        <p className="text-sm text-muted-foreground">
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
                              <Input placeholder="barbearia-do-ze" {...field} />
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
                              <Input placeholder="Barbearia do Zé" {...field} />
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
                              <Input placeholder="Barbearia do Zé" {...field} />
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
                          <FormItem>
                            <FormLabel>Complemento (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Sala, andar, ponto de referência" {...field} />
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
                                <Input {...field} />
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
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  {...field}
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
                              <Input placeholder="00000-000" {...field} />
                            </FormControl>
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
                              <Input placeholder="Barbearia do Zé — Matriz" {...field} />
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
  );
}
