/**
 * UUID v4 — tenta crypto.randomUUID (Hermes RN 0.74+) com fallback
 * Math.random. Não é cripto-seguro no fallback, mas suficiente pra
 * Idempotency-Key (ADR-005 §2 — escopo é dedup, não segredo).
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
