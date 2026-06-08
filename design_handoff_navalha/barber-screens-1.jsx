// appointments.jsx — A15 Lista de agendamentos, vintage style.
// Exports to window: AppointmentsList.
const { useState, useMemo } = React;

const brlA = (n) => 'R$\u00a0' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ── 6 status variants (spec colors) ──────────────────────────
const STATUS = {
  pendente:   { label: 'Pendente',   base: '#F59E0B', tLight: '#9a6608', tDark: '#f2b44c' },
  confirmado: { label: 'Confirmado', base: '#1a365d', tLight: '#1a365d', tDark: '#8fb3e0' },
  concluido:  { label: 'Concluído',  base: '#10B981', tLight: '#0c6e4e', tDark: '#4cc38a' },
  cancelado:  { label: 'Cancelado',  base: '#94A3B8', tLight: '#5b6675', tDark: '#aab4c2' },
  expirado:   { label: 'Expirado',   base: '#bf212f', tLight: '#a31b28', tDark: '#f08a8a' },
  noshow:     { label: 'No-show',    base: '#D97706', tLight: '#9a560a', tDark: '#e8a04e' },
};

function StatusBadge({ status, dark }) {
  const s = STATUS[status];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
      background: `color-mix(in srgb, ${s.base} 14%, transparent)`,
      border: `1px solid color-mix(in srgb, ${s.base} 38%, transparent)`, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.base }} />
      <span style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: dark ? s.tDark : s.tLight }}>{s.label}</span>
    </div>
  );
}

// ── sample data ──────────────────────────────────────────────
const PROXIMOS = [
  { id: 1, status: 'pendente', day: 'HOJE', date: 'qui · 18:30', d1: '15', d2: 'mai', service: 'Corte clássico', dur: '30 min', barber: 'Jajá', shop: 'Barbearia do Jajá', price: 50, soon: true },
  { id: 2, status: 'confirmado', day: '', date: 'sáb · 14:00', d1: '17', d2: 'mai', service: 'Corte clássico + Barba', dur: '50 min', barber: 'Jajá', shop: 'Barbearia do Jajá', price: 76, soon: false },
];
const HISTORICO = [
  { id: 3, status: 'concluido', day: '', date: '02 mai · 11:00', d1: '02', d2: 'mai', service: 'Corte clássico', dur: '30 min', barber: 'Jajá', shop: 'Barbearia do Jajá', price: 50 },
  { id: 4, status: 'cancelado', day: '', date: '28 abr · 16:00', d1: '28', d2: 'abr', service: 'Barba', dur: '20 min', barber: 'Jajá', shop: 'Barbearia do Jajá', price: 30 },
  { id: 5, status: 'noshow', day: '', date: '20 abr · 09:30', d1: '20', d2: 'abr', service: 'Corte + Sobrancelha', dur: '40 min', barber: 'Rafa', shop: 'Barbearia do Jajá', price: 60 },
  { id: 6, status: 'expirado', day: '', date: '12 abr · 13:00', d1: '12', d2: 'abr', service: 'Corte clássico', dur: '30 min', barber: 'Jajá', shop: 'Barbearia do Jajá', price: 50 },
];

// action sets by status
function actionsFor(a) {
  switch (a.status) {
    case 'pendente':   return [{ k: 'editar', label: 'Editar', kind: 'ghost' }, { k: 'cancelar', label: 'Cancelar', kind: 'danger' }];
    case 'confirmado': return a.soon
      ? [{ k: 'cancelar-taxa', label: 'Cancelar', kind: 'danger', note: 'taxa' }]
      : [{ k: 'cancelar', label: 'Cancelar', kind: 'danger' }];
    case 'concluido':  return [{ k: 'repetir', label: 'Repetir', kind: 'ghost' }, { k: 'avaliar', label: 'Avaliar', kind: 'primary' }];
    default:           return [{ k: 'repetir', label: 'Repetir agendamento', kind: 'ghost' }];
  }
}

function ActBtn({ a, onClick }) {
  const base = { fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', border: '1.4px solid transparent', whiteSpace: 'nowrap' };
  const styles = {
    primary: { ...base, background: 'var(--frame)', color: '#fff' },
    ghost: { ...base, background: 'transparent', color: 'var(--ink)', borderColor: 'var(--hairline-strong)' },
    danger: { ...base, background: 'transparent', color: 'var(--vermelho-ink)', borderColor: 'color-mix(in srgb, var(--vermelho) 45%, transparent)' },
  };
  return (
    <button style={styles[a.kind]} onClick={() => onClick(a)}>
      {a.label}{a.note === 'taxa' ? ' · taxa' : ''}
    </button>
  );
}

function PoleA({ w = 9, h = 22 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 999, border: '1.3px solid var(--frame)', overflow: 'hidden',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 4px, var(--papel) 4px 8px, var(--navy) 8px 12px, var(--papel) 12px 16px)', boxShadow: 'inset 0 0 0 1.5px var(--papel)' }} />
  );
}

