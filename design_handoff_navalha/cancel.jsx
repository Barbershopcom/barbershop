// barbershop.jsx — A8 Página da barbearia, vintage style.
// Exports to window: BarbershopPage.
const { useState } = React;

const brlB = (n) => 'R$\u00a0' + n.toFixed(2).replace('.', ',');

function MonoB({ initials, color = 'var(--frame)', s = 30, fs = 15, ring }) {
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: color, color: 'var(--papel)', flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: fs, letterSpacing: 0.5,
      boxShadow: ring ? '0 0 0 3px var(--card), 0 0 0 4.5px var(--dourado)' : 'none' }}>{initials}</div>
  );
}

function Stars({ r, size = 12 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n <= Math.round(r) ? 'var(--dourado)' : 'none'} stroke="var(--dourado)" strokeWidth="1.5"><path d="M12 2.2l2.95 6.4 6.85.85-5.05 4.65 1.35 6.85L12 18.1l-6.05 3.5 1.35-6.85L2.25 9.45l6.85-.85z" /></svg>
      ))}
    </span>
  );
}

// ── data ─────────────────────────────────────────────────────
const SERVICES = [
  { id: 's1', name: 'Corte clássico', dur: '30 min', price: 50, was: null, barbers: ['JJ', 'RF'] },
  { id: 's2', name: 'Barba terapia', dur: '20 min', price: 30, was: null, barbers: ['JJ', 'CA'] },
  { id: 's3', name: 'Corte + Barba', dur: '50 min', price: 64, was: 80, off: 20, barbers: ['JJ'] },
  { id: 's4', name: 'Pezinho / acabamento', dur: '15 min', price: 20, was: null, barbers: ['JJ', 'RF', 'CA'] },
  { id: 's5', name: 'Sobrancelha', dur: '10 min', price: 15, was: null, barbers: ['CA'] },
];
const BARBERS = [
  { in: 'JJ', name: 'Jajá', color: 'var(--frame)', r: 4.8, cuts: '1,2k', spec: 'Degradê · navalhado' },
  { in: 'RF', name: 'Rafa', color: 'var(--vermelho)', r: 4.6, cuts: '840', spec: 'Clássico · tesoura' },
  { in: 'CA', name: 'Cau', color: '#2a5a8f', r: 4.9, cuts: '2,1k', spec: 'Barba · freestyle' },
];
const REVIEWS = [
  { in: 'MP', name: 'Marcos P.', color: 'var(--frame)', r: 5, when: 'há 2 dias', text: 'Melhor corte da região. O Jajá caprichou no degradê, saí novo.' },
  { in: 'LT', name: 'Lucas T.', color: 'var(--vermelho)', r: 5, when: 'há 1 semana', text: 'Ambiente top, café na espera e barba impecável. Volto sempre.' },
  { in: 'RA', name: 'Rafa A.', color: '#2a5a8f', r: 4, when: 'há 2 semanas', text: 'Bom atendimento, só atrasou uns 10 min. Corte ficou ótimo.' },
];

