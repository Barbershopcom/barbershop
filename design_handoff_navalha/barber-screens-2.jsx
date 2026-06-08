// barber-kit.jsx — shared bits for the Barbeiro app. Prefix B to avoid clashes.
// Exports: BMono, BPole, BStatusBadge, BTabBar, BAppBar, bBrl, BSection.
const bBrl = (n) => 'R$\u00a0' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function BMono({ initials, color = 'var(--frame)', s = 36, fs = 16, ring }) {
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: color, color: 'var(--papel)', flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: fs, letterSpacing: 0.5,
      boxShadow: ring ? '0 0 0 2.5px var(--card), 0 0 0 4px var(--dourado)' : 'none' }}>{initials}</div>
  );
}

function BPole({ w = 12, h = 26 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 999, border: '1.4px solid var(--frame)', overflow: 'hidden', flex: '0 0 auto',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 5px, var(--papel) 5px 10px, var(--navy) 10px 15px, var(--papel) 15px 20px)', boxShadow: 'inset 0 0 0 2px var(--papel)' }} />
  );
}

const B_STATUS = {
  pendente:   { label: 'Pendente',   base: '#F59E0B', tLight: '#9a6608', tDark: '#f2b44c' },
  confirmado: { label: 'Confirmado', base: '#1a365d', tLight: '#1a365d', tDark: '#8fb3e0' },
  concluido:  { label: 'Concluído',  base: '#10B981', tLight: '#0c6e4e', tDark: '#4cc38a' },
  cancelado:  { label: 'Cancelado',  base: '#94A3B8', tLight: '#5b6675', tDark: '#aab4c2' },
  noshow:     { label: 'No-show',    base: '#D97706', tLight: '#9a560a', tDark: '#e8a04e' },
};

function BStatusBadge({ status, dark, small }) {
  const s = B_STATUS[status] || B_STATUS.pendente;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: small ? '3px 9px' : '4px 11px', borderRadius: 999,
      background: `color-mix(in srgb, ${s.base} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${s.base} 38%, transparent)`, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.base }} />
      <span style={{ fontFamily: 'var(--ui)', fontSize: small ? 9.5 : 10.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: dark ? s.tDark : s.tLight }}>{s.label}</span>
    </div>
  );
}

function BAppBar({ title, onBack, right }) {
  return (
    <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
          </button>
        )}
        <span style={{ fontFamily: 'var(--display)', fontSize: 23, letterSpacing: 1, color: 'var(--ink)' }}>{title}</span>
      </div>
      {right || <BPole w={12} h={26} />}
    </div>
  );
}

function BSection({ icon, title, count, action, onAction, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: accent ? 'var(--vermelho-ink)' : 'var(--muted)' }}>{title}</span>
        {count != null && <span style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, color: '#fff', background: accent ? 'var(--vermelho)' : 'var(--frame)', borderRadius: 999, padding: '1px 8px' }}>{count}</span>}
      </div>
      {action && <span onClick={onAction} style={{ fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: 'var(--frame-ink)', cursor: 'pointer' }}>{action} →</span>}
    </div>
  );
}

// bottom tab bar for barbeiro: Início / Agenda / Ajustes / Perfil
function BTabBar({ active, nav }) {
  const items = [
    { id: 'dash', label: 'Início', icon: <path d="M3 11l9-7 9 7M5 9.5V20h14V9.5" /> },
    { id: 'agenda', label: 'Agenda', icon: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></> },
    { id: 'ajustes', label: 'Ajustes', icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" /></> },
    { id: 'perfil', label: 'Perfil', icon: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c1.4-4 4-6 7-6s5.6 2 7 6" /></> },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 9, paddingBottom: 26, background: 'var(--card)', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', zIndex: 10 }}>
      {items.map((it) => {
        const on = active === it.id;
        const c = on ? 'var(--frame-ink)' : 'var(--muted)';
        return (
          <div key={it.id} onClick={() => nav && nav(it.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, cursor: 'pointer' }}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={on ? 2.1 : 1.8} strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: on ? 700 : 500, color: c }}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { bBrl, BMono, BPole, BStatusBadge, BAppBar, BSection, BTabBar, B_STATUS });
