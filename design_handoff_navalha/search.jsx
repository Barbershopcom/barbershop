// promos.jsx — A22 Promoções (lista expandida), vintage style.
// Exports to window: PromosScreen.

const PROMO_THEME = {
  navy: { bg: 'var(--frame)', ink: '#fff', sub: 'rgba(255,255,255,.8)', tag: 'var(--dourado)', tagInk: '#1c1917' },
  red: { bg: 'var(--vermelho)', ink: '#fff', sub: 'rgba(255,255,255,.85)', tag: '#fff', tagInk: 'var(--vermelho)' },
  gold: { bg: 'var(--dourado)', ink: '#1c1917', sub: 'rgba(28,25,23,.7)', tag: '#1c1917', tagInk: 'var(--dourado)' },
};

const PROMOS = [
  { id: 1, off: '30% OFF', title: 'Corte + Barba', shop: 'Barbearia do Jajá', until: 'até domingo', theme: 'navy' },
  { id: 2, off: 'R$ 10 OFF', title: 'No 1º corte', shop: 'Rede Navalha', until: 'novos clientes', theme: 'red' },
  { id: 3, off: '2 POR 1', title: 'Leve um amigo', shop: 'Studio Lâmina', until: 'até 31 mai', theme: 'gold' },
  { id: 4, off: '15% OFF', title: 'Combo pai & filho', shop: 'Barbearia do Jajá', until: 'fim de semana', theme: 'navy' },
  { id: 5, off: 'GRÁTIS', title: 'Sobrancelha no pacote', shop: 'Corte Old School', until: 'em qualquer corte', theme: 'red' },
];

function PromoBig({ p, onClick }) {
  const c = PROMO_THEME[p.theme];
  return (
    <div onClick={onClick} style={{ borderRadius: 18, background: c.bg, color: c.ink, padding: 18, position: 'relative', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 8px 20px rgba(28,25,23,.12)' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'repeating-linear-gradient(-45deg, #fff 0 14px, transparent 14px 34px)' }} />
      <div style={{ position: 'absolute', right: -24, top: -24, width: 96, height: 96, borderRadius: '50%', border: '12px solid ' + c.sub, opacity: 0.25 }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-block', fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', background: c.tag, color: c.tagInk, padding: '3px 9px', borderRadius: 999 }}>{p.until}</span>
          <div style={{ fontFamily: 'var(--display)', fontSize: 46, lineHeight: 0.85, letterSpacing: 0.5, marginTop: 12, whiteSpace: 'nowrap' }}>{p.off}</div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, marginTop: 8 }}>{p.title}</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: c.sub, marginTop: 4 }}>{p.shop}</div>
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid ' + c.sub }}>
        <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: c.ink }}>Ver detalhes</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </div>
    </div>
  );
}

function PromosScreen({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* app bar */}
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}>
        <button onClick={() => nav && nav('__back')} style={{ width: 38, height: 38, borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--display)', fontSize: 23, letterSpacing: 1, color: 'var(--ink)' }}>PROMOÇÕES</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', padding: '0 2px' }}>{PROMOS.length} ofertas ativas perto de você</div>
        {PROMOS.map((p) => <PromoBig key={p.id} p={p} onClick={() => nav && nav('barbearia')} />)}
      </div>
    </div>
  );
}

window.PromosScreen = PromosScreen;
