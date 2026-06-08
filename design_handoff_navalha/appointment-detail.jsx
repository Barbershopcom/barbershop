// admin-screens-2.jsx — C4 Serviços, C6 Promoções (+modal/preview), C7 Relatórios, C8 Perfil.
// Uses admin-shell globals. Exports: AdminServices, AdminPromos, AdminReports, AdminProfile.
const { useState: as2State } = React;

// ════════════════════════ C4 Serviços ════════════════════════
const SERVICES = [
  { id: 1, name: 'Corte clássico', dur: 30, price: 50, disc: 0, status: 'ativo' },
  { id: 2, name: 'Barba terapia', dur: 20, price: 30, disc: 0, status: 'ativo' },
  { id: 3, name: 'Corte + Barba', dur: 50, price: 64, disc: 20, until: 'até 08 jun', status: 'ativo' },
  { id: 4, name: 'Pezinho / acabamento', dur: 15, price: 20, disc: 0, status: 'ativo' },
  { id: 5, name: 'Sobrancelha', dur: 10, price: 15, disc: 0, status: 'ativo' },
  { id: 6, name: 'Platinado / descoloração', dur: 90, price: 150, disc: 10, until: 'até 30 jun', status: 'ativo' },
  { id: 7, name: 'Hidratação capilar', dur: 25, price: 40, disc: 0, status: 'inativo' },
];
const SVC_FILTERS = [['todos', 'Todos'], ['ativo', 'Ativos'], ['inativo', 'Inativos'], ['desconto', 'Com desconto']];

