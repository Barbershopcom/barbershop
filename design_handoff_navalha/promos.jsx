// pix-payment.jsx — A13 Processando pagamento (Pix flow), vintage style.
// Exports to window: PixPayment.
// Self-contained (own helpers, no collision with vintage-checkout globals).

const { useState, useEffect, useRef, useMemo } = React;

const brlPix = (n) =>
  'R$\u00a0' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const TOTAL = 76.0;
// realistic-looking Pix copia-e-cola (BR Code / EMV) sample
const PIX_CODE =
  '00020126580014br.gov.bcb.pix0136a1b2c3d4-5e6f-7g8h-9i0j-jaja0427520400005303986540576.005802BR5921BARBEARIA DO JAJA SP6009SAO PAULO62120508JAJA04276304B1A7';

// ── deterministic faux-QR matrix (looks like a real QR at a glance) ──
function useQrMatrix(seedStr, n = 29) {
  return useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    const g = Array.from({ length: n }, () => Array(n).fill(false));
    const inFinder = (r, c) => {
      const z = [[0, 0], [0, n - 7], [n - 7, 0]];
      return z.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
    };
    // finder patterns (7x7 with ring + 3x3 core)
    const drawFinder = (fr, fc) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        g[fr + r][fc + c] = ring || core;
      }
    };
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (inFinder(r, c)) continue;
      g[r][c] = rnd() > 0.52;
    }
    drawFinder(0, 0); drawFinder(0, n - 7); drawFinder(n - 7, 0);
    // timing-ish dots + a small alignment block for verisimilitude
    for (let i = 8; i < n - 8; i++) { g[6][i] = i % 2 === 0; g[i][6] = i % 2 === 0; }
    for (let r = n - 9; r < n - 4; r++) for (let c = n - 9; c < n - 4; c++) {
      const ring = r === n - 9 || r === n - 5 || c === n - 9 || c === n - 5;
      const core = r === n - 7 && c === n - 7;
      g[r][c] = ring || core;
    }
    return g;
  }, [seedStr, n]);
}

function QrCode({ size = 188, dark }) {
  const n = 29;
  const m = useQrMatrix(PIX_CODE, n);
  const cell = size / n;
  const fg = '#1c1917';
  return (
    <div style={{ width: size, height: size, background: '#fff', borderRadius: 10, padding: 0, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
        {m.map((row, r) => row.map((on, c) =>
          on ? <rect key={r + '-' + c} x={c * cell} y={r * cell} width={cell + 0.5} height={cell + 0.5} fill={fg} /> : null
        ))}
      </svg>
      {/* center brand chip */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 34, height: 34, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 3px #fff' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1f8a5b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.2l3.5 3.5a3 3 0 0 0 4.2 0M12 20.8l3.5-3.5a3 3 0 0 1 4.2 0M12 3.2L8.5 6.7a3 3 0 0 1-4.2 0M12 20.8l-3.5-3.5a3 3 0 0 0-4.2 0" />
          <rect x="9" y="9" width="6" height="6" rx="1.4" transform="rotate(45 12 12)" />
        </svg>
      </div>
    </div>
  );
}

function BarberPoleP({ w = 12, h = 30 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 999,
      border: '1.5px solid var(--frame)', overflow: 'hidden',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 5px, var(--papel) 5px 10px, var(--navy) 10px 15px, var(--papel) 15px 20px)',
      boxShadow: 'inset 0 0 0 2px var(--papel)' }} />
  );
}

const mm = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ── result overlays ──────────────────────────────────────────
function PaidOverlay({ onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'cfade .35s ease' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 34px', textAlign: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 26 }}>
          <span style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '1.5px dashed var(--dourado)', animation: 'cspin 9s linear infinite' }} />
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(31,138,107,.35)' }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 38, lineHeight: 0.95, letterSpacing: 0.5, color: 'var(--frame-ink)' }}>PIX CONFIRMADO!</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink)', marginTop: 12, maxWidth: 280, lineHeight: 1.45 }}>
          Recebemos seu pagamento de {brlPix(TOTAL)}. Seu horário está aguardando a confirmação do Jajá.
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 18, padding: '7px 14px', borderRadius: 999, background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
          <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: 'var(--amber-ink)' }}>Pendente</span>
        </div>
      </div>
      <div style={{ padding: '0 18px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={btnP('var(--frame)')} onClick={onClose}>Ver meus agendamentos</button>
        <button style={btnGhostP()} onClick={onClose}>Voltar pra home</button>
      </div>
    </div>
  );
}

function ExpiredOverlay({ onRetry }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'cfade .35s ease' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 34px', textAlign: 'center' }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--tint)', border: '1.5px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 34, lineHeight: 0.95, letterSpacing: 0.5, color: 'var(--ink)' }}>O PIX EXPIROU</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--muted)', marginTop: 12, maxWidth: 280, lineHeight: 1.45 }}>
          O código tem validade de 10 minutos. Gere um novo pra concluir seu agendamento — seu horário ainda está reservado.
        </div>
      </div>
      <div style={{ padding: '0 18px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={btnP('var(--vermelho)')} onClick={onRetry}>Gerar novo código Pix</button>
        <button style={btnGhostP()} onClick={onRetry}>Trocar forma de pagamento</button>
      </div>
    </div>
  );
}

const btnP = (bg) => ({ width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer',
  background: bg, color: '#fff', fontFamily: 'var(--ui)', fontSize: 15.5, fontWeight: 700, letterSpacing: 0.2,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 });
const btnGhostP = () => ({ width: '100%', height: 50, borderRadius: 14, cursor: 'pointer', background: 'transparent',
  color: 'var(--ink)', border: '1.4px solid var(--hairline-strong)', fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 600 });

