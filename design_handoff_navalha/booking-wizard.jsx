// barber-screens-2.jsx — Ajustes hub, Serviços (B6), Disponibilidade (B7), Folgas (B8), Perfil (B9), Config (B11).
// Uses barber-kit globals. Exports: BarberAjustes, BarberServices, BarberAvailability, BarberTimeOff, BarberProfile, BarberSettings.
const { useState: b2State } = React;

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', flex: '0 0 auto',
      background: on ? 'var(--green)' : 'var(--hairline-strong)', transition: 'background .15s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  );
}

// ════════════════════════ Ajustes hub ════════════════════════
function BarberAjustes({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const rows = [
    { id: 'bservicos', icon: <><path d="M14.5 4.5 19 9l-9.5 9.5L5 19l.5-4.5z" /><path d="M14.5 4.5 19 9" /></>, label: 'Meus serviços', sub: 'O que você faz' },
    { id: 'bdisponibilidade', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, label: 'Minha disponibilidade', sub: 'Horários por dia da semana' },
    { id: 'bfolgas', icon: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></>, label: 'Folgas', sub: 'Dias que você não atende' },
    { id: 'bconfig', icon: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" /></>, label: 'Configurações', sub: 'Notificações, idioma, sair' },
  ];
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 18, paddingRight: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.8, color: 'var(--ink)' }}>AJUSTES</span>
        <BPole w={13} h={28} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px 96px' }}>
        <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: '2px 14px', boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
          {rows.map((r, i) => (
            <div key={r.id} onClick={() => nav && nav(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 4px', cursor: 'pointer', borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--hairline)' }}>
              <span style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: 11, background: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--frame-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{r.icon}</svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{r.label}</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{r.sub}</div>
              </div>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
            </div>
          ))}
        </div>
      </div>
      <BTabBar active="ajustes" nav={nav} />
    </div>
  );
}

