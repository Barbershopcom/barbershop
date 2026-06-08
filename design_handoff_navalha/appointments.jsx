// admin-shell.jsx — desktop admin shell + shared UI. Prefix A_ to avoid clashes.
// Exports: AdminShell, A_Kpi, A_Card, A_Pill, A_Btn, A_Avatar, A_Bars, A_brl, A_SectionTitle, A_Toast.
const { useState: aState } = React;
const A_brl = (n) => 'R$\u00a0' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const A_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <><path d="M3 11l9-7 9 7M5 9.5V20h14V9.5" /></> },
  { id: 'agenda', label: 'Agenda', icon: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></> },
  { id: 'barbeiros', label: 'Barbeiros', icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.8-3.4 3-5.2 5.5-5.2s4.7 1.8 5.5 5.2" /><path d="M17 9.5a2.6 2.6 0 1 0-1.6-4.7" /><path d="M16.5 14.6c2 .3 3.4 1.9 4 5.4" /></> },
  { id: 'servicos', label: 'Serviços', icon: <><path d="M14.5 4.5 19 9l-9.5 9.5L5 19l.5-4.5z" /><path d="M14.5 4.5 19 9" /></> },
  { id: 'promocoes', label: 'Promoções', icon: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.9a2 2 0 0 1 1.4.6l7.5 7.5a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.3" /></> },
  { id: 'relatorios', label: 'Relatórios', icon: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></> },
  { id: 'perfil', label: 'Perfil', icon: <><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" /><circle cx="12" cy="7" r="4" /></> },
];

function A_Avatar({ initials, color = '#1a365d', s = 34, fs = 14, ring }) {
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: color, color: '#fffcf5', flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: fs, letterSpacing: 0.5,
      boxShadow: ring ? '0 0 0 2px #fff, 0 0 0 3.4px #c5a059' : 'none' }}>{initials}</div>
  );
}

function A_Btn({ children, kind = 'primary', sm, onClick, type }) {
  const base = { display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--ui)',
    fontWeight: 700, borderRadius: 10, border: '1.4px solid transparent', whiteSpace: 'nowrap',
    height: sm ? 36 : 42, padding: sm ? '0 14px' : '0 18px', fontSize: sm ? 13 : 14 };
  const kinds = {
    primary: { background: 'var(--navy)', color: '#fff', boxShadow: '0 6px 16px rgba(26,54,93,.22)' },
    gold: { background: 'var(--dourado)', color: '#1c1917' },
    ghost: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--hairline-strong)' },
    danger: { background: 'transparent', color: 'var(--vermelho-ink)', borderColor: 'color-mix(in srgb, var(--vermelho) 40%, transparent)' },
  };
  return <button type={type} onClick={onClick} style={{ ...base, ...kinds[kind] }}>{children}</button>;
}

function A_Card({ children, pad = 20, style }) {
  return <div style={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 16, padding: pad, boxShadow: '0 4px 14px rgba(28,25,23,.05)', ...style }}>{children}</div>;
}

function A_SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}>{children}</h3>
      {action && <span onClick={onAction} style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--navy-ink)', cursor: 'pointer' }}>{action} →</span>}
    </div>
  );
}

const A_STATUS = {
  pendente: { label: 'Pendente', c: '#b97e0a', bg: 'rgba(217,164,65,.16)' },
  confirmado: { label: 'Confirmado', c: '#1a365d', bg: 'rgba(26,54,93,.12)' },
  concluido: { label: 'Concluído', c: '#0c6e4e', bg: 'rgba(16,185,129,.15)' },
  cancelado: { label: 'Cancelado', c: '#6b7280', bg: 'rgba(107,114,128,.14)' },
  ativo: { label: 'Ativo', c: '#0c6e4e', bg: 'rgba(16,185,129,.15)' },
  inativo: { label: 'Inativo', c: '#6b7280', bg: 'rgba(107,114,128,.14)' },
  pendente_convite: { label: 'Convite pendente', c: '#b97e0a', bg: 'rgba(217,164,65,.16)' },
  desconto: { label: 'Desconto ativo', c: '#a31b28', bg: 'rgba(191,33,47,.12)' },
};
function A_Pill({ status, dot = true, children }) {
  const s = A_STATUS[status] || { label: children || status, c: 'var(--muted)', bg: 'var(--tint)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: s.bg, whiteSpace: 'nowrap' }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.c }} />}
      <span style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: s.c }}>{s.label}</span>
    </span>
  );
}

