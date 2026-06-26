'use client';

/**
 * Loader + helpers do SDK do Mercado Pago (tokenização de cartão no cliente).
 *
 * O número do cartão (PAN) NUNCA passa pelo nosso backend: os campos são
 * iframes hospedados pelo MP (Secure Fields), e só o token (cardTokenId)
 * volta pra gente. Exige NEXT_PUBLIC_MP_PUBLIC_KEY.
 *
 * ⚠️ Precisa de verificação ao vivo (public key + cartões de teste do MP) —
 * a API exata do SDK pode exigir ajuste fino no fluxo real.
 */

const SDK_SRC = 'https://sdk.mercadopago.com/js/v2';

let sdkPromise: Promise<void> | null = null;

/** Carrega o script do SDK do MP uma única vez (idempotente). */
export function loadMercadoPagoSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    if ((window as unknown as { MercadoPago?: unknown }).MercadoPago) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o SDK do Mercado Pago.')));
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o SDK do Mercado Pago.'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/** Tipos mínimos do SDK que usamos (o SDK não traz tipos oficiais por npm). */
interface MpField {
  mount: (containerId: string) => void;
  unmount: () => void;
}
interface MpFields {
  create: (type: 'cardNumber' | 'expirationDate' | 'securityCode', opts?: Record<string, unknown>) => MpField;
  createCardToken: (data: {
    cardholderName: string;
    identificationType: string;
    identificationNumber: string;
  }) => Promise<{ id: string }>;
}
export interface MercadoPagoInstance {
  fields: MpFields;
}

/** Instancia o MP com a public key pública (locale pt-BR). */
export async function getMercadoPago(): Promise<MercadoPagoInstance> {
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('NEXT_PUBLIC_MP_PUBLIC_KEY não configurada.');
  }
  await loadMercadoPagoSdk();
  const Ctor = (window as unknown as {
    MercadoPago: new (key: string, opts?: { locale?: string }) => MercadoPagoInstance;
  }).MercadoPago;
  return new Ctor(publicKey, { locale: 'pt-BR' });
}