// ════════════════════════ B6 Meus serviços ════════════════════════
function BarberServices({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const [svc, setSvc] = b2State([
    { id: 's1', name: 'Corte clássico', dur: '30 min', price: 50, on: true },
    { id: 's2', name: 'Barba terapia', dur: '20 min', price: 30, on: true },
    { id: 's3', name: 'Corte + Barba', dur: '50 min', price: 64, on: true },
    { id: 's4', name: 'Pezinho / acabamento', dur: '15 min', price: 20, on: true },
    { id: 's5', name: 'Sobrancelha', dur: '10 min', price: 15, on: false },
    { id: 's6', name: 'Platinado / descoloração', dur: '90 min', price: 150, on: false },
  ]);
  const toggle = (id) => setSvc((l) => l.map((s) => s.id === id ? { ...s, on: !s.on } : s));
  const count = svc.filter((s) => s.on).length;
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <BAppBar title="MEUS SERVIÇOS" onBack={() => nav && nav('__back')} />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 30px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', padding: '0 2px' }}>Você faz {count} de {svc.length} serviços da barbearia</div>
        {svc.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13, borderRadius: 15, background: 'var(--card)', border: '1px solid ' + (s.on ? 'color-mix(in srgb, var(--green) 30%, var(--hairline))' : 'var(--hairline)'), padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{s.name}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.dur} · {bBrl(s.price)}</div>
            </div>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 700, color: s.on ? 'var(--green)' : 'var(--muted)' }}>{s.on ? 'Faço' : 'Não faço'}</span>
            <Toggle on={s.on} onClick={() => toggle(s.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════ B7 Disponibilidade ════════════════════════
const DAYS = [
  { k: 'dom', label: 'Domingo', on: false, ranges: [] },
  { k: 'seg', label: 'Segunda', on: false, ranges: [] },
  { k: 'ter', label: 'Terça', on: true, ranges: ['09:00 – 12:00', '14:00 – 19:00'] },
  { k: 'qua', label: 'Quarta', on: true, ranges: ['09:00 – 12:00', '14:00 – 19:00'] },
  { k: 'qui', label: 'Quinta', on: true, ranges: ['09:00 – 12:00', '14:00 – 19:00'] },
  { k: 'sex', label: 'Sexta', on: true, ranges: ['09:00 – 12:00', '14:00 – 20:00'] },
  { k: 'sab', label: 'Sábado', on: true, ranges: ['08:00 – 17:00'] },
];

function BarberAvailability({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const [days, setDays] = b2State(DAYS);
  const [saved, setSaved] = b2State(false);
  const toggleDay = (k) => setDays((l) => l.map((d) => d.k === k ? { ...d, on: !d.on, ranges: !d.on && d.ranges.length === 0 ? ['09:00 – 18:00'] : d.ranges } : d));
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <BAppBar title="DISPONIBILIDADE" onBack={() => nav && nav('__back')} />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 130px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', padding: '0 2px' }}>Defina os horários que você atende em cada dia</div>
        {days.map((d) => (
          <div key={d.k} style={{ borderRadius: 15, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: d.on ? 'var(--ink)' : 'var(--muted)' }}>{d.label}</span>
              <Toggle on={d.on} onClick={() => toggleDay(d.k)} />
            </div>
            {d.on && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {d.ranges.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 10, background: 'var(--tint)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--frame-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    <span style={{ flex: 1, fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{r}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </div>
                ))}
                <button style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--frame-ink)', display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Adicionar intervalo
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 18px 30px', background: 'linear-gradient(to top, var(--bg) 74%, transparent)', zIndex: 8 }}>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1200); }} style={{ width: '100%', height: 54, borderRadius: 15, border: 'none', cursor: 'pointer', background: saved ? 'var(--green)' : 'var(--frame)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 22px rgba(28,25,23,.2)', transition: 'background .2s' }}>
          {saved ? <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>Salvo!</> : 'Salvar disponibilidade'}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════ B8 Folgas ════════════════════════
function BarberTimeOff({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const [folgas, setFolgas] = b2State([
    { id: 1, label: 'Sex, 23 mai', sub: 'Dia inteiro' },
    { id: 2, label: '02–04 jun', sub: 'Viagem · 3 dias' },
  ]);
  const today = new Date(2026, 5, 2);
  const year = 2026, month = 5;
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const off = [6, 14, 15]; // marked days
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <BAppBar title="FOLGAS" onBack={() => nav && nav('__back')} />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 110px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* calendar */}
        <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: 0.6, color: 'var(--ink)', marginBottom: 12, textTransform: 'capitalize' }}>junho 2026</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {['d','s','t','q','q','s','s'].map((w, i) => <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', padding: '2px 0' }}>{w}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const isOff = off.includes(d);
              const isToday = d === today.getDate();
              return (
                <div key={i} style={{ aspectRatio: '1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  background: isOff ? 'color-mix(in srgb, var(--vermelho) 16%, transparent)' : 'transparent',
                  fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: isOff || isToday ? 700 : 500,
                  color: isOff ? 'var(--vermelho-ink)' : 'var(--ink)', outline: isToday && !isOff ? '1.5px solid var(--dourado)' : 'none', outlineOffset: -1.5 }}>{d}</div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: 'color-mix(in srgb, var(--vermelho) 16%, transparent)' }} /> Folga marcada
          </div>
        </div>

        {/* future list */}
        <div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', margin: '0 2px 10px' }}>Próximas folgas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {folgas.map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 14, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 13 }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, background: 'color-mix(in srgb, var(--vermelho) 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--vermelho)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18.4 5.6 5.6 18.4M5.6 5.6l12.8 12.8" /><circle cx="12" cy="12" r="9.5" /></svg>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{f.label}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>{f.sub}</div>
                </div>
                <button onClick={() => setFolgas((l) => l.filter((x) => x.id !== f.id))} style={{ width: 36, height: 36, borderRadius: 10, border: '1.4px solid var(--hairline-strong)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--vermelho-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 18px 30px', background: 'linear-gradient(to top, var(--bg) 74%, transparent)', zIndex: 8 }}>
        <button style={{ width: '100%', height: 54, borderRadius: 15, border: 'none', cursor: 'pointer', background: 'var(--frame)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 22px rgba(28,25,23,.2)' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Nova folga
        </button>
      </div>
    </div>
  );
}

// ════════════════════════ B9 Perfil barbeiro ════════════════════════
function BarberProfile({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const stat = (n, l, c) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 26, lineHeight: 0.9, color: c || 'var(--frame-ink)' }}>{n}</div>
      <div style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3 }}>{l}</div>
    </div>
  );
  const specs = ['Degradê', 'Navalhado', 'Barba', 'Freestyle', 'Infantil'];
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 18, paddingRight: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.8, color: 'var(--ink)' }}>PERFIL</span>
        <BPole w={13} h={28} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 18px 96px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* identity */}
        <div style={{ borderRadius: 18, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 18, boxShadow: '0 8px 20px rgba(28,25,23,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <BMono initials="JJ" s={64} fs={28} ring />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Jajá</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>barbeiro · Barbearia do Jajá</div>
            </div>
            <button onClick={() => nav && nav('editar')} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1.4px solid var(--hairline-strong)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Editar</button>
          </div>
          <div style={{ display: 'flex', marginTop: 16, paddingTop: 15, borderTop: '1px solid var(--hairline)' }}>
            {stat('1,2k', 'cortes')}
            <span style={{ width: 1, background: 'var(--hairline)' }} />
            {stat('4,8', 'rating', 'var(--dourado-ink)')}
            <span style={{ width: 1, background: 'var(--hairline)' }} />
            {stat('2%', 'no-show')}
          </div>
        </div>

        {/* bio */}
        <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 16 }}>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Bio</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>15 anos de navalha. Especialista em degradê e barba desenhada. Cada corte é assinatura.</div>
        </div>

        {/* specialties */}
        <div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', margin: '0 2px 10px' }}>Especialidades</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {specs.map((s) => <span key={s} style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, background: 'var(--tint)', color: 'var(--ink)', border: '1px solid var(--hairline)' }}>{s}</span>)}
          </div>
        </div>

        {/* gallery */}
        <div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', margin: '0 2px 10px' }}>Galeria de trabalhos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[0,1,2,3,4,5].map((i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 12, background: ['var(--frame)','var(--vermelho)','#2a5a8f','#7a5a2f','var(--dourado)','#1c1917'][i], position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.12, background: 'repeating-linear-gradient(-45deg, #fff 0 6px, transparent 6px 14px)' }} />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.85"><circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><path d="M8 7.5L20 18M8 16.5L20 6" /></svg>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BTabBar active="perfil" nav={nav} />
    </div>
  );
}

