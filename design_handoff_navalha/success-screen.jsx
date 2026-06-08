// review.jsx — A17 Avaliar atendimento, vintage style.
// Exports to window: ReviewScreen.
const { useState } = React;

function PoleR({ w = 11, h = 26 }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: h, borderRadius: 999, border: '1.4px solid var(--frame)', overflow: 'hidden',
      background: 'repeating-linear-gradient(-45deg, var(--vermelho) 0 5px, var(--papel) 5px 10px, var(--navy) 10px 15px, var(--papel) 15px 20px)', boxShadow: 'inset 0 0 0 2px var(--papel)' }} />
  );
}

const LABELS = { 0: 'Toque pra avaliar', 1: 'Não curti', 2: 'Podia melhorar', 3: 'Foi ok', 4: 'Muito bom', 5: 'Excelente!' };
const POSITIVE = ['Pontual', 'Caprichou no corte', 'Boa conversa', 'Ambiente top', 'Atencioso', 'Recomendo'];
const IMPROVE = ['Atrasou', 'Corte às pressas', 'Pouca atenção', 'Ambiente', 'Comunicação'];

function Star({ filled, onClick, onHover, onLeave }) {
  return (
    <button onClick={onClick} onMouseEnter={onHover} onMouseLeave={onLeave}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, lineHeight: 0, transition: 'transform .1s', transform: filled ? 'scale(1.04)' : 'scale(1)' }}>
      <svg width="42" height="42" viewBox="0 0 24 24" fill={filled ? 'var(--dourado)' : 'none'} stroke={filled ? 'var(--dourado)' : 'var(--hairline-strong)'} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M12 2.2l2.95 6.4 6.85.85-5.05 4.65 1.35 6.85L12 18.1l-6.05 3.5 1.35-6.85L2.25 9.45l6.85-.85z" />
      </svg>
    </button>
  );
}

function Chip({ label, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'var(--ui)', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer',
      padding: '9px 15px', borderRadius: 999, whiteSpace: 'nowrap',
      border: '1.5px solid ' + (on ? 'var(--frame)' : 'var(--hairline-strong)'),
      background: on ? 'color-mix(in srgb, var(--frame) 12%, transparent)' : 'transparent',
      color: on ? 'var(--frame-ink)' : 'var(--ink)', transition: 'all .12s',
      display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {on && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--frame-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
      {label}
    </button>
  );
}

function ThanksOverlay({ onClose, rating }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'cfade .35s ease' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 34px', textAlign: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <span style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '1.5px dashed var(--dourado)', animation: 'cspin 10s linear infinite' }} />
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--dourado)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(197,160,89,.4)' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2.2l2.95 6.4 6.85.85-5.05 4.65 1.35 6.85L12 18.1l-6.05 3.5 1.35-6.85L2.25 9.45l6.85-.85z" /></svg>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 38, lineHeight: 0.95, letterSpacing: 0.5, color: 'var(--frame-ink)' }}>VALEU PELA REAL!</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink)', marginTop: 12, maxWidth: 280, lineHeight: 1.45 }}>
          Sua avaliação de {rating} {rating === 1 ? 'estrela' : 'estrelas'} ajuda o Jajá e outros clientes. Até o próximo corte!
        </div>
      </div>
      <div style={{ padding: '0 18px 40px' }}>
        <button onClick={onClose} style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'var(--frame)', color: '#fff', fontFamily: 'var(--ui)', fontSize: 15.5, fontWeight: 700 }}>Voltar pros agendamentos</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
function ReviewScreen({ tweaks = {} }) {
  const { dark = false, sent: sentInit = false } = tweaks;
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(sentInit);

  const shown = hover || rating;
  const tagSet = rating === 0 ? POSITIVE : (rating >= 4 ? POSITIVE : IMPROVE);
  const toggleTag = (t) => setTags((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* app bar */}
      <div style={{ paddingTop: 56, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}>
        <button style={{ width: 38, height: 38, borderRadius: 11, border: '1.4px solid var(--hairline)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--display)', fontSize: 23, letterSpacing: 1, color: 'var(--ink)' }}>AVALIAR</span>
        <PoleR w={13} h={28} />
      </div>

      {/* body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px 150px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* barber */}
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--frame)', color: 'var(--papel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 34, letterSpacing: 1, boxShadow: '0 8px 20px rgba(28,25,23,.18)' }}>JJ</div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: 0.5, color: 'var(--ink)', marginTop: 14, textAlign: 'center' }}>COMO FOI SEU CORTE?</div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', marginTop: 3, textAlign: 'center' }}>com o Jajá · sáb, 17 mai · 14:00</div>

        {/* stars */}
        <div style={{ display: 'flex', gap: 2, marginTop: 22 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} filled={n <= shown} onClick={() => setRating(n)} onHover={() => setHover(n)} onLeave={() => setHover(0)} />
          ))}
        </div>
        <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: shown ? 'var(--dourado-ink)' : 'var(--muted)', marginTop: 10, height: 20, letterSpacing: 0.3 }}>{LABELS[shown]}</div>

        {/* tags */}
        {rating > 0 && (
          <div style={{ width: '100%', marginTop: 22 }}>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, textAlign: 'center' }}>
              {rating >= 4 ? 'O que foi destaque?' : 'O que pode melhorar?'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center' }}>
              {tagSet.map((t) => <Chip key={t} label={t} on={tags.includes(t)} onClick={() => toggleTag(t)} />)}
            </div>
          </div>
        )}

        {/* comment */}
        {rating > 0 && (
          <div style={{ width: '100%', marginTop: 22 }}>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 9 }}>Comentário <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>· opcional</span></div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Conta como foi a experiência…" rows={3}
              style={{ width: '100%', resize: 'none', borderRadius: 13, border: '1.4px solid var(--hairline-strong)', background: 'var(--card)', padding: '12px 14px',
                fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink)', outline: 'none', lineHeight: 1.4 }} />
          </div>
        )}
      </div>

      {/* sticky actions */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 18px 30px', background: 'linear-gradient(to top, var(--bg) 74%, transparent)', zIndex: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => rating > 0 && setSent(true)} disabled={rating === 0}
          style={{ width: '100%', height: 54, borderRadius: 15, border: 'none', cursor: rating > 0 ? 'pointer' : 'not-allowed',
            background: rating > 0 ? 'var(--vermelho)' : 'var(--hairline-strong)', color: rating > 0 ? '#fff' : 'var(--muted)',
            fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, boxShadow: rating > 0 ? '0 8px 22px rgba(191,33,47,.26)' : 'none', transition: 'background .2s' }}>
          Enviar avaliação
        </button>
        <button style={{ width: '100%', height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 600 }}>
          Avaliar depois
        </button>
      </div>

      {sent && <ThanksOverlay rating={rating || 5} onClose={() => setSent(false)} />}
    </div>
  );
}

window.ReviewScreen = ReviewScreen;
