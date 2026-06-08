// landing-data.js — populates D1 landing: features, testimonials, plans, FAQ, mockups, interactivity.
(function () {
  // ── FEATURES ──
  const FEATURES = [
    { ic: 'cal', tint: 'rgba(26,54,93,.1)', col: '#1a365d', h: 'Agenda online 24h', p: 'Seus clientes marcam sozinhos, a qualquer hora. A cadeira nunca mais fica vazia por falta de aviso.' },
    { ic: 'pix', tint: 'rgba(31,138,107,.12)', col: '#1f8a5b', h: 'Pix sem taxa', p: 'Receba na hora, com confirmação automática. Zero comissão sobre o Pix — o dinheiro é todo seu.' },
    { ic: 'bell', tint: 'rgba(191,33,47,.1)', col: '#bf212f', h: 'Lembretes anti no-show', p: 'WhatsApp e push automáticos antes do horário. Menos furo, mais cadeira girando.' },
    { ic: 'team', tint: 'rgba(197,160,89,.16)', col: '#9b7a3a', h: 'Gestão da equipe', p: 'Cada barbeiro com sua agenda, seus serviços e seu repasse. Você vê tudo num lugar só.' },
    { ic: 'chart', tint: 'rgba(26,54,93,.1)', col: '#1a365d', h: 'Relatórios de verdade', p: 'Receita, comissão, ocupação e ranking de serviços. Decida com número, não com achismo.' },
    { ic: 'tag', tint: 'rgba(191,33,47,.1)', col: '#bf212f', h: 'Promoções num clique', p: 'Crie combos e descontos que aparecem na home do cliente. Encha os dias parados.' },
  ];
  const FIC = {
    cal: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
    pix: '<path d="M12 3.2l3.5 3.5a3 3 0 0 0 4.2 0M12 20.8l3.5-3.5a3 3 0 0 1 4.2 0M12 3.2L8.5 6.7a3 3 0 0 1-4.2 0M12 20.8l-3.5-3.5a3 3 0 0 0-4.2 0"/><rect x="9" y="9" width="6" height="6" rx="1.4" transform="rotate(45 12 12)"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c.8-3.4 3-5.2 5.5-5.2s4.7 1.8 5.5 5.2"/><path d="M17 9.5a2.6 2.6 0 1 0-1.6-4.7"/><path d="M16.5 14.6c2 .3 3.4 1.9 4 5.4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.9a2 2 0 0 1 1.4.6l7.5 7.5a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  };
  document.getElementById('feat-grid').innerHTML = FEATURES.map((f) => `
    <div class="feat">
      <div class="fic" style="background:${f.tint}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${f.col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${FIC[f.ic]}</svg></div>
      <h3>${f.h}</h3><p>${f.p}</p>
    </div>`).join('');

  // ── TESTIMONIALS ──
  const QUOTES = [
    { q: 'Cortei o no-show pela metade no primeiro mês. Os caras recebem o lembrete e aparecem. Mudou meu faturamento.', n: 'Jajá Moreira', r: 'Barbearia do Jajá · SP', i: 'JM', c: '#1a365d' },
    { q: 'Larguei o caderninho e a planilha. Hoje sei exatamente quanto cada barbeiro fez e quanto entra no Pix.', n: 'Renan Costa', r: 'Old School Barber · RJ', i: 'RC', c: '#bf212f' },
    { q: 'Montei a barbearia no sistema em 10 minutos. O cliente agenda sozinho e eu só apareço pra cortar.', n: 'Téo Martins', r: 'Studio Lâmina · MG', i: 'TM', c: '#2a5a8f' },
  ];
  const star = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#c5a059" stroke="none"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 21l1.4-6.8L2.2 9.6l6.9-.7z"/></svg>';
  document.getElementById('quote-grid').innerHTML = QUOTES.map((t) => `
    <div class="quote">
      <div class="stars">${star.repeat(5)}</div>
      <p>“${t.q}”</p>
      <div class="who"><span class="av" style="background:${t.c}">${t.i}</span><div><b>${t.n}</b><span>${t.r}</span></div></div>
    </div>`).join('');

  // ── PLANS ──
  const PLANS = [
    { name: 'Free', desc: 'Pra começar e testar a água.', m: 0, a: 0, pop: false, cta: 'Começar grátis', ctaCls: 'btn-ghost', feats: [['1 barbeiro', 1], ['Até 50 agendamentos/mês', 1], ['Pagamento no Pix', 1], ['App do cliente', 1], ['Relatórios avançados', 0], ['Promoções', 0]] },
    { name: 'Basic', desc: 'Pra barbearia de bairro afiada.', m: 49, a: 39, pop: true, cta: 'Assinar Basic', ctaCls: 'btn-navy', feats: [['Até 4 barbeiros', 1], ['Agendamentos ilimitados', 1], ['Pix + cartão', 1], ['Lembretes WhatsApp', 1], ['Relatórios financeiros', 1], ['Promoções', 0]] },
    { name: 'Pro', desc: 'Pra rede que quer escalar.', m: 99, a: 79, pop: false, cta: 'Assinar Pro', ctaCls: 'btn-gold', feats: [['Barbeiros ilimitados', 1], ['Tudo do Basic', 1], ['Múltiplas unidades', 1], ['Promoções ilimitadas', 1], ['Relatórios + exportação', 1], ['Suporte prioritário', 1]] },
  ];
  const ckOn = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8a5b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
  const ckOff = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b3a896" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  let cycle = 'mensal';
  function renderPlans() {
    document.getElementById('plan-grid').innerHTML = PLANS.map((p) => {
      const price = cycle === 'mensal' ? p.m : p.a;
      return `<div class="plan${p.pop ? ' pop' : ''}">
        ${p.pop ? '<span class="tag">Mais popular</span>' : ''}
        <h3>${p.name}</h3>
        <div class="pdesc">${p.desc}</div>
        <div class="price">${price === 0 ? '<span class="amt">Grátis</span>' : `<span class="amt">R$${price}</span><span class="per">/mês${cycle === 'anual' ? ' · cobr. anual' : ''}</span>`}</div>
        <ul class="feats">${p.feats.map(([f, on]) => `<li class="${on ? '' : 'off'}">${on ? ckOn : ckOff}${f}</li>`).join('')}</ul>
        <a class="btn ${p.ctaCls}" href="D3 Signup.html" style="justify-content:center">${p.cta}</a>
      </div>`;
    }).join('');
  }
  window.setCycle = function (c) {
    cycle = c;
    document.getElementById('t-mensal').classList.toggle('on', c === 'mensal');
    document.getElementById('t-anual').classList.toggle('on', c === 'anual');
    renderPlans();
  };
  renderPlans();

  // ── FAQ ──
  const FAQ = [
    ['Preciso de cartão pra testar?', 'Não. O teste de 14 dias é liberado na hora, sem cartão. Você só cadastra forma de pagamento se decidir continuar.'],
    ['Vocês cobram taxa sobre o Pix?', 'Zero. O Pix cai direto na conta da barbearia, sem comissão da NAVALHA. Só pagamentos no cartão têm a taxa da maquininha.'],
    ['Funciona pra mais de uma unidade?', 'Sim. No plano Pro você gerencia várias unidades, cada uma com sua equipe, agenda e relatórios, tudo no mesmo painel.'],
    ['Meus clientes precisam baixar o app?', 'Eles podem usar o app ou agendar pelo link da sua barbearia no navegador. Você escolhe como divulgar.'],
    ['Consigo migrar minha agenda atual?', 'Sim. A gente importa seus clientes e horários, e o time de suporte ajuda na configuração inicial sem custo.'],
    ['Posso cancelar quando quiser?', 'Quando quiser, sem multa nem fidelidade. Se cancelar, seus dados ficam disponíveis pra exportar por 90 dias.'],
  ];
  document.getElementById('faq-list').innerHTML = FAQ.map(([q, a]) => `
    <div class="qa">
      <button onclick="this.parentElement.classList.toggle('open')">${q}
        <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="ans"><p>${a}</p></div>
    </div>`).join('');

  // ── MOCKUPS (schematic, on-brand) ──
  // client home mock
  document.getElementById('mock-home').innerHTML = `
    <div style="height:100%;display:flex;flex-direction:column;font-family:var(--ui)">
      <div style="padding:26px 16px 12px;display:flex;align-items:center;gap:9px">
        <div style="width:30px;height:30px;border-radius:50%;background:#1a365d"></div>
        <div style="flex:1"><div style="height:7px;width:54px;background:#e6dcc8;border-radius:4px"></div><div style="height:9px;width:78px;background:#d8cdb6;border-radius:4px;margin-top:5px"></div></div>
        <div style="width:30px;height:30px;border-radius:9px;background:#f3ebda"></div>
      </div>
      <div style="margin:6px 16px;height:42px;border-radius:12px;background:#f3ebda"></div>
      <div style="margin:10px 16px 6px;height:108px;border-radius:14px;background:linear-gradient(135deg,#1a365d,#12243d);position:relative;overflow:hidden">
        <div style="position:absolute;inset:0;opacity:.12;background:repeating-linear-gradient(-45deg,#fff 0 8px,transparent 8px 18px)"></div>
        <div style="position:absolute;left:14px;top:16px;font-family:var(--display);font-size:30px;color:#fff;letter-spacing:.5px">30% OFF</div>
        <div style="position:absolute;left:14px;top:52px;height:8px;width:90px;background:rgba(255,255,255,.5);border-radius:4px"></div>
        <div style="position:absolute;left:14px;bottom:14px;height:7px;width:64px;background:#c5a059;border-radius:4px"></div>
      </div>
      <div style="margin:14px 16px 6px;height:8px;width:90px;background:#d8cdb6;border-radius:4px"></div>
      ${[0,1,2].map((i)=>`<div style="margin:8px 16px;display:flex;align-items:center;gap:10px"><div style="width:42px;height:42px;border-radius:50%;background:${['#bf212f','#2a5a8f','#7a5a2f'][i]}"></div><div style="flex:1"><div style="height:8px;width:70%;background:#e0d6c0;border-radius:4px"></div><div style="height:7px;width:45%;background:#ebe2cf;border-radius:4px;margin-top:6px"></div></div><div style="width:18px;height:18px;border-radius:5px;background:#f3ebda"></div></div>`).join('')}
      <div style="margin-top:auto;height:52px;border-top:1px solid #eee4d0;display:flex">${[0,1,2,3,4].map((i)=>`<div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="width:20px;height:20px;border-radius:6px;background:${i===0?'#1a365d':'#e6dcc8'}"></div></div>`).join('')}</div>
    </div>`;
  // admin mock (back phone — show a mini dashboard)
  document.getElementById('mock-admin').innerHTML = `
    <div style="height:100%;background:#faf6ec;display:flex;flex-direction:column;font-family:var(--ui)">
      <div style="padding:26px 14px 10px"><div style="font-family:var(--display);font-size:22px;color:#1c1917;letter-spacing:.5px">PAINEL</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 14px">
        ${[['#1a365d','R$1.3k'],['#bf212f','86'],['#1f8a5b','74%'],['#9b7a3a','3%']].map(([c,v])=>`<div style="background:#fffefb;border:1px solid #eee4d0;border-radius:11px;padding:10px"><div style="width:22px;height:22px;border-radius:7px;background:${c}1f;margin-bottom:8px"></div><div style="font-family:var(--display);font-size:22px;color:#1c1917">${v}</div></div>`).join('')}
      </div>
      <div style="margin:10px 14px;background:#fffefb;border:1px solid #eee4d0;border-radius:11px;padding:12px;flex:1">
        <div style="height:7px;width:80px;background:#d8cdb6;border-radius:4px;margin-bottom:12px"></div>
        <div style="display:flex;align-items:flex-end;gap:4px;height:78px">${[40,55,48,70,62,52,80,68,58,74,90,66].map((h,i)=>`<div style="flex:1;border-radius:3px;height:${h}%;background:${i===10?'#c5a059':'#1a365d'};opacity:${i===10?1:.82}"></div>`).join('')}</div>
      </div>
    </div>`;
  // showcase admin mock (browser-ish dashboard)
  document.getElementById('mock-showcase').innerHTML = `
    <div style="background:#faf6ec;aspect-ratio:4/3;display:flex;font-family:var(--ui)">
      <div style="width:64px;background:#1a365d;padding:14px 8px;display:flex;flex-direction:column;gap:8px;flex:0 0 auto">
        <div style="width:30px;height:30px;border-radius:8px;background:rgba(197,160,89,.2);margin-bottom:8px"></div>
        ${[0,1,2,3,4].map((i)=>`<div style="height:30px;border-radius:8px;background:${i===0?'rgba(197,160,89,.18)':'transparent'};display:flex;align-items:center;padding-left:8px"><div style="width:16px;height:16px;border-radius:5px;background:${i===0?'#c5a059':'rgba(255,255,255,.3)'}"></div></div>`).join('')}
      </div>
      <div style="flex:1;padding:16px">
        <div style="font-family:var(--display);font-size:20px;color:#1c1917;margin-bottom:12px">DASHBOARD</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
          ${[['#1a365d','R$1.3k'],['#bf212f','86'],['#1f8a5b','74%'],['#9b7a3a','3,1%']].map(([c,v])=>`<div style="background:#fffefb;border:1px solid #eee4d0;border-radius:10px;padding:9px"><div style="width:18px;height:18px;border-radius:6px;background:${c}1f;margin-bottom:6px"></div><div style="font-family:var(--display);font-size:18px;color:#1c1917">${v}</div></div>`).join('')}
        </div>
        <div style="background:#fffefb;border:1px solid #eee4d0;border-radius:10px;padding:12px">
          <div style="height:7px;width:90px;background:#d8cdb6;border-radius:4px;margin-bottom:12px"></div>
          <div style="display:flex;align-items:flex-end;gap:4px;height:84px">${[40,55,48,70,62,52,80,68,58,74,66,90,72,60,84].map((h,i)=>`<div style="flex:1;border-radius:3px;height:${h}%;background:${i===11?'#c5a059':'#1a365d'};opacity:${i===11?1:.8}"></div>`).join('')}</div>
        </div>
      </div>
    </div>`;
})();
