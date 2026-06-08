// notifications.jsx — A23 Notificações, vintage style.
// Exports to window: NotificationsScreen.
const { useState } = React;

function PoleN({ w = 26, h = 26 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 12, border: '1.4px solid var(--frame)', overflow: 'hidden', flex: '0 0 auto',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 6px, var(--papel) 6px 12px, var(--navy) 12px 18px, var(--papel) 18px 24px)', boxShadow: 'inset 0 0 0 2px var(--papel)' }} />
  );
}

// type → icon + accent
const TYPES = {
  confirmacao: { color: 'var(--frame)', icon: <path d="M5 13l4 4L19 7" /> },
  lembrete:    { color: 'var(--dourado)', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></> },
  promo:       { color: 'var(--vermelho)', icon: <><path d="M20.6 13.4 12 22l-9-9V4h9z" /><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" /></> },
  avaliar:     { color: '#c5a059', icon: <path d="M12 2.2l2.95 6.4 6.85.85-5.05 4.65 1.35 6.85L12 18.1l-6.05 3.5 1.35-6.85L2.25 9.45l6.85-.85z" /> },
  pagamento:   { color: 'var(--green)', icon: <><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 9.5h19" /></> },
};

const NOTIFS = [
  { group: 'Hoje', items: [
    { id: 1, type: 'confirmacao', unread: true, title: 'Jajá confirmou seu horário', body: 'Corte + Barba · sáb 17 mai, 14:00. Te esperamos!', when: 'há 12 min' },
    { id: 2, type: 'promo', unread: true, title: '30% OFF em Corte + Barba', body: 'Promo da Barbearia do Jajá, válida até domingo.', when: 'há 3 h' },
  ]},
  { group: 'Ontem', items: [
    { id: 3, type: 'lembrete', unread: true, title: 'Seu corte é amanhã', body: 'Lembrete: sáb 17 mai às 14:00 com o Jajá.', when: 'ontem · 19:30' },
    { id: 4, type: 'pagamento', unread: false, title: 'Pagamento confirmado', body: 'Recebemos seu Pix de R$ 76,00. Comanda 0427.', when: 'ontem · 14:33' },
  ]},
  { group: 'Esta semana', items: [
    { id: 5, type: 'avaliar', unread: false, title: 'Como foi seu corte?', body: 'Avalie seu atendimento de 02 mai e ajude o Jajá.', when: 'ter · 11:20' },
    { id: 6, type: 'lembrete', unread: false, title: 'Faz tempo que não corta!', body: 'Que tal agendar? Seu último corte foi há 3 semanas.', when: 'seg · 09:00' },
  ]},
];

function NotifRow({ n, onRead }) {
  const t = TYPES[n.type];
  return (
    <div onClick={() => onRead(n.id)} style={{ display: 'flex', gap: 12, padding: '13px 14px', borderRadius: 14, cursor: 'pointer', position: 'relative',
      background: n.unread ? 'color-mix(in srgb, var(--frame) 6%, var(--card))' : 'var(--card)',
      border: '1px solid ' + (n.unread ? 'color-mix(in srgb, var(--frame) 22%, transparent)' : 'var(--hairline)') }}>
      <span style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${t.color} 15%, transparent)` }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={n.type === 'avaliar' ? t.color : 'none'} stroke={t.color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: n.unread ? 700 : 600, color: 'var(--ink)' }}>{n.title}</span>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', flex: '0 0 auto' }}>{n.when}</span>
        </div>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 12.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>
      </div>
      {n.unread && <span style={{ position: 'absolute', top: 14, right: 12, width: 8, height: 8, borderRadius: '50%', background: 'var(--vermelho)' }} />}
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
function NotificationsScreen({ tweaks = {}, nav }) {
  const { dark = false, empty = false } = tweaks;
  const [read, setRead] = useState({});
  const markRead = (id) => setRead((r) => ({ ...r, [id]: true }));
  const markAll = () => { const all = {}; NOTIFS.forEach((g) => g.items.forEach((n) => { all[n.id] = true; })); setRead(all); };
  const isUnread = (n) => n.unread && !read[n.id];
  const unreadCount = NOTIFS.reduce((a, g) => a + g.items.filter(isUnread).length, 0);

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* header */}
      <div style={{ paddingTop: 54, paddingBottom: 12, paddingLeft: 18, paddingRight: 18, background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => nav && nav('__back')} style={{ width: 38, height: 38, borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
            </button>
            <span style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 0.8, color: 'var(--ink)' }}>NOTIFICAÇÕES</span>
          </div>
          <PoleN w={26} h={26} />
        </div>
        {!empty && unreadCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--muted)' }}>{unreadCount} não lidas</span>
            <button onClick={markAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--frame-ink)' }}>Marcar todas como lidas</button>
          </div>
        )}
      </div>

      {/* list */}
      <div style={{ flex: 1, overflow: 'auto', padding: empty ? 0 : '14px 18px 96px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {empty ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px', minHeight: 420 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--tint)', border: '1.5px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 0.5, color: 'var(--ink)' }}>TUDO EM DIA</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.45 }}>Você não tem notificações novas por enquanto.</div>
          </div>
        ) : NOTIFS.map((g) => (
          <div key={g.group}>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', margin: '0 2px 9px' }}>{g.group}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {g.items.map((n) => <NotifRow key={n.id} n={{ ...n, unread: isUnread(n) }} onRead={markRead} />)}
            </div>
          </div>
        ))}
      </div>

      {/* bottom tab */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 9, paddingBottom: 26, background: 'var(--card)', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', zIndex: 10 }}>
        <Tab icon="home" label="Início" onClick={() => nav && nav('home')} />
        <Tab icon="search" label="Buscar" onClick={() => nav && nav('busca')} />
        <Tab icon="cal" label="Agenda" onClick={() => nav && nav('historico')} />
        <Tab icon="user" label="Perfil" onClick={() => nav && nav('perfil')} />
      </div>
    </div>
  );
}

window.NotificationsScreen = NotificationsScreen;
