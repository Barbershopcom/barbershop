// home.jsx — A6 Home cliente, vintage barbershop style.
// Exports to window: HomeScreen.
const { useState } = React;

const brlH = (n) => 'R$\u00a0' + n.toFixed(2).replace('.', ',');

function Mono({ initials, color = 'var(--frame)', s = 30, fs = 15 }) {
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: color, color: 'var(--papel)', flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: fs, letterSpacing: 0.5 }}>{initials}</div>
  );
}

function PoleH({ w = 8, h = 18 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 999, border: '1.3px solid var(--frame)', overflow: 'hidden',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 4px, var(--papel) 4px 8px, var(--navy) 8px 12px, var(--papel) 12px 16px)', boxShadow: 'inset 0 0 0 1.5px var(--papel)' }} />
  );
}

function SectionHead({ title, action = 'Ver tudo', onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px', padding: '0 18px' }}>
      <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</span>
      <span onClick={onAction} style={{ fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: 'var(--frame-ink)', cursor: 'pointer' }}>{action} →</span>
    </div>
  );
}

// horizontal scroller (bleeds to edges, padded ends)
function HScroll({ children }) {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 18px 4px', scrollSnapType: 'x mandatory' }}>{children}</div>
  );
}

const PROMO_COLORS = {
  navy: { bg: 'var(--frame)', ink: '#fff', sub: 'rgba(255,255,255,.78)', tag: 'var(--dourado)', tagInk: '#1c1917' },
  red: { bg: 'var(--vermelho)', ink: '#fff', sub: 'rgba(255,255,255,.82)', tag: '#fff', tagInk: 'var(--vermelho)' },
  gold: { bg: 'var(--dourado)', ink: '#1c1917', sub: 'rgba(28,25,23,.66)', tag: '#1c1917', tagInk: 'var(--dourado)' },
};
function PromoCard({ pct, title, shop, until, color }) {
  const c = PROMO_COLORS[color];
  return (
    <div style={{ flex: '0 0 auto', width: 230, scrollSnapAlign: 'start', borderRadius: 16, background: c.bg, color: c.ink, padding: 16, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 20px rgba(28,25,23,.12)' }}>
      {/* faint pole motif */}
      <div style={{ position: 'absolute', right: -14, top: -14, width: 70, height: 70, borderRadius: '50%', border: '10px solid ' + c.sub, opacity: 0.18 }} />
      <span style={{ display: 'inline-block', fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', background: c.tag, color: c.tagInk, padding: '3px 9px', borderRadius: 999 }}>{until}</span>
      <div style={{ fontFamily: 'var(--display)', fontSize: 34, lineHeight: 0.9, letterSpacing: 0.5, marginTop: 12, whiteSpace: 'nowrap' }}>{pct}</div>
      <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, marginTop: 6 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: c.sub }}>
        {shop}
      </div>
    </div>
  );
}

function BarberCard({ initials, name, shop, rating, cuts, color, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: '0 0 auto', width: 144, scrollSnapAlign: 'start', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.06)', textAlign: 'center', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}><Mono initials={initials} color={color} s={56} fs={26} /></div>
      <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginTop: 10 }}>{name}</div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shop}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 9 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: 'var(--dourado-ink)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--dourado)" stroke="none"><path d="M12 2l2.9 6.3L22 9.2l-5 4.6 1.3 6.9L12 17.4 5.7 20.7 7 13.8 2 9.2l7.1-.9z" /></svg>{rating}
        </span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--hairline-strong)' }} />
        <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)' }}>{cuts} cortes</span>
      </div>
    </div>
  );
}

