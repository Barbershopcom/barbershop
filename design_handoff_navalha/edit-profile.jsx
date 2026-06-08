// ds-data.js — renders data-driven bits of the NAVALHA design system page.
(function () {
  // ── brand swatches ──
  const BRAND = [
    { n: 'Navy', h: '#1a365d', d: 'Âncora · primária', light: false },
    { n: 'Vermelho', h: '#bf212f', d: 'Ação · destaque', light: false },
    { n: 'Dourado', h: '#c5a059', d: 'Acento vintage', light: true },
    { n: 'Papel', h: '#fffcf5', d: 'Fundo', light: true },
    { n: 'Tinta', h: '#1c1917', d: 'Texto', light: false },
  ];
  document.getElementById('brand-sw').innerHTML = BRAND.map((c) => `
    <div class="sw">
      <div class="chip" style="background:${c.h}${c.light ? ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)' : ''}"></div>
      <div class="meta"><b>${c.n}</b><span>${c.h.toUpperCase()}</span><div style="font-family:var(--serif);font-style:italic;font-size:11px;color:var(--muted);margin-top:3px">${c.d}</div></div>
    </div>`).join('');

  // ── status colors / badges ──
  const STATUS = [
    { k: 'Pendente', h: '#F59E0B', ink: '#9a6608' },
    { k: 'Confirmado', h: '#1a365d', ink: '#1a365d' },
    { k: 'Concluído', h: '#10B981', ink: '#0c6e4e' },
    { k: 'Cancelado', h: '#94A3B8', ink: '#5b6675' },
    { k: 'Expirado', h: '#bf212f', ink: '#a31b28' },
    { k: 'No-show', h: '#D97706', ink: '#9a560a' },
  ];
  const swHtml = STATUS.map((s) => `
    <div class="sw" style="flex:1;min-width:120px">
      <div class="chip" style="height:54px;background:${s.h}"></div>
      <div class="meta"><b>${s.k}</b><span>${s.h.toUpperCase()}</span></div>
    </div>`).join('');
  document.getElementById('status-sw').innerHTML = `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;width:100%">${swHtml}</div>`;

  document.getElementById('badge-row').innerHTML = STATUS.map((s) => `
    <span class="badge" style="background:color-mix(in srgb, ${s.h} 15%, transparent);color:${s.ink}">
      <span class="dot" style="background:${s.h}"></span>${s.k}
    </span>`).join('');

  // ── tab bars ──
  const ICON = {
    home: '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    cal: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
    wallet: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M16 12h.01M2 10h20"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.4-4 4-6 7-6s5.6 2 7 6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>',
  };
  const tab = (items) => items.map((it, i) => {
    const on = i === 0;
    const c = on ? 'var(--navy-ink)' : 'var(--muted)';
    return `<div class="tab"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${on ? 2.1 : 1.8}" stroke-linecap="round" stroke-linejoin="round">${ICON[it[1]]}</svg><span style="color:${c};font-weight:${on ? 700 : 500}">${it[0]}</span></div>`;
  }).join('');
  document.getElementById('tab-cli').innerHTML = tab([['Início', 'home'], ['Buscar', 'search'], ['Agenda', 'cal'], ['Carteira', 'wallet'], ['Perfil', 'user']]);
  document.getElementById('tab-bar').innerHTML = tab([['Início', 'home'], ['Agenda', 'cal'], ['Ajustes', 'gear'], ['Perfil', 'user']]);

  // ── social buttons ──
  const SOCIAL = [
    { n: 'Google', bg: '#fff', bd: 'var(--line2)', ink: 'var(--ink)', svg: '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.8 3.2-7.8z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.2 1-3.6 1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.5 0 2.9.5 4 1.5l3-3A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.6 3.2-4.6 6-4.6z"/></svg>' },
    { n: 'Apple', bg: '#1c1917', bd: '#1c1917', ink: '#fff', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17 12.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7 2-1.1 2.7-2.1c.9-1.3 1.2-2.5 1.2-2.6 0 0-2.3-.9-2.3-3.5zM14.7 5.6c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.3-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.1z"/></svg>' },
    { n: 'Facebook', bg: '#1877F2', bd: '#1877F2', ink: '#fff', svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>' },
  ];
  document.getElementById('social-row').innerHTML = SOCIAL.map((s) => `
    <button class="btn" style="background:${s.bg};color:${s.ink};border:1.6px solid ${s.bd}">${s.svg}Entrar com ${s.n}</button>`).join('');

  // ── button loading toggle demo ──
  const lb = document.getElementById('loadBtn');
  if (lb) lb.addEventListener('click', () => {
    lb.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>Pronto!';
    setTimeout(() => { lb.innerHTML = '<span class="spin"></span>Processando…'; }, 1400);
  });
})();
