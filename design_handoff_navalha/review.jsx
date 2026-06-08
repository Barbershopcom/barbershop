// profile.jsx — A19 Perfil cliente, vintage style.
// Exports to window: ProfileScreen.

function PoleP({ w = 26, h = 26 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 12, border: '1.4px solid var(--frame)', overflow: 'hidden', flex: '0 0 auto',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 6px, var(--papel) 6px 12px, var(--navy) 12px 18px, var(--papel) 18px 24px)', boxShadow: 'inset 0 0 0 2px var(--papel)' }} />
  );
}

// menu icons
const I = {
  edit: <><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  card: <><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 9.5h19" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5M12 17h.01" /></>,
  out: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
};

function MenuRow({ icon, label, sub, danger, last, onClick, badge }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 4px', cursor: 'pointer', borderBottom: last ? 'none' : '1px solid var(--hairline)' }}>
      <span style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: danger ? 'var(--red-bg)' : 'var(--tint)' }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={danger ? 'var(--vermelho)' : 'var(--frame-ink)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{I[icon]}</svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 600, color: danger ? 'var(--vermelho-ink)' : 'var(--ink)' }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      {badge && <span style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 800, color: '#fff', background: 'var(--vermelho)', borderRadius: 999, padding: '2px 7px', flex: '0 0 auto' }}>{badge}</span>}
      {!danger && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M9 5l7 7-7 7" /></svg>}
    </div>
  );
}

function Group({ label, children }) {
  return (
    <div>
      {label && <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', margin: '0 2px 8px' }}>{label}</div>}
      <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: '2px 14px', boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>{children}</div>
    </div>
  );
}

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
function ProfileScreen({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const stat = (n, l) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 28, lineHeight: 0.9, color: 'var(--frame-ink)' }}>{n}</div>
      <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3 }}>{l}</div>
    </div>
  );

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* header */}
      <div style={{ paddingTop: 54, paddingBottom: 12, paddingLeft: 18, paddingRight: 18, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.8, color: 'var(--ink)' }}>PERFIL</span>
        <PoleP w={28} h={28} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 18px 96px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* identity card */}
        <div style={{ borderRadius: 18, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 18, boxShadow: '0 8px 20px rgba(28,25,23,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--frame)', color: 'var(--papel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 28, letterSpacing: 1, boxShadow: '0 0 0 3px var(--card), 0 0 0 4.5px var(--dourado)' }}>JS</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>João da Silva</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>cliente desde mar 2025</div>
            </div>
            <button onClick={() => nav && nav('editar')} style={{ flex: '0 0 auto', height: 36, padding: '0 14px', borderRadius: 10, border: '1.4px solid var(--hairline-strong)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Editar</button>
          </div>
          <div style={{ display: 'flex', marginTop: 16, paddingTop: 15, borderTop: '1px solid var(--hairline)' }}>
            {stat('14', 'cortes')}
            <span style={{ width: 1, background: 'var(--hairline)' }} />
            {stat('4,9', 'sua nota')}
            <span style={{ width: 1, background: 'var(--hairline)' }} />
            {stat('2', 'favoritas')}
          </div>
        </div>

        {/* contact data */}
        <Group label="Dados">
          <MenuRow icon="edit" label="Editar perfil" sub="joao@email.com · (11) 95555-0123" onClick={() => nav && nav('editar')} />
          <MenuRow icon="pin" label="Endereços salvos" sub="Casa · Trabalho" />
          <MenuRow icon="card" label="Métodos de pagamento" sub="Pix · Cartão final 4242" last />
        </Group>

        {/* preferences */}
        <Group label="Preferências">
          <MenuRow icon="bell" label="Notificações" sub="Lembretes, confirmações, promoções" badge="3" onClick={() => nav && nav('notificacoes')} />
          <MenuRow icon="lock" label="Privacidade e dados" last />
        </Group>

        {/* support */}
        <Group label="Suporte">
          <MenuRow icon="help" label="Ajuda e WhatsApp" sub="Fala com a gente" />
          <MenuRow icon="out" label="Sair da conta" danger last onClick={() => nav && nav('login')} />
        </Group>

        <div style={{ textAlign: 'center', fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)', paddingTop: 2 }}>NAVALHA · versão 1.0.0</div>
      </div>

      {/* bottom tab */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 9, paddingBottom: 26, background: 'var(--card)', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', zIndex: 10 }}>
        <Tab icon="home" label="Início" onClick={() => nav && nav('home')} />
        <Tab icon="search" label="Buscar" onClick={() => nav && nav('busca')} />
        <Tab icon="cal" label="Agenda" onClick={() => nav && nav('historico')} />
        <Tab icon="user" label="Perfil" active />
      </div>
    </div>
  );
}

window.ProfileScreen = ProfileScreen;
