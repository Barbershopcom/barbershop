// barber-screens-1.jsx — Dashboard (B2), Pendentes (B3), Detalhe (B4), Agenda (B5).
// Uses barber-kit globals. Exports: BarberDashboard, BarberPending, BarberBookingDetail, BarberAgenda.
const { useState: bUseState } = React;

// shared booking data
const B_TODAY = [
  { id: 't1', time: '14:00', client: 'João da Silva', initials: 'JS', color: 'var(--frame)', service: 'Corte clássico', price: 50, status: 'confirmado' },
  { id: 't2', time: '15:00', client: 'Pedro Alves', initials: 'PA', color: 'var(--vermelho)', service: 'Barba terapia', price: 30, status: 'confirmado' },
  { id: 't3', time: '16:40', client: 'Caio Souza', initials: 'CS', color: '#2a5a8f', service: 'Corte + Barba', price: 64, status: 'confirmado' },
];
const B_PENDING = [
  { id: 'p1', when: 'amanhã · 10:00', client: 'Maria Lopes', initials: 'ML', color: '#7a5a2f', service: 'Corte + Sobrancelha', price: 65 },
  { id: 'p2', when: 'amanhã · 11:30', client: 'Rafael Dias', initials: 'RD', color: 'var(--frame)', service: 'Corte clássico', price: 50 },
  { id: 'p3', when: 'sex · 09:00', client: 'Bruno Reis', initials: 'BR', color: 'var(--vermelho)', service: 'Barba terapia', price: 30 },
];

function TodayRow({ b, last, onOpen }) {
  return (
    <div onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: last ? 'none' : '1px solid var(--hairline)', cursor: 'pointer' }}>
      <div style={{ width: 52, textAlign: 'center', flex: '0 0 auto' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 22, lineHeight: 0.9, color: 'var(--frame-ink)' }}>{b.time}</div>
      </div>
      <span style={{ width: 1, height: 34, background: 'var(--hairline)', flex: '0 0 auto' }} />
      <BMono initials={b.initials} color={b.color} s={34} fs={14} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.client}</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>{b.service}</div>
      </div>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{bBrl(b.price)}</span>
    </div>
  );
}