// compact upcoming appointment
function HomeAppt({ onOpen }) {
  return (
    <div onClick={onOpen} style={{ margin: '0 18px', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.06)', display: 'flex', gap: 13, alignItems: 'center', cursor: 'pointer' }}>
      <div style={{ flex: '0 0 auto', width: 50, borderRadius: 12, background: 'var(--tint)', border: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 24, lineHeight: 0.9, color: 'var(--frame-ink)' }}>17</span>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 2 }}>mai</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>sáb · 14:00</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: 'color-mix(in srgb, var(--frame) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--frame) 38%, transparent)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--frame)' }} />
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--frame-ink)' }}>Confirmado</span>
          </span>
        </div>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>Corte clássico + Barba</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <PoleH w={7} h={16} />
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>com Jajá · Barbearia do Jajá</span>
        </div>
      </div>
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
function HomeScreen({ tweaks = {}, nav }) {
  const { dark = false, periodo = 'Bom dia', empty = false } = tweaks;
  const go = (r) => nav && nav(r);

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* header */}
      <div style={{ paddingTop: 54, paddingBottom: 14, paddingLeft: 18, paddingRight: 18, background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Mono initials="JS" s={42} fs={19} />
            <div>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)' }}>{periodo},</div>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>João da Silva</div>
            </div>
          </div>
          <button onClick={() => go('notificacoes')} style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%', background: 'var(--vermelho)', border: '1.5px solid var(--card)' }} />
          </button>
        </div>

        {/* greeting masthead */}
        <div style={{ fontFamily: 'var(--display)', fontSize: 34, letterSpacing: 0.5, color: 'var(--ink)', marginTop: 16, lineHeight: 1 }}>PRONTO PRO PRÓXIMO CORTE?</div>

        {/* search entry */}
        <div onClick={() => go('busca')} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, height: 48, borderRadius: 13, background: 'var(--card)', border: '1.4px solid var(--hairline-strong)', padding: '0 14px', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></svg>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--muted)' }}>Buscar barbearia, serviço…</span>
        </div>
      </div>

      {/* body */}
      {empty ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px 80px' }}>
          <div style={{ width: 78, height: 78, borderRadius: '50%', background: 'var(--tint)', border: '1.5px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 0.5, color: 'var(--ink)' }}>COMECE POR AQUI</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.45 }}>Encontre uma barbearia perto de você e marque seu primeiro corte.</div>
          <button style={{ marginTop: 20, height: 50, padding: '0 26px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'var(--vermelho)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, boxShadow: '0 8px 20px rgba(191,33,47,.28)' }}>Encontrar barbearia</button>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', paddingTop: 6, paddingBottom: 96, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <SectionHead title="Promoções da semana" onAction={() => go('promocoes')} />
            <HScroll>
              <PromoCard pct="30% OFF" title="Corte + Barba" shop="Barbearia do Jajá" until="até domingo" color="navy" />              <PromoCard pct="R$ 10 OFF" title="No 1º corte" shop="Rede Navalha" until="1ª vez" color="red" />
              <PromoCard pct="2 por 1" title="Leve um amigo" shop="Studio Lâmina" until="até 31 mai" color="gold" />
            </HScroll>
          </div>

          <div>
            <SectionHead title="Seus agendamentos" action="Ver todos" onAction={() => go('historico')} />
            <HomeAppt onOpen={() => go('detalhe')} />
          </div>

          <div>
            <SectionHead title="Barbeiros em destaque" />
            <HScroll>
              <BarberCard initials="JJ" name="Jajá" shop="Barbearia do Jajá" rating="4,8" cuts="1,2k" color="var(--frame)" onClick={() => go('barbearia')} />
              <BarberCard initials="RF" name="Rafa" shop="Barbearia do Jajá" rating="4,6" cuts="840" color="var(--vermelho)" onClick={() => go('barbearia')} />
              <BarberCard initials="CA" name="Cau" shop="Studio Lâmina" rating="4,9" cuts="2,1k" color="#2a5a8f" onClick={() => go('barbearia')} />
              <BarberCard initials="BT" name="Beto" shop="Navalha Centro" rating="4,7" cuts="560" color="var(--frame)" onClick={() => go('barbearia')} />
            </HScroll>
          </div>
        </div>
      )}

      {/* bottom tab */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 9, paddingBottom: 26, background: 'var(--card)', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', zIndex: 10 }}>
        <Tab icon="home" label="Início" active />
        <Tab icon="search" label="Buscar" onClick={() => go('busca')} />
        <Tab icon="cal" label="Agenda" onClick={() => go('historico')} />
        <Tab icon="user" label="Perfil" onClick={() => go('perfil')} />
      </div>
    </div>
  );
}

window.HomeScreen = HomeScreen;
