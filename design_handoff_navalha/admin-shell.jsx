// admin-screens-1.jsx — C1 Dashboard, C2 Barbeiros (+C3 convite modal), C5 Agenda.
// Uses admin-shell globals. Exports: AdminDashboard, AdminTeam, AdminAgenda.
const { useState: as1State } = React;

// ════════════════════════ C1 Dashboard ════════════════════════
const REV30 = (() => {
  const base = [620,540,710,680,540,900,1180,760,690,820,760,640,910,1240,1080,720,680,840,790,610,950,1280,1120,780,700,860,930,720,1010,1340];
  return base.map((v, i) => ({ v, l: i % 5 === 0 ? `${i + 1}` : '', hl: i === base.length - 1 }));
})();
const NEXT3H = [
  { t: '14:00', client: 'João da Silva', initials: 'JS', color: '#1a365d', barber: 'Jajá', service: 'Corte clássico', status: 'confirmado' },
  { t: '14:30', client: 'Pedro Alves', initials: 'PA', color: '#bf212f', barber: 'Renan', service: 'Barba terapia', status: 'confirmado' },
  { t: '15:00', client: 'Maria Lopes', initials: 'ML', color: '#7a5a2f', barber: 'Jajá', service: 'Corte + Sobrancelha', status: 'pendente' },
  { t: '16:00', client: 'Caio Souza', initials: 'CS', color: '#2a5a8f', barber: 'Renan', service: 'Corte + Barba', status: 'confirmado' },
];

function AdminDashboard({ nav }) {
  return (
    <AdminShell active="dashboard" nav={nav} title="DASHBOARD" subtitle="Quarta, 5 de junho · visão geral do dia"
      actions={<><A_Btn kind="ghost" sm><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>Atualizar</A_Btn><A_Btn kind="primary" sm>Relatório do dia</A_Btn></>}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <A_Kpi label="Receita do dia" value={A_brl(1340)} delta="12%" up accent="#1a365d" icon={<><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>} />
        <A_Kpi label="Bookings da semana" value="86" delta="8%" up accent="#bf212f" icon={<><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></>} />
        <A_Kpi label="Ocupação média" value="74%" delta="5%" up accent="#0c6e4e" icon={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />
        <A_Kpi label="Taxa de no-show" value="3,1%" delta="0,4%" up={false} accent="#b97e0a" icon={<><path d="M18.4 5.6 5.6 18.4M5.6 5.6l12.8 12.8" /><circle cx="12" cy="12" r="9.5" /></>} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* revenue chart */}
        <A_Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <A_SectionTitle>Receita — últimos 30 dias</A_SectionTitle>
              <div style={{ fontFamily: 'var(--display)', fontSize: 34, color: 'var(--ink)', lineHeight: 0.9 }}>{A_brl(25840)}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>+18% vs. mês anterior · pico ontem</div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--navy)' }} />Diária</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--dourado)' }} />Hoje</span>
            </div>
          </div>
          <A_Bars data={REV30} h={170} />
        </A_Card>

        {/* next bookings */}
        <A_Card>
          <A_SectionTitle action="Ver agenda" onAction={() => nav && nav('agenda')}>Próximos · 3h</A_SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {NEXT3H.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i === NEXT3H.length - 1 ? 'none' : '1px solid var(--hairline)' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 19, color: 'var(--navy-ink)', width: 46, flex: '0 0 auto' }}>{b.t}</div>
                <A_Avatar initials={b.initials} color={b.color} s={32} fs={13} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.client}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--muted)' }}>{b.service} · {b.barber}</div>
                </div>
                <A_Pill status={b.status} />
              </div>
            ))}
          </div>
        </A_Card>
      </div>
    </AdminShell>
  );
}