function PendingCard({ b, onAct, onOpen }) {
  return (
    <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid color-mix(in srgb, var(--amber) 40%, var(--hairline))', padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
      <div onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <BMono initials={b.initials} color={b.color} s={42} fs={18} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{b.client}</span>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{b.service}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 600, color: 'var(--amber-ink)' }}>{b.when}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--hairline-strong)' }} />
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 700, color: 'var(--green)' }}>+ {bBrl(b.price)}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
        <button onClick={() => onAct(b.id, 'recusar')} style={{ flex: 1, height: 44, borderRadius: 11, border: '1.4px solid var(--hairline-strong)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>Recusar
        </button>
        <button onClick={() => onAct(b.id, 'confirmar')} style={{ flex: 1.4, height: 44, borderRadius: 11, border: 'none', background: 'var(--green)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 6px 16px rgba(31,138,107,.26)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>Confirmar
        </button>
      </div>
    </div>
  );
}

// ════════════════════════ B2 Dashboard ════════════════════════
function BarberDashboard({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const [pending, setPending] = bUseState(B_PENDING);
  const [toast, setToast] = bUseState(null);
  const act = (id, kind) => {
    setPending((p) => p.filter((x) => x.id !== id));
    setToast(kind === 'confirmar' ? 'Agendamento confirmado ✓' : 'Agendamento recusado');
    clearTimeout(window.__bToast); window.__bToast = setTimeout(() => setToast(null), 2200);
  };

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* header */}
      <div style={{ paddingTop: 54, paddingBottom: 14, paddingLeft: 18, paddingRight: 18, background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <BMono initials="JJ" s={42} fs={19} ring />
            <div>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)' }}>Bom dia,</div>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>Jajá · barbeiro</div>
            </div>
          </div>
          <button onClick={() => nav && nav('notificacoes')} style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            {pending.length > 0 && <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%', background: 'var(--vermelho)', border: '1.5px solid var(--card)' }} />}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px 96px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* today summary stat band */}
        <div style={{ display: 'flex', gap: 11 }}>
          <div style={{ flex: 1, borderRadius: 16, background: 'var(--frame)', color: '#fff', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'repeating-linear-gradient(-45deg, #fff 0 10px, transparent 10px 24px)' }} />
            <div style={{ position: 'relative', fontFamily: 'var(--display)', fontSize: 40, lineHeight: 0.9 }}>8</div>
            <div style={{ position: 'relative', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 4 }}>cortes hoje</div>
          </div>
          <div style={{ flex: 1, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 40, lineHeight: 0.9, color: 'var(--frame-ink)' }}>14:00</div>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginTop: 4 }}>próximo · João</div>
          </div>
        </div>

        {/* today list */}
        <div>
          <BSection title="Hoje" action="Ver agenda" onAction={() => nav && nav('agenda')} />
          <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: '2px 14px', boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
            {B_TODAY.map((b, i) => <TodayRow key={b.id} b={b} last={i === B_TODAY.length - 1} onOpen={() => nav && nav('bdetalhe')} />)}
          </div>
        </div>

        {/* pending */}
        <div>
          <BSection title="Pendentes" count={pending.length} accent action={pending.length > 0 ? 'Ver todos' : null} onAction={() => nav && nav('pendentes')} />
          {pending.length === 0 ? (
            <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px dashed var(--hairline-strong)', padding: '20px', textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)' }}>Tudo confirmado! Sem pendências.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {pending.slice(0, 2).map((b) => <PendingCard key={b.id} b={b} onAct={act} onOpen={() => nav && nav('bdetalhe')} />)}
            </div>
          )}
        </div>

        {/* carteira */}
        <div>
          <BSection title="Carteira" />
          <div style={{ borderRadius: 16, background: 'linear-gradient(135deg, #2a5a3f, #1c3a2a)', color: '#fff', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 11, opacity: 0.8 }}>Saldo disponível</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 34, lineHeight: 0.95, marginTop: 2 }}>{bBrl(240)}</div>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 11, opacity: 0.8, marginTop: 3 }}>Hoje você ganhou {bBrl(144)}</div>
            </div>
            <button style={{ height: 42, padding: '0 20px', borderRadius: 12, border: 'none', background: 'var(--dourado)', color: '#1c1917', fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Sacar</button>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 86, zIndex: 20, background: 'var(--ink)', color: 'var(--bg)', borderRadius: 12, padding: '12px 15px', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 600, boxShadow: '0 10px 26px rgba(0,0,0,.28)', animation: 'cfade .25s ease' }}>{toast}</div>
      )}

      <BTabBar active="dash" nav={nav} />
    </div>
  );
}

// ════════════════════════ B3 Pendentes ════════════════════════
function BarberPending({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const [pending, setPending] = bUseState(B_PENDING);
  const [toast, setToast] = bUseState(null);
  const act = (id, kind) => {
    setPending((p) => p.filter((x) => x.id !== id));
    setToast(kind === 'confirmar' ? 'Confirmado ✓' : 'Recusado');
    clearTimeout(window.__bToast2); window.__bToast2 = setTimeout(() => setToast(null), 2000);
  };
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <BAppBar title="PENDENTES" onBack={() => nav && nav('__back')} />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pending.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 36px', minHeight: 400 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'color-mix(in srgb, var(--green) 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 0.5, color: 'var(--ink)' }}>TUDO CONFIRMADO</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14.5, color: 'var(--muted)', marginTop: 8 }}>Você não tem solicitações pendentes.</div>
          </div>
        ) : (
          <React.Fragment>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', padding: '0 2px' }}>{pending.length} solicitações aguardando sua resposta</div>
            {pending.map((b) => <PendingCard key={b.id} b={b} onAct={act} onOpen={() => nav && nav('bdetalhe')} />)}
          </React.Fragment>
        )}
      </div>
      {toast && <div style={{ position: 'absolute', left: 16, right: 16, bottom: 30, zIndex: 20, background: 'var(--ink)', color: 'var(--bg)', borderRadius: 12, padding: '12px 15px', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 600, boxShadow: '0 10px 26px rgba(0,0,0,.28)' }}>{toast}</div>}
    </div>
  );
}

