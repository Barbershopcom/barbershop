// appointment-detail.jsx — A16 Detalhe do agendamento, vintage style.
// Exports to window: AppointmentDetail.
const { useState } = React;

const brlD = (n) => 'R$\u00a0' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const TOTAL_D = 76.0;

const STATUS_D = {
  pendente:   { label: 'Pendente',   base: '#F59E0B', tLight: '#9a6608', tDark: '#f2b44c' },
  confirmado: { label: 'Confirmado', base: '#1a365d', tLight: '#1a365d', tDark: '#8fb3e0' },
  concluido:  { label: 'Concluído',  base: '#10B981', tLight: '#0c6e4e', tDark: '#4cc38a' },
};
const ORDER = { pendente: 0, confirmado: 1, concluido: 2 };

function PoleD({ w = 11, h = 26 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 999, border: '1.4px solid var(--frame)', overflow: 'hidden',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 5px, var(--papel) 5px 10px, var(--navy) 10px 15px, var(--papel) 15px 20px)', boxShadow: 'inset 0 0 0 2px var(--papel)' }} />
  );
}

function BigBadge({ status, dark }) {
  const s = STATUS_D[status];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '8px 18px', borderRadius: 999,
      background: `color-mix(in srgb, ${s.base} 15%, transparent)`, border: `1.5px solid color-mix(in srgb, ${s.base} 42%, transparent)` }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.base }} />
      <span style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: dark ? s.tDark : s.tLight }}>{s.label}</span>
    </div>
  );
}

function Card({ children, label }) {
  return (
    <div style={{ width: '100%' }}>
      {label && <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', margin: '0 2px 9px', display: 'flex', alignItems: 'center', gap: 9 }}>{label}<span style={{ flex: 1, height: 1, background: 'var(--dourado)', opacity: 0.5 }} /></div>}
      <div style={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 16, padding: 15, boxShadow: '0 6px 16px rgba(28,25,23,.06)' }}>{children}</div>
    </div>
  );
}

function Line({ a, b, sub, accent, bold }) {
  const col = accent ? 'var(--dourado-ink)' : 'var(--ink)';
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: bold ? 700 : 500, color: col, whiteSpace: 'nowrap' }}>{a}</span>
        {sub && <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{sub}</span>}
      </div>
      <div style={{ flex: 1, borderBottom: '1.4px dotted var(--hairline-strong)', transform: 'translateY(-3px)', minWidth: 10 }} />
      <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: bold ? 700 : 600, color: col, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{b}</span>
    </div>
  );
}

