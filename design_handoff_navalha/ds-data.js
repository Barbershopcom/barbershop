// booking-wizard.jsx — A9+A10+A11 connected booking wizard, vintage style.
// Exports to window: BookingWizard.
// Cascade: serviços escolhidos → filtram barbeiros → dia escolhido → horários.
const { useState, useMemo } = React;

const brlW = (n) => 'R$\u00a0' + n.toFixed(2).replace('.', ',');

// ── data ─────────────────────────────────────────────────────
const BARBER_META = {
  JJ: { in: 'JJ', name: 'Jajá', color: 'var(--frame)', r: 4.8, cuts: '1,2k', spec: 'Degradê · navalhado', next: 'hoje 16:40' },
  RF: { in: 'RF', name: 'Rafa', color: 'var(--vermelho)', r: 4.6, cuts: '840', spec: 'Clássico · tesoura', next: 'amanhã 09:00' },
  CA: { in: 'CA', name: 'Cau', color: '#2a5a8f', r: 4.9, cuts: '2,1k', spec: 'Barba · freestyle', next: 'qui 11:20' },
};
const SVC = [
  { id: 's1', name: 'Corte clássico', dur: 30, price: 50, was: null, barbers: ['JJ', 'RF'] },
  { id: 's3', name: 'Corte + Barba', dur: 50, price: 64, was: 80, off: 20, barbers: ['JJ'] },
  { id: 's2', name: 'Barba terapia', dur: 20, price: 30, was: null, barbers: ['JJ', 'CA'] },
  { id: 's4', name: 'Pezinho / acabamento', dur: 15, price: 20, was: null, barbers: ['JJ', 'RF', 'CA'] },
  { id: 's5', name: 'Sobrancelha', dur: 10, price: 15, was: null, barbers: ['CA'] },
];