function AdminServices({ nav }) {
  const [filter, setFilter] = as2State('todos');
  const list = SERVICES.filter((s) => filter === 'todos' ? true : filter === 'desconto' ? s.disc > 0 : s.status === filter);
  return (
    <AdminShell active="servicos" nav={nav} title="SERVIÇOS" subtitle={`${SERVICES.length} serviços cadastrados`}
      actions={<A_Btn kind="primary" sm><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Novo serviço</A_Btn>}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SVC_FILTERS.map(([v, l]) => {
          const on = filter === v;
          return <button key={v} onClick={() => setFilter(v)} style={{ height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: on ? 700 : 500, border: '1.4px solid ' + (on ? 'var(--navy)' : 'var(--hairline-strong)'), background: on ? 'var(--navy)' : 'transparent', color: on ? '#fff' : 'var(--ink)' }}>{l}</button>;
        })}
      </div>
      <A_Card pad={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
              {['Serviço', 'Duração', 'Preço', 'Desconto', 'Status', ''].map((h, i) => (
                <th key={i} style={{ textAlign: i === 1 || i === 2 ? 'right' : 'left', padding: '14px 18px', fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => {
              const net = s.disc ? s.price * (1 - s.disc / 100) : s.price;
              return (
                <tr key={s.id} style={{ borderBottom: i === list.length - 1 ? 'none' : '1px solid var(--hairline)', opacity: s.status === 'inativo' ? 0.6 : 1 }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--navy-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><path d="M8 7.5L20 18M8 16.5L20 6" /></svg>
                      </span>
                      <span style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--muted)' }}>{s.dur} min</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    {s.disc ? (
                      <div>
                        <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)', textDecoration: 'line-through', marginRight: 6 }}>{A_brl(s.price)}</span>
                        <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>{A_brl(net)}</span>
                      </div>
                    ) : <span style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{A_brl(s.price)}</span>}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {s.disc ? <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 800, color: 'var(--vermelho-ink)' }}>−{s.disc}%</span><span style={{ fontFamily: 'var(--ui)', fontSize: 10.5, color: 'var(--muted)' }}>{s.until}</span></div> : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 18px' }}><A_Pill status={s.status} /></td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button style={{ width: 34, height: 34, borderRadius: 9, border: '1.4px solid var(--hairline)', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4.5 19 9l-9.5 9.5L5 19l.5-4.5z" /></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </A_Card>
    </AdminShell>
  );
}

// ════════════════════════ C6 Promoções ════════════════════════
const A_PROMOS = [
  { id: 1, title: 'Combo Corte + Barba', type: '−20%', apply: 'Corte + Barba', start: '01 jun', end: '08 jun', status: 'ativo', theme: 'navy' },
  { id: 2, title: 'Primeiro corte', type: 'R$ 10 OFF', apply: 'Novos clientes', start: '01 mai', end: '31 jul', status: 'ativo', theme: 'red' },
  { id: 3, title: 'Platinado de inverno', type: '−10%', apply: 'Platinado', start: '01 jun', end: '30 jun', status: 'ativo', theme: 'gold' },
  { id: 4, title: 'Leve um amigo', type: '2 por 1', apply: 'Todos serviços', start: '10 abr', end: '20 abr', status: 'inativo', theme: 'navy' },
];
const PT = { navy: { bg: '#1a365d', ink: '#fff', tag: '#c5a059', tagInk: '#1c1917' }, red: { bg: '#bf212f', ink: '#fff', tag: '#fff', tagInk: '#bf212f' }, gold: { bg: '#c5a059', ink: '#1c1917', tag: '#1c1917', tagInk: '#c5a059' } };

function PromoPreview({ p }) {
  const c = PT[p.theme];
  return (
    <div style={{ borderRadius: 16, background: c.bg, color: c.ink, padding: 16, position: 'relative', overflow: 'hidden', width: 220 }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'repeating-linear-gradient(-45deg, #fff 0 12px, transparent 12px 28px)' }} />
      <div style={{ position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: '50%', border: '10px solid rgba(255,255,255,.18)' }} />
      <span style={{ position: 'relative', display: 'inline-block', fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', background: c.tag, color: c.tagInk, padding: '3px 8px', borderRadius: 999 }}>{p.apply}</span>
      <div style={{ position: 'relative', fontFamily: 'var(--display)', fontSize: 38, lineHeight: 0.85, marginTop: 10 }}>{p.type}</div>
      <div style={{ position: 'relative', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 700, marginTop: 6 }}>{p.title}</div>
      <div style={{ position: 'relative', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, opacity: 0.85, marginTop: 2 }}>Barbearia do Jajá</div>
    </div>
  );
}

function PromoFormModal({ onClose, onCreate }) {
  const [title, setTitle] = as2State('');
  const [type, setType] = as2State('percent');
  const [val, setVal] = as2State('15');
  const [theme, setTheme] = as2State('navy');
  const preview = { title: title || 'Título da promoção', type: type === 'percent' ? `−${val || 0}%` : type === 'fixed' ? `R$ ${val || 0} OFF` : 'Brinde', apply: 'Todos serviços', theme };
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(28,25,23,.42)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'afade .18s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 720, maxWidth: '100%', background: 'var(--card)', borderRadius: 18, boxShadow: '0 30px 70px rgba(28,25,23,.34)', overflow: 'hidden', display: 'flex' }}>
        {/* form */}
        <div style={{ flex: 1, padding: 24, borderRight: '1px solid var(--hairline)' }}>
          <h2 style={{ margin: '0 0 18px', fontFamily: 'var(--display)', fontSize: 24, letterSpacing: 0.5, color: 'var(--ink)' }}>NOVA PROMOÇÃO</h2>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Combo do mês" style={{ width: '100%', height: 44, borderRadius: 11, border: '1.5px solid var(--hairline-strong)', background: 'var(--bg)', padding: '0 12px', fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['percent', '% desconto'], ['fixed', 'Valor fixo'], ['gift', 'Brinde']].map(([v, l]) => {
                const on = type === v;
                return <button key={v} onClick={() => setType(v)} style={{ flex: 1, height: 40, borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: on ? 700 : 500, border: '1.5px solid ' + (on ? 'var(--navy)' : 'var(--hairline-strong)'), background: on ? 'color-mix(in srgb, var(--navy) 8%, transparent)' : 'transparent', color: 'var(--ink)' }}>{l}</button>;
              })}
            </div>
          </div>
          {type !== 'gift' && (
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{type === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}</label>
              <input value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} style={{ width: 120, height: 44, borderRadius: 11, border: '1.5px solid var(--hairline-strong)', background: 'var(--bg)', padding: '0 12px', fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
            </div>
          )}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Cor do card</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['navy', 'red', 'gold'].map((t) => (
                <button key={t} onClick={() => setTheme(t)} style={{ width: 36, height: 36, borderRadius: 10, cursor: 'pointer', background: PT[t].bg, border: theme === t ? '2.5px solid var(--ink)' : '2.5px solid transparent', boxShadow: '0 0 0 1px var(--hairline)' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <A_Btn kind="ghost" onClick={onClose}>Cancelar</A_Btn>
            <div style={{ flex: 1 }} />
            <A_Btn kind="primary" onClick={() => { onCreate({ title: preview.title, type: preview.type, apply: 'Todos serviços', start: 'hoje', end: '—', status: 'ativo', theme }); onClose(); }}>Criar promoção</A_Btn>
          </div>
        </div>
        {/* preview */}
        <div style={{ width: 280, flex: '0 0 auto', padding: 24, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16, alignSelf: 'flex-start' }}>Como o cliente vê</div>
          <PromoPreview p={preview} />
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', marginTop: 18, textAlign: 'center', lineHeight: 1.5 }}>Aparece no carrossel "Promoções da semana" da home do app.</div>
        </div>
      </div>
    </div>
  );
}

function AdminPromos({ nav }) {
  const [promos, setPromos] = as2State(A_PROMOS);
  const [modal, setModal] = as2State(false);
  const [toast, setToast] = as2State(null);
  return (
    <AdminShell active="promocoes" nav={nav} title="PROMOÇÕES" subtitle={`${promos.filter((p) => p.status === 'ativo').length} ativas de ${promos.length}`}
      actions={<A_Btn kind="primary" sm onClick={() => setModal(true)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Nova promoção</A_Btn>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {promos.map((p) => (
          <A_Card key={p.id} style={{ opacity: p.status === 'inativo' ? 0.62 : 1 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <PromoPreview p={p} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <A_Pill status={p.status} />
                </div>
                <div style={{ fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 10 }}>{p.title}</div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[['Aplicação', p.apply], ['Vigência', `${p.start} – ${p.end}`]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)' }}>{k}</span>
                      <span style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <A_Btn kind="ghost" sm onClick={() => setPromos((l) => l.map((x) => x.id === p.id ? { ...x, status: x.status === 'ativo' ? 'inativo' : 'ativo' } : x))}>{p.status === 'ativo' ? 'Pausar' : 'Ativar'}</A_Btn>
                  <A_Btn kind="ghost" sm>Editar</A_Btn>
                </div>
              </div>
            </div>
          </A_Card>
        ))}
      </div>
      {modal && <PromoFormModal onClose={() => setModal(false)} onCreate={(p) => { setPromos((l) => [{ ...p, id: Date.now() }, ...l]); setToast('Promoção criada ✓'); clearTimeout(window.__ap); window.__ap = setTimeout(() => setToast(null), 2400); }} />}
      <A_Toast msg={toast} />
    </AdminShell>
  );
}

// ════════════════════════ C7 Relatórios ════════════════════════
const REP_ROWS = [
  { date: '05/06', client: 'João S.', barber: 'Jajá', service: 'Corte clássico', gross: 50, fee: 7.5, status: 'concluido' },
  { date: '05/06', client: 'Pedro A.', barber: 'Renan', service: 'Barba terapia', gross: 30, fee: 4.5, status: 'concluido' },
  { date: '04/06', client: 'André M.', barber: 'Renan', service: 'Corte + Barba', gross: 64, fee: 9.6, status: 'concluido' },
  { date: '04/06', client: 'Téo P.', barber: 'Téo', service: 'Platinado', gross: 135, fee: 20.25, status: 'concluido' },
  { date: '03/06', client: 'Lucas T.', barber: 'Jajá', service: 'Corte clássico', gross: 50, fee: 7.5, status: 'concluido' },
  { date: '03/06', client: 'Igor N.', barber: 'Renan', service: 'Corte + Barba', gross: 64, fee: 9.6, status: 'concluido' },
  { date: '02/06', client: 'Caio S.', barber: 'Jajá', service: 'Corte', gross: 50, fee: 0, status: 'cancelado' },
];

function AdminReports({ nav }) {
  const valid = REP_ROWS.filter((r) => r.status !== 'cancelado');
  const totalGross = valid.reduce((a, r) => a + r.gross, 0);
  const totalFee = valid.reduce((a, r) => a + r.fee, 0);
  const totalNet = totalGross - totalFee;
  const Filter = ({ label, value }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</label>
      <button style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--hairline-strong)', background: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
        {value}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    </div>
  );
  return (
    <AdminShell active="relatorios" nav={nav} title="RELATÓRIOS" subtitle="Receita, comissão e repasses"
      actions={<A_Btn kind="gold" sm><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>Exportar CSV</A_Btn>}>
      {/* filters */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <Filter label="Período" value="Últimos 7 dias" />
        <Filter label="Barbeiro" value="Todos" />
        <Filter label="Serviço" value="Todos" />
      </div>
      {/* totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        <A_Card pad={18}><div style={{ fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Receita bruta</div><div style={{ fontFamily: 'var(--display)', fontSize: 34, color: 'var(--ink)', marginTop: 6 }}>{A_brl(totalGross)}</div></A_Card>
        <A_Card pad={18}><div style={{ fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Comissão plataforma (15%)</div><div style={{ fontFamily: 'var(--display)', fontSize: 34, color: 'var(--vermelho-ink)', marginTop: 6 }}>−{A_brl(totalFee)}</div></A_Card>
        <A_Card pad={18} style={{ background: 'color-mix(in srgb, #10b981 8%, var(--card))' }}><div style={{ fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Líquido pro barbeiro</div><div style={{ fontFamily: 'var(--display)', fontSize: 34, color: '#0c6e4e', marginTop: 6 }}>{A_brl(totalNet)}</div></A_Card>
      </div>
      {/* table */}
      <A_Card pad={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
              {['Data', 'Cliente', 'Barbeiro', 'Serviço', 'Bruto', 'Taxa', 'Líquido', 'Status'].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 4 && i <= 6 ? 'right' : 'left', padding: '13px 16px', fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REP_ROWS.map((r, i) => (
              <tr key={i} style={{ borderBottom: i === REP_ROWS.length - 1 ? 'none' : '1px solid var(--hairline)', opacity: r.status === 'cancelado' ? 0.5 : 1 }}>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--ui)', fontSize: 12.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{r.date}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{r.client}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--ink)' }}>{r.barber}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--ink)' }}>{r.service}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{r.status === 'cancelado' ? '—' : A_brl(r.gross)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--vermelho-ink)', fontVariantNumeric: 'tabular-nums' }}>{r.status === 'cancelado' ? '—' : '−' + A_brl(r.fee)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 800, color: r.status === 'cancelado' ? 'var(--muted)' : '#0c6e4e', fontVariantNumeric: 'tabular-nums' }}>{r.status === 'cancelado' ? '—' : A_brl(r.gross - r.fee)}</td>
                <td style={{ padding: '12px 16px' }}><A_Pill status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </A_Card>
    </AdminShell>
  );
}

// ════════════════════════ C8 Perfil da barbearia ════════════════════════
function AdminProfile({ nav }) {
  const [toast, setToast] = as2State(null);
  const field = (label, value, wide) => (
    <div style={{ gridColumn: wide ? '1 / -1' : 'auto' }}>
      <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>{label}</label>
      <input defaultValue={value} style={{ width: '100%', height: 46, borderRadius: 11, border: '1.5px solid var(--hairline-strong)', background: 'var(--bg)', padding: '0 13px', fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
    </div>
  );
  return (
    <AdminShell active="perfil" nav={nav} title="PERFIL DA BARBEARIA" subtitle="Dados públicos exibidos no app"
      actions={<A_Btn kind="primary" sm onClick={() => { setToast('Alterações salvas ✓'); clearTimeout(window.__app); window.__app = setTimeout(() => setToast(null), 2200); }}>Salvar alterações</A_Btn>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        <A_Card>
          <A_SectionTitle>Informações</A_SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {field('Nome', 'Barbearia do Jajá')}
            {field('Telefone / WhatsApp', '(11) 95555-0123')}
            {field('Endereço', 'Rua das Tesouras, 42 — Vila Mariana, São Paulo', true)}
            {field('Instagram', '@barbeariadojaja')}
            {field('Horário', 'Ter–Sáb · 09h–20h')}
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Bio</label>
            <textarea defaultValue="Tradição em corte e barba desde 2009. Ambiente clássico, atendimento de primeira e os melhores barbeiros da região." style={{ width: '100%', height: 84, borderRadius: 11, border: '1.5px solid var(--hairline-strong)', background: 'var(--bg)', padding: 13, fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', outline: 'none', resize: 'none', lineHeight: 1.5 }} />
          </div>
        </A_Card>

        {/* brand side */}
        <A_Card>
          <A_SectionTitle>Marca</A_SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0 4px' }}>
            <div style={{ position: 'relative', width: 92, height: 92, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px var(--card), 0 0 0 4.5px var(--dourado)' }}>
              <span style={{ width: 15, height: 46, borderRadius: 999, border: '2px solid #c5a059', overflow: 'hidden', background: 'repeating-linear-gradient(-45deg, #bf212f 0 6px, #fffcf5 6px 12px, #2a5a8f 12px 18px, #fffcf5 18px 24px)' }} />
            </div>
            <button style={{ marginTop: 14, fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--navy-ink)', background: 'none', border: 'none', cursor: 'pointer' }}>Trocar logo</button>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Capa do app</div>
            <div style={{ height: 84, borderRadius: 12, background: 'linear-gradient(135deg, #1a365d, #12243d)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.12, background: 'repeating-linear-gradient(-45deg, #fff 0 12px, transparent 12px 28px)' }} />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-9 8" /></svg>
            </div>
          </div>
        </A_Card>
      </div>
      <A_Toast msg={toast} />
    </AdminShell>
  );
}

Object.assign(window, { AdminServices, AdminPromos, AdminReports, AdminProfile });