function A_Kpi({ label, value, delta, up, icon, accent = 'var(--navy)' }) {
  return (
    <A_Card pad={18}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, background: `color-mix(in srgb, ${accent} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        </span>
        {delta && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: up ? '#0c6e4e' : 'var(--vermelho-ink)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{up ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}</svg>{delta}
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 40, lineHeight: 0.95, color: 'var(--ink)', marginTop: 14 }}>{value}</div>
      <div style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 500, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
    </A_Card>
  );
}

// simple bar chart
function A_Bars({ data, color = 'var(--navy)', h = 150 }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: h }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
          <div title={A_brl(d.v)} style={{ width: '100%', maxWidth: 18, borderRadius: '4px 4px 2px 2px', height: `${(d.v / max) * 100}%`,
            background: d.hl ? 'var(--dourado)' : color, opacity: d.hl ? 1 : 0.82, transition: 'height .3s' }} />
          {d.l && <span style={{ fontFamily: 'var(--ui)', fontSize: 9, color: 'var(--muted)' }}>{d.l}</span>}
        </div>
      ))}
    </div>
  );
}

function A_Toast({ msg }) {
  if (!msg) return null;
  return <div style={{ position: 'absolute', right: 24, bottom: 24, zIndex: 60, background: 'var(--ink)', color: 'var(--bg)', borderRadius: 12, padding: '13px 18px', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 600, boxShadow: '0 12px 30px rgba(0,0,0,.3)', animation: 'afade .25s ease' }}>{msg}</div>;
}

// ════════════════════════ Shell ════════════════════════
function AdminShell({ active, nav, title, subtitle, actions, children, scroll = true }) {
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', fontFamily: 'var(--ui)', color: 'var(--ink)' }}>
      {/* sidebar */}
      <aside style={{ width: 236, flex: '0 0 auto', background: 'var(--navy)', display: 'flex', flexDirection: 'column', padding: '22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 22px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <span style={{ width: 11, height: 22, borderRadius: 999, border: '1.5px solid #c5a059', overflow: 'hidden', background: 'repeating-linear-gradient(-45deg, #bf212f 0 4px, #fffcf5 4px 8px, #2a5a8f 8px 12px, #fffcf5 12px 16px)' }} />
          </span>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: 1.5, color: '#fffcf5', lineHeight: 0.9 }}>NAVALHA</div>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#c5a059' }}>Admin</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          {A_NAV.map((it) => {
            const on = active === it.id;
            return (
              <button key={it.id} onClick={() => nav && nav(it.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, height: 42, padding: '0 12px', borderRadius: 10, cursor: 'pointer', border: 'none', textAlign: 'left',
                background: on ? 'rgba(197,160,89,.16)' : 'transparent', color: on ? '#fffcf5' : 'rgba(255,252,245,.62)', position: 'relative' }}>
                {on && <span style={{ position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: 999, background: '#c5a059' }} />}
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={on ? '#c5a059' : 'currentColor'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: on ? 700 : 500 }}>{it.label}</span>
              </button>
            );
          })}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px 4px', marginTop: 12, borderTop: '1px solid rgba(255,252,245,.12)' }}>
          <A_Avatar initials="BJ" color="#c5a059" s={34} fs={14} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: '#fffcf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Barbearia do Jajá</div>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, color: 'rgba(255,252,245,.5)' }}>plano Pro</div>
          </div>
        </div>
      </aside>

      {/* main */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--hairline)', background: 'var(--bg)' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.6, color: 'var(--ink)', lineHeight: 0.95 }}>{title}</h1>
            {subtitle && <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', marginTop: 3 }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{actions}</div>
        </header>
        <div style={{ flex: 1, overflow: scroll ? 'auto' : 'hidden', padding: scroll ? '24px 28px 40px' : 0, position: 'relative' }}>{children}</div>
      </main>
    </div>
  );
}

Object.assign(window, { AdminShell, A_Kpi, A_Card, A_Pill, A_Btn, A_Avatar, A_Bars, A_brl, A_SectionTitle, A_Toast, A_STATUS });
