// search.jsx — A7 Busca de barbearias, vintage style.
// Exports to window: SearchScreen.
const { useState } = React;

function PoleS({ w = 26, h = 26 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 12, border: '1.4px solid var(--frame)', overflow: 'hidden', flex: '0 0 auto',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 6px, var(--papel) 6px 12px, var(--navy) 12px 18px, var(--papel) 18px 24px)', boxShadow: 'inset 0 0 0 2px var(--papel)' }} />
  );
}

// little tile "logo" per shop (monogram on tinted block)
function ShopLogo({ initials, bg, s = 64 }) {
  return (
    <div style={{ width: s, height: s, borderRadius: 14, flex: '0 0 auto', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.12, background: 'repeating-linear-gradient(-45deg, #fff 0 8px, transparent 8px 18px)' }} />
      <span style={{ fontFamily: 'var(--display)', fontSize: s * 0.42, letterSpacing: 1, color: '#fff', position: 'relative' }}>{initials}</span>
    </div>
  );
}

const SHOPS = [
  { id: 1, in: 'JJ', bg: 'var(--frame)', name: 'Barbearia do Jajá', hood: 'Pinheiros', dist: '1,2 km', r: 4.8, n: 312, barbers: 3, open: true, promo: true, tags: ['promocoes', 'avaliadas', 'proximas'] },
  { id: 2, in: 'SL', bg: '#2a5a8f', name: 'Studio Lâmina', hood: 'Vila Madalena', dist: '2,0 km', r: 4.9, n: 528, barbers: 5, open: true, promo: false, tags: ['avaliadas', 'proximas'] },
  { id: 3, in: 'NV', bg: 'var(--vermelho)', name: 'Navalha Centro', hood: 'República', dist: '3,4 km', r: 4.7, n: 196, barbers: 4, open: false, promo: true, tags: ['promocoes'] },
  { id: 4, in: 'BR', bg: '#1c1917', name: 'Barba & Real', hood: 'Itaim Bibi', dist: '4,1 km', r: 4.6, n: 142, barbers: 2, open: true, promo: false, tags: ['proximas'] },
  { id: 5, in: 'CO', bg: '#7a5a2f', name: 'Corte Old School', hood: 'Perdizes', dist: '5,8 km', r: 4.9, n: 410, barbers: 6, open: true, promo: true, tags: ['avaliadas', 'promocoes'] },
];

const FILTERS = [
  { id: 'proximas', label: 'Próximas' },
  { id: 'avaliadas', label: 'Mais avaliadas' },
  { id: 'promocoes', label: 'Promoções' },
];

function Stars({ r, size = 11 }) {
  return <span style={{ display: 'inline-flex', gap: 1 }}>{[1,2,3,4,5].map((n)=>(<svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n<=Math.round(r)?'var(--dourado)':'none'} stroke="var(--dourado)" strokeWidth="1.5"><path d="M12 2.2l2.95 6.4 6.85.85-5.05 4.65 1.35 6.85L12 18.1l-6.05 3.5 1.35-6.85L2.25 9.45l6.85-.85z" /></svg>))}</span>;
}

function BarbershopCard({ shop, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', gap: 13, alignItems: 'center', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 13, boxShadow: '0 6px 16px rgba(28,25,23,.05)', cursor: 'pointer' }}>
      <ShopLogo initials={shop.in} bg={shop.bg} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shop.name}</span>
          {shop.promo && <span style={{ fontFamily: 'var(--ui)', fontSize: 9, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', background: 'var(--dourado)', color: '#1c1917', padding: '2px 6px', borderRadius: 999, flex: '0 0 auto' }}>Promo</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Stars r={shop.r} />
          <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 700, color: 'var(--dourado-ink)' }}>{shop.r.toString().replace('.', ',')}</span>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)' }}>({shop.n})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{shop.hood} · {shop.dist}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--hairline-strong)', flex: '0 0 auto' }} />
          <span style={{ whiteSpace: 'nowrap' }}>{shop.barbers} barbeiros</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, padding: '2px 8px', borderRadius: 999,
          background: shop.open ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'var(--tint)' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: shop.open ? 'var(--green)' : 'var(--muted)' }} />
          <span style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 700, color: shop.open ? 'var(--green)' : 'var(--muted)' }}>{shop.open ? 'Aberta agora' : 'Fechada'}</span>
        </div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M9 5l7 7-7 7" /></svg>
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
function SearchScreen({ tweaks = {}, nav }) {
  const { dark = false, empty = false } = tweaks;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('proximas');

  let list = empty ? [] : SHOPS.filter((s) => s.tags.includes(filter));
  if (q.trim()) list = list.filter((s) => (s.name + ' ' + s.hood).toLowerCase().includes(q.toLowerCase()));
  const noResults = !empty && list.length === 0;

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* header */}
      <div style={{ paddingTop: 54, paddingBottom: 13, paddingLeft: 18, paddingRight: 18, background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.8, color: 'var(--ink)' }}>BUSCAR</span>
          <PoleS w={28} h={28} />
        </div>
        {/* search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, borderRadius: 13, background: 'var(--card)', border: '1.4px solid var(--hairline-strong)', padding: '0 14px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome da barbearia ou bairro"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink)' }} />
          {q && <button onClick={() => setQ('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 2 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></button>}
        </div>
        {/* filter chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto' }}>
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{ flex: '0 0 auto', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: 'pointer',
                padding: '8px 14px', borderRadius: 999, border: '1.5px solid ' + (on ? 'var(--frame)' : 'var(--hairline-strong)'),
                background: on ? 'var(--frame)' : 'transparent', color: on ? '#fff' : 'var(--ink)', transition: 'all .12s' }}>{f.label}</button>
            );
          })}
        </div>
      </div>

      {/* results */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 18px 96px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(empty || noResults) ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 36px', minHeight: 360 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--tint)', border: '1.5px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6" /></svg>
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 0.5, color: 'var(--ink)' }}>NADA ENCONTRADO</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.45 }}>Tenta outro termo ou ajusta os filtros.</div>
          </div>
        ) : (
          <React.Fragment>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)', padding: '6px 2px 0' }}>{list.length} barbearias perto de você</div>
            {list.map((s) => <BarbershopCard key={s.id} shop={s} onClick={() => nav && nav('barbearia')} />)}
          </React.Fragment>
        )}
      </div>

      {/* bottom tab */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 9, paddingBottom: 26, background: 'var(--card)', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', zIndex: 10 }}>
        <Tab icon="home" label="Início" onClick={() => nav && nav('home')} />
        <Tab icon="search" label="Buscar" active />
        <Tab icon="cal" label="Agenda" onClick={() => nav && nav('historico')} />
        <Tab icon="user" label="Perfil" onClick={() => nav && nav('perfil')} />
      </div>
    </div>
  );
}

window.SearchScreen = SearchScreen;
