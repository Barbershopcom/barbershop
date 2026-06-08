// login.jsx — A2 Login, vintage barbershop style.
// Exports to window: LoginScreen.
const { useState } = React;

// circular barbershop seal (brand mark)
function Seal() {
  return (
    <div style={{ position: 'relative', width: 92, height: 92, borderRadius: '50%', background: 'var(--frame)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(28,25,23,.22)' }}>
      <span style={{ position: 'absolute', inset: 5, borderRadius: '50%', border: '1.5px solid var(--dourado)', opacity: 0.85 }} />
      <span style={{ position: 'absolute', inset: 9, borderRadius: '50%', border: '1px dashed color-mix(in srgb, var(--dourado) 60%, transparent)' }} />
      {/* barber pole */}
      <span style={{ width: 15, height: 46, borderRadius: 999, border: '1.5px solid var(--dourado)', overflow: 'hidden',
        background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 5px, var(--papel) 5px 10px, #2a5a8f 10px 15px, var(--papel) 15px 20px)' }} />
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, right, onRight, error }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', borderRadius: 13, background: 'var(--card)',
        border: '1.6px solid ' + (error ? 'var(--vermelho)' : focus ? 'var(--frame)' : 'var(--hairline-strong)'),
        padding: '0 13px', height: 52, transition: 'border-color .15s' }}>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--ui)', fontSize: 15, color: 'var(--ink)' }} />
        {right && (
          <button onClick={onRight} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex' }}>{right}</button>
        )}
      </div>
    </div>
  );
}

const EyeOpen = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></svg>;
const EyeOff = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M9.4 5.2A10.5 10.5 0 0 1 12 5c7 0 10.5 7 10.5 7a16 16 0 0 1-3.3 4.1M6.2 6.3A16 16 0 0 0 1.5 12S5 19 12 19a10 10 0 0 0 3.5-.6" /></svg>;

function Social({ brand, children, onClick }) {
  const dark = brand === 'apple';
  return (
    <button onClick={onClick} style={{ width: '100%', height: 50, borderRadius: 13, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      background: dark ? 'var(--ink)' : 'var(--card)', color: dark ? 'var(--bg)' : 'var(--ink)',
      border: dark ? 'none' : '1.5px solid var(--hairline-strong)', fontFamily: 'var(--ui)', fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

const GoogleG = (
  <svg width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.9z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.9l3.7-2.9z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.7l3.1-3.1A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.4 9.1 5.4 12 5.4z" /></svg>
);
const AppleA = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.5-3.8zM14.1 5.8c.7-.8 1.1-2 1-3.1-1 0-2.2.6-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" /></svg>;

// ════════════════════════════════════════════════════════════
function LoginScreen({ tweaks = {}, nav }) {
  const { dark = false, simulate = 'sucesso' } = tweaks;
  const [email, setEmail] = useState('cliente@email.com');
  const [pw, setPw] = useState('123456');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | error | done

  const submit = () => {
    if (status === 'loading') return;
    setStatus('loading');
    setTimeout(() => {
      if (simulate === 'erro') { setStatus('error'); return; }
      setStatus('done');
      if (nav) setTimeout(() => nav('home'), 750);
    }, 1500);
  };

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative', overflow: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 26px 32px' }}>
        {/* brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Seal />
          <div style={{ fontFamily: 'var(--display)', fontSize: 40, letterSpacing: 2, color: 'var(--ink)', marginTop: 16, lineHeight: 0.9 }}>NAVALHA</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>seu corte, na hora certa</div>
        </div>

        {/* heading */}
        <div style={{ marginTop: 34 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: 0.8, color: 'var(--ink)' }}>ENTRAR</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', marginTop: 1 }}>Faça login pra continuar</div>
        </div>

        {/* form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 22 }}>
          <Field label="Email" type="email" value={email} onChange={(v) => { setEmail(v); status === 'error' && setStatus('idle'); }} placeholder="voce@email.com" error={status === 'error'} />
          <Field label="Senha" type={show ? 'text' : 'password'} value={pw} onChange={(v) => { setPw(v); status === 'error' && setStatus('idle'); }} placeholder="sua senha" error={status === 'error'}
            right={show ? EyeOff : EyeOpen} onRight={() => setShow((s) => !s)} />

          {status === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--vermelho)" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" /></svg>
              <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, color: 'var(--vermelho-ink)', fontWeight: 600 }}>Email ou senha incorretos</span>
            </div>
          )}

          <div style={{ textAlign: 'right', marginTop: -2 }}>
            <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 600, color: 'var(--frame-ink)', cursor: 'pointer' }}>Esqueci a senha →</span>
          </div>

          <button onClick={submit} disabled={status === 'loading'}
            style={{ width: '100%', height: 54, borderRadius: 14, border: 'none', cursor: 'pointer', marginTop: 4,
              background: status === 'done' ? 'var(--green)' : 'var(--frame)', color: '#fff',
              fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, letterSpacing: 0.3,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 8px 22px rgba(28,25,23,.2)', transition: 'background .25s' }}>
            {status === 'loading' ? <><span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.4px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'cspin .7s linear infinite' }} />Entrando…</>
              : status === 'done' ? <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>Pronto!</>
              : 'Entrar'}
          </button>
        </div>

        {/* divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--hairline-strong)', opacity: 0.7 }} />
          <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>ou continue com</span>
          <span style={{ flex: 1, height: 1, background: 'var(--hairline-strong)', opacity: 0.7 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Social brand="google">{GoogleG} Continuar com Google</Social>
          <Social brand="apple">{AppleA} Continuar com Apple</Social>
        </div>

        {/* footer */}
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center', marginTop: 26, fontFamily: 'var(--ui)', fontSize: 13.5, color: 'var(--muted)' }}>
          Não tem conta? <span style={{ color: 'var(--frame-ink)', fontWeight: 700, cursor: 'pointer' }}>Criar conta</span>
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