// ════════════════════════ C2 Barbeiros + C3 Convite ════════════════════════
const TEAM = [
  { id: 1, name: 'Jajá', initials: 'JJ', color: '#1a365d', role: 'Admin barbeiro', email: 'jaja@navalha.com', cuts: 1240, rating: 4.8, status: 'ativo' },
  { id: 2, name: 'Renan Costa', initials: 'RC', color: '#bf212f', role: 'Barbeiro', email: 'renan@navalha.com', cuts: 870, rating: 4.7, status: 'ativo' },
  { id: 3, name: 'Téo Martins', initials: 'TM', color: '#2a5a8f', role: 'Barbeiro', email: 'teo@navalha.com', cuts: 540, rating: 4.9, status: 'ativo' },
  { id: 4, name: 'Vini Rocha', initials: 'VR', color: '#7a5a2f', role: 'Barbeiro', email: 'vini@navalha.com', cuts: 0, rating: 0, status: 'pendente_convite' },
];

function InviteModal({ onClose, onCreate }) {
  const [step, setStep] = as1State('form');
  const [name, setName] = as1State('');
  const [email, setEmail] = as1State('');
  const [role, setRole] = as1State('barber');
  const [copied, setCopied] = as1State(false);
  const link = 'navalha.app/convite/8f3a-92kd-bz';
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(28,25,23,.42)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'afade .18s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: 'var(--card)', borderRadius: 18, boxShadow: '0 30px 70px rgba(28,25,23,.34)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 24, letterSpacing: 0.5, color: 'var(--ink)' }}>{step === 'form' ? 'CONVIDAR BARBEIRO' : 'CONVITE CRIADO'}</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1.4px solid var(--hairline)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {step === 'form' ? (
          <div style={{ padding: 24 }}>
            {[['Nome completo', name, setName, 'Ex.: Carlos Mendes', 'text'], ['Email', email, setEmail, 'carlos@email.com', 'email']].map(([lbl, val, set, ph, tp]) => (
              <div key={lbl} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>{lbl}</label>
                <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} type={tp} style={{ width: '100%', height: 46, borderRadius: 11, border: '1.5px solid var(--hairline-strong)', background: 'var(--bg)', padding: '0 13px', fontFamily: 'var(--ui)', fontSize: 14.5, color: 'var(--ink)', outline: 'none' }} />
              </div>
            ))}
            <label style={{ display: 'block', fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Função</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {[['barber', 'Barbeiro', 'Vê só a própria agenda'], ['admin_barber', 'Admin barbeiro', 'Gerencia a barbearia']].map(([v, t, d]) => {
                const on = role === v;
                return (
                  <button key={v} onClick={() => setRole(v)} style={{ flex: 1, textAlign: 'left', padding: '12px 13px', borderRadius: 12, cursor: 'pointer', background: on ? 'color-mix(in srgb, var(--navy) 8%, transparent)' : 'var(--bg)', border: '1.6px solid ' + (on ? 'var(--navy)' : 'var(--hairline-strong)') }}>
                    <div style={{ fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{t}</div>
                    <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{d}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <A_Btn kind="ghost" onClick={onClose}>Cancelar</A_Btn>
              <div style={{ flex: 1 }} />
              <A_Btn kind="primary" onClick={() => setStep('done')}>Gerar convite</A_Btn>
            </div>
          </div>
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
              <span style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0c6e4e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              </span>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', maxWidth: 320 }}>Mande o link abaixo pra <b style={{ color: 'var(--ink)' }}>{name || 'o barbeiro'}</b>. Ele aparece como <b style={{ color: 'var(--ink)' }}>convite pendente</b> até aceitar.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'var(--bg)', border: '1.4px dashed var(--hairline-strong)', marginBottom: 16 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
              <span style={{ flex: 1, fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
              <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ flex: '0 0 auto', fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: copied ? '#0c6e4e' : 'var(--navy-ink)', background: 'none', border: 'none', cursor: 'pointer' }}>{copied ? 'Copiado!' : 'Copiar'}</button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <A_Btn kind="ghost" onClick={() => { onCreate && onCreate({ name, email, role }); onClose(); }}>Concluir</A_Btn>
              <div style={{ flex: 1 }} />
              <A_Btn kind="primary"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M4 7l8 6 8-6" /></svg>Enviar por email</A_Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminTeam({ nav }) {
  const [team, setTeam] = as1State(TEAM);
  const [modal, setModal] = as1State(false);
  const [toast, setToast] = as1State(null);
  const fire = (m) => { setToast(m); clearTimeout(window.__at); window.__at = setTimeout(() => setToast(null), 2400); };
  return (
    <AdminShell active="barbeiros" nav={nav} title="BARBEIROS" subtitle={`${team.length} profissionais na equipe`}
      actions={<A_Btn kind="primary" sm onClick={() => setModal(true)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Convidar barbeiro</A_Btn>}>
      <A_Card pad={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
              {['Barbeiro', 'Função', 'Cortes', 'Rating', 'Status', ''].map((h, i) => (
                <th key={i} style={{ textAlign: i > 1 && i < 4 ? 'right' : 'left', padding: '14px 18px', fontFamily: 'var(--ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.map((b, i) => (
              <tr key={b.id} style={{ borderBottom: i === team.length - 1 ? 'none' : '1px solid var(--hairline)' }}>
                <td style={{ padding: '13px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <A_Avatar initials={b.initials} color={b.color} s={38} fs={15} />
                    <div>
                      <div style={{ fontFamily: 'var(--ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{b.name}</div>
                      <div style={{ fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)' }}>{b.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '13px 18px', fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--ink)' }}>{b.role}</td>
                <td style={{ padding: '13px 18px', textAlign: 'right', fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{b.cuts ? b.cuts.toLocaleString('pt-BR') : '—'}</td>
                <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                  {b.rating ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ui)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="#c5a059" stroke="none"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 21l1.4-6.8L2.2 9.6l6.9-.7z" /></svg>{b.rating.toFixed(1).replace('.', ',')}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '13px 18px' }}><A_Pill status={b.status} /></td>
                <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                  <button onClick={() => fire(`Agenda de ${b.name} — em breve`)} style={{ fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--navy-ink)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Ver agenda</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </A_Card>
      {modal && <InviteModal onClose={() => setModal(false)} onCreate={(d) => { setTeam((t) => [...t, { id: Date.now(), name: d.name || 'Novo barbeiro', initials: (d.name || 'NB').slice(0, 2).toUpperCase(), color: '#7a5a2f', role: d.role === 'admin_barber' ? 'Admin barbeiro' : 'Barbeiro', email: d.email, cuts: 0, rating: 0, status: 'pendente_convite' }]); fire('Convite gerado ✓'); }} />}
      <A_Toast msg={toast} />
    </AdminShell>
  );
}

// ════════════════════════ C5 Agenda ════════════════════════
const AG_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const AG_DAYS = ['Seg 02', 'Ter 03', 'Qua 04', 'Qui 05', 'Sex 06', 'Sáb 07'];
const AG_EVENTS = [
  { d: 0, h: 0, span: 1, client: 'Lucas T.', service: 'Corte', barber: 'Jajá', status: 'concluido' },
  { d: 0, h: 3, span: 2, client: 'André M.', service: 'Corte + Barba', barber: 'Renan', status: 'concluido' },
  { d: 1, h: 1, span: 1, client: 'Bruno R.', service: 'Barba', barber: 'Téo', status: 'confirmado' },
  { d: 2, h: 2, span: 1, client: 'Caio S.', service: 'Corte', barber: 'Jajá', status: 'cancelado' },
  { d: 3, h: 5, span: 1, client: 'João S.', service: 'Corte clássico', barber: 'Jajá', status: 'confirmado' },
  { d: 3, h: 6, span: 1, client: 'Maria L.', service: 'Sobrancelha', barber: 'Renan', status: 'pendente' },
  { d: 4, h: 4, span: 2, client: 'Téo P.', service: 'Platinado', barber: 'Téo', status: 'confirmado' },
  { d: 5, h: 0, span: 1, client: 'Rafa D.', service: 'Corte', barber: 'Jajá', status: 'confirmado' },
  { d: 5, h: 2, span: 1, client: 'Igor N.', service: 'Corte + Barba', barber: 'Renan', status: 'pendente' },
];
const AG_FILTERS = [['todos', 'Todos'], ['pendente', 'Pendentes'], ['confirmado', 'Confirmados'], ['concluido', 'Concluídos'], ['cancelado', 'Cancelados']];

function AdminAgenda({ nav }) {
  const [filter, setFilter] = as1State('todos');
  const [sel, setSel] = as1State(null);
  const evColor = (s) => ({ pendente: '#d9a441', confirmado: '#1a365d', concluido: '#10b981', cancelado: '#94a3b8' }[s]);
  return (
    <AdminShell active="agenda" nav={nav} title="AGENDA" subtitle="Semana de 2 – 7 de junho" scroll={false}
      actions={<><A_Btn kind="ghost" sm>‹ Semana anterior</A_Btn><A_Btn kind="ghost" sm>Próxima ›</A_Btn></>}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderBottom: '1px solid var(--hairline)', flex: '0 0 auto' }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginRight: 4 }}>Status:</span>
          {AG_FILTERS.map(([v, l]) => {
            const on = filter === v;
            return <button key={v} onClick={() => setFilter(v)} style={{ height: 32, padding: '0 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: on ? 700 : 500, border: '1.4px solid ' + (on ? 'var(--navy)' : 'var(--hairline-strong)'), background: on ? 'var(--navy)' : 'transparent', color: on ? '#fff' : 'var(--ink)' }}>{l}</button>;
          })}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 13, fontFamily: 'var(--ui)', fontSize: 11.5, color: 'var(--muted)' }}>
            {[['Pendente', '#d9a441'], ['Confirmado', '#1a365d'], ['Concluído', '#10b981'], ['Cancelado', '#94a3b8']].map(([l, c]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />{l}</span>
            ))}
          </div>
        </div>

        {/* calendar grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(6, 1fr)', minWidth: 760 }}>
            {/* header row */}
            <div />
            {AG_DAYS.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '6px 0 12px', fontFamily: 'var(--ui)', fontSize: 12.5, fontWeight: 700, color: i === 3 ? 'var(--navy-ink)' : 'var(--ink)' }}>
                {d}{i === 3 && <div style={{ fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--vermelho-ink)', marginTop: 2 }}>hoje</div>}
              </div>
            ))}
            {/* hour rows */}
            {AG_HOURS.map((h, hi) => (
              <React.Fragment key={hi}>
                <div style={{ height: 54, paddingRight: 8, textAlign: 'right', fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)', transform: 'translateY(-6px)', fontVariantNumeric: 'tabular-nums' }}>{h}</div>
                {AG_DAYS.map((_, di) => {
                  const ev = AG_EVENTS.find((e) => e.d === di && e.h === hi);
                  const dim = ev && filter !== 'todos' && ev.status !== filter;
                  return (
                    <div key={di} style={{ height: 54, borderTop: '1px solid var(--hairline)', borderLeft: di === 0 ? '1px solid var(--hairline)' : 'none', borderRight: '1px solid var(--hairline)', padding: 3, position: 'relative' }}>
                      {ev && (
                        <button onClick={() => setSel(ev)} style={{ position: 'absolute', inset: 3, height: ev.span * 54 - 6, borderRadius: 8, cursor: 'pointer', textAlign: 'left', padding: '6px 8px', overflow: 'hidden', border: 'none', zIndex: 2,
                          background: `color-mix(in srgb, ${evColor(ev.status)} 14%, var(--card))`, borderLeft: `3px solid ${evColor(ev.status)}`, opacity: dim ? 0.28 : 1 }}>
                          <div style={{ fontFamily: 'var(--ui)', fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.client}</div>
                          <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.service}</div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* event detail popover */}
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(28,25,23,.34)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'afade .16s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 360, background: 'var(--card)', borderRadius: 16, boxShadow: '0 24px 60px rgba(28,25,23,.32)', overflow: 'hidden' }}>
            <div style={{ height: 6, background: evColor(sel.status) }} />
            <div style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <A_Pill status={sel.status} />
                <button onClick={() => setSel(null)} style={{ width: 30, height: 30, borderRadius: 8, border: '1.4px solid var(--hairline)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
              </div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 0.4, color: 'var(--ink)' }}>{sel.service}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{AG_DAYS[sel.d]} · {AG_HOURS[sel.h]}</div>
              {[['Cliente', sel.client], ['Barbeiro', sel.barber]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid var(--hairline)' }}>
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 12.5, color: 'var(--muted)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

Object.assign(window, { AdminDashboard, AdminTeam, AdminAgenda });