function AppointmentCard({ a, dark, onAction, onOpen }) {
  const acts = actionsFor(a);
  const dim = a.status === 'cancelado' || a.status === 'expirado' || a.status === 'noshow';
  return (
    <div onClick={(e) => { if (e.target.closest('button')) return; onOpen && onOpen(a); }} style={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 16, padding: 14,
      boxShadow: '0 6px 16px rgba(28,25,23,.06)', opacity: dim ? 0.82 : 1, position: 'relative', cursor: onOpen ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', gap: 13 }}>
        {/* date chip */}
        <div style={{ flex: '0 0 auto', width: 52, borderRadius: 12, background: 'var(--tint)', border: '1px solid var(--hairline)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', alignSelf: 'flex-start' }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 26, lineHeight: 0.9, color: 'var(--frame-ink)' }}>{a.d1}</span>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 2 }}>{a.d2}</span>
        </div>

        {/* main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {a.day && <span style={{ fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, color: '#fff', background: 'var(--vermelho)', borderRadius: 5, padding: '2px 6px' }}>{a.day}</span>}
                <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{a.date}</span>
              </div>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 5, letterSpacing: -0.1, lineHeight: 1.2 }}>{a.service}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.dur} · com {a.barber}</div>
            </div>
            <StatusBadge status={a.status} dark={dark} />
          </div>

          {/* shop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9 }}>
            <PoleA w={8} h={18} />
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)' }}>{a.shop}</span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed var(--hairline-strong)', margin: '12px 0 11px' }} />

      {/* footer: price + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)' }}>{a.status === 'expirado' ? 'Não pago' : 'Pago'}</span>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 800, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{brlA(a.price)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {acts.map((act) => <ActBtn key={act.k} a={act} onClick={(x) => onAction(a, x)} />)}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCta }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 36px', minHeight: 380 }}>
      <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--tint)', border: '1.5px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><path d="M8 7.5L20 18M8 16.5L20 6M11 10.2l2 1.8" /></svg>
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 0.5, color: 'var(--ink)' }}>NENHUM AGENDAMENTO</div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.45 }}>Que tal marcar um corte com seu barbeiro favorito?</div>
      <button onClick={onCta} style={{ marginTop: 20, height: 50, padding: '0 26px', borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'var(--vermelho)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, boxShadow: '0 8px 20px rgba(191,33,47,.28)' }}>Agendar agora</button>
    </div>
  );
}

// ── bottom tab bar ───────────────────────────────────────────
function Tab({ icon, label, active, onClick }) {
  const c = active ? 'var(--frame-ink)' : 'var(--muted)';
  const icons = {
    home: <path d="M3 11l9-7 9 7M5 9.5V20h14V9.5" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>,
    cal: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></>,
    user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c1.4-4 4-6 7-6s5.6 2 7 6" /></>,
  };
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, cursor: 'pointer' }}>
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.1 : 1.8} strokeLinecap="round" strokeLinejoin="round">{icons[icon]}</svg>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: active ? 700 : 500, color: c }}>{label}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
function AppointmentsList({ tweaks = {}, nav }) {
  const { dark = false, empty = false } = tweaks;
  const [tab, setTab] = useState('proximos');
  const [toast, setToast] = useState(null);

  const list = tab === 'proximos' ? (empty ? [] : PROXIMOS) : HISTORICO;

  const onAction = (a, act) => {
    const msg = {
      editar: 'Abrindo edição do agendamento…',
      cancelar: 'Cancelamento grátis — confirme na próxima tela',
      'cancelar-taxa': 'Atenção: cancelar agora cobra 50% (R$ ' + (a.price / 2).toFixed(2).replace('.', ',') + ')',
      repetir: 'Repetindo agendamento de ' + a.service + '…',
      avaliar: 'Abrindo avaliação do corte…',
    }[act.k] || 'Ação';
    setToast(msg);
    clearTimeout(window.__aToast);
    window.__aToast = setTimeout(() => setToast(null), 2600);
  };

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* app bar */}
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 18, paddingRight: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.8, color: 'var(--ink)' }}>AGENDAMENTOS</span>
        <PoleA w={12} h={28} />
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 0, padding: '0 18px', borderBottom: '1px solid var(--hairline)' }}>
        {[['proximos', 'Próximos'], ['historico', 'Histórico']].map(([k, l]) => {
          const on = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '12px 0 13px', position: 'relative', fontFamily: 'var(--ui)', fontSize: 14, fontWeight: on ? 700 : 500,
              color: on ? 'var(--frame-ink)' : 'var(--muted)' }}>
              {l}
              {on && <span style={{ position: 'absolute', left: '50%', bottom: -1, transform: 'translateX(-50%)', width: '62%', height: 3, borderRadius: 3, background: 'var(--dourado)' }} />}
            </button>
          );
        })}
      </div>

      {/* list */}
      <div style={{ flex: 1, overflow: 'auto', padding: list.length ? '16px 18px 96px' : '0 0 96px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        {list.length === 0
          ? <EmptyState onCta={() => setTab('proximos')} />
          : list.map((a) => <AppointmentCard key={a.id} a={a} dark={dark} onAction={onAction} onOpen={() => nav && nav('detalhe')} />)}
      </div>

      {/* toast */}
      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 84, zIndex: 20,
          background: 'var(--ink)', color: 'var(--bg)', borderRadius: 12, padding: '12px 15px',
          fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, boxShadow: '0 10px 26px rgba(0,0,0,.28)', animation: 'cfade .25s ease' }}>
          {toast}
        </div>
      )}

      {/* bottom tab bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 9, paddingBottom: 26,
        background: 'var(--card)', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', zIndex: 10 }}>
        <Tab icon="home" label="Início" onClick={() => nav && nav('home')} />
        <Tab icon="search" label="Buscar" onClick={() => nav && nav('agendar')} />
        <Tab icon="cal" label="Agenda" active />
        <Tab icon="user" label="Perfil" />
      </div>
    </div>
  );
}

window.AppointmentsList = AppointmentsList;