// ════════════════════════ B4 Detalhe ════════════════════════
function BarberBookingDetail({ tweaks = {}, nav }) {
  const { dark = false, status: st = 'confirmado' } = tweaks;
  const [status, setStatus] = bUseState(st);
  const [toast, setToast] = bUseState(null);
  const fire = (m) => { setToast(m); clearTimeout(window.__bd); window.__bd = setTimeout(() => setToast(null), 2200); };

  const actions = () => {
    if (status === 'pendente') return [
      { k: 'recusar', label: 'Recusar', kind: 'ghost', fn: () => { setStatus('cancelado'); fire('Recusado'); } },
      { k: 'confirmar', label: 'Confirmar', kind: 'green', fn: () => { setStatus('confirmado'); fire('Confirmado ✓'); } },
    ];
    if (status === 'confirmado') return [
      { k: 'noshow', label: 'No-show', kind: 'ghost', fn: () => { setStatus('noshow'); fire('Marcado como no-show'); } },
      { k: 'done', label: 'Concluir', kind: 'navy', fn: () => { setStatus('concluido'); fire('Atendimento concluído ✓'); } },
    ];
    if (status === 'concluido') return [{ k: 'aval', label: 'Ver avaliação do cliente', kind: 'ghost', fn: () => fire('★ 5,0 — "Melhor corte da região!"') }];
    return [{ k: 'reabrir', label: 'Reabrir como confirmado', kind: 'ghost', fn: () => { setStatus('confirmado'); fire('Reaberto'); } }];
  };
  const btnStyle = (kind) => {
    const base = { flex: 1, height: 52, borderRadius: 14, cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, border: '1.4px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
    return { ghost: { ...base, background: 'transparent', color: 'var(--ink)', borderColor: 'var(--hairline-strong)' },
      green: { ...base, background: 'var(--green)', color: '#fff', boxShadow: '0 8px 20px rgba(31,138,107,.24)' },
      navy: { ...base, background: 'var(--frame)', color: '#fff', boxShadow: '0 8px 20px rgba(28,25,23,.2)' } }[kind];
  };

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <BAppBar title="AGENDAMENTO" onBack={() => nav && nav('__back')} />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 18px 150px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <BStatusBadge status={status} dark={dark} />
          <div style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.5, color: 'var(--ink)', marginTop: 12 }}>CORTE CLÁSSICO</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', marginTop: 3 }}>sábado, 17 de maio · 14:00 · 30 min</div>
        </div>

        {/* client card */}
        <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)', display: 'flex', alignItems: 'center', gap: 13 }}>
          <BMono initials="JS" color="var(--frame)" s={48} fs={20} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>João da Silva</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)' }}>cliente · 14 cortes</div>
          </div>
          <button style={{ width: 44, height: 44, borderRadius: 12, border: '1.4px solid color-mix(in srgb, var(--green) 50%, transparent)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--green)"><path d="M12 2A10 10 0 0 0 3.5 17.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-2.6.8.8-2.5-.2-.3A8 8 0 0 1 12 4z" /></svg>
          </button>
        </div>

        {/* services + total */}
        <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: '14px 16px', boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>Corte clássico · 30 min</span>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{bBrl(50)}</span>
          </div>
          <div style={{ borderTop: '1.4px dashed var(--hairline-strong)', margin: '12px 0 11px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: 0.6, color: 'var(--ink)' }}>VOCÊ RECEBE</span>
            <span style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--green)', whiteSpace: 'nowrap' }}>{bBrl(42.5)}</span>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>já descontada a taxa da plataforma (15%)</div>
        </div>
      </div>

      {toast && <div style={{ position: 'absolute', left: 16, right: 16, bottom: 150, zIndex: 20, background: 'var(--ink)', color: 'var(--bg)', borderRadius: 12, padding: '12px 15px', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 600, boxShadow: '0 10px 26px rgba(0,0,0,.28)', animation: 'cfade .25s ease' }}>{toast}</div>}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 18px 30px', background: 'linear-gradient(to top, var(--bg) 74%, transparent)', zIndex: 8, display: 'flex', gap: 10 }}>
        {actions().map((a) => <button key={a.k} style={btnStyle(a.kind)} onClick={a.fn}>{a.label}</button>)}
      </div>
    </div>
  );
}

// ════════════════════════ B5 Agenda ════════════════════════
const B_ALL = {
  Próximos: [
    { id: 1, time: '14:00', d: 'hoje', client: 'João da Silva', initials: 'JS', color: 'var(--frame)', service: 'Corte clássico', price: 50, status: 'confirmado' },
    { id: 2, time: '15:00', d: 'hoje', client: 'Pedro Alves', initials: 'PA', color: 'var(--vermelho)', service: 'Barba terapia', price: 30, status: 'confirmado' },
    { id: 3, time: '10:00', d: 'amanhã', client: 'Maria Lopes', initials: 'ML', color: '#7a5a2f', service: 'Corte + Sobrancelha', price: 65, status: 'pendente' },
  ],
  Pendentes: [
    { id: 4, time: '10:00', d: 'amanhã', client: 'Maria Lopes', initials: 'ML', color: '#7a5a2f', service: 'Corte + Sobrancelha', price: 65, status: 'pendente' },
    { id: 5, time: '09:00', d: 'sex', client: 'Bruno Reis', initials: 'BR', color: 'var(--vermelho)', service: 'Barba terapia', price: 30, status: 'pendente' },
  ],
  Concluídos: [
    { id: 6, time: '11:00', d: '02 mai', client: 'Lucas T.', initials: 'LT', color: '#2a5a8f', service: 'Corte clássico', price: 50, status: 'concluido' },
    { id: 7, time: '16:00', d: '28 abr', client: 'André M.', initials: 'AM', color: 'var(--frame)', service: 'Corte + Barba', price: 64, status: 'concluido' },
  ],
  Cancelados: [
    { id: 8, time: '13:00', d: '20 abr', client: 'Caio S.', initials: 'CS', color: '#94A3B8', service: 'Corte clássico', price: 50, status: 'cancelado' },
  ],
};
const B_TABS = ['Próximos', 'Pendentes', 'Concluídos', 'Cancelados'];

function BarberAgenda({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const [tab, setTab] = bUseState('Próximos');
  const list = B_ALL[tab];
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ paddingTop: 56, paddingBottom: 10, paddingLeft: 18, paddingRight: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.8, color: 'var(--ink)' }}>AGENDA</span>
        <BPole w={13} h={28} />
      </div>
      {/* tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 18px 12px', overflowX: 'auto', borderBottom: '1px solid var(--hairline)' }}>
        {B_TABS.map((tb) => {
          const on = tab === tb;
          return (
            <button key={tb} onClick={() => setTab(tb)} style={{ flex: '0 0 auto', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: 'pointer',
              padding: '8px 14px', borderRadius: 999, border: '1.5px solid ' + (on ? 'var(--frame)' : 'var(--hairline-strong)'),
              background: on ? 'var(--frame)' : 'transparent', color: on ? '#fff' : 'var(--ink)' }}>{tb}</button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 96px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {list.map((b) => (
          <div key={b.id} onClick={() => nav && nav('bdetalhe')} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 15, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 13, boxShadow: '0 6px 16px rgba(28,25,23,.05)', cursor: 'pointer', opacity: (b.status === 'cancelado') ? 0.7 : 1 }}>
            <div style={{ width: 56, textAlign: 'center', flex: '0 0 auto' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 22, lineHeight: 0.85, color: 'var(--frame-ink)' }}>{b.time}</div>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3 }}>{b.d}</div>
            </div>
            <span style={{ width: 1, height: 40, background: 'var(--hairline)', flex: '0 0 auto' }} />
            <BMono initials={b.initials} color={b.color} s={36} fs={15} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.client}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>{b.service}</div>
              <div style={{ marginTop: 5 }}><BStatusBadge status={b.status} dark={dark} small /></div>
            </div>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 800, color: 'var(--ink)', flex: '0 0 auto' }}>{bBrl(b.price)}</span>
          </div>
        ))}
      </div>
      <BTabBar active="agenda" nav={nav} />
    </div>
  );
}

Object.assign(window, { BarberDashboard, BarberPending, BarberBookingDetail, BarberAgenda });
