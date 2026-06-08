// owner-flow.jsx — D3 Signup + D4 Checkout subscription + D5 Onboarding, as one wizard.
// Exports to window: OwnerFlow.
const { useState: oState, useMemo: oMemo } = React;

const oBrl = (n) => 'R$\u00a0' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const O_PLANS = [
  { id: 'free', name: 'Free', m: 0, a: 0, line: '1 barbeiro · 50 agend./mês' },
  { id: 'basic', name: 'Basic', m: 49, a: 39, line: 'Até 4 barbeiros · ilimitado' },
  { id: 'pro', name: 'Pro', m: 99, a: 79, line: 'Barbeiros e unidades ilimitados' },
];
const SVC_TEMPLATES = [
  { id: 't1', name: 'Corte clássico', dur: 30, price: 50, on: true },
  { id: 't2', name: 'Barba terapia', dur: 20, price: 30, on: true },
  { id: 't3', name: 'Corte + Barba', dur: 50, price: 64, on: true },
  { id: 't4', name: 'Pezinho', dur: 15, price: 20, on: false },
  { id: 't5', name: 'Sobrancelha', dur: 10, price: 15, on: false },
  { id: 't6', name: 'Platinado', dur: 90, price: 150, on: false },
];
const WEEK = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']];

// ── shared controls ──
function OField({ label, value, onChange, placeholder, type = 'text', prefix, hint, right }) {
  const [focus, setFocus] = oState(false);
  const [show, setShow] = oState(false);
  const isPw = type === 'password';
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', height: 50, borderRadius: 12, background: 'var(--card)', border: '1.6px solid ' + (focus ? 'var(--navy)' : 'var(--line2)'), padding: '0 13px', transition: 'border-color .15s' }}>
        {prefix && <span style={{ fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--muted)', marginRight: 2, whiteSpace: 'nowrap' }}>{prefix}</span>}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={isPw && !show ? 'password' : 'text'} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--ui)', fontSize: 14.5, color: 'var(--ink)' }} />
        {isPw && <button onClick={() => setShow(!show)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{show ? <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M9.9 5a9.8 9.8 0 0 1 2.1-.2c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.6-1.1M3 3l18 18" /></>}</svg>
        </button>}
        {right}
      </div>
      {hint && <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function OToggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', flex: '0 0 auto', background: on ? 'var(--green)' : 'var(--line2)', transition: 'background .15s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  );
}

// ════════════ STEP 1 — Conta ════════════
function StepConta({ d, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <OField label="Seu nome" value={d.owner} onChange={(v) => set({ owner: v })} placeholder="Ex.: Carlos Mendes" />
      <OField label="Email" value={d.email} onChange={(v) => set({ email: v })} placeholder="voce@email.com" type="email" />
      <OField label="Senha" value={d.pw} onChange={(v) => set({ pw: v })} placeholder="mínimo 8 caracteres" type="password" hint="Use letras e números pra ficar mais seguro" />
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 2 }}>
        <span onClick={() => set({ terms: !d.terms })} style={{ width: 22, height: 22, borderRadius: 7, flex: '0 0 auto', marginTop: 1, border: '1.8px solid ' + (d.terms ? 'var(--navy)' : 'var(--line2)'), background: d.terms ? 'var(--navy)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {d.terms && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
        </span>
        <span onClick={() => set({ terms: !d.terms })} style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>Li e aceito os <b style={{ color: 'var(--navy-ink)' }}>Termos de uso</b> e a <b style={{ color: 'var(--navy-ink)' }}>Política de privacidade</b> da NAVALHA.</span>
      </label>
    </div>
  );
}

// ════════════ STEP 2 — Barbearia ════════════
function StepBarbearia({ d, set }) {
  const slug = slugify(d.shop || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <OField label="Nome da barbearia" value={d.shop} onChange={(v) => set({ shop: v })} placeholder="Ex.: Barbearia do Carlos" />
      <OField label="Link público (gerado automaticamente)" value={slug} onChange={() => {}} prefix="navalha.app/b/" hint="É por aqui que seus clientes vão te achar" />
      <OField label="Telefone / WhatsApp" value={d.phone} onChange={(v) => set({ phone: v })} placeholder="(11) 90000-0000" type="tel" />
      <OField label="Endereço" value={d.address} onChange={(v) => set({ address: v })} placeholder="Rua, número — bairro, cidade" />
    </div>
  );
}

// ════════════ STEP 3 — Plano ════════════
function StepPlano({ d, set }) {
  return (
    <div>
      <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--tint)', borderRadius: 999, padding: 4, marginBottom: 18 }}>
        {[['mensal', 'Mensal'], ['anual', 'Anual −20%']].map(([v, l]) => (
          <button key={v} onClick={() => set({ cycle: v })} style={{ border: 'none', background: d.cycle === v ? 'var(--navy)' : 'transparent', color: d.cycle === v ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 999 }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {O_PLANS.map((p) => {
          const on = d.plan === p.id;
          const price = d.cycle === 'mensal' ? p.m : p.a;
          return (
            <button key={p.id} onClick={() => set({ plan: p.id })} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer', background: on ? 'color-mix(in srgb, var(--navy) 7%, transparent)' : 'var(--card)', border: '1.8px solid ' + (on ? 'var(--navy)' : 'var(--line2)') }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', border: '2px solid ' + (on ? 'var(--navy)' : 'var(--line2)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--navy)' }} />}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: 0.5, color: 'var(--ink)' }}>{p.name}</span>
                  {p.id === 'basic' && <span style={{ fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', background: 'var(--vermelho)', color: '#fff', padding: '2px 7px', borderRadius: 999 }}>Popular</span>}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--muted)' }}>{p.line}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)', lineHeight: 0.9 }}>{price === 0 ? 'Grátis' : oBrl(price)}</div>
                {price > 0 && <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, color: 'var(--muted)' }}>/mês</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════ STEP 4 — Pagamento (D4) ════════════
function StepPagamento({ d, set }) {
  const plan = O_PLANS.find((p) => p.id === d.plan);
  const price = d.cycle === 'mensal' ? plan.m : plan.a;
  const total = d.cycle === 'anual' ? price * 12 : price;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 13, background: 'color-mix(in srgb, var(--green) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          <div><div style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>14 dias grátis</div><div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>Primeira cobrança só depois do teste</div></div>
        </div>
        <span style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--green)' }}>{oBrl(total)}{d.cycle === 'anual' ? '/ano' : '/mês'}</span>
      </div>
      <OField label="Número do cartão" value={d.card} onChange={(v) => set({ card: v.replace(/[^0-9 ]/g, '') })} placeholder="0000 0000 0000 0000" right={<svg width="30" height="20" viewBox="0 0 32 20" fill="none"><rect width="32" height="20" rx="3" fill="#f0e8d6" /><circle cx="13" cy="10" r="6" fill="#bf212f" opacity=".85" /><circle cx="19" cy="10" r="6" fill="#c5a059" opacity=".85" /></svg>} />
      <OField label="Nome no cartão" value={d.cardName} onChange={(v) => set({ cardName: v })} placeholder="Como está impresso" />
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}><OField label="Validade" value={d.exp} onChange={(v) => set({ exp: v })} placeholder="MM/AA" /></div>
        <div style={{ flex: 1 }}><OField label="CVV" value={d.cvv} onChange={(v) => set({ cvv: v.replace(/\D/g, '') })} placeholder="123" /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        Pagamento seguro · seus dados são criptografados
      </div>
    </div>
  );
}

// ════════════ D5 onboarding sub-steps ════════════
function OnbIntro({ d }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--navy)', margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px var(--bg), 0 0 0 5px var(--dourado)' }}>
        <span style={{ width: 16, height: 48, borderRadius: 999, border: '2px solid var(--dourado)', overflow: 'hidden', background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 6px, var(--papel) 6px 12px, #2a5a8f 12px 18px, var(--papel) 18px 24px)' }} />
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 36, letterSpacing: 0.6, color: 'var(--ink)', lineHeight: 1 }}>BEM-VINDO, {(d.owner || 'CHEFE').split(' ')[0].toUpperCase()}!</div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--muted)', marginTop: 12, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>Sua conta da <b style={{ color: 'var(--ink)' }}>{d.shop || 'sua barbearia'}</b> está criada. Vamos deixar tudo pronto em 3 passos rápidos — leva menos de 2 minutos.</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginTop: 26 }}>
        {[['Equipe', 'team'], ['Serviços', 'svc'], ['Horários', 'clock']].map(([l, ic]) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 48, height: 48, borderRadius: 13, background: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ic === 'team' ? <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.8-3.4 3-5.2 5.5-5.2s4.7 1.8 5.5 5.2" /><path d="M17 9.5a2.6 2.6 0 1 0-1.6-4.7" /></> : ic === 'svc' ? <><circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><path d="M8 7.5L20 18M8 16.5L20 6" /></> : <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}</svg>
            </span>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnbBarbeiros({ d, set }) {
  const add = () => set({ barbers: [...d.barbers, { id: Date.now(), name: '', email: '' }] });
  const upd = (id, k, v) => set({ barbers: d.barbers.map((b) => b.id === id ? { ...b, [k]: v } : b) });
  const del = (id) => set({ barbers: d.barbers.filter((b) => b.id !== id) });
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Adicione os barbeiros da equipe. Eles recebem um convite por email — você pode fazer isso depois também.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {d.barbers.map((b, i) => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: '50%', background: ['#1a365d', '#bf212f', '#2a5a8f', '#7a5a2f'][i % 4], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 15, flex: '0 0 auto' }}>{(b.name || '?').slice(0, 1).toUpperCase()}</span>
            <input value={b.name} onChange={(e) => upd(b.id, 'name', e.target.value)} placeholder="Nome" style={{ flex: 1.2, minWidth: 0, height: 46, borderRadius: 11, border: '1.5px solid var(--line2)', background: 'var(--card)', padding: '0 12px', fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
            <input value={b.email} onChange={(e) => upd(b.id, 'email', e.target.value)} placeholder="email" style={{ flex: 1.4, minWidth: 0, height: 46, borderRadius: 11, border: '1.5px solid var(--line2)', background: 'var(--card)', padding: '0 12px', fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
            <button onClick={() => del(b.id)} style={{ width: 38, height: 38, borderRadius: 10, border: '1.4px solid var(--line2)', background: 'transparent', cursor: 'pointer', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--vermelho-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg></button>
          </div>
        ))}
      </div>
      <button onClick={add} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--navy-ink)' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Adicionar barbeiro
      </button>
    </div>
  );
}

function OnbServicos({ d, set }) {
  const toggle = (id) => set({ services: d.services.map((s) => s.id === id ? { ...s, on: !s.on } : s) });
  const price = (id, v) => set({ services: d.services.map((s) => s.id === id ? { ...s, price: +v.replace(/\D/g, '') || 0 } : s) });
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Já preparamos os serviços mais comuns. Ative os que você faz e ajuste o preço.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {d.services.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 13, background: 'var(--card)', border: '1.5px solid ' + (s.on ? 'color-mix(in srgb, var(--green) 30%, var(--line))' : 'var(--line)') }}>
            <OToggle on={s.on} onClick={() => toggle(s.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, color: s.on ? 'var(--ink)' : 'var(--muted)' }}>{s.name}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--muted)' }}>{s.dur} min</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', height: 42, borderRadius: 10, border: '1.5px solid var(--line2)', background: s.on ? 'var(--bg)' : 'transparent', padding: '0 11px', opacity: s.on ? 1 : 0.5 }}>
              <span style={{ fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--muted)', marginRight: 3 }}>R$</span>
              <input value={s.price} onChange={(e) => price(s.id, e.target.value)} disabled={!s.on} style={{ width: 46, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', textAlign: 'right' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnbHorarios({ d, set }) {
  const toggle = (k) => set({ hours: { ...d.hours, [k]: { ...d.hours[k], on: !d.hours[k].on } } });
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Quais dias a barbearia abre? Você refina os horários de cada barbeiro depois.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {WEEK.map(([k, label]) => {
          const h = d.hours[k];
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 13, background: 'var(--card)', border: '1.5px solid var(--line)' }}>
              <OToggle on={h.on} onClick={() => toggle(k)} />
              <span style={{ flex: 1, fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, color: h.on ? 'var(--ink)' : 'var(--muted)' }}>{label}</span>
              {h.on ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ padding: '7px 11px', borderRadius: 9, background: 'var(--tint)' }}>{h.from}</span>
                  <span style={{ color: 'var(--muted)' }}>—</span>
                  <span style={{ padding: '7px 11px', borderRadius: 9, background: 'var(--tint)' }}>{h.to}</span>
                </div>
              ) : <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)' }}>Fechado</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OnbPronto({ d }) {
  const [copied, setCopied] = oState(false);
  const slug = slugify(d.shop || 'sua-barbearia');
  const link = 'navalha.app/b/' + slug;
  return (
    <div style={{ textAlign: 'center', padding: '4px 0' }}>
      <div style={{ width: 86, height: 86, borderRadius: '50%', background: 'color-mix(in srgb, var(--green) 16%, transparent)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 38, letterSpacing: 0.6, color: 'var(--ink)', lineHeight: 1 }}>TUDO PRONTO!</div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--muted)', marginTop: 12, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>Sua barbearia já está no ar. Compartilhe o link abaixo e comece a receber agendamentos hoje mesmo.</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 13, background: 'var(--card)', border: '1.6px dashed var(--navy)', maxWidth: 420, margin: '24px auto 0' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
        <span style={{ flex: 1, fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
        <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }} style={{ flex: '0 0 auto', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 800, color: copied ? 'var(--green)' : 'var(--navy-ink)', background: 'none', border: 'none', cursor: 'pointer' }}>{copied ? 'Copiado!' : 'Copiar'}</button>
      </div>
      <div style={{ display: 'flex', gap: 11, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 46, padding: '0 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#25D366', color: '#fff', fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 2A10 10 0 0 0 3.5 17.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-2.6.8.8-2.5-.2-.3A8 8 0 0 1 12 4z" /></svg>Compartilhar no WhatsApp
        </button>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 46, padding: '0 20px', borderRadius: 12, border: '1.5px solid var(--line2)', cursor: 'pointer', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>Mais opções
        </button>
      </div>
    </div>
  );
}

// ════════════ Orchestrator ════════════
const STEPS = [
  { id: 'conta', macro: 0, title: 'Crie sua conta', sub: 'Comece pelo básico — leva 30 segundos.', cta: 'Continuar' },
  { id: 'barbearia', macro: 1, title: 'Sua barbearia', sub: 'Os dados que vão aparecer pros clientes.', cta: 'Continuar' },
  { id: 'plano', macro: 2, title: 'Escolha o plano', sub: 'Comece grátis ou turbine de cara.', cta: 'Continuar' },
  { id: 'pagamento', macro: 3, title: 'Pagamento', sub: 'Você só é cobrado depois dos 14 dias.', cta: 'Iniciar teste grátis' },
  { id: 'intro', macro: 4, title: '', sub: '', cta: 'Bora configurar', center: true },
  { id: 'barbeiros', macro: 4, title: 'Sua equipe', sub: 'Quem vai cortar com você?', cta: 'Continuar', skip: true },
  { id: 'servicos', macro: 4, title: 'Serviços', sub: 'O que sua barbearia oferece.', cta: 'Continuar' },
  { id: 'horarios', macro: 4, title: 'Horário de funcionamento', sub: 'Quando a barbearia abre.', cta: 'Finalizar' },
  { id: 'pronto', macro: 4, title: '', sub: '', cta: 'Ir pro meu painel', center: true },
];
const MACROS = ['Conta', 'Barbearia', 'Plano', 'Pagamento', 'Configurar'];

function OwnerFlow({ nav }) {
  const [i, setI] = oState(0);
  const [d, setD] = oState({
    owner: '', email: '', pw: '', terms: false,
    shop: '', phone: '', address: '',
    plan: 'basic', cycle: 'mensal',
    card: '', cardName: '', exp: '', cvv: '',
    barbers: [{ id: 1, name: '', email: '' }],
    services: SVC_TEMPLATES.map((s) => ({ ...s })),
    hours: Object.fromEntries(WEEK.map(([k]) => [k, { on: k !== 'dom', from: k === 'sab' ? '08:00' : '09:00', to: k === 'sex' ? '20:00' : k === 'sab' ? '17:00' : '19:00' }])),
  });
  const set = (patch) => setD((p) => ({ ...p, ...patch }));
  const step = STEPS[i];

  // skip payment if Free
  const next = () => {
    let n = i + 1;
    if (STEPS[i].id === 'plano' && d.plan === 'free') n = STEPS.findIndex((s) => s.id === 'intro');
    if (n >= STEPS.length) { nav && nav('done'); return; }
    setI(n);
  };
  const back = () => { if (i === 0) { nav && nav('landing'); return; } let p = i - 1; if (STEPS[i].id === 'intro' && d.plan === 'free') p = STEPS.findIndex((s) => s.id === 'plano'); setI(p); };

  const canNext = (() => {
    if (step.id === 'conta') return d.owner && d.email && d.pw.length >= 4 && d.terms;
    if (step.id === 'barbearia') return d.shop && d.phone;
    if (step.id === 'pagamento') return d.plan === 'free' || (d.card && d.exp && d.cvv);
    return true;
  })();

  const body = (() => {
    switch (step.id) {
      case 'conta': return <StepConta d={d} set={set} />;
      case 'barbearia': return <StepBarbearia d={d} set={set} />;
      case 'plano': return <StepPlano d={d} set={set} />;
      case 'pagamento': return <StepPagamento d={d} set={set} />;
      case 'intro': return <OnbIntro d={d} />;
      case 'barbeiros': return <OnbBarbeiros d={d} set={set} />;
      case 'servicos': return <OnbServicos d={d} set={set} />;
      case 'horarios': return <OnbHorarios d={d} set={set} />;
      case 'pronto': return <OnbPronto d={d} />;
      default: return null;
    }
  })();

  const total = STEPS.length;
  const pct = Math.round(((i + 1) / total) * 100);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', fontFamily: 'var(--ui)', color: 'var(--ink)' }}>
      {/* left brand rail */}
      <aside style={{ width: 320, flex: '0 0 auto', background: 'var(--navy)', color: 'var(--papel)', padding: '40px 34px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, background: 'repeating-linear-gradient(-45deg, #fff 0 16px, transparent 16px 36px)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 12, height: 24, borderRadius: 999, border: '1.5px solid var(--dourado)', overflow: 'hidden', background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 5px, var(--papel) 5px 10px, #2a5a8f 10px 15px, var(--papel) 15px 20px)' }} />
          </span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: 1.5 }}>NAVALHA</span>
        </div>

        <div style={{ position: 'relative', marginTop: 48, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {MACROS.map((m, mi) => {
            const done = step.macro > mi;
            const active = step.macro === mi;
            return (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0' }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 800,
                  background: done ? 'var(--dourado)' : active ? 'rgba(197,160,89,.18)' : 'rgba(255,255,255,.07)',
                  color: done ? '#1c1917' : active ? 'var(--dourado)' : 'rgba(255,252,245,.5)',
                  border: active ? '1.5px solid var(--dourado)' : '1.5px solid transparent' }}>
                  {done ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg> : mi + 1}
                </span>
                <span style={{ fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: active ? 700 : 500, color: active || done ? 'var(--papel)' : 'rgba(255,252,245,.5)' }}>{m}</span>
              </div>
            );
          })}
        </div>

        <div style={{ position: 'relative', padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>{[0,1,2,3,4].map((s) => <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="var(--dourado)"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 21l1.4-6.8L2.2 9.6l6.9-.7z" /></svg>)}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, fontStyle: 'italic', color: 'rgba(255,252,245,.85)', lineHeight: 1.5 }}>"Montei tudo em 10 minutos e o cliente já começou a agendar no mesmo dia."</div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 600, color: 'var(--dourado)', marginTop: 10 }}>Jajá · Barbearia do Jajá</div>
        </div>
      </aside>

      {/* right form */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* top progress */}
        <div style={{ height: 5, background: 'var(--tint)', flex: '0 0 auto' }}><div style={{ height: '100%', width: pct + '%', background: 'var(--vermelho)', transition: 'width .3s ease', borderRadius: '0 3px 3px 0' }} /></div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, width: '100%', maxWidth: 520, margin: '0 auto', padding: '40px 32px 24px', display: 'flex', flexDirection: 'column' }}>
            {step.title && (
              <div style={{ marginBottom: 26 }}>
                <div style={{ fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: 'var(--vermelho-ink)', letterSpacing: 0.5, marginBottom: 6 }}>Passo {i + 1} de {total}</div>
                <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 38, letterSpacing: 0.5, color: 'var(--ink)', lineHeight: 1 }}>{step.title}</h1>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15.5, color: 'var(--muted)', marginTop: 8 }}>{step.sub}</div>
              </div>
            )}
            <div style={{ flex: step.center ? 'none' : 1, margin: step.center ? 'auto 0' : 0 }}>{body}</div>
          </div>

          {/* footer nav */}
          <div style={{ position: 'sticky', bottom: 0, background: 'linear-gradient(to top, var(--bg) 70%, transparent)', padding: '16px 32px 28px' }}>
            <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={back} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 52, padding: '0 18px', borderRadius: 13, border: '1.5px solid var(--line2)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>Voltar
              </button>
              {step.skip && <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 600, color: 'var(--muted)', padding: '0 6px' }}>Pular</button>}
              <div style={{ flex: 1 }} />
              <button onClick={canNext ? next : undefined} disabled={!canNext} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, height: 52, padding: '0 26px', borderRadius: 13, border: 'none', cursor: canNext ? 'pointer' : 'not-allowed',
                background: canNext ? 'var(--vermelho)' : 'var(--line2)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, boxShadow: canNext ? '0 8px 20px rgba(191,33,47,.26)' : 'none', transition: 'background .15s' }}>
                {step.cta}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.OwnerFlow = OwnerFlow;
