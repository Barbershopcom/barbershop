/* ds-styles.css — NAVALHA Design System component styles */
:root {
  --navy: #1a365d; --vermelho: #bf212f; --dourado: #c5a059; --papel: #fffcf5; --tinta: #1c1917;
  --ui: 'Inter', system-ui, sans-serif; --display: 'Bebas Neue', 'Inter', sans-serif; --serif: 'Lora', Georgia, serif;
  --bg: #faf6ec; --card: #fffefb; --tint: #f3ebda; --ink: #1c1917; --muted: #74695b;
  --navy-ink: #1a365d; --vermelho-ink: #a31b28; --dourado-ink: #9b7a3a; --green: #1f8a5b;
  --line: rgba(28,25,23,.1); --line2: rgba(28,25,23,.2);
  /* status */
  --st-pendente: #F59E0B; --st-confirmado: #1a365d; --st-concluido: #10B981; --st-cancelado: #94A3B8; --st-expirado: #bf212f; --st-noshow: #D97706;
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 22px;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; font-family: var(--ui); color: var(--ink); background: var(--bg); -webkit-font-smoothing: antialiased; }
::selection { background: var(--dourado); color: #1c1917; }

/* layout */
.ds { display: grid; grid-template-columns: 240px 1fr; max-width: 1280px; margin: 0 auto; }
.ds-nav { position: sticky; top: 0; align-self: start; height: 100vh; overflow: auto; padding: 30px 22px; border-right: 1px solid var(--line); }
.ds-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
.ds-brand .seal { width: 38px; height: 38px; border-radius: 50%; background: var(--navy); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.ds-brand .seal .pole { width: 11px; height: 22px; border-radius: 999px; border: 1.4px solid var(--dourado); overflow: hidden; background: repeating-linear-gradient(-45deg, var(--vermelho) 0 5px, var(--papel) 5px 10px, #2a5a8f 10px 15px, var(--papel) 15px 20px); }
.ds-brand b { font-family: var(--display); font-size: 24px; letter-spacing: 1.2px; line-height: 1; }
.ds-brand span { display: block; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--dourado-ink); }
.ds-nav a { display: block; font-size: 13.5px; font-weight: 500; color: var(--muted); padding: 8px 10px; border-radius: 8px; }
.ds-nav a:hover { background: var(--tint); color: var(--ink); }
.ds-nav .grp { font-size: 10.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin: 18px 10px 6px; }

.ds-main { padding: 44px 48px 100px; min-width: 0; }
.ds-hero { margin-bottom: 18px; }
.ds-hero h1 { font-family: var(--display); font-size: 60px; letter-spacing: 1px; margin: 0; line-height: .95; }
.ds-hero p { font-family: var(--serif); font-style: italic; font-size: 17px; color: var(--muted); margin: 10px 0 0; max-width: 560px; }
.ds-stripe { height: 7px; border-radius: 999px; margin: 24px 0 8px; background: repeating-linear-gradient(-45deg, var(--vermelho) 0 13px, var(--papel) 13px 26px, var(--navy) 26px 39px, var(--papel) 39px 52px); }

section.sec { padding: 44px 0 8px; border-top: 1px solid var(--line); margin-top: 36px; }
section.sec:first-of-type { border-top: none; margin-top: 18px; }
.sec-h { display: flex; align-items: baseline; gap: 12px; margin-bottom: 4px; }
.sec-h h2 { font-family: var(--display); font-size: 34px; letter-spacing: .5px; margin: 0; }
.sec-h .tag { font-family: var(--ui); font-size: 11px; font-weight: 700; color: var(--muted); }
.sec-desc { font-size: 14.5px; color: var(--muted); margin: 0 0 24px; max-width: 620px; line-height: 1.55; }

.subh { font-family: var(--ui); font-size: 11.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin: 26px 0 14px; }
.demo { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 26px; }
.row { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.lbl { font-family: var(--ui); font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 9px; display: block; }

/* ── COLORS ── */
.swatches { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; }
.sw { border-radius: var(--r-md); overflow: hidden; border: 1px solid var(--line); background: var(--card); }
.sw .chip { height: 76px; }
.sw .meta { padding: 11px 13px; }
.sw .meta b { font-family: var(--ui); font-size: 13px; font-weight: 700; display: block; }
.sw .meta span { font-family: var(--ui); font-size: 11.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.status-row { display: flex; flex-wrap: wrap; gap: 10px; }

/* ── TYPE ── */
.type-spec { display: flex; align-items: baseline; gap: 18px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.type-spec:last-child { border-bottom: none; }
.type-spec .tname { width: 130px; flex: 0 0 auto; font-family: var(--ui); font-size: 12px; font-weight: 700; color: var(--muted); }
.type-spec .tsample { flex: 1; min-width: 0; }
.type-spec .tmeta { font-family: var(--ui); font-size: 11.5px; color: var(--muted); white-space: nowrap; }

/* ── BUTTON ── */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 22px; border-radius: var(--r-md); font-family: var(--ui); font-size: 14.5px; font-weight: 700; cursor: pointer; border: 1.6px solid transparent; white-space: nowrap; transition: transform .12s, box-shadow .12s, opacity .12s; }
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn-primary { background: var(--navy); color: #fff; box-shadow: 0 8px 20px rgba(26,54,93,.22); }
.btn-secondary { background: transparent; color: var(--navy-ink); border-color: var(--navy); }
.btn-destructive { background: var(--vermelho); color: #fff; box-shadow: 0 8px 20px rgba(191,33,47,.24); }
.btn-ghost { background: transparent; color: var(--ink); }
.btn-ghost:hover { background: var(--tint); }
.btn-gold { background: var(--dourado); color: #1c1917; }
.btn[disabled] { opacity: .45; cursor: not-allowed; transform: none; }
.btn.sm { height: 40px; padding: 0 16px; font-size: 13.5px; border-radius: 10px; }
.btn.lg { height: 56px; padding: 0 30px; font-size: 16px; }
.spin { width: 17px; height: 17px; border-radius: 50%; border: 2.4px solid rgba(255,255,255,.4); border-top-color: #fff; animation: dsspin .7s linear infinite; }
@keyframes dsspin { to { transform: rotate(360deg); } }

/* ── INPUT ── */
.field { max-width: 340px; }
.field label { display: block; font-family: var(--ui); font-size: 11px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; color: var(--muted); margin-bottom: 7px; }
.input { display: flex; align-items: center; height: 50px; border-radius: var(--r-md); background: var(--card); border: 1.6px solid var(--line2); padding: 0 13px; gap: 8px; }
.input.focus { border-color: var(--navy); box-shadow: 0 0 0 3px rgba(26,54,93,.1); }
.input.error { border-color: var(--vermelho); }
.input input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: var(--ui); font-size: 14.5px; color: var(--ink); }
.input svg { color: var(--muted); flex: 0 0 auto; }
.field .err { font-family: var(--ui); font-size: 12px; color: var(--vermelho-ink); margin-top: 6px; display: flex; align-items: center; gap: 5px; }
.field .hint { font-family: var(--serif); font-style: italic; font-size: 12px; color: var(--muted); margin-top: 6px; }

/* ── BADGE ── */
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-family: var(--ui); font-size: 11.5px; font-weight: 700; letter-spacing: .3px; }
.badge .dot { width: 6px; height: 6px; border-radius: 50%; }

/* ── generic mobile card demos ── */
.mcard { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: 0 4px 14px rgba(28,25,23,.05); overflow: hidden; }
.mono { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--display); color: #fff; flex: 0 0 auto; }
.tabbar { display: flex; background: var(--card); border-top: 1px solid var(--line); border-radius: 0 0 var(--r-lg) var(--r-lg); padding: 8px 0 10px; }
.tabbar .tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.tabbar .tab span { font-family: var(--ui); font-size: 9.5px; font-weight: 600; }
.appbar { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--card); border-bottom: 1px solid var(--line); border-radius: var(--r-lg) var(--r-lg) 0 0; }
.iconbtn { width: 38px; height: 38px; border-radius: 11px; border: 1.4px solid var(--line); background: var(--card); display: flex; align-items: center; justify-content: center; cursor: pointer; flex: 0 0 auto; }

/* skeleton */
@keyframes shimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
.skel { border-radius: 7px; background: linear-gradient(90deg, var(--tint) 25%, #ece2cf 50%, var(--tint) 75%); background-size: 600px 100%; animation: shimmer 1.3s infinite linear; }

/* stepper */
.stepper { display: flex; align-items: center; }
.stepper .dot { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--ui); font-size: 13px; font-weight: 800; flex: 0 0 auto; }
.stepper .bar { flex: 1; height: 2.5px; margin: 0 6px; border-radius: 999px; }

/* modal demo */
.modal-demo { position: relative; height: 280px; border-radius: var(--r-lg); overflow: hidden; background: var(--tint); display: flex; align-items: center; justify-content: center; }
.modal-demo .scrim { position: absolute; inset: 0; background: rgba(28,25,23,.34); }
.modal-card { position: relative; width: 300px; background: var(--card); border-radius: var(--r-lg); box-shadow: 0 24px 50px rgba(28,25,23,.3); padding: 22px; }
.sheet-demo { position: relative; height: 280px; border-radius: var(--r-lg); overflow: hidden; background: var(--tint); }
.sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--card); border-radius: 20px 20px 0 0; box-shadow: 0 -16px 40px rgba(28,25,23,.18); padding: 12px 20px 22px; }
.sheet .grab { width: 40px; height: 4px; border-radius: 999px; background: var(--line2); margin: 0 auto 16px; }

@media (max-width: 880px) {
  .ds { grid-template-columns: 1fr; }
  .ds-nav { display: none; }
  .ds-main { padding: 28px 20px 80px; }
  .swatches { grid-template-columns: repeat(2,1fr); }
  .grid2, .grid3 { grid-template-columns: 1fr; }
}
