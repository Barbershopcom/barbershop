// edit-profile.jsx — A20 Editar perfil, vintage style.
// Exports to window: EditProfileScreen.
const { useState } = React;

function FieldE({ label, value, onChange, placeholder, type = 'text', hint }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', borderRadius: 13, background: 'var(--card)', border: '1.6px solid ' + (focus ? 'var(--frame)' : 'var(--hairline-strong)'), padding: '0 13px', height: 50, transition: 'border-color .15s' }}>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--ui)', fontSize: 15, color: 'var(--ink)' }} />
      </div>
      {hint && <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function EditProfileScreen({ tweaks = {}, nav }) {
  const { dark = false } = tweaks;
  const [name, setName] = useState('João da Silva');
  const [email, setEmail] = useState('joao@email.com');
  const [phone, setPhone] = useState('(11) 95555-0123');
  const [birth, setBirth] = useState('14/05/1992');
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => { setSaved(false); if (nav) nav('__back'); }, 1100); };

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* app bar */}
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}>
        <button onClick={() => nav && nav('__back')} style={{ width: 38, height: 38, borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--display)', fontSize: 23, letterSpacing: 1, color: 'var(--ink)' }}>EDITAR PERFIL</span>
        <span style={{ width: 38 }} />
      </div>

      {/* body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 18px 130px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* avatar + upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 92, height: 92, borderRadius: '50%', background: 'var(--frame)', color: 'var(--papel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 40, letterSpacing: 1, boxShadow: '0 0 0 3px var(--card), 0 0 0 4.5px var(--dourado)' }}>JS</div>
            <button style={{ position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: '50%', border: '2.5px solid var(--bg)', background: 'var(--vermelho)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="3.5" /></svg>
            </button>
          </div>
          <button style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 700, color: 'var(--frame-ink)' }}>Trocar foto</button>
        </div>

        <FieldE label="Nome completo" value={name} onChange={setName} />
        <FieldE label="Email" value={email} onChange={setEmail} type="email" />
        <FieldE label="Telefone" value={phone} onChange={setPhone} hint="Usado para lembretes via WhatsApp" />
        <FieldE label="Data de nascimento" value={birth} onChange={setBirth} hint="Opcional — pra te dar um mimo no seu dia" />
      </div>

      {/* sticky save */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 18px 30px', background: 'linear-gradient(to top, var(--bg) 74%, transparent)', zIndex: 8 }}>
        <button onClick={save} style={{ width: '100%', height: 54, borderRadius: 15, border: 'none', cursor: 'pointer',
          background: saved ? 'var(--green)' : 'var(--frame)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 8px 22px rgba(28,25,23,.2)', transition: 'background .2s' }}>
          {saved ? <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>Salvo!</> : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

window.EditProfileScreen = EditProfileScreen;