// ── schematic mini-map ───────────────────────────────────────
function MiniMap() {
  return (
    <div style={{ position: 'relative', height: 104, borderRadius: 12, overflow: 'hidden', background: 'var(--tint)', border: '1px solid var(--hairline)' }}>
      <svg width="100%" height="100%" viewBox="0 0 300 104" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
        <g stroke="var(--hairline-strong)" strokeWidth="7" opacity="0.5">
          <path d="M-10 30 H310" /><path d="M-10 74 H310" />
          <path d="M60 -10 V114" /><path d="M150 -10 V114" /><path d="M232 -10 V114" />
        </g>
        <g stroke="var(--dourado)" strokeWidth="2.4" opacity="0.55" fill="none">
          <path d="M-10 30 H310" /><path d="M150 -10 V114" />
        </g>
        {/* blocks */}
        <g fill="var(--hairline)" opacity="0.5">
          <rect x="12" y="40" width="36" height="24" rx="2" /><rect x="74" y="40" width="62" height="24" rx="2" />
          <rect x="166" y="40" width="50" height="24" rx="2" /><rect x="12" y="84" width="36" height="18" rx="2" />
        </g>
      </svg>
      {/* pin */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-100%)' }}>
        <svg width="30" height="38" viewBox="0 0 30 38" fill="none"><path d="M15 37C15 37 27 22 27 13A12 12 0 1 0 3 13C3 22 15 37 15 37Z" fill="var(--vermelho)" stroke="#fff" strokeWidth="2" /><circle cx="15" cy="13" r="4.5" fill="#fff" /></svg>
      </div>
      <div style={{ position: 'absolute', right: 9, bottom: 9, background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '5px 10px',
        fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 700, color: 'var(--frame-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--frame-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        Ver no mapa
      </div>
    </div>
  );
}

// ── status timeline ──────────────────────────────────────────
function Timeline({ status }) {
  const cur = ORDER[status];
  const rows = [
    { t: '14:32', label: 'Pedido criado', sub: 'Comanda enviada à barbearia', stage: 0 },
    { t: '14:45', label: 'Confirmado pelo Jajá', sub: 'Seu horário está garantido', stage: 1 },
    { t: 'Hoje · 15:00', label: 'Atendimento concluído', sub: 'Esperamos que tenha curtido', stage: 2 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map((r, i) => {
        const done = cur >= r.stage;
        const isLast = i === rows.length - 1;
        return (
          <div key={i} style={{ display: 'flex', gap: 13 }}>
            {/* rail */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', flex: '0 0 auto',
                background: done ? 'var(--green)' : 'var(--card)', border: '2px solid ' + (done ? 'var(--green)' : 'var(--hairline-strong)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
              </span>
              {!isLast && <span style={{ width: 2, flex: 1, minHeight: 30, background: cur > r.stage ? 'var(--green)' : 'var(--hairline-strong)', opacity: cur > r.stage ? 1 : 0.6 }} />}
            </div>
            {/* content */}
            <div style={{ paddingBottom: isLast ? 0 : 16, opacity: done ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{r.label}</span>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{done ? r.t : '—'}</span>
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{r.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const btnD = (kind) => {
  const base = { flex: 1, height: 50, borderRadius: 13, cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, border: '1.4px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
  return {
    primary: { ...base, background: 'var(--frame)', color: '#fff' },
    ghost: { ...base, background: 'transparent', color: 'var(--ink)', borderColor: 'var(--hairline-strong)' },
    danger: { ...base, background: 'transparent', color: 'var(--vermelho-ink)', borderColor: 'color-mix(in srgb, var(--vermelho) 45%, transparent)' },
  }[kind];
};

function actionsForDetail(status, soon) {
  switch (status) {
    case 'pendente':   return [{ k: 'editar', label: 'Reagendar', kind: 'ghost' }, { k: 'cancelar', label: 'Cancelar', kind: 'danger' }];
    case 'confirmado': return [{ k: 'cancelar', label: soon ? 'Cancelar · taxa' : 'Cancelar', kind: 'danger' }];
    case 'concluido':  return [{ k: 'repetir', label: 'Repetir', kind: 'ghost' }, { k: 'avaliar', label: 'Avaliar', kind: 'primary' }];
    default:           return [];
  }
}

// ════════════════════════════════════════════════════════════
function AppointmentDetail({ tweaks = {}, nav }) {
  const { dark = false, status = 'confirmado', soon = false } = tweaks;
  const [toast, setToast] = useState(null);
  const acts = actionsForDetail(status, soon);

  const fire = (k) => {
    const msg = {
      editar: 'Reagendamento disponível enquanto pendente',
      cancelar: soon && status === 'confirmado' ? 'Cancelar agora cobra 50% (R$ 38,00)' : 'Cancelamento grátis — confirme na próxima tela',
      repetir: 'Repetindo Corte clássico + Barba…',
      avaliar: 'Abrindo avaliação do corte…',
      wa: 'Abrindo conversa no WhatsApp…',
    }[k] || 'Ação';
    setToast(msg);
    clearTimeout(window.__dToast);
    window.__dToast = setTimeout(() => setToast(null), 2600);
  };

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* app bar */}
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}>
        <button onClick={() => nav && nav('__back')} style={{ width: 38, height: 38, borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--display)', fontSize: 23, letterSpacing: 1, color: 'var(--ink)' }}>DETALHE</span>
        <button style={{ width: 38, height: 38, borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></svg>
        </button>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 18px 150px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <BigBadge status={status} dark={dark} />
          <div style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.5, color: 'var(--ink)', marginTop: 13 }}>CORTE CLÁSSICO + BARBA</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>sábado, 17 de maio · 14:00 · 50 min</div>
        </div>

        {/* local + map */}
        <Card label="Local">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <PoleD w={11} h={28} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 21, letterSpacing: 0.5, color: 'var(--frame-ink)', lineHeight: 1 }}>BARBEARIA DO JAJÁ</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>R. Aurora, 120 · Pinheiros, SP</div>
            </div>
          </div>
          <MiniMap />
        </Card>

        {/* comanda items */}
        <Card label="Serviços">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13, paddingBottom: 13, borderBottom: '1px dashed var(--hairline-strong)' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--frame)', color: 'var(--papel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 18 }}>JJ</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Jajá</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>seu barbeiro · ★ 4,8</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Line a="Corte clássico" sub="30 min" b={brlD(50)} />
            <Line a="Barba" sub="20 min" b={brlD(30)} />
            <Line a="Desconto · 1º corte" b={'– ' + brlD(4)} accent />
          </div>
          <div style={{ borderTop: '1.6px dashed var(--hairline-strong)', margin: '13px 0 11px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: 0.6, color: 'var(--ink)' }}>TOTAL</span>
            <span style={{ fontFamily: 'var(--display)', fontSize: 28, lineHeight: 0.9, color: 'var(--frame-ink)', whiteSpace: 'nowrap' }}>{brlD(TOTAL_D)}</span>
          </div>
        </Card>

        {/* payment */}
        <Card label="Pagamento">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'color-mix(in srgb, var(--green) 16%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5l3.4 3.4a3 3 0 0 0 4.2 0M12 20.5l3.4-3.4a3 3 0 0 1 4.2 0M12 3.5L8.6 6.9a3 3 0 0 1-4.2 0M12 20.5l-3.4-3.4a3 3 0 0 0-4.2 0" /><rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.4" transform="rotate(45 12 12)" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Pix · pago</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>via Mercado Pago</div>
            </div>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{brlD(TOTAL_D)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 13, paddingTop: 12, borderTop: '1px dashed var(--hairline-strong)' }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)' }}>ID da transação</span>
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: 'var(--ink)', letterSpacing: 0.3 }}>MP-7F3A9C21</span>
          </div>
        </Card>

        {/* timeline */}
        <Card label="Histórico de status">
          <Timeline status={status} />
        </Card>
      </div>

      {/* toast */}
      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 150, zIndex: 20, background: 'var(--ink)', color: 'var(--bg)', borderRadius: 12, padding: '12px 15px', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, boxShadow: '0 10px 26px rgba(0,0,0,.28)', animation: 'cfade .25s ease' }}>{toast}</div>
      )}

      {/* sticky actions */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 18px 30px', background: 'linear-gradient(to top, var(--bg) 74%, transparent)', zIndex: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {acts.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            {acts.map((a) => <button key={a.k} style={btnD(a.kind)} onClick={() => fire(a.k)}>{a.label}</button>)}
          </div>
        )}
        <button onClick={() => fire('wa')} style={{ width: '100%', height: 50, borderRadius: 13, cursor: 'pointer', background: 'transparent',
          border: '1.4px solid color-mix(in srgb, var(--green) 50%, transparent)', color: 'var(--green)', fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="var(--green)"><path d="M12 2A10 10 0 0 0 3.5 17.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-2.6.8.8-2.5-.2-.3A8 8 0 0 1 12 4zm-2.7 4c-.2 0-.5 0-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7 2.1.8 2.5.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.6-.3l-1.5-.7c-.2-.1-.4-.1-.5.1l-.6.8c-.1.2-.3.2-.5.1-.7-.3-1.5-.6-2.2-1.5-.5-.6-.8-1.2-.9-1.4-.1-.2 0-.3.1-.4l.4-.5c.1-.2.2-.3.2-.5s0-.4-.1-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4z" /></svg>
          Chamar barbearia no WhatsApp
        </button>
      </div>
    </div>
  );
}

window.AppointmentDetail = AppointmentDetail;
