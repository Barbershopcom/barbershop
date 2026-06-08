// onboarding.jsx — A1 Splash + A5 Onboarding, vintage style.
// Exports to window: OnboardingFlow.
const { useState, useEffect } = React;

function BigPole({ w = 30, h = 100 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 999, border: '2px solid var(--dourado)', overflow: 'hidden',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 8px, var(--papel) 8px 16px, #2a5a8f 16px 24px, var(--papel) 24px 32px)', boxShadow: 'inset 0 0 0 3px var(--papel)' }} />
  );
}

// brand seal (reused vibe from login)
function Seal({ s = 110 }) {
  return (
    <div style={{ position: 'relative', width: s, height: s, borderRadius: '50%', background: 'var(--frame)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 34px rgba(28,25,23,.28)' }}>
      <span style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: '2px solid var(--dourado)', opacity: 0.85 }} />
      <span style={{ position: 'absolute', inset: 11, borderRadius: '50%', border: '1.2px dashed color-mix(in srgb, var(--dourado) 60%, transparent)' }} />
      <span style={{ width: s * 0.16, height: s * 0.5, borderRadius: 999, border: '2px solid var(--dourado)', overflow: 'hidden',
        background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 6px, var(--papel) 6px 12px, #2a5a8f 12px 18px, var(--papel) 18px 24px)' }} />
    </div>
  );
}

// onboarding scene illustrations (schematic, on-brand — no photos)
function Scene({ kind }) {
  const box = { width: 200, height: 180, position: 'relative' };
  if (kind === 'agenda') return (
    <div style={box}>
      <div style={{ position: 'absolute', inset: '14px 20px', borderRadius: 18, background: 'var(--card)', border: '1.5px solid var(--hairline)', boxShadow: '0 12px 30px rgba(28,25,23,.12)', padding: 14 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>{[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i===1?'var(--frame)':'var(--tint)' }} />)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {Array.from({length:12}).map((_,i)=><div key={i} style={{ aspectRatio:'1', borderRadius:7, background: i===5?'var(--vermelho)':'var(--tint)', display:'flex',alignItems:'center',justifyContent:'center' }}>{i===5&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}</div>)}
        </div>
      </div>
    </div>
  );
  if (kind === 'pix') return (
    <div style={box}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 130, height: 130, borderRadius: 20, background: 'var(--card)', border: '1.5px solid var(--hairline)', boxShadow: '0 12px 30px rgba(28,25,23,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.2l3.5 3.5a3 3 0 0 0 4.2 0M12 20.8l3.5-3.5a3 3 0 0 1 4.2 0M12 3.2L8.5 6.7a3 3 0 0 1-4.2 0M12 20.8l-3.5-3.5a3 3 0 0 0-4.2 0" /><rect x="9" y="9" width="6" height="6" rx="1.4" transform="rotate(45 12 12)" /></svg>
      </div>
      <div style={{ position: 'absolute', right: 14, top: 18, background: 'var(--green)', color: '#fff', borderRadius: 999, padding: '5px 11px', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, boxShadow: '0 6px 16px rgba(31,138,107,.3)' }}>R$ 76</div>
    </div>
  );
  return (
    <div style={box}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 120, height: 120, borderRadius: '50%', background: 'var(--card)', border: '1.5px solid var(--hairline)', boxShadow: '0 12px 30px rgba(28,25,23,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--dourado-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      </div>
      <div style={{ position: 'absolute', right: 24, top: 30, width: 16, height: 16, borderRadius: '50%', background: 'var(--vermelho)', boxShadow: '0 4px 12px rgba(191,33,47,.4)' }} />
    </div>
  );
}

const SLIDES = [
  { kind: 'agenda', title: 'AGENDE COM SEU\nBARBEIRO FAVORITO', sub: 'Escolha serviço, profissional e horário em segundos — do seu jeito.' },
  { kind: 'pix', title: 'PAGUE COM PIX\nNA HORA', sub: 'Confirmação instantânea e sem taxa. Sua comanda fechada antes de sentar na cadeira.' },
  { kind: 'bell', title: 'NUNCA MAIS\nPERCA UM CORTE', sub: 'Lembretes automáticos antes do horário. A gente te avisa, você só aparece.' },
];

// ════════════════════════════════════════════════════════════
function OnboardingFlow({ tweaks = {}, nav }) {
  const { dark = false, start = 'splash' } = tweaks;
  const [phase, setPhase] = useState(start); // splash | onboarding
  const [i, setI] = useState(0);

  useEffect(() => {
    if (phase !== 'splash') return;
    const t = setTimeout(() => setPhase('onboarding'), 1700);
    return () => clearTimeout(t);
  }, [phase]);

  const finish = () => { if (nav) nav('login'); else { setPhase('splash'); setI(0); } };
  const next = () => { if (i < SLIDES.length - 1) setI(i + 1); else finish(); };

  if (phase === 'splash') {
    return (
      <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ animation: 'cfade .6s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Seal s={112} />
          <div style={{ fontFamily: 'var(--display)', fontSize: 50, letterSpacing: 3, color: 'var(--ink)', marginTop: 20, lineHeight: 0.9 }}>NAVALHA</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>seu corte, na hora certa</div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 14px, var(--papel) 14px 28px, var(--frame) 28px 42px, var(--papel) 42px 56px)' }} />
        <div style={{ position: 'absolute', bottom: 40, fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: 1, color: 'var(--muted)' }}>carregando…</div>
      </div>
    );
  }

  const s = SLIDES[i];
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* skip */}
      <div style={{ paddingTop: 56, paddingRight: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={finish} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 600, color: 'var(--muted)' }}>Pular</button>
      </div>

      {/* scene */}
      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', animation: 'cfade .35s ease' }}>
        <div style={{ marginBottom: 38 }}><Scene kind={s.kind} /></div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 34, lineHeight: 1.02, letterSpacing: 0.5, color: 'var(--ink)', whiteSpace: 'pre-line' }}>{s.title}</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15.5, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5, maxWidth: 300 }}>{s.sub}</div>
      </div>

      {/* dots + cta */}
      <div style={{ padding: '0 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {SLIDES.map((_, k) => (
            <span key={k} onClick={() => setI(k)} style={{ height: 8, borderRadius: 999, cursor: 'pointer', transition: 'all .2s',
              width: k === i ? 26 : 8, background: k === i ? 'var(--frame)' : 'var(--hairline-strong)' }} />
          ))}
        </div>
        <button onClick={next} style={{ width: '100%', height: 56, borderRadius: 15, border: 'none', cursor: 'pointer',
          background: 'var(--frame)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, letterSpacing: 0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 8px 22px rgba(28,25,23,.22)' }}>
          {i < SLIDES.length - 1 ? 'Próximo' : 'Começar'}
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}

window.OnboardingFlow = OnboardingFlow;
