'use client';

import { Check, Copy, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useActiveTenant } from '@/lib/active-tenant';

interface TenantProfile {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  phoneE164: string | null;
  addressLine: string | null;
  instagramHandle: string | null;
  lateCancelFeePct?: number | null;
}

export default function PerfilPage() {
  const { tenant, refresh } = useActiveTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const appLink = `${process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ?? 'https://appbarbeariab.com'}/b/${tenant.slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(appLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: selecionar texto manualmente
    }
  }

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [instagram, setInstagram] = useState('');
  const [lateCancelFeePct, setLateCancelFeePct] = useState<number>(50);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TenantProfile>('/admin/tenant/me')
      .then((data) => {
        if (cancelled) return;
        setName(data.name);
        setPhone(data.phoneE164 ?? '');
        setAddress(data.addressLine ?? '');
        setInstagram(data.instagramHandle ?? '');
        setLateCancelFeePct(data.lateCancelFeePct ?? 50);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar perfil');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Nome precisa ter pelo menos 2 caracteres.');
      return;
    }
    const phoneNormalized = phone.trim() ? toE164(phone) : null;
    if (phone.trim() && !phoneNormalized) {
      setError('Telefone inválido. Use formato (11) 99999-9999 ou +5511999999999.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/admin/tenant/me', {
        name: trimmedName,
        phoneE164: phoneNormalized,
        addressLine: address.trim() ? address.trim() : null,
        instagramHandle: instagram.trim() ? instagram.trim() : null,
        lateCancelFeePct,
      });
      setSuccess(true);
      await refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-center text-sm text-muted-foreground">Carregando...</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil da barbearia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esses dados aparecem na landing pública (
          <span className="font-mono text-xs">/b/{tenant.slug}</span>) e nos
          emails enviados aos clientes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Link do app do cliente</CardTitle>
          <CardDescription>
            Envie esse link para seus clientes acessarem o app de agendamento da
            sua barbearia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm font-mono">
              {appLink}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base">Informações públicas</CardTitle>
            <CardDescription>
              Tudo opcional exceto o nome. Preencha o que fizer sentido pra
              sua barbearia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da barbearia</Label>
              <Input
                id="name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Telefone / WhatsApp{' '}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Aparece como botão &ldquo;Chamar no WhatsApp&rdquo; na landing.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">
                Endereço{' '}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua das Tesouras, 123 — Centro"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instagram">
                Instagram{' '}
                <span className="text-xs text-muted-foreground">(opcional, sem @)</span>
              </Label>
              <Input
                id="instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="barbearia_jaja"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lateCancelFeePct">
                Multa de cancelamento tardio (%)
              </Label>
              <Input
                id="lateCancelFeePct"
                type="number"
                min={0}
                max={100}
                value={lateCancelFeePct}
                onChange={(e) => setLateCancelFeePct(Number(e.target.value))}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                % do valor do serviço cobrada quando o cliente cancela com menos de 24h (0–100).
              </p>
            </div>

            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Perfil atualizado com sucesso.
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

/**
 * Aceita BR comum (`(11) 99999-9999`, `11 99999-9999`, `11999999999`)
 * e devolve E.164 (`+5511999999999`). Retorna null se inválido.
 */
function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if (digits.length === 12 || digits.length === 13) return `+${digits}`;
  return null;
}