// ════════════════════════ B11 Config ════════════════════════
function BarberSettings({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const [push, setPush] = b2State(true);
  const [novos, setNovos] = b2State(true);
  const [promo, setPromo] = b2State(false);
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <BAppBar title="CONFIGURAÇÕES" onBack={() => nav && nav('__back')} />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 30px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', margin: '0 2px 9px' }}>Notificações</div>
          <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: '4px 16px' }}>
            {[['Novos agendamentos', novos, setNovos], ['Lembretes push', push, setPush], ['Promoções e novidades', promo, setPromo]].map(([label, val, set], i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--hairline)' }}>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
                <Toggle on={val} onClick={() => set(!val)} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', margin: '0 2px 9px' }}>Conta</div>
          <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: '4px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--hairline)' }}>
              <span style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Idioma</span>
              <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, color: 'var(--muted)' }}>Português (BR) ›</span>
            </div>
            <div onClick={() => nav && nav('login')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', cursor: 'pointer' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--vermelho)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              <span style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--vermelho-ink)' }}>Sair da conta</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)' }}>NAVALHA Barbeiro · versão 1.0.0</div>
      </div>
    </div>
  );
}

Object.assign(window, { BarberAjustes, BarberServices, BarberAvailability, BarberTimeOff, BarberProfile, BarberSettings });
