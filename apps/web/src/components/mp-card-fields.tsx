'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { getMercadoPago, type MercadoPagoInstance } from '@/lib/mercadopago';

/**
 * Campos de cartão do Mercado Pago (Secure Fields). Os inputs reais são
 * iframes hospedados pelo MP — o PAN nunca toca nosso código. O pai chama
 * `ref.current.tokenize(...)` pra obter o cardTokenId antes de submeter.
 *
 * ⚠️ Requer NEXT_PUBLIC_MP_PUBLIC_KEY e verificação ao vivo com cartões de
 * teste do MP.
 */

export interface MpCardFieldsHandle {
  /** Tokeniza o cartão e devolve o cardTokenId, ou lança em caso de erro. */
  tokenize: (cardholderName: string, cpf: string) => Promise<string>;
  ready: boolean;
}

const FIELD_CLASS =
  'h-10 rounded-md border border-input bg-background px-3 py-2 text-sm [&>iframe]:h-full [&>iframe]:w-full';

export const MpCardFields = forwardRef<MpCardFieldsHandle>(function MpCardFields(_props, ref) {
  const mpRef = useRef<MercadoPagoInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mp = await getMercadoPago();
        if (cancelled) return;
        mp.fields.create('cardNumber', { placeholder: 'Número do cartão' }).mount('mp-card-number');
        mp.fields.create('expirationDate', { placeholder: 'MM/AA' }).mount('mp-card-expiration');
        mp.fields.create('securityCode', { placeholder: 'CVV' }).mount('mp-card-cvv');
        mpRef.current = mp;
        setReady(true);
      } catch (err) {
        // Detalhe técnico só no console; usuário vê mensagem amigável em PT.
        console.error('[MercadoPago] falha ao montar campos de cartão:', err);
        if (!cancelled) {
          setError('Não foi possível carregar o pagamento agora. Recarregue a página e tente de novo.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      ready,
      tokenize: async (cardholderName: string, cpf: string) => {
        const mp = mpRef.current;
        if (!mp) throw new Error('O formulário de cartão ainda está carregando. Aguarde um instante e tente de novo.');
        let token: { id: string };
        try {
          token = await mp.fields.createCardToken({
            cardholderName,
            identificationType: 'CPF',
            identificationNumber: cpf.replace(/\D/g, ''),
          });
        } catch (err) {
          // MP pode devolver erro técnico/inglês; loga e mostra PT amigável.
          console.error('[MercadoPago] createCardToken falhou:', err);
          throw new Error('Não foi possível validar o cartão. Confira o número, validade e CVV e tente de novo.');
        }
        if (!token?.id) throw new Error('Não foi possível validar o cartão. Confira os dados e tente de novo.');
        return token.id;
      },
    }),
    [ready],
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Número do cartão</label>
        <div id="mp-card-number" className={FIELD_CLASS} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Validade</label>
          <div id="mp-card-expiration" className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">CVV</label>
          <div id="mp-card-cvv" className={FIELD_CLASS} />
        </div>
      </div>
      {!ready && !error ? (
        <p className="text-xs text-muted-foreground">Carregando formulário de cartão…</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
});