// ── instruction step ────────────────────────────────────────
function Step({ n, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <span style={{ width: 24, height: 24, flex: '0 0 auto', borderRadius: '50%', border: '1.5px solid var(--dourado)', color: 'var(--dourado-ink)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 15, letterSpacing: 0.5 }}>{n}</span>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.35 }}>{children}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
function PixPayment({ tweaks = {}, nav }) {
  const { simulate = 'pago', fast = true, dark = false } = tweaks;
  const FULL = 600; // 10 min
  const [left, setLeft] = useState(FULL - 2); // shows 09:58
  const [status, setStatus] = useState('waiting'); // waiting | paid | expired
  const [copied, setCopied] = useState(false);
  const [nonce, setNonce] = useState(0); // retry resets
  const tick = useRef(null);
  const resolveT = useRef(null);

  // countdown
  useEffect(() => {
    if (status !== 'waiting') return;
    tick.current = setInterval(() => {
      setLeft((s) => {
        const dec = fast ? 18 : 1; // fast demo burns the clock
        const next = s - dec;
        if (next <= 0) { clearInterval(tick.current); setStatus('expired'); return 0; }
        return next;
      });
    }, fast ? 250 : 1000);
    return () => clearInterval(tick.current);
  }, [status, fast, nonce]);

  // simulated polling result (auto only when NOT in the navigable prototype)
  useEffect(() => {
    if (status !== 'waiting') return;
    if (nav) return; // prototype: user taps "Já fiz o pagamento"
    if (simulate === 'pago') {
      resolveT.current = setTimeout(() => setStatus('paid'), fast ? 4200 : 9000);
      return () => clearTimeout(resolveT.current);
    }
    // simulate === 'expirar' → let the countdown reach 0 naturally (fast)
  }, [status, simulate, fast, nonce]);

  const retry = () => { clearInterval(tick.current); clearTimeout(resolveT.current); setLeft(FULL - 2); setNonce((x) => x + 1); setStatus('waiting'); };

  const copy = () => {
    setCopied(true);
    try { navigator.clipboard && navigator.clipboard.writeText(PIX_CODE); } catch (e) {}
    setTimeout(() => setCopied(false), 1900);
  };

  const pct = Math.max(0, left / FULL);
  const lowTime = left <= 120;

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* app bar */}
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 16, paddingRight: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--hairline)', background: 'var(--bg)', position: 'relative', zIndex: 5 }}>
        <button onClick={() => nav && nav('__back')} style={{ width: 38, height: 38, borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--display)', fontSize: 23, letterSpacing: 1, color: 'var(--ink)', whiteSpace: 'nowrap' }}>PAGAR COM PIX</span>
        <BarberPoleP w={13} h={30} />
      </div>

      {/* body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 18px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* amount + countdown */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}>Barbearia do Jajá · Comanda 0427</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 46, lineHeight: 1, letterSpacing: 0.5, color: 'var(--frame-ink)', marginTop: 4 }}>{brlPix(TOTAL)}</div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '6px 13px', borderRadius: 999,
          background: lowTime ? 'var(--red-bg)' : 'var(--amber-bg)', border: '1px solid ' + (lowTime ? 'var(--vermelho)' : 'var(--amber)') }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={lowTime ? 'var(--vermelho)' : 'var(--amber-ink)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: lowTime ? 'var(--vermelho-ink)' : 'var(--amber-ink)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>expira em {mm(left)}</span>
        </div>

        {/* QR card */}
        <div style={{ marginTop: 18, background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 18, padding: 16,
          boxShadow: '0 10px 24px rgba(28,25,23,.10)', position: 'relative' }}>
          {/* dourado corner ticks */}
          <div style={{ position: 'relative' }}>
            <QrCode size={188} />
          </div>
          <div style={{ textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--muted)', marginTop: 12 }}>
            Escaneie com o app do seu banco
          </div>
        </div>

        {/* copia e cola */}
        <div style={{ width: '100%', marginTop: 16 }}>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Pix copia e cola</div>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, border: '1.4px solid var(--hairline-strong)', borderRadius: 12, background: 'var(--tint)', padding: '11px 13px',
              fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
              {PIX_CODE}
            </div>
            <button onClick={copy} style={{ flex: '0 0 auto', width: 116, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: copied ? 'var(--green)' : 'var(--frame)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background .2s' }}>
              {copied ? (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>Copiado!</>
              ) : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>Copiar</>
              )}
            </button>
          </div>
        </div>

        {/* waiting indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 18 }}>
          <span style={{ position: 'relative', width: 10, height: 10 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--green)', animation: 'cping 1.4s ease-out infinite' }} />
          </span>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Aguardando pagamento…</span>
        </div>

        {/* prototype: manual confirm so the flow is user-driven */}
        {nav && status === 'waiting' && (
          <button onClick={() => nav('sucesso')} style={{ width: '100%', marginTop: 16, height: 50, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: 'var(--green)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(31,138,107,.26)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            Já fiz o pagamento
          </button>
        )}

        {/* steps */}
        <div style={{ width: '100%', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 11,
          borderTop: '1px dashed var(--hairline-strong)', paddingTop: 16 }}>
          <Step n="1">Abra o app do seu banco e escolha pagar via Pix.</Step>
          <Step n="2">Escaneie o QR ou cole o código copia e cola.</Step>
          <Step n="3">Confirme — a tela atualiza sozinha ao recebermos.</Step>
        </div>
      </div>

      {status === 'paid' && <PaidOverlay onClose={() => nav ? nav('sucesso') : setStatus('waiting')} />}
      {status === 'expired' && <ExpiredOverlay onRetry={retry} />}
    </div>
  );
}

window.PixPayment = PixPayment;