function Mono({ initials, color = 'var(--frame)', s = 30, fs = 15, ring }) {
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: color, color: 'var(--papel)', flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: fs, letterSpacing: 0.5,
      boxShadow: ring ? '0 0 0 2.5px var(--card), 0 0 0 4px var(--dourado)' : 'none' }}>{initials}</div>
  );
}
function Pill({ children }) {
  return <span style={{ fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', background: 'var(--dourado)', color: '#1c1917', padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>{children}</span>;
}
function Stars({ r, size = 11 }) {
  return <span style={{ display: 'inline-flex', gap: 1 }}>{[1,2,3,4,5].map((n)=>(<svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n<=Math.round(r)?'var(--dourado)':'none'} stroke="var(--dourado)" strokeWidth="1.5"><path d="M12 2.2l2.95 6.4 6.85.85-5.05 4.65 1.35 6.85L12 18.1l-6.05 3.5 1.35-6.85L2.25 9.45l6.85-.85z" /></svg>))}</span>;
}

// ── simple header (back + título) ────────────────────────────
function SimpleHeader({ title, onBack }) {
  return (
    <div style={{ paddingTop: 54, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, background: 'var(--bg)', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button onClick={onBack} style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
      </button>
      <span style={{ fontFamily: 'var(--display)', fontSize: 23, letterSpacing: 1, color: 'var(--ink)' }}>{title}</span>
      <span style={{ width: 13, height: 28, borderRadius: 999, border: '1.4px solid var(--frame)', overflow: 'hidden', flex: '0 0 auto', background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 5px, var(--papel) 5px 10px, var(--navy) 10px 15px, var(--papel) 15px 20px)', boxShadow: 'inset 0 0 0 2px var(--papel)' }} />
    </div>
  );
}

// ── progress header (não usado — mantido p/ referência) ──────
const STEP_NAMES = ['Serviços', 'Barbeiro', 'Dia e hora'];
function Progress({ step, onBack }) {
  return (
    <div style={{ paddingTop: 54, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          {STEP_NAMES.map((nm, i) => {
            const done = i < step, cur = i === step;
            return (
              <React.Fragment key={nm}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'var(--green)' : cur ? 'var(--frame)' : 'transparent', border: '1.6px solid ' + (done ? 'var(--green)' : cur ? 'var(--frame)' : 'var(--hairline-strong)'),
                    fontFamily: 'var(--display)', fontSize: 13, color: (done || cur) ? '#fff' : 'var(--muted)' }}>
                    {done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg> : i + 1}
                  </span>
                  {cur && <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{nm}</span>}
                </div>
                {i < 2 && <span style={{ flex: 1, height: 2, borderRadius: 2, background: i < step ? 'var(--green)' : 'var(--hairline-strong)', opacity: i < step ? 1 : 0.5, minWidth: 8 }} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── sticky summary bar (shows once services chosen) ──────────
function SummaryBar({ services, barber, total, dur }) {
  if (!services.length) return null;
  const label = services.length === 1 ? services[0].name : `${services.length} serviços`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'var(--tint)', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}{barber ? ` · ${barber}` : ''}</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>{dur} min no total</div>
      </div>
      <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: 0.5, color: 'var(--frame-ink)', whiteSpace: 'nowrap' }}>{brlW(total)}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 1 — Serviços
// ════════════════════════════════════════════════════════════
function StepServices({ sel, toggle }) {
  return (
    <div style={{ padding: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: 0.5, color: 'var(--ink)' }}>O QUE VOCÊ VAI FAZER?</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>Escolha um ou combine vários serviços</div>
      </div>
      {SVC.map((s) => {
        const on = sel.includes(s.id);
        return (
          <div key={s.id} onClick={() => toggle(s.id)} style={{ borderRadius: 15, background: 'var(--card)', cursor: 'pointer',
            border: (on ? '2px' : '1px') + ' solid ' + (on ? 'var(--frame)' : 'var(--hairline)'), padding: on ? 13 : 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)', transition: 'border-color .12s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{s.name}</span>
                  {s.off && <Pill>−{s.off}%</Pill>}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.dur} min</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9 }}>
                  <div style={{ display: 'flex' }}>
                    {s.barbers.map((b, i) => <div key={b} style={{ marginLeft: i ? -7 : 0, border: '1.5px solid var(--card)', borderRadius: '50%' }}><Mono initials={b} s={22} fs={10} color={BARBER_META[b].color} /></div>)}
                  </div>
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 10.5, color: 'var(--muted)' }}>{s.barbers.length} fazem</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ textAlign: 'right' }}>
                  {s.was && <div style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)', textDecoration: 'line-through' }}>{brlW(s.was)}</div>}
                  <div style={{ fontFamily: 'var(--ui)', fontSize: 17, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{brlW(s.price)}</div>
                </div>
                <span style={{ width: 26, height: 26, borderRadius: 8, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.6px solid ' + (on ? 'var(--frame)' : 'var(--hairline-strong)'), background: on ? 'var(--frame)' : 'transparent', transition: 'all .12s' }}>
                  {on ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 2 — Barbeiro (filtrado pelos serviços)
// ════════════════════════════════════════════════════════════
function StepBarber({ eligible, barber, setBarber }) {
  return (
    <div style={{ padding: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: 0.5, color: 'var(--ink)' }}>COM QUEM?</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>Só barbeiros que fazem os serviços escolhidos</div>
      </div>

      {/* qualquer barbeiro */}
      <div onClick={() => setBarber('any')} style={{ borderRadius: 15, cursor: 'pointer', background: 'var(--card)',
        border: (barber === 'any' ? '2px' : '1px') + ' solid ' + (barber === 'any' ? 'var(--frame)' : 'var(--hairline)'), padding: barber === 'any' ? 13 : 14, display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', flex: '0 0 auto', background: 'var(--tint)', border: '1.5px dashed var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--frame-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3.2" /><path d="M22 21v-2a4 4 0 0 0-3-3.8" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Qualquer barbeiro</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '2px 8px', borderRadius: 999, background: 'color-mix(in srgb, var(--green) 15%, transparent)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 700, color: 'var(--green)' }}>Mais cedo: hoje 15:00</span>
          </div>
        </div>
        <span style={{ width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', border: '2px solid ' + (barber === 'any' ? 'var(--frame)' : 'var(--hairline-strong)'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {barber === 'any' && <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--frame)' }} />}
        </span>
      </div>

      {eligible.map((b) => {
        const on = barber === b.in;
        return (
          <div key={b.in} onClick={() => setBarber(b.in)} style={{ borderRadius: 15, cursor: 'pointer', background: 'var(--card)',
            border: (on ? '2px' : '1px') + ' solid ' + (on ? 'var(--frame)' : 'var(--hairline)'), padding: on ? 13 : 14, display: 'flex', alignItems: 'center', gap: 13, boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
            <Mono initials={b.in} color={b.color} s={48} fs={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{b.name}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{b.spec}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Stars r={b.r} /><span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 700, color: 'var(--dourado-ink)' }}>{b.r.toString().replace('.', ',')}</span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--hairline-strong)' }} />
                <span style={{ fontFamily: 'var(--ui)', fontSize: 10.5, color: 'var(--muted)' }}>próx: {b.next}</span>
              </div>
            </div>
            <span style={{ width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', border: '2px solid ' + (on ? 'var(--frame)' : 'var(--hairline-strong)'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {on && <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--frame)' }} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 3 — Dia e hora
// ════════════════════════════════════════════════════════════
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SLOT_BANK = ['09:00', '09:40', '10:20', '11:00', '11:40', '12:20', '14:00', '14:40', '15:20', '16:00', '16:40', '17:20'];
// deterministic slots per day-of-month; empty for a specific demo day
function slotsForDay(d, forceEmpty) {
  if (forceEmpty) return [];
  if (!d) return [];
  if (d % 7 === 0) return []; // some days fully booked
  const start = (d * 3) % 5;
  const count = 5 + (d % 5);
  return SLOT_BANK.slice(start, start + count);
}

function Calendar({ year, month, today, selDay, onSel }) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const isToday = (d) => year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
  const isPast = (d) => new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = (d) => new Date(year, month, d).getDay();
  const available = (d) => !isPast(d) && dow(d) >= 2 && dow(d) <= 6 && slotsForDay(d).length > 0; // Ter–Sáb com vagas

  return (
    <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--hairline)', padding: 14, boxShadow: '0 6px 16px rgba(28,25,23,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: 0.6, color: 'var(--ink)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{MONTHS[month]} {year}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, border: '1.3px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.45 }}><svg width="9" height="14" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg></span>
          <span style={{ width: 30, height: 30, borderRadius: 9, border: '1.3px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><svg width="9" height="14" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l8 8-8 8" /></svg></span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WD.map((w) => <div key={w} style={{ textAlign: 'center', fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', padding: '2px 0' }}>{w[0]}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const av = available(d), sel = selDay === d, tod = isToday(d);
          return (
            <button key={i} disabled={!av} onClick={() => av && onSel(d)} style={{ aspectRatio: '1', border: 'none', borderRadius: 10, cursor: av ? 'pointer' : 'default',
              background: sel ? 'var(--frame)' : 'transparent', position: 'relative',
              fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: sel || tod ? 700 : 500,
              color: sel ? '#fff' : av ? 'var(--ink)' : 'var(--hairline-strong)',
              outline: tod && !sel ? '1.5px solid var(--dourado)' : 'none', outlineOffset: -1.5 }}>
              {d}
              {av && !sel && <span style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--green)' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDateTime({ year, month, today, selDay, setSelDay, time, setTime, forceEmpty }) {
  const slots = useMemo(() => slotsForDay(selDay, forceEmpty), [selDay, forceEmpty]);
  return (
    <div style={{ padding: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: 0.5, color: 'var(--ink)' }}>QUANDO FICA BOM?</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>Dias com vaga marcados em verde</div>
      </div>
      <Calendar year={year} month={month} today={today} selDay={selDay} onSel={(d) => { setSelDay(d); setTime(null); }} />

      <div>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 11 }}>
          {selDay ? `Horários · ${WD[new Date(year, month, selDay).getDay()]} ${selDay}` : 'Escolha um dia'}
        </div>
        {!selDay ? (
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', padding: '8px 2px' }}>Toque num dia disponível pra ver os horários.</div>
        ) : slots.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, background: 'var(--tint)', border: '1px dashed var(--hairline-strong)', padding: '14px 15px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 15s1.5-2 4-2 4 2 4 2M9 9h.01M15 9h.01" /></svg>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--ink)' }}>Sem horários disponíveis nesse dia. Tenta outro.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
            {slots.map((t) => {
              const on = time === t;
              return (
                <button key={t} onClick={() => setTime(t)} style={{ height: 46, borderRadius: 11, cursor: 'pointer',
                  border: '1.5px solid ' + (on ? 'var(--frame)' : 'var(--hairline-strong)'), background: on ? 'var(--frame)' : 'var(--card)',
                  color: on ? '#fff' : 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', transition: 'all .12s' }}>{t}</button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
function BookingWizard({ tweaks = {}, nav }) {
  const { dark = false, forceEmptyDay = false, start = 0 } = tweaks;
  const [step, setStep] = useState(start);
  const [sel, setSel] = useState(['s3']);
  const [barber, setBarber] = useState(null);
  const [selDay, setSelDay] = useState(null);
  const [time, setTime] = useState(null);
  const [done, setDone] = useState(false);

  const today = new Date(2026, 5, 2); // 2 jun 2026 (ter)
  const services = SVC.filter((s) => sel.includes(s.id));
  const total = services.reduce((a, s) => a + s.price, 0);
  const dur = services.reduce((a, s) => a + s.dur, 0);

  // barbeiros que fazem TODOS os serviços escolhidos
  const eligible = useMemo(() => {
    if (!services.length) return [];
    const sets = services.map((s) => new Set(s.barbers));
    const all = Object.keys(BARBER_META).filter((b) => sets.every((set) => set.has(b)));
    return all.map((b) => BARBER_META[b]);
  }, [sel]);

  const toggle = (id) => { setSel((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]); setBarber(null); };

  const barberName = barber === 'any' ? 'Qualquer barbeiro' : barber ? BARBER_META[barber].name : null;
  const canNext = step === 0 ? sel.length > 0 : step === 1 ? !!barber : !!(selDay && time);
  const ctaLabel = step < 2 ? 'Continuar' : 'Ir para pagamento';

  const next = () => { if (!canNext) return; if (step < 2) setStep(step + 1); else if (nav) nav('checkout'); else setDone(true); };
  const back = () => { if (done) { setDone(false); return; } if (step > 0) setStep(step - 1); else if (nav) nav('__back'); };

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <SimpleHeader title="AGENDAR" onBack={back} />
      <SummaryBar services={services} barber={step >= 1 ? barberName : null} total={total} dur={dur} />

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 110 }}>
        {step === 0 && <StepServices sel={sel} toggle={toggle} />}
        {step === 1 && <StepBarber eligible={eligible} barber={barber} setBarber={setBarber} />}
        {step === 2 && <StepDateTime year={2026} month={5} today={today} selDay={selDay} setSelDay={setSelDay} time={time} setTime={setTime} forceEmpty={forceEmptyDay} />}
      </div>

      {/* footer CTA */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 18px 30px', background: 'linear-gradient(to top, var(--bg) 74%, transparent)', zIndex: 8 }}>
        <button onClick={next} disabled={!canNext} style={{ width: '100%', height: 56, borderRadius: 15, border: 'none', cursor: canNext ? 'pointer' : 'not-allowed',
          background: canNext ? 'var(--frame)' : 'var(--hairline-strong)', color: canNext ? '#fff' : 'var(--muted)',
          fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, letterSpacing: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          boxShadow: canNext ? '0 8px 22px rgba(28,25,23,.2)' : 'none', transition: 'background .2s' }}>
          {ctaLabel}
          {canNext && <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
        </button>
      </div>

      {/* handoff confirmation to A12 */}
      {done && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 34px', textAlign: 'center', animation: 'cfade .3s ease' }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--frame)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 32, letterSpacing: 0.5, color: 'var(--frame-ink)' }}>TUDO PRONTO PRA PAGAR</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14.5, color: 'var(--ink)', marginTop: 12, maxWidth: 290, lineHeight: 1.5 }}>
            {services.map((s) => s.name).join(' + ')} · {barberName} · {WD[new Date(2026, 5, selDay || today.getDate()).getDay()]} {selDay} · {time} — {brlW(total)}
          </div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 12.5, color: 'var(--muted)', marginTop: 14 }}>↳ próximo: A12 Checkout (Comanda)</div>
          <button onClick={() => setDone(false)} style={{ marginTop: 22, height: 48, padding: '0 24px', borderRadius: 13, border: '1.4px solid var(--hairline-strong)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Voltar ao wizard</button>
        </div>
      )}
    </div>
  );
}

window.BookingWizard = BookingWizard;