function Pill({ children }) {
  return <span style={{ fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', background: 'var(--dourado)', color: '#1c1917', padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>{children}</span>;
}

function ServiceCard({ s, selected, onToggle }) {
  return (
    <div onClick={onToggle} style={{ borderRadius: 15, background: 'var(--card)', cursor: 'pointer',
      border: (selected ? '2px' : '1px') + ' solid ' + (selected ? 'var(--frame)' : 'var(--hairline)'),
      padding: selected ? 13 : 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)', transition: 'border-color .12s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{s.name}</span>
            {s.off && <Pill>−{s.off}%</Pill>}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.dur}</div>
          {/* barbers that do it */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9 }}>
            <div style={{ display: 'flex' }}>
              {s.barbers.map((b, i) => (
                <div key={b} style={{ marginLeft: i ? -7 : 0, border: '1.5px solid var(--card)', borderRadius: '50%' }}>
                  <MonoB initials={b} s={22} fs={10} color={b === 'JJ' ? 'var(--frame)' : b === 'RF' ? 'var(--vermelho)' : '#2a5a8f'} />
                </div>
              ))}
            </div>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10.5, color: 'var(--muted)' }}>{s.barbers.length} barbeiros</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            {s.was && <div style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)', textDecoration: 'line-through' }}>{brlB(s.was)}</div>}
            <div style={{ fontFamily: 'var(--ui)', fontSize: 17, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{brlB(s.price)}</div>
          </div>
          <span style={{ width: 26, height: 26, borderRadius: 8, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1.6px solid ' + (selected ? 'var(--frame)' : 'var(--hairline-strong)'), background: selected ? 'var(--frame)' : 'transparent', transition: 'all .12s' }}>
            {selected
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
          </span>
        </div>
      </div>
    </div>
  );
}

function BarberDetailCard({ b }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderRadius: 15, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 13, boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
      <MonoB initials={b.in} color={b.color} s={52} fs={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{b.name}</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{b.spec}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
          <Stars r={b.r} />
          <span style={{ fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: 'var(--dourado-ink)' }}>{b.r.toString().replace('.', ',')}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--hairline-strong)' }} />
          <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)' }}>{b.cuts} cortes</span>
        </div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
    </div>
  );
}

function ReviewItem({ rv }) {
  return (
    <div style={{ borderRadius: 15, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MonoB initials={rv.in} color={rv.color} s={34} fs={15} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{rv.name}</div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)' }}>{rv.when}</div>
        </div>
        <Stars r={rv.r} size={13} />
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink)', marginTop: 10, lineHeight: 1.5 }}>{rv.text}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span style={{ color: 'var(--frame-ink)', marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 13.5, color: 'var(--ink)', marginTop: 3, lineHeight: 1.4 }}>{value}</div>
      </div>
    </div>
  );
}

function SocialBtn({ children, label }) {
  return (
    <button style={{ flex: 1, height: 42, borderRadius: 11, border: '1.4px solid var(--hairline-strong)', background: 'var(--card)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
      {children}<span>{label}</span>
    </button>
  );
}

const TABS = ['Serviços', 'Barbeiros', 'Avaliações', 'Info'];

// ════════════════════════════════════════════════════════════
function BarbershopPage({ tweaks = {}, nav }) {
  const { dark = false, tab: tabInit = 'Serviços' } = tweaks;
  const [tab, setTab] = useState(tabInit);
  const [sel, setSel] = useState(['s3']);
  const toggle = (id) => setSel((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);

  const selServices = SERVICES.filter((s) => sel.includes(s.id));
  const total = selServices.reduce((a, s) => a + s.price, 0);
  const dur = selServices.reduce((a, s) => a + parseInt(s.dur), 0);

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* scroll body */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: sel.length ? 150 : 96 }}>
        {/* banner */}
        <div style={{ position: 'relative', height: 168, background: 'linear-gradient(135deg, var(--frame) 0%, #122845 100%)', overflow: 'hidden' }}>
          {/* barber-pole stripes motif */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.10, background: 'repeating-linear-gradient(-45deg, #fff 0 16px, transparent 16px 38px)' }} />
          <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', border: '14px solid var(--dourado)', opacity: 0.22 }} />
          {/* back + share */}
          <div style={{ position: 'absolute', top: 52, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => nav && nav('__back')} style={{ width: 38, height: 38, borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
            </button>
            <button style={{ width: 38, height: 38, borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
            </button>
          </div>
        </div>

        {/* identity (overlaps banner) */}
        <div style={{ padding: '0 18px', marginTop: -36 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 13 }}>
            <div style={{ width: 76, height: 76, borderRadius: 20, background: 'var(--card)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(28,25,23,.16)', flex: '0 0 auto' }}>
              <span style={{ width: 22, height: 52, borderRadius: 999, border: '1.5px solid var(--frame)', overflow: 'hidden', background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 6px, var(--papel) 6px 12px, var(--navy) 12px 18px, var(--papel) 18px 24px)' }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 4, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 999, background: 'color-mix(in srgb, var(--green) 16%, transparent)', marginBottom: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--green)' }}>Aberta agora</span>
              </div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.5, color: 'var(--ink)', lineHeight: 0.95 }}>BARBEARIA DO JAJÁ</div>
            </div>
          </div>

          {/* meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--dourado-ink)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--dourado)" stroke="none"><path d="M12 2l2.9 6.3L22 9.2l-5 4.6 1.3 6.9L12 17.4 5.7 20.7 7 13.8 2 9.2l7.1-.9z" /></svg>
              4,8 <span style={{ color: 'var(--muted)', fontWeight: 500 }}>(312)</span>
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--hairline-strong)' }} />
            <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, color: 'var(--muted)' }}>R. Aurora, 120 · Pinheiros</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--hairline-strong)' }} />
            <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, color: 'var(--muted)' }}>1,2 km</span>
          </div>

          {/* social */}
          <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
            <SocialBtn label="WhatsApp"><svg width="16" height="16" viewBox="0 0 24 24" fill="var(--green)"><path d="M12 2A10 10 0 0 0 3.5 17.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-2.6.8.8-2.5-.2-.3A8 8 0 0 1 12 4zm-2.7 4c-.2 0-.5 0-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7 2.1.8 2.5.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.6-.3z" /></svg></SocialBtn>
            <SocialBtn label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="var(--ink)" stroke="none" /></svg></SocialBtn>
            <SocialBtn label="Ligar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--frame-ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg></SocialBtn>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', marginTop: 18, padding: '0 18px', borderBottom: '1px solid var(--hairline)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 4 }}>
          {TABS.map((tb) => {
            const on = tab === tb;
            return (
              <button key={tb} onClick={() => setTab(tb)} style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', padding: '11px 0 12px', position: 'relative',
                fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? 'var(--frame-ink)' : 'var(--muted)' }}>
                {tb}
                {on && <span style={{ position: 'absolute', left: '50%', bottom: -1, transform: 'translateX(-50%)', width: '58%', height: 3, borderRadius: 3, background: 'var(--dourado)' }} />}
              </button>
            );
          })}
        </div>

        {/* panels */}
        <div style={{ padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
          {tab === 'Serviços' && SERVICES.map((s) => <ServiceCard key={s.id} s={s} selected={sel.includes(s.id)} onToggle={() => toggle(s.id)} />)}
          {tab === 'Barbeiros' && BARBERS.map((b) => <BarberDetailCard key={b.in} b={b} />)}
          {tab === 'Avaliações' && (
            <React.Fragment>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderRadius: 15, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 16, marginBottom: 2 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 44, lineHeight: 0.9, color: 'var(--frame-ink)' }}>4,8</div>
                  <Stars r={4.8} size={13} />
                </div>
                <div style={{ flex: 1, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>312 avaliações · 96% recomendam esta barbearia</div>
              </div>
              {REVIEWS.map((rv) => <ReviewItem key={rv.in} rv={rv} />)}
            </React.Fragment>
          )}
          {tab === 'Info' && (
            <div style={{ borderRadius: 15, background: 'var(--card)', border: '1px solid var(--hairline)', padding: '4px 16px 14px' }}>
              <InfoRow label="Endereço" value="R. Aurora, 120 · Pinheiros, São Paulo — SP" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>} />
              <InfoRow label="Horário" value="Ter–Sáb · 09:00–20:00 · Seg e Dom fechado" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>} />
              <InfoRow label="Telefone" value="(11) 95555-0427" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>} />
              {/* mini map */}
              <div style={{ position: 'relative', height: 110, borderRadius: 12, overflow: 'hidden', background: 'var(--tint)', border: '1px solid var(--hairline)', marginTop: 14 }}>
                <svg width="100%" height="100%" viewBox="0 0 320 110" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
                  <g stroke="var(--hairline-strong)" strokeWidth="7" opacity="0.5"><path d="M-10 34 H330" /><path d="M-10 80 H330" /><path d="M70 -10 V120" /><path d="M170 -10 V120" /><path d="M250 -10 V120" /></g>
                  <path d="M-10 34 H330" stroke="var(--dourado)" strokeWidth="2.4" opacity="0.55" /><path d="M170 -10 V120" stroke="var(--dourado)" strokeWidth="2.4" opacity="0.55" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-100%)' }}>
                  <svg width="28" height="36" viewBox="0 0 30 38" fill="none"><path d="M15 37C15 37 27 22 27 13A12 12 0 1 0 3 13C3 22 15 37 15 37Z" fill="var(--vermelho)" stroke="#fff" strokeWidth="2" /><circle cx="15" cy="13" r="4.5" fill="#fff" /></svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* fixed CTA */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 18px 30px', background: 'linear-gradient(to top, var(--bg) 74%, transparent)', zIndex: 8 }}>
        <button onClick={() => nav && nav('agendar')} style={{ width: '100%', height: 56, borderRadius: 15, border: 'none', cursor: 'pointer',
          background: 'var(--frame)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, letterSpacing: 0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', boxShadow: '0 8px 22px rgba(28,25,23,.22)' }}>
          <span>{sel.length ? `Agendar · ${sel.length} ${sel.length > 1 ? 'serviços' : 'serviço'}` : 'Agendar agora'}</span>
          {sel.length > 0
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ fontFamily: 'var(--ui)', fontSize: 12, opacity: 0.8 }}>{dur} min</span><span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: 0.5 }}>{brlB(total)}</span></span>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>}
        </button>
      </div>
    </div>
  );
}

window.BarbershopPage = BarbershopPage;
