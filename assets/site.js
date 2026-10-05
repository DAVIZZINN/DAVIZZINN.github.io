/* David Dev · portfólio. JavaScript puro, sem dependências. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (e0, e1, p) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  const root = document.documentElement;
  /* ---------- animações: ligadas para todo mundo; quem preferir menos movimento desliga no rodapé ---------- */
  let motionOff = false;
  try { motionOff = localStorage.getItem('dd-motion') === 'off'; } catch (e) { /* sem armazenamento: fica o padrão */ }
  const rmListeners = [];
  const RM = {
    get matches() { return motionOff; },
    addEventListener(type, fn) { rmListeners.push(fn); }
  };
  const motionBtn = $('#motionToggle');
  function syncMotionUI() {
    root.classList.toggle('reduce-motion', motionOff);
    motionBtn.setAttribute('aria-pressed', String(!motionOff));
    motionBtn.textContent = motionOff ? 'Ligar animações' : 'Reduzir animações';
  }
  motionBtn.addEventListener('click', () => {
    motionOff = !motionOff;
    try { localStorage.setItem('dd-motion', motionOff ? 'off' : 'on'); } catch (e) { /* vale só nesta visita */ }
    syncMotionUI();
    rmListeners.forEach(fn => fn({ matches: motionOff }));
  });
  syncMotionUI();

  /* ---------- WhatsApp ---------- */
  const WA = 'https://wa.me/5517996604865';
  const waLink = msg => WA + '?text=' + encodeURIComponent(msg);
  $$('[data-wa]').forEach(a => { a.href = waLink(a.dataset.wa); });

  /* ---------- ponteiro: mouse, caneta e toque ---------- */
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const ptr = { tx: innerWidth / 2, ty: innerHeight * 0.3, x: innerWidth / 2, y: innerHeight * 0.3, cx: 0, cy: 0, tcx: 0, tcy: 0, drag: 0, dragging: false, raf: null, last: 0 };
  const smooth = { on: false };

  /* ---------- hero: as camadas se montam sozinhas, em loop, como um vídeo ---------- */
  const hero = $('.hero');
  const stack = $('#stack');
  const layers = $$('.layer', stack);
  const cue = $('.cue');
  const hudT = $('#hudT');
  const hudTicks = $$('.hud-ticks i');
  // as batidas da história em progresso da cena: guiam os destaques das camadas e o rótulo embaixo
  const BEATS = [[0, 0.17], [0.2, 0.37], [0.4, 0.57], [0.6, 0.77], [0.81, 1]]
    .map(([a, b], i, arr) => ({ a, b, first: i === 0, last: i === arr.length - 1 }));
  const STEP_LABEL = ['As 4 camadas do seu site', 'Camada 01 · código', 'Camadas 02 e 03 · estrutura e design', 'Camada 04 · conteúdo', 'No ar'];

  let W = 0, G = 0, shiftX = 0;
  const STACKED = matchMedia('(orientation: portrait) and (max-width: 1100px), (max-width: 600px)');
  let scrubOn = false, heroOn = true, shown = 0;
  let loopRaf = null, loopClock = 0, loopLast = 0;
  const sc = { stack: '', type: -1, live: -1, n: -1, step: -1, cue: -1, L: layers.map(() => ({ t: '', o: -1, hi: -1, ao: -1 })) };

  // no celular a pilha explodida começa um pouco à direita para os rótulos caberem, e volta ao centro ao assentar
  function measure() { W = stack.offsetWidth; G = W * 0.25; shiftX = STACKED.matches ? W * 0.09 : 0; }

  function bandOpacity(b, p) {
    const f = Math.min(0.02, (b.b - b.a) / 3);
    const inn = b.first ? 1 : sstep(b.a, b.a + f, p);
    const out = b.last ? 1 : 1 - sstep(b.b - f, b.b, p);
    return inn * out;
  }

  function setVar(el, name, val, prev, eps) {
    if (Math.abs(val - prev) > eps || (val !== prev && (val === 0 || val === 1))) {
      el.style.setProperty(name, val.toFixed(3));
      return val;
    }
    return prev;
  }

  function renderScene(p, ops) {
    const land = [1, sstep(0.38, 0.50, p), sstep(0.47, 0.58, p), sstep(0.62, 0.75, p)];
    const r = sstep(0.78, 0.95, p);
    const avg = (land[1] + land[2] + land[3]) / 3;
    const rx = 58 * (1 - r);
    const rz = lerp(-38, -27, clamp(p / 0.78, 0, 1)) * (1 - r);
    const s = lerp(lerp(0.78, 0.88, avg), 1, r);
    const zs = land.map((l, i) => i * G * (1 - l) + i * 1.2);
    const c = zs[3] / 2;

    const t = `translate3d(${(shiftX * (1 - r)).toFixed(2)}px,0,0) rotateX(${(-ptr.cy * 4).toFixed(3)}deg) rotateY(${(ptr.cx * 5).toFixed(3)}deg) scale(${s.toFixed(4)}) rotateX(${rx.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) translateZ(${(-c).toFixed(2)}px)`;
    if (t !== sc.stack) { stack.style.transform = t; sc.stack = t; }

    const [, o2, o3, o4] = ops;
    const endFade = 1 - sstep(0.9, 0.99, p);
    const annoBase = 1 - sstep(0.74, 0.84, p);
    const opa = [
      (1 - 0.3 * o3) * endFade,
      (1 - 0.62 * o2) * endFade,
      (1 - 0.62 * o2) * endFade,
      Math.max(0.35, 1 - 0.62 * o2 - 0.62 * o3)
    ];
    const hi = [o2, o3, o3, o4];
    // só a camada do topo da pilha mantém o rótulo: ele some quando outra camada pousa em cima
    const free = [1 - land[1], 1 - land[2], 1 - land[3], 1 - sstep(0.565, 0.605, p)];

    layers.forEach((el, i) => {
      const L = sc.L[i];
      const lt = `translateZ(${zs[i].toFixed(2)}px)`;
      if (lt !== L.t) { el.style.transform = lt; L.t = lt; }
      const o = opa[i];
      if (Math.abs(o - L.o) > 0.004 || (o !== L.o && (o === 0 || o === 1))) { el.style.opacity = o.toFixed(3); L.o = o; }
      L.hi = setVar(el, '--hi', hi[i], L.hi, 0.01);
      L.ao = setVar(el, '--ao', annoBase * free[i] * (0.7 + 0.3 * hi[i]), L.ao, 0.01);
    });

    sc.type = setVar(stack, '--type', lerp(0.32, 1, sstep(0.18, 0.34, p)), sc.type, 0.004);
    sc.live = setVar(stack, '--live', sstep(0.9, 0.98, p), sc.live, 0.01);

    const n = p < 0.19 ? 0 : 1 + (land[1] > 0.5) + (land[2] > 0.5) + (land[3] > 0.5);
    if (n !== sc.n) { hudTicks.forEach((tk, i) => tk.classList.toggle('on', i < n)); sc.n = n; }
  }

  // o rótulo embaixo da cena conta em qual camada o site está
  function updateStep(ops) {
    let i = 0;
    ops.forEach((o, k) => { if (o > ops[i]) i = k; });
    if (i === sc.step) return;
    sc.step = i;
    hudT.classList.remove('swap');
    void hudT.offsetWidth;
    hudT.textContent = STEP_LABEL[i];
    hudT.classList.add('swap');
  }

  function frame(p) {
    const ops = BEATS.map(b => bandOpacity(b, p));
    renderScene(p, ops);
    updateStep(ops);
  }

  // um ciclo de 14,6 segundos com uma pausa em cada camada, para dar tempo de ler o rótulo:
  // explodido, código, estrutura e design, conteúdo, site no ar, e desmonta para recomeçar
  const LOOP = [[0, 0], [1.6, 0], [2.8, 0.28], [4.2, 0.30], [5.6, 0.5], [6.8, 0.57], [8.2, 0.72], [9.0, 0.75], [10.4, 1], [13.0, 1], [14.6, 0]];
  const CYCLE = 14600;
  const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function loopP(ms) {
    const t = (ms % CYCLE) / 1000;
    for (let i = 1; i < LOOP.length; i++) {
      const [t1, p1] = LOOP[i];
      if (t <= t1) {
        const [t0, p0] = LOOP[i - 1];
        return p0 + (p1 - p0) * easeIO((t - t0) / (t1 - t0));
      }
    }
    return 0;
  }
  function loopTick(now) {
    const dt = Math.min(100, now - (loopLast || now));
    loopLast = now;
    loopClock += dt;
    shown = loopP(loopClock);
    frame(shown);
    loopRaf = requestAnimationFrame(loopTick);
  }
  // o relógio só anda com o topo na tela e a aba aberta, e continua de onde parou
  function loopRun() { if (!loopRaf && scrubOn && heroOn && !document.hidden) { loopLast = 0; loopRaf = requestAnimationFrame(loopTick); } }
  function loopHalt() { if (loopRaf) { cancelAnimationFrame(loopRaf); loopRaf = null; } }

  function resetCaches() {
    sc.stack = ''; sc.type = sc.live = sc.n = sc.step = -1;
    sc.L.forEach(L => { L.t = ''; L.o = L.hi = L.ao = -1; });
  }

  function clearSceneInline() {
    stack.style.transform = '';
    ['--type', '--live'].forEach(v => stack.style.removeProperty(v));
    layers.forEach(el => {
      el.style.transform = '';
      el.style.opacity = '';
      el.style.removeProperty('--hi');
      el.style.removeProperty('--ao');
    });
  }

  function enableScrub() {
    if (scrubOn) return;
    scrubOn = true;
    root.classList.add('scrub');
    measure();
    resetCaches();
    frame(shown);
    loopRun();
  }

  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    loopHalt();
    clearSceneInline();
    root.classList.remove('scrub');
  }

  // movimento reduzido recebe o site pronto, parado; com animações, o loop roda
  function applyHeroMode() {
    if (RM.matches) disableScrub();
    else enableScrub();
  }
  RM.addEventListener('change', applyHeroMode);

  new IntersectionObserver(es => {
    heroOn = es[0].isIntersecting;
    if (heroOn) loopRun(); else loopHalt();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) loopHalt(); else loopRun(); });

  // a seta "role para ver mais" some assim que a pessoa começa a descer
  addEventListener('scroll', () => {
    sc.cue = setVar(cue, '--cue', clamp(1 - scrollY / 240, 0, 1), sc.cue, 0.02);
  }, { passive: true });

  let resizeRaf = null;
  addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      if (!scrubOn) return;
      measure();
      resetCaches();
      frame(shown);
    });
  });

  /* ---------- mini sites (ilustrações em código) ---------- */
  const BIZ = {
    restaurante: {
      name: 'Brasa Burger', url: 'brasaburger.com.br', label: 'restaurante', ac: '#FF5A1F', ff: "'Unbounded', sans-serif", fw: 700, layout: 'split', art: 'burger',
      links: ['Cardápio', 'Sobre', 'Contato'], cta: 'Pedir agora', kick: 'Hamburgueria artesanal', h: 'Smash na brasa, entregue quente.', p: 'Peça pelo WhatsApp em dois toques.',
      sh: 'Cardápio', items: [['Smash duplo', 'R$ 32'], ['Brasa bacon', 'R$ 36'], ['Batata rústica', 'R$ 18']], addr: 'Rua das Palmeiras, 220', hours: 'Ter a dom, 18h às 23h'
    },
    beleza: {
      name: 'Studio Íris', url: 'studioiris.com.br', label: 'salão de beleza', ac: '#C2408F', ff: "Georgia, 'Times New Roman', serif", fw: 700, layout: 'center', art: 'iris',
      links: ['Serviços', 'Equipe', 'Agendar'], cta: 'Agendar', kick: 'Cabelo, unhas e sobrancelha', h: 'Seu horário, do seu jeito.', p: 'Escolha o serviço e agende pelo WhatsApp.',
      sh: 'Serviços', items: [['Corte e escova', 'R$ 90'], ['Manicure', 'R$ 40'], ['Sobrancelha', 'R$ 45']], addr: 'Rua das Acácias, 88', hours: 'Seg a sáb, 9h às 19h'
    },
    profissional: {
      name: 'Rafa Moura', url: 'rafamoura.com.br', label: 'profissional autônomo', ac: '#0E8F60', ff: "'Geist', sans-serif", fw: 600, layout: 'split', art: 'kettle',
      links: ['Planos', 'Sobre', 'Contato'], cta: 'Agendar avaliação', kick: 'Personal trainer', h: 'Treino que cabe na sua rotina.', p: 'Aulas presenciais e online. A primeira avaliação é por minha conta.',
      sh: 'Planos', items: [['Presencial', '3x por semana'], ['Online', 'Planilha e vídeo'], ['Avaliação', 'A primeira é grátis']], addr: 'Na academia ou na sua casa', hours: 'Seg a sex, 6h às 21h'
    },
    loja: {
      name: 'Vento', url: 'ventostore.com.br', label: 'loja', ac: '#E5372B', ff: "'JetBrains Mono', monospace", fw: 500, layout: 'rev', art: 'shirt',
      links: ['Coleção', 'Lojas', 'Contato'], cta: 'Ver coleção', kick: 'Streetwear feito no interior', h: 'Nova coleção. Pouca peça.', p: 'Compre pelo site, retire na loja ou receba em casa.',
      sh: 'Coleção', items: [['Camiseta Brisa', 'R$ 89'], ['Moletom Norte', 'R$ 189'], ['Boné Vento', 'R$ 69']], addr: 'Rua do Comércio, 45', hours: 'Seg a sáb, 10h às 20h'
    }
  };
  const STYLES = {
    escuro: ac => ({ bg: '#121318', fg: '#F3F4F7', mu: '#A4A8B5', cd: '#1C1E26', ac, on: '#FFFFFF', ln: 'rgba(255,255,255,.08)' }),
    claro: ac => ({ bg: '#F7F6F2', fg: '#16171B', mu: '#5B5F6C', cd: '#FFFFFF', ac, on: '#FFFFFF', ln: 'rgba(0,0,0,.08)' }),
    vibrante: ac => ({ bg: ac, fg: '#FFFFFF', mu: 'rgba(255,255,255,.86)', cd: 'rgba(255,255,255,.16)', ac: '#101114', on: '#FFFFFF', ln: 'rgba(255,255,255,.2)' })
  };
  const ART = {
    burger: '<svg viewBox="0 0 200 160"><circle cx="100" cy="82" r="70" fill="currentColor" opacity=".2"/><path d="M44 74c0-30 25-46 56-46s56 16 56 46z" fill="#E9A23B"/><g fill="#FFF3DA"><ellipse cx="80" cy="46" rx="3.2" ry="1.8"/><ellipse cx="100" cy="40" rx="3.2" ry="1.8"/><ellipse cx="120" cy="47" rx="3.2" ry="1.8"/><ellipse cx="92" cy="58" rx="3.2" ry="1.8"/><ellipse cx="112" cy="60" rx="3.2" ry="1.8"/></g><path d="M40 76c8 6 14-4 22 2s14-4 22 2 14-4 22 2 14-4 22 2 14-4 22 2v8H40z" fill="#5DBB4C"/><path d="M46 86h108l-10 12-8-6-10 10-12-8-10 9-12-9-10 8-10-8-10 6z" fill="#FFC531"/><rect x="42" y="90" width="116" height="20" rx="9" fill="#5A2A17"/><rect x="46" y="113" width="108" height="20" rx="8" fill="#D9892F"/></svg>',
    iris: '<svg viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor"><circle cx="150" cy="50" r="18" stroke-width="10" opacity=".9"/><circle cx="150" cy="50" r="33" stroke-width="2" opacity=".55"/><circle cx="150" cy="50" r="47" stroke-width="1.4" opacity=".4"/><circle cx="150" cy="50" r="63" stroke-width="1" opacity=".28"/><path d="M0 84c50-28 100-28 150 0s100 28 150 0" stroke-width="1.4" opacity=".4"/><path d="M0 18c50 26 100 26 150 0s100-26 150 0" stroke-width="1" opacity=".3"/></g><circle cx="150" cy="50" r="7" fill="currentColor"/></svg>',
    kettle: '<svg viewBox="0 0 200 160"><circle cx="104" cy="82" r="66" fill="currentColor" opacity=".16"/><path d="M80 60a24 24 0 0 1 48 0" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><rect x="78" y="56" width="52" height="12" rx="6" fill="currentColor"/><circle cx="104" cy="100" r="40" fill="currentColor"/><g stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".55"><path d="M26 74h24M18 94h32M26 114h24"/></g></svg>',
    shirt: '<svg viewBox="0 0 200 160"><path d="M74 28 40 46l12 27 14-6v68h68V67l14 6 12-27-34-18c-4 10-14 16-26 16s-22-6-26-16z" fill="currentColor"/><path d="M12 52c20-8 30 4 46-2M146 122c18-6 28 4 42-2M10 128c14-4 22 2 32-1" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity=".45"/></svg>'
  };
  const MAP = '<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><path class="st" d="M0 30h160M0 64h160M40 0v90M98 0v90M0 88 160 6"/><path class="pin" d="M98 26c-7 0-12 5-12 11 0 9 12 19 12 19s12-10 12-19c0-6-5-11-12-11z"/><circle cx="98" cy="37" r="4" fill="#fff"/></svg>';

  function msHTML(key, style, x) {
    const d = BIZ[key];
    const v = STYLES[style](d.ac);
    const css = `--bg:${v.bg};--fg:${v.fg};--mu:${v.mu};--cd:${v.cd};--ac:${v.ac};--on:${v.on};--ln:${v.ln};--ff:${d.ff};--fw:${d.fw}`;
    const cards = d.items.map(([t, s]) => `<div class="ms-card"><i class="ms-thumb"></i><b>${t}</b><span>${s}</span></div>`).join('');
    return `<div class="ms ms--${d.layout}${x.anim ? ' ms--anim' : ''}" style="${css}">` +
      `<div class="ms-nav"><span class="ms-logo">${d.name}</span><span class="ms-links">${d.links.map(l => `<i>${l}</i>`).join('')}</span><span class="ms-btn">${d.cta}</span></div>` +
      `<div class="ms-hero"><div class="ms-copy"><span class="ms-kick">${d.kick}</span><b class="ms-h">${d.h}</b><span class="ms-p">${d.p}</span><span class="ms-btn ms-btn--lg">${d.cta}</span></div><div class="ms-art">${ART[d.art]}</div></div>` +
      (x.items ? `<div class="ms-sec"><b class="ms-sh">${d.sh}</b><div class="ms-cards">${cards}</div></div>` : '') +
      (x.gallery ? `<div class="ms-sec"><b class="ms-sh">Fotos</b><div class="ms-gal"><i></i><i></i><i></i><i></i></div></div>` : '') +
      (x.map ? `<div class="ms-sec ms-map"><div class="ms-mapart">${MAP}</div><div class="ms-info"><b>Onde estamos</b><span>${d.addr}</span><span>${d.hours}</span></div></div>` : '') +
      `<div class="ms-foot">© 2026 ${d.name} · site conceito</div></div>`;
  }

  $$('.work .ms-view').forEach(v => {
    v.innerHTML = msHTML(v.dataset.ms, v.dataset.style, { items: true, gallery: true, map: true });
  });

  /* ---------- monte o seu ---------- */
  const cfg = $('#cfg');
  const pv = $('#pv');
  const pvBody = $('.pv-body');
  const pvUrl = $('#pv-url');
  const X_LABEL = { items: 'cardápio ou catálogo', gallery: 'galeria de fotos', map: 'mapa e horários', anim: 'animações no scroll' };
  const joinPt = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];

  function priceFor(x) {
    if (x.includes('anim')) return ['Site animado', 'R$ 4.000'];
    return x.length >= 2 ? ['Site completo', 'R$ 1.200'] : ['Página única', 'R$ 300'];
  }

  // o preço sobe ou desce contando, em vez de trocar de uma vez
  let priceNow = 300, priceRaf = null;
  function countPrice(label, animate) {
    const el = $('#pk-price');
    const to = +label.replace(/\D/g, '');
    if (priceRaf) cancelAnimationFrame(priceRaf);
    if (!animate || RM.matches || to === priceNow) { priceNow = to; el.textContent = label; return; }
    const from = priceNow, t0 = performance.now(), dur = 900;
    const step = now => {
      const t = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      priceNow = Math.round(from + (to - from) * e);
      el.textContent = 'R$ ' + priceNow.toLocaleString('pt-BR');
      priceRaf = t < 1 ? requestAnimationFrame(step) : null;
      if (!priceRaf) el.textContent = label;
    };
    priceRaf = requestAnimationFrame(step);
  }

  function updateCfg(animate) {
    const f = new FormData(cfg);
    const biz = f.get('biz');
    const style = f.get('estilo');
    const x = f.getAll('x');
    pv.innerHTML = msHTML(biz, style, { items: x.includes('items'), gallery: x.includes('gallery'), map: x.includes('map'), anim: x.includes('anim') });
    pvUrl.textContent = BIZ[biz].url;
    const [name, price] = priceFor(x);
    const nameEl = $('#pk-name');
    if (nameEl.textContent !== name) {
      nameEl.textContent = name;
      if (animate && !RM.matches) { nameEl.classList.remove('pk-swap'); void nameEl.offsetWidth; nameEl.classList.add('pk-swap'); }
    }
    countPrice(price, animate);
    const extras = x.length ? joinPt(x.map(v => X_LABEL[v])) : 'o básico';
    $('#pk-send').href = waLink(`Oi David! Montei uma ideia no seu site: ${BIZ[biz].label}, estilo ${style}, com ${extras}. Deu ${name.toLowerCase()}, a partir de ${price}. Quero um orçamento.`);
    if (animate && !RM.matches) {
      pvBody.classList.remove('rebuild');
      void pvBody.offsetWidth;
      pvBody.classList.add('rebuild');
    }
  }
  cfg.addEventListener('change', () => updateCfg(true));
  cfg.addEventListener('submit', e => e.preventDefault());
  updateCfg(false);

  /* ---------- como funciona: a linha que se traça ---------- */
  const stepsWrap = $('#steps');
  const stepEls = $$('.step', stepsWrap);
  let stepsVisible = false, stepsRaf = null, lastDraw = -1;

  function drawSteps() {
    stepsRaf = null;
    let p = 1;
    if (!RM.matches) {
      const r = stepsWrap.getBoundingClientRect();
      const vh = innerHeight;
      p = clamp((vh * 0.82 - r.top) / (r.height * 0.8 + vh * 0.3), 0, 1);
    }
    if (Math.abs(p - lastDraw) > 0.003 || (p !== lastDraw && (p === 0 || p === 1))) {
      stepsWrap.style.setProperty('--draw', p.toFixed(3));
      lastDraw = p;
    }
    stepEls.forEach(s => {
      const on = p >= +s.dataset.at;
      if (on !== s._on) { s.classList.toggle('lit', on); s._on = on; }
    });
  }
  const queueSteps = () => { if (stepsVisible && !stepsRaf) stepsRaf = requestAnimationFrame(drawSteps); };
  new IntersectionObserver(es => {
    stepsVisible = es[0].isIntersecting;
    if (stepsVisible) queueSteps();
  }, { rootMargin: '80px 0px' }).observe(stepsWrap);
  addEventListener('scroll', queueSteps, { passive: true });

  /* ---------- dúvidas ---------- */
  $$('.qa button').forEach(btn => btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    btn.closest('.qa').classList.toggle('open', !open);
  }));

  /* ---------- formulário final: vira mensagem de WhatsApp ---------- */
  const lead = $('#lead');
  lead.addEventListener('submit', e => {
    e.preventDefault();
    const nome = lead.elements.nome.value.trim();
    const neg = lead.elements.negocio.value.trim();
    const msg = lead.elements.msg.value.trim();
    const err = $('#lead-err');
    const ok = $('#lead-ok');
    lead.elements.nome.setAttribute('aria-invalid', String(!nome));
    lead.elements.negocio.setAttribute('aria-invalid', String(!neg));
    if (!nome || !neg) {
      ok.hidden = true;
      err.hidden = false;
      (nome ? lead.elements.negocio : lead.elements.nome).focus();
      return;
    }
    err.hidden = true;
    let text = `Oi David! Meu nome é ${nome}. Meu negócio: ${neg}.`;
    if (msg) text += ' ' + msg;
    const url = waLink(text);
    $('#lead-link').href = url;
    ok.hidden = false;
    window.open(url, '_blank', 'noopener');
  });

  /* ---------- títulos que entram palavra por palavra ---------- */
  $$('.rv-words').forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach((w, i) => {
      const sp = document.createElement('span');
      sp.className = 'wd';
      sp.style.setProperty('--wi', i);
      sp.textContent = w;
      h.appendChild(sp);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------- comparação: uma cor passa pelo texto e volta ---------- */
  $$('.sweep').forEach(sw => {
    const t = sw.textContent;
    sw.textContent = '';
    const base = document.createElement('span');
    base.textContent = t;
    const tint = document.createElement('span');
    tint.className = 'sw-tint';
    tint.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.textContent = t;
    tint.appendChild(inner);
    sw.append(base, tint);
  });
  function sweepRow(row) {
    if (RM.matches) return;
    row.classList.remove('swept');
    void row.offsetWidth;
    row.classList.add('swept');
  }
  $$('.cmp-row').forEach(row => {
    row.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') sweepRow(row); });
    row.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') sweepRow(row); });
  });

  /* ---------- entradas, seções vivas, nav ---------- */
  const groups = $$('.rv-group');
  groups.forEach(g => $$('.rv, .rv-words', g).forEach((el, i) => el.style.setProperty('--d', i)));
  const revealIO = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    const g = en.target;
    g.classList.add('in');
    revealIO.unobserve(g);
    const n = $$('.rv, .rv-words', g).length;
    setTimeout(() => g.classList.add('done'), n * 110 + 2000);
    if (g.classList.contains('cmp')) $$('.cmp-row', g).forEach((row, i) => setTimeout(() => sweepRow(row), 1050 + i * 280));
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  groups.forEach(g => revealIO.observe(g));

  const liveIO = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('live', en.isIntersecting)), { rootMargin: '120px 0px' });
  $$('.hero, .sec').forEach(s => liveIO.observe(s));

  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

  const nav = $('#nav');
  let navSolid = null;
  const navCheck = () => {
    const on = scrollY > 24;
    if (on !== navSolid) { nav.classList.toggle('solid', on); navSolid = on; }
  };
  addEventListener('scroll', navCheck, { passive: true });
  navCheck();

  /* ---------- menu de celular e tablet ---------- */
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  function setMenu(open) {
    nav.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('menu-open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('pointerdown', e => {
    if (nav.classList.contains('menu-open') && !nav.contains(e.target)) setMenu(false);
  });
  matchMedia('(min-width: 981px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- fundo que segue o mouse (ou o toque) e cena do topo inclinando ---------- */
  const spotEl = $('#spot');
  function ptrTick(now) {
    const dt = Math.min(100, now - (ptr.last || now));
    ptr.last = now;
    const a = 1 - Math.pow(1 - 0.08, dt / 16.667);
    const b = 1 - Math.pow(1 - 0.06, dt / 16.667);
    ptr.x += (ptr.tx - ptr.x) * a;
    ptr.y += (ptr.ty - ptr.y) * a;
    ptr.cx += (ptr.tcx - ptr.cx) * b;
    ptr.cy += (ptr.tcy - ptr.cy) * b;
    ptr.drag += ((ptr.dragging ? 1 : 0) - ptr.drag) * b;
    spotEl.style.transform = `translate3d(${ptr.x.toFixed(1)}px,${ptr.y.toFixed(1)}px,0)`;
    if (scrubOn && heroOn && !loopRaf) frame(shown);
    paintStars();
    const rest = Math.abs(ptr.tx - ptr.x) < 0.5 && Math.abs(ptr.ty - ptr.y) < 0.5 &&
      Math.abs(ptr.tcx - ptr.cx) < 0.002 && Math.abs(ptr.tcy - ptr.cy) < 0.002 &&
      Math.abs((ptr.dragging ? 1 : 0) - ptr.drag) < 0.002;
    if (rest) { ptr.raf = null; ptr.last = 0; } else ptr.raf = requestAnimationFrame(ptrTick);
  }
  const ptrKick = () => { if (!ptr.raf) ptr.raf = requestAnimationFrame(ptrTick); };
  function ptrAt(e) {
    if (RM.matches) return;
    ptr.tx = e.clientX;
    ptr.ty = e.clientY;
    if (e.pointerType !== 'touch') {
      ptr.tcx = clamp(e.clientX / innerWidth * 2 - 1, -1, 1);
      ptr.tcy = clamp(e.clientY / innerHeight * 2 - 1, -1, 1);
    }
    spotEl.classList.add('on');
    ptrKick();
  }
  addEventListener('pointermove', ptrAt, { passive: true });
  addEventListener('pointerdown', e => {
    ptrAt(e);
    // segurar e arrastar o fundo puxa o céu com mais força
    if (e.pointerType === 'mouse' && !e.target.closest('a, button, input, textarea, label, .tilt, form')) { ptr.dragging = true; ptrKick(); }
  }, { passive: true });
  addEventListener('pointerup', () => { if (ptr.dragging) { ptr.dragging = false; ptrKick(); } }, { passive: true });
  document.addEventListener('pointerout', e => {
    if (e.relatedTarget) return;
    ptr.tcx = ptr.tcy = 0;
    ptr.dragging = false;
    ptrKick();
  });
  // no celular e no tablet, arrastar o dedo também mexe as estrelas
  addEventListener('touchmove', e => {
    if (RM.matches || !e.touches[0]) return;
    const t = e.touches[0];
    ptr.tcx = clamp(t.clientX / innerWidth * 2 - 1, -1, 1);
    ptr.tcy = clamp(t.clientY / innerHeight * 2 - 1, -1, 1);
    ptr.tx = t.clientX;
    ptr.ty = t.clientY;
    ptrKick();
  }, { passive: true });
  addEventListener('touchend', () => { ptr.tcx = ptr.tcy = 0; ptrKick(); }, { passive: true });

  /* ---------- brilho nos cards que segue o cursor, a caneta ou o dedo ---------- */
  $$('.spot').forEach(el => {
    let raf = null, mx = 0, my = 0, off = null;
    const paint = () => { raf = null; el.style.setProperty('--mx', mx + 'px'); el.style.setProperty('--my', my + 'px'); };
    const at = e => {
      const r = el.getBoundingClientRect();
      mx = Math.round(e.clientX - r.left);
      my = Math.round(e.clientY - r.top);
      if (!raf) raf = requestAnimationFrame(paint);
    };
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'touch') return; at(e); el.classList.add('lit'); });
    el.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') at(e); });
    el.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') el.classList.remove('lit'); });
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return;
      clearTimeout(off);
      at(e);
      el.classList.add('lit');
    });
    const release = e => {
      if (e.pointerType !== 'touch') return;
      clearTimeout(off);
      off = setTimeout(() => el.classList.remove('lit'), 700);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  });

  /* ---------- cards que inclinam de leve na direção do cursor ---------- */
  $$('.tilt').forEach(el => {
    const max = el.classList.contains('tier') ? 3 : 4.5;
    let raf = null, rx = 0, ry = 0, box = null, sy = 0;
    const paint = () => { raf = null; el.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; };
    el.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch' || RM.matches) return;
      box = el.getBoundingClientRect();
      sy = scrollY;
      el.classList.add('tilting');
    });
    el.addEventListener('pointermove', e => {
      if (!box || e.pointerType === 'touch' || RM.matches) return;
      const top = box.top - (scrollY - sy);
      const nx = (e.clientX - box.left) / box.width - 0.5;
      const ny = (e.clientY - top) / box.height - 0.5;
      ry = clamp(nx, -0.5, 0.5) * max * 2;
      rx = -clamp(ny, -0.5, 0.5) * max * 2;
      if (!raf) raf = requestAnimationFrame(paint);
    });
    el.addEventListener('pointerleave', () => {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      box = null;
      el.classList.remove('tilting');
      el.style.transform = '';
    });
  });

  /* ---------- botões principais que puxam de leve o cursor ---------- */
  $$('.magnet').forEach(el => {
    el.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' || RM.matches || !FINE.matches) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${clamp(dx * 0.18, -9, 9).toFixed(1)}px,${clamp(dy * 0.3, -7, 7).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- profundidade no scroll e fundo que muda de tom pela página ---------- */
  const depthEls = $$('[data-depth]').map(el => ({ el, d: +el.dataset.depth, y: 0, vis: false }));
  const depthIO = new IntersectionObserver(es => es.forEach(en => {
    const o = depthEls.find(x => x.el === en.target);
    if (o) o.vis = en.isIntersecting;
  }), { rootMargin: '200px 0px' });
  depthEls.forEach(o => depthIO.observe(o.el));
  const aur = $$('.aur');
  const aurO = aur.map(() => -1);

  /* ---------- fundo astral: estrelas geradas uma vez, em três profundidades ---------- */
  function starTiles(seed, n, size, rMin, rMax, oMin, oMax, glow) {
    const r = rng(seed);
    const stars = [];
    for (let i = 0; i < n; i++) {
      const h = r();
      stars.push({ x: r() * size, y: r() * size, rad: rMin + r() * (rMax - rMin), o: oMin + r() * (oMax - oMin), c: h < 0.12 ? '#A9C6FF' : h < 0.17 ? '#FFE6C7' : '#FFFFFF' });
    }
    const head = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      (glow ? `<defs><radialGradient id='g'><stop offset='0' stop-color='#fff'/><stop offset='.3' stop-color='#cfe0ff' stop-opacity='.5'/><stop offset='1' stop-color='#cfe0ff' stop-opacity='0'/></radialGradient></defs>` : '');
    const dot = s => (glow && s.rad > 1.15 ? `<circle cx='${s.x.toFixed(1)}' cy='${s.y.toFixed(1)}' r='${(s.rad * 4.5).toFixed(1)}' fill='url(#g)' opacity='${(s.o * 0.45).toFixed(2)}'/>` : '') +
      `<circle cx='${s.x.toFixed(1)}' cy='${s.y.toFixed(1)}' r='${s.rad.toFixed(2)}' fill='${s.c}' opacity='${s.o.toFixed(2)}'/>`;
    const url = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    const half = Math.ceil(n / 2);
    return {
      a: url(head + stars.slice(0, half).map(dot).join('') + '</svg>'),
      b: url(head + stars.slice(half).map(dot).join('') + '</svg>'),
      streak: url(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
        stars.map(s => `<ellipse cx='${s.x.toFixed(1)}' cy='${s.y.toFixed(1)}' rx='${(s.rad * 0.6).toFixed(2)}' ry='${(s.rad * 9).toFixed(1)}' fill='${s.c}' opacity='${(s.o * 0.55).toFixed(2)}'/>`).join('') + '</svg>')
    };
  }
  const STAR_LAYERS = [
    { el: $('.s-far'), size: 700, speed: 0.025, t: starTiles(11, 170, 700, 0.3, 0.75, 0.25, 0.75, false) },
    { el: $('.s-mid'), size: 900, speed: 0.07, t: starTiles(23, 95, 900, 0.55, 1.1, 0.4, 0.9, false) },
    { el: $('.s-near'), size: 1100, speed: 0.15, t: starTiles(37, 34, 1100, 0.9, 1.7, 0.6, 1, true) }
  ];
  STAR_LAYERS.forEach(L => {
    L.y = null;
    $$('.st', L.el).forEach(st => {
      if (!st.classList.contains('b')) st.style.backgroundImage = st.classList.contains('streak') ? L.t.streak : L.t.a + ',' + L.t.b;
    });
  });
  $('.gx-dust').style.backgroundImage = starTiles(53, 260, 520, 0.25, 0.6, 0.3, 0.8, false).a;
  const streakEl = $('.s-near .streak');
  const galaxy = $('#galaxy');
  const aurs = $('#aurs');
  let aursT = '';
  const horizon = $('#horizon');
  const contato = $('#contato');
  const foot = $('.foot');
  const meteor = $('#meteor');
  meteor.addEventListener('animationiteration', () => {
    meteor.style.setProperty('--tx', (45 + Math.random() * 45).toFixed(1) + '%');
    meteor.style.setProperty('--ty', (4 + Math.random() * 30).toFixed(1) + '%');
  });
  let lastY = scrollY, vel = 0, velRaf = null, streakO = -1, gxT = '', hzT = '', starsDim = null, skyAlpha = 1;

  // cada camada de estrelas anda com a rolagem e desliza ao contrário do mouse, mais perto = mais movimento
  const STAR_SHIFT = [7, 16, 30];
  function paintStars() {
    const k = 1 + ptr.drag * 1.6;
    STAR_LAYERS.forEach((L, i) => {
      const sx = -ptr.cx * STAR_SHIFT[i] * k;
      const sy = (L.sy || 0) - ptr.cy * STAR_SHIFT[i] * k;
      const t = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
      if (t !== L.y) { L.el.style.transform = t; L.y = t; }
    });
  }

  /* ---------- céu interativo: galáxia que gira com a rolagem, o seu D virando constelação, estrelas cadentes ---------- */
  const sky = $('#skycv');
  const sctx = sky.getContext('2d');
  let SW = 0, SH = 0, parts = [], skyRaf = null, skyLast = 0, skyY = scrollY, skyAcc = 0, skyClock = 0;
  // se o aparelho estiver lento, o céu se adapta: menos estrelas e meio ritmo de atualização
  let skyEma = 16.7, skyLow = false, skySkip = false, skyFrame = 0, skyBusyUntil = 0;
  // com a pessoa parada, o céu desenha 1 a cada 3 quadros; ao mexer o mouse, rolar ou tocar, volta ao ritmo cheio
  const skyWake = () => { skyBusyUntil = performance.now() + 1500; };
  ['pointermove', 'pointerdown', 'scroll', 'touchmove', 'wheel'].forEach(t => addEventListener(t, skyWake, { passive: true }));
  const shocks = [];
  const meteors = [];
  // os vértices do logo D (as duas peças), em coordenadas de 0 a 600
  const LOGO = [
    [[100, 140], [245, 86], [238, 410], [262, 412], [260, 498], [82, 486]],
    [[262, 108], [448, 46], [505, 96], [508, 372], [452, 428], [258, 455], [256, 410], [398, 400], [400, 140], [292, 148], [290, 186], [266, 190]]
  ];
  let cons = [];
  // um carimbo de brilho desenhado uma vez: cada estrela vira um drawImage barato em vez de um círculo novo
  const glowSprite = document.createElement('canvas');
  glowSprite.width = glowSprite.height = 32;
  (() => {
    const g = glowSprite.getContext('2d');
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.12, 'rgba(235,242,255,.95)');
    rg.addColorStop(0.3, 'rgba(200,220,255,.28)');
    rg.addColorStop(1, 'rgba(200,220,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 32, 32);
  })();
  function skySize() {
    const dpr = 1;
    SW = innerWidth;
    SH = innerHeight;
    sky.width = Math.round(SW * dpr);
    sky.height = Math.round(SH * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // estrelas soltas espalhadas num disco que cobre a tela inteira, para a galáxia poder girar sem buracos
    const r = rng(77);
    const n = Math.round((SW < 760 ? 90 : 160) * (skyLow ? 0.6 : 1));
    const R = Math.hypot(SW, SH) * 0.56;
    parts = [];
    for (let i = 0; i < n; i++) {
      const rad = Math.sqrt(r()) * R, ang = r() * 6.283;
      parts.push({ rad, ang, x: SW / 2 + Math.cos(ang) * rad, y: SH / 2 + Math.sin(ang) * rad, vx: 0, vy: 0, size: 0.5 + r() * 1.3, a: 0.35 + r() * 0.55, ph: r() * 6.283, sp: 0.4 + r() * 1.1 });
    }
    // a constelação: cada vértice começa num ponto qualquer do céu e vai para o seu lugar no D
    // no computador o D termina no espaço livre embaixo das camadas da chamada final; no celular, no alto da tela
    const wide = SW >= 981;
    const S = wide ? Math.min(SH * 0.3, SW * 0.19, 250) : Math.min(SW * 0.5, 220);
    const cx = wide ? SW * 0.235 : SW * 0.5, cy = SH * (wide ? 0.575 : 0.24);
    const rc = rng(91);
    cons = LOGO.map(poly => poly.map(([vx, vy]) => ({
      sx: rc() * SW, sy: rc() * SH,
      tx: cx + (vx - 300) / 600 * S, ty: cy + (vy - 300) / 600 * S,
      ph: rc() * 6.283
    })));
  }
  function drawGlowDot(x, y, size, alpha) {
    const g = size * 5;
    sctx.globalAlpha = alpha;
    sctx.drawImage(glowSprite, x - g, y - g, g * 2, g * 2);
  }
  function skyTick(now) {
    skyFrame++;
    const busy = now < skyBusyUntil || shocks.length > 0 || meteors.length > 0;
    if (!busy && skyFrame % 3 !== 0) { skyRaf = requestAnimationFrame(skyTick); return; }
    if (skyLow && busy) {
      skySkip = !skySkip;
      if (skySkip) { skyRaf = requestAnimationFrame(skyTick); return; }
    }
    const dt = Math.min(50, now - (skyLast || now));
    skyLast = now;
    if (busy) skyEma = skyEma * 0.95 + dt * 0.05;
    if (!skyLow && skyClock > 3000 && skyEma > 26) { skyLow = true; parts.length = Math.round(parts.length * 0.6); }
    skyClock += dt;
    const f = dt / 16.667;
    sctx.clearRect(0, 0, SW, SH);
    const max = document.documentElement.scrollHeight - innerHeight;
    const pg = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    const dy = scrollY - skyY;
    skyY = scrollY;
    // a galáxia gira devagar sozinha e bem mais quando a pessoa rola
    const theta = scrollY * 0.00016 + skyClock * 0.000006;
    const R = SW < 760 ? 110 : 150, R2 = R * R;
    const pOn = spotEl.classList.contains('on');
    const damp = Math.pow(0.88, f);
    for (let s = shocks.length - 1; s >= 0; s--) if ((now - shocks[s].t0) > 1300) shocks.splice(s, 1);
    sctx.fillStyle = '#DCE8FF';
    for (const p of parts) {
      const hx = SW / 2 + Math.cos(p.ang + theta) * p.rad;
      const hy = SH / 2 + Math.sin(p.ang + theta) * p.rad * 0.86;
      let ax = (hx - p.x) * 0.012, ay = (hy - p.y) * 0.012;
      if (pOn) {
        const ddx = p.x - ptr.x, ddy = p.y - ptr.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 < R2) { const d = Math.sqrt(d2) || 1, k = (1 - d / R) ** 2 * 1.5; ax += ddx / d * k; ay += ddy / d * k; }
      }
      for (const sh of shocks) {
        const age = Math.max(0, (now - sh.t0) / 1000), rad = age * 620;
        const ddx = p.x - sh.x, ddy = p.y - sh.y, d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        if (Math.abs(d - rad) < 46) { const k = (1 - age) * 1.8; ax += ddx / d * k; ay += ddy / d * k; }
      }
      p.vx = (p.vx + ax * f) * damp;
      p.vy = (p.vy + ay * f) * damp;
      p.x += p.vx * f;
      p.y += p.vy * f;
      if (p.x < -20 || p.x > SW + 20 || p.y < -20 || p.y > SH + 20) continue;
      const tw = 0.62 + 0.38 * Math.sin(now * 0.001 * p.sp + p.ph);
      if (p.size > 1.35) drawGlowDot(p.x, p.y, p.size, p.a * tw * skyAlpha);
      else {
        sctx.globalAlpha = p.a * tw * skyAlpha;
        sctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      }
    }

    // o seu D se forma no céu conforme a página desce, e as linhas da constelação se desenham no fim
    const form = easeIO(sstep(0.04, 0.82, pg));
    const lines = sstep(0.4, 0.94, pg);
    const done = sstep(0.9, 1, pg);
    const conAlpha = Math.max(skyAlpha, 0.55 + done * 0.45);
    const pts = cons.map(poly => poly.map(v => ({
      x: lerp(v.sx, v.tx, form) + Math.sin(now * 0.0011 + v.ph) * 1.2 * (1 - form * 0.6),
      y: lerp(v.sy, v.ty, form) + Math.cos(now * 0.0013 + v.ph) * 1.2 * (1 - form * 0.6),
      ph: v.ph
    })));
    if (lines > 0) {
      const total = pts.reduce((n, poly) => n + poly.length, 0);
      let budget = lines * total;
      sctx.strokeStyle = '#8AB2FF';
      sctx.lineWidth = 1.2;
      sctx.globalAlpha = (0.22 + done * (0.2 + 0.08 * Math.sin(now * 0.002))) * conAlpha;
      sctx.beginPath();
      for (const poly of pts) {
        for (let i = 0; i < poly.length && budget > 0; i++) {
          const a = poly[i], b = poly[(i + 1) % poly.length];
          const k = Math.min(1, budget);
          sctx.moveTo(a.x, a.y);
          sctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
          budget -= 1;
        }
      }
      sctx.stroke();
    }
    sctx.fillStyle = '#E6EEFF';
    for (const poly of pts) {
      for (const v of poly) {
        const tw = 0.7 + 0.3 * Math.sin(now * 0.0017 + v.ph);
        drawGlowDot(v.x, v.y, 1.1 + form * 0.6 + done * 0.4, (0.35 + form * 0.6) * tw * conAlpha);
      }
    }

    // estrelas cadentes: a cada trecho rolado, uma risca o céu
    skyAcc += Math.abs(dy);
    if (skyAcc > 1100 && meteors.length < 3) {
      skyAcc = 0;
      const ang = (150 + Math.random() * 14) * Math.PI / 180;
      meteors.push({ x: SW * (0.35 + Math.random() * 0.6), y: SH * (0.04 + Math.random() * 0.36), ang, len: 140 + Math.random() * 120, t0: now });
    }
    for (let m = meteors.length - 1; m >= 0; m--) {
      const mt = meteors[m];
      const age = (now - mt.t0) / 1000;
      if (age > 0.9) { meteors.splice(m, 1); continue; }
      if (age < 0) continue;
      const dist = age * 950;
      const hx = mt.x + Math.cos(mt.ang) * dist, hy = mt.y + Math.sin(mt.ang) * dist;
      const tx = hx - Math.cos(mt.ang) * mt.len, ty = hy - Math.sin(mt.ang) * mt.len;
      const gr = sctx.createLinearGradient(tx, ty, hx, hy);
      gr.addColorStop(0, 'rgba(190,215,255,0)');
      gr.addColorStop(1, 'rgba(225,236,255,1)');
      sctx.globalAlpha = (age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.75) * 0.9;
      sctx.strokeStyle = gr;
      sctx.lineWidth = 1.6;
      sctx.beginPath();
      sctx.moveTo(tx, ty);
      sctx.lineTo(hx, hy);
      sctx.stroke();
    }

    for (const sh of shocks) {
      const age = (now - sh.t0) / 1000;
      if (age <= 0 || age > 1.1) continue;
      sctx.globalAlpha = 0.28 * (1 - age / 1.1) * skyAlpha;
      sctx.strokeStyle = '#8AB2FF';
      sctx.lineWidth = 1.5;
      sctx.beginPath();
      sctx.arc(sh.x, sh.y, age * 620, 0, 6.283);
      sctx.stroke();
    }
    sctx.globalAlpha = 1;
    skyRaf = requestAnimationFrame(skyTick);
  }
  function skyStart() { if (!skyRaf && !RM.matches && !document.hidden) { skyLast = 0; skyRaf = requestAnimationFrame(skyTick); } }
  function skyStop() { if (skyRaf) { cancelAnimationFrame(skyRaf); skyRaf = null; } sctx.clearRect(0, 0, SW, SH); }
  skySize();
  skyStart();
  let skyResize = null;
  addEventListener('resize', () => { clearTimeout(skyResize); skyResize = setTimeout(skySize, 200); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) skyStop(); else skyStart(); });
  // um clique (ou toque) em qualquer lugar manda uma onda pelo céu
  addEventListener('pointerdown', e => {
    if (RM.matches || e.target.closest('input, textarea')) return;
    shocks.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
    if (shocks.length > 4) shocks.shift();
  }, { passive: true });
  // rastro das estrelas: acende com a velocidade da rolagem e apaga sozinho quando ela para
  function velTick() {
    vel *= 0.9;
    const o = clamp((Math.abs(vel) - 6) / 50, 0, 0.75);
    if (Math.abs(o - streakO) > 0.01 || (o === 0 && streakO !== 0)) { streakEl.style.setProperty('--v', o.toFixed(2)); streakO = o; }
    velRaf = Math.abs(vel) > 0.5 ? requestAnimationFrame(velTick) : null;
  }
  function spaceFrame(pg) {
    const y = scrollY;
    vel += clamp(y - lastY, -160, 160) * 0.35;
    lastY = y;
    if (!velRaf && !RM.matches) velRaf = requestAnimationFrame(velTick);
    STAR_LAYERS.forEach(L => { L.sy = -((y * L.speed) % L.size); });
    paintStars();
    // depois do topo, as estrelas ficam mais discretas atrás dos textos; voltam a brilhar no fim, perto do planeta
    const dim = y > hero.offsetHeight - innerHeight * 0.5 && contato.getBoundingClientRect().top > innerHeight * 0.4;
    if (dim !== starsDim) { STAR_LAYERS.forEach(L => L.el.style.setProperty('--so', dim ? '0.4' : '1')); starsDim = dim; skyAlpha = dim ? 0.45 : 1; }
    const au = `translate3d(0,${(-pg * 22).toFixed(2)}vh,0) rotate(${(pg * 10).toFixed(2)}deg)`;
    if (au !== aursT) { aurs.style.transform = au; aursT = au; }
    const g = `translate3d(0,${(-pg * 34).toFixed(2)}vh,0) rotate(${(-18 + pg * 14).toFixed(2)}deg)`;
    if (g !== gxT) { galaxy.style.transform = g; gxT = g; }
    const r = contato.getBoundingClientRect();
    const t = sstep(0, 1, (innerHeight - r.top) / (innerHeight * 1.1));
    // no fim, a borda do planeta para logo acima do rodapé, em qualquer tela
    const rise = Math.min(foot.offsetHeight + 60, innerHeight * 0.45);
    const h = `translate3d(0,${(-t * rise).toFixed(1)}px,0)`;
    if (h !== hzT) { horizon.style.transform = h; hzT = h; }
  }

  let depthRaf = null;
  function depthFrame() {
    depthRaf = null;
    const max = document.documentElement.scrollHeight - innerHeight;
    const pg = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    [1 - pg * 0.45, 0.55 + pg * 0.45, 0.35 + pg * 0.65, 0.4 + pg * 0.6].forEach((o, i) => {
      if (aur[i] && Math.abs(o - aurO[i]) > 0.02) { aur[i].style.setProperty('--o', o.toFixed(2)); aurO[i] = o; }
    });
    if (RM.matches) return;
    spaceFrame(pg);
    const vh = innerHeight;
    const k = STACKED.matches ? 0.6 : 1;
    depthEls.forEach(o => {
      if (!o.vis) return;
      const r = o.el.getBoundingClientRect();
      const mid = r.top - o.y + r.height / 2;
      const y = clamp((vh / 2 - mid) * o.d * k, -80, 80);
      if (Math.abs(y - o.y) > 0.3) { o.el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`; o.y = y; }
    });
  }
  const queueDepth = () => { if (!depthRaf) depthRaf = requestAnimationFrame(depthFrame); };
  addEventListener('scroll', queueDepth, { passive: true });
  addEventListener('resize', queueDepth);
  queueDepth();

  /* ---------- rolagem suave na roda do mouse (toque, teclado e barra seguem nativos) ---------- */
  const SMOOTH_Q = matchMedia('(hover: hover) and (pointer: fine)');
  let sT = 0, sC = 0, sRaf = null, sLast = 0;
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  function smoothTick(now) {
    // outra coisa moveu a página (barra de rolagem, link, busca): a rolagem suave cede o lugar
    if (sLast && Math.abs(scrollY - sC) > 3) { sRaf = null; sLast = 0; return; }
    const dt = Math.min(100, now - (sLast || now));
    sLast = now;
    sC += (sT - sC) * (1 - Math.pow(1 - 0.2, dt / 16.667));
    if (Math.abs(sT - sC) < 0.5) { sC = sT; sRaf = null; sLast = 0; } else sRaf = requestAnimationFrame(smoothTick);
    scrollTo({ top: sC, behavior: 'instant' });
  }
  function stopSmooth() { if (sRaf) { cancelAnimationFrame(sRaf); sRaf = null; sLast = 0; } }
  addEventListener('wheel', e => {
    if (!smooth.on || e.ctrlKey || e.defaultPrevented || root.classList.contains('pm-lock')) return;
    if (e.target.closest && e.target.closest('textarea, select')) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (!sRaf) sT = sC = scrollY;
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
    sT = clamp(sT + e.deltaY * unit, 0, maxScroll());
    if (!sRaf) sRaf = requestAnimationFrame(smoothTick);
  }, { passive: false });
  addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) stopSmooth();
  });
  addEventListener('pointerdown', stopSmooth, { passive: true });
  function applySmooth() {
    smooth.on = SMOOTH_Q.matches && !RM.matches;
    if (!smooth.on) stopSmooth();
  }
  SMOOTH_Q.addEventListener('change', applySmooth);
  applySmooth();

  /* ---------- ondulação ao clicar em botões, chips, dúvidas e menu ---------- */
  const RIPPLE = '.btn, .chips span, .qa button, .menu-btn, .menu a, .work-open, .pm-close';
  addEventListener('pointerdown', e => {
    if (RM.matches) return;
    let el = e.target.closest('.chips label');
    el = el ? $('span', el) : e.target.closest(RIPPLE);
    if (!el) return;
    let box = el.querySelector(':scope > .rbox');
    if (!box) { box = document.createElement('span'); box.className = 'rbox'; box.setAttribute('aria-hidden', 'true'); el.prepend(box); }
    const r = el.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.4;
    const rp = document.createElement('span');
    rp.className = 'ripple';
    rp.style.cssText = `left:${(e.clientX - r.left).toFixed(0)}px;top:${(e.clientY - r.top).toFixed(0)}px;width:${d.toFixed(0)}px;height:${d.toFixed(0)}px`;
    box.appendChild(rp);
    rp.addEventListener('animationend', () => rp.remove(), { once: true });
  }, { passive: true });

  /* ---------- projetos: abrem numa janela que cresce a partir do card ---------- */
  const PM_FEATURES = {
    restaurante: ['Cardápio com preços', 'Pedido direto no WhatsApp', 'Galeria de fotos', 'Mapa e horários'],
    beleza: ['Serviços com preço', 'Agendamento pelo WhatsApp', 'Galeria dos trabalhos', 'Endereço e horários'],
    profissional: ['Planos e valores', 'Avaliação marcada pelo WhatsApp', 'Fotos dos treinos', 'Onde atende e horários'],
    loja: ['Coleção com preços', 'Pedido pelo WhatsApp', 'Galeria de looks', 'Endereço da loja']
  };
  const pm = $('#pm');
  const pmPanel = $('#pm-panel');
  let pmFrom = null, pmBusy = false;
  function openProject(work) {
    if (pm.classList.contains('open') || pmBusy) return;
    const key = $('.work-open', work).dataset.open;
    const d = BIZ[key];
    const view = $('.ms-view', work);
    $('#pm-ms').innerHTML = msHTML(key, view.dataset.style, { items: true, gallery: true, map: true });
    $('#pm-url').textContent = d.url;
    $('#pm-tag').textContent = $('.tag', work).textContent;
    $('#pm-title').textContent = $('h3', work).textContent;
    $('#pm-desc').textContent = $('.work-meta p:last-child', work).textContent;
    $('#pm-list').innerHTML = PM_FEATURES[key].map(t => `<li>${t}</li>`).join('');
    $('#pm-pack').innerHTML = 'Um site assim sai no pacote <b>Site completo</b>, a partir de <b>R$ 1.200</b>.';
    $('#pm-cta').href = waLink(`Oi David! Vi o projeto ${$('h3', work).textContent} no seu portfólio e quero um site assim para o meu negócio.`);
    pmFrom = work;
    const gap = innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.paddingRight = gap ? gap + 'px' : '';
    root.classList.add('pm-lock');
    stopSmooth();
    pmPanel.classList.remove('anim');
    pm.classList.add('open');
    if (!RM.matches) {
      // começa exatamente em cima do card e cresce até o centro
      const a = $('.tilt', work).getBoundingClientRect();
      const b = pmPanel.getBoundingClientRect();
      pmPanel.style.transform = `translate(${(a.left - b.left).toFixed(1)}px,${(a.top - b.top).toFixed(1)}px) scale(${(a.width / b.width).toFixed(4)},${(a.height / b.height).toFixed(4)})`;
      void pmPanel.offsetWidth;
      pmPanel.classList.add('anim');
      pmPanel.style.transform = '';
    }
    setTimeout(() => $('.pm-close', pm).focus({ preventScroll: true }), 60);
  }
  function closeProject() {
    if (!pm.classList.contains('open') || pmBusy) return;
    const work = pmFrom;
    if (!RM.matches && work) {
      pmBusy = true;
      const a = $('.tilt', work).getBoundingClientRect();
      pmPanel.style.transform = '';
      const b = pmPanel.getBoundingClientRect();
      pmPanel.classList.add('anim');
      pmPanel.style.transform = `translate(${(a.left - b.left).toFixed(1)}px,${(a.top - b.top).toFixed(1)}px) scale(${(a.width / b.width).toFixed(4)},${(a.height / b.height).toFixed(4)})`;
    }
    pm.classList.remove('open');
    setTimeout(() => {
      pmPanel.classList.remove('anim');
      pmPanel.style.transform = '';
      root.classList.remove('pm-lock');
      document.documentElement.style.paddingRight = '';
      pmBusy = false;
      if (work) $('.work-open', work).focus({ preventScroll: true });
    }, RM.matches ? 0 : 800);
  }
  $$('.work').forEach(work => {
    $('.tilt', work).addEventListener('click', () => openProject(work));
  });
  pm.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeProject(); });
  addEventListener('keydown', e => {
    if (!pm.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeProject(); return; }
    if (e.key === 'Tab') {
      const f = $$('button, a[href]', pm).filter(el => el.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- links do menu: a página desce devagar até a seção ---------- */
  let tweenRaf = null;
  const stopTween = () => { if (tweenRaf) { cancelAnimationFrame(tweenRaf); tweenRaf = null; } };
  function tweenScroll(to) {
    stopSmooth();
    stopTween();
    to = clamp(to, 0, maxScroll());
    if (RM.matches) { scrollTo({ top: to, behavior: 'instant' }); return; }
    const from = scrollY, dist = to - from;
    const dur = clamp(Math.abs(dist) * 0.16, 700, 1900);
    const t0 = performance.now();
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    let set = from;
    const step = now => {
      // outra coisa moveu a página (barra de rolagem, busca, outro link): a descida cede o lugar
      if (Math.abs(scrollY - set) > 3) { tweenRaf = null; return; }
      const t = clamp((now - t0) / dur, 0, 1);
      set = from + dist * ease(t);
      scrollTo({ top: set, behavior: 'instant' });
      tweenRaf = t < 1 ? requestAnimationFrame(step) : null;
    };
    tweenRaf = requestAnimationFrame(step);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('skip')) return;
    const id = a.getAttribute('href');
    const el = id.length > 1 && document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    tweenScroll(id === '#topo' ? 0 : el.getBoundingClientRect().top + scrollY - margin);
    history.replaceState(null, '', id);
  });
  addEventListener('wheel', stopTween, { passive: true });
  addEventListener('touchstart', stopTween, { passive: true });
  addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) stopTween(); });

  /* ---------- movimento reduzido ao vivo, nas duas direções ---------- */
  function pinToFinalStates() {
    skyStop();
    groups.forEach(g => g.classList.add('in', 'done'));
    lastDraw = -1;
    drawSteps();
    depthEls.forEach(o => { o.el.style.transform = ''; o.y = 0; });
    $$('.tilt, .magnet').forEach(el => { el.style.transform = ''; });
    spotEl.classList.remove('on');
    ptr.tcx = ptr.tcy = ptr.cx = ptr.cy = 0;
    ptr.drag = 0;
    paintStars();
  }
  function unpinFinalStates() {
    skyStart();
    lastDraw = -1;
    stepEls.forEach(s => { s._on = undefined; });
    drawSteps();
    queueDepth();
  }
  RM.addEventListener('change', e => {
    applySmooth();
    if (e.matches) pinToFinalStates();
    else unpinFinalStates();
  });
  if (RM.matches) pinToFinalStates();

  applyHeroMode();
})();
