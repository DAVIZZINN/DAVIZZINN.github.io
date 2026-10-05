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
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- WhatsApp ---------- */
  const WA = 'https://wa.me/5517996604865';
  const waLink = msg => WA + '?text=' + encodeURIComponent(msg);
  $$('[data-wa]').forEach(a => { a.href = waLink(a.dataset.wa); });

  /* ---------- divisão do texto das legendas ---------- */
  function splitTitle(el, seed, fx, spread) {
    const text = el.textContent.trim();
    const em = el.dataset.em || '';
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr';
    sr.textContent = text;
    const vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    const r = rng(seed);
    const words = text.split(' ');
    const total = text.replace(/ /g, '').length;
    let ci = 0;
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'w' + (em && word === em ? ' em' : '');
      w.style.setProperty('--th', (wi / words.length * (fx === 'punch' ? 0.5 : 0.45)).toFixed(3));
      if (fx === 'scatter' || fx === 'grid') {
        for (const ch of word) {
          const c = document.createElement('span');
          c.className = 'c';
          c.textContent = ch;
          if (fx === 'scatter') {
            c.style.setProperty('--th', (r() * spread).toFixed(3));
            c.style.setProperty('--jx', ((r() - 0.5) * 90).toFixed(1) + 'px');
            c.style.setProperty('--jy', ((r() - 0.5) * 64).toFixed(1) + 'px');
            c.style.setProperty('--jr', ((r() - 0.5) * 70).toFixed(1) + 'deg');
          } else {
            c.style.setProperty('--th', (ci / total * spread + r() * 0.06).toFixed(3));
            c.style.setProperty('--jx', (16 + r() * 12).toFixed(1) + 'px');
          }
          ci++;
          w.appendChild(c);
        }
      } else {
        w.textContent = word;
      }
      vis.appendChild(w);
      if (wi < words.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    el.append(sr, vis);
  }

  /* ---------- ponteiro: mouse, caneta e toque ---------- */
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const ptr = { tx: innerWidth / 2, ty: innerHeight * 0.3, x: innerWidth / 2, y: innerHeight * 0.3, cx: 0, cy: 0, tcx: 0, tcy: 0, raf: null, last: 0 };
  const smooth = { on: false };

  /* ---------- hero: a vista explodida ---------- */
  const hero = $('.hero');
  const stage = $('.stage');
  const stack = $('#stack');
  const layers = $$('.layer', stack);
  const cue = $('.cue');
  const hudN = $('#hudN');
  const hudTicks = $$('.hud-ticks i');

  const bands = $$('.band').map((el, i, arr) => ({
    el, a: +el.dataset.a, b: +el.dataset.b, ramp: +el.dataset.ramp || 0,
    first: i === 0, last: i === arr.length - 1, op: -1, k: -1, on: null
  }));
  bands.forEach((b, i) => {
    const fx = (b.el.className.match(/fx-(\w+)/) || [])[1];
    splitTitle($('.t', b.el), 101 + i * 17, fx, +b.el.dataset.spread || 0.5);
  });

  let W = 0, G = 0, shiftX = 0;
  const STACKED = matchMedia('(orientation: portrait) and (max-width: 1100px), (max-width: 600px)');
  let scrubOn = false, heroOn = true;
  let target = 0, shown = 0, rafId = null, lastTick = 0;
  let loadK = 0, loadRaf = null;
  const sc = { stack: '', type: -1, live: -1, cue: -1, n: -1, label: '', labelAt: 0, L: layers.map(() => ({ t: '', o: -1, hi: -1, ao: -1 })) };

  // no celular a pilha explodida começa um pouco à direita para os rótulos caberem, e volta ao centro ao assentar
  function measure() { W = stack.offsetWidth; G = W * 0.25; shiftX = STACKED.matches ? W * 0.09 : 0; }

  function heroProgress() {
    const range = hero.offsetHeight - stage.offsetHeight;
    if (range <= 0) return 1;
    return clamp(-hero.getBoundingClientRect().top / range, 0, 1);
  }

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
    const act = [o2, o3, o3, o4];
    // só a camada do topo da pilha mantém o rótulo: ele some quando outra camada pousa em cima
    const free = [1 - land[1], 1 - land[2], 1 - land[3], 1 - sstep(0.565, 0.605, p)];

    layers.forEach((el, i) => {
      const L = sc.L[i];
      const lt = `translateZ(${zs[i].toFixed(2)}px)`;
      if (lt !== L.t) { el.style.transform = lt; L.t = lt; }
      const o = opa[i];
      if (Math.abs(o - L.o) > 0.004 || (o !== L.o && (o === 0 || o === 1))) { el.style.opacity = o.toFixed(3); L.o = o; }
      L.hi = setVar(el, '--hi', hi[i], L.hi, 0.01);
      L.ao = setVar(el, '--ao', annoBase * free[i] * (0.7 + 0.3 * act[i]), L.ao, 0.01);
    });

    sc.type = setVar(stack, '--type', lerp(0.32, 1, sstep(0.18, 0.34, p)), sc.type, 0.004);
    sc.live = setVar(stack, '--live', sstep(0.9, 0.98, p), sc.live, 0.01);
    sc.cue = setVar(cue, '--cue', 1 - sstep(0.01, 0.05, p), sc.cue, 0.01);

    const n = p < 0.19 ? 0 : 1 + (land[1] > 0.5) + (land[2] > 0.5) + (land[3] > 0.5);
    if (n !== sc.n) { hudTicks.forEach((tk, i) => tk.classList.toggle('on', i < n)); sc.n = n; }
    return n;
  }

  function updateLabel(text, now) {
    if (now - sc.labelAt < 100) return;
    if (text === sc.label) return;
    sc.label = text;
    sc.labelAt = now;
    hudN.textContent = text;
  }

  function updateCaptions(p, ops) {
    bands.forEach((b, i) => {
      const op = ops[i];
      if (Math.abs(op - b.op) > 0.004 || (op !== b.op && (op === 0 || op === 1))) { b.el.style.opacity = op.toFixed(3); b.op = op; }
      const ramp = b.ramp || Math.min(0.035, (b.b - b.a) * 0.35);
      let k = clamp((p - b.a) / ramp, 0, 1);
      if (b.first) k = Math.max(k, loadK);
      b.k = setVar(b.el, '--k', k, b.k, 0.008);
      const on = op > 0.5;
      if (on !== b.on) { b.el.classList.toggle('on', on); b.on = on; }
    });
  }

  function frame(p, now) {
    const ops = bands.map(b => bandOpacity(b, p));
    const n = renderScene(p, ops);
    updateCaptions(p, ops);
    updateLabel(String(n), now);
  }

  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    const k = smooth.on ? 0.24 : 0.14;
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    if (Math.abs(target - shown) < 0.0004) {
      shown = target;
      rafId = null;
      lastTick = 0;
    } else {
      rafId = requestAnimationFrame(tick);
    }
    frame(shown, now);
  }

  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOn) rafId = requestAnimationFrame(tick);
  }

  function startLoadRamp() {
    if (loadK >= 1 || loadRaf) return;
    const t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / 1300, 0, 1);
      loadK = 1 - Math.pow(1 - t, 3);
      updateCaptions(shown, bands.map(b => bandOpacity(b, shown)));
      loadRaf = t < 1 ? requestAnimationFrame(step) : null;
    };
    loadRaf = requestAnimationFrame(step);
  }

  function resetCaches() {
    sc.stack = ''; sc.type = sc.live = sc.cue = sc.n = -1; sc.label = ''; sc.labelAt = 0;
    sc.L.forEach(L => { L.t = ''; L.o = L.hi = L.ao = -1; });
    bands.forEach(b => { b.op = -1; b.k = -1; b.on = null; });
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

  // mantém o leitor no mesmo lugar quando a altura do hero muda (viradas ao vivo do portão)
  const afterHero = $('#por-que');
  function toggleHeroClass(on) {
    const top0 = afterHero.getBoundingClientRect().top;
    root.classList.toggle('scrub', on);
    if (top0 < innerHeight) {
      const shift = afterHero.getBoundingClientRect().top - top0;
      if (Math.abs(shift) > 1) scrollBy({ top: shift, behavior: 'instant' });
    }
  }

  function enableScrub() {
    if (scrubOn) return;
    scrubOn = true;
    toggleHeroClass(true);
    measure();
    resetCaches();
    addEventListener('scroll', onScroll, { passive: true });
    target = shown = heroProgress();
    frame(shown, performance.now());
    startLoadRamp();
  }

  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    removeEventListener('scroll', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; lastTick = 0; }
    clearSceneInline();
    toggleHeroClass(false);
  }

  // o portão: movimento reduzido e celular deitado sem altura recebem o quadro final parado
  const GATES = [
    '(prefers-reduced-motion: reduce)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)'
  ];
  const MQLS = GATES.map(q => matchMedia(q));
  function applyHeroMode() {
    if (MQLS.some(m => m.matches)) disableScrub();
    else enableScrub();
  }
  MQLS.forEach(m => m.addEventListener('change', applyHeroMode));

  new IntersectionObserver(es => {
    heroOn = es[0].isIntersecting;
    if (heroOn && scrubOn) onScroll();
  }).observe(hero);

  let resizeRaf = null;
  addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      if (!scrubOn) return;
      measure();
      resetCaches();
      target = shown = heroProgress();
      frame(shown, performance.now());
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

  function updateCfg(animate) {
    const f = new FormData(cfg);
    const biz = f.get('biz');
    const style = f.get('estilo');
    const x = f.getAll('x');
    pv.innerHTML = msHTML(biz, style, { items: x.includes('items'), gallery: x.includes('gallery'), map: x.includes('map'), anim: x.includes('anim') });
    pvUrl.textContent = BIZ[biz].url;
    const [name, price] = priceFor(x);
    $('#pk-name').textContent = name;
    $('#pk-price').textContent = price;
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
    spotEl.style.transform = `translate3d(${ptr.x.toFixed(1)}px,${ptr.y.toFixed(1)}px,0)`;
    if (scrubOn && heroOn) frame(shown, now);
    const rest = Math.abs(ptr.tx - ptr.x) < 0.5 && Math.abs(ptr.ty - ptr.y) < 0.5 &&
      Math.abs(ptr.tcx - ptr.cx) < 0.002 && Math.abs(ptr.tcy - ptr.cy) < 0.002;
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
  addEventListener('pointerdown', ptrAt, { passive: true });
  document.addEventListener('pointerout', e => {
    if (e.relatedTarget) return;
    ptr.tcx = ptr.tcy = 0;
    ptrKick();
  });

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
      st.style.backgroundImage = st.classList.contains('streak') ? L.t.streak : st.classList.contains('b') ? L.t.b : L.t.a;
    });
  });
  $('.gx-dust').style.backgroundImage = starTiles(53, 260, 520, 0.25, 0.6, 0.3, 0.8, false).a;
  const streakEl = $('.s-near .streak');
  const galaxy = $('#galaxy');
  const horizon = $('#horizon');
  const contato = $('#contato');
  const foot = $('.foot');
  const meteor = $('#meteor');
  meteor.addEventListener('animationiteration', () => {
    meteor.style.setProperty('--tx', (45 + Math.random() * 45).toFixed(1) + '%');
    meteor.style.setProperty('--ty', (4 + Math.random() * 30).toFixed(1) + '%');
  });
  let lastY = scrollY, vel = 0, velRaf = null, streakO = -1, gxT = '', hzT = '', starsDim = null;
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
    STAR_LAYERS.forEach(L => {
      const ty = Math.round(-((y * L.speed) % L.size) * 10) / 10;
      if (ty !== L.y) { L.el.style.transform = `translate3d(0,${ty}px,0)`; L.y = ty; }
    });
    // depois do topo, as estrelas ficam mais discretas atrás dos textos; voltam a brilhar no fim, perto do planeta
    const dim = y > hero.offsetHeight - innerHeight * 0.5 && contato.getBoundingClientRect().top > innerHeight * 0.4;
    if (dim !== starsDim) { STAR_LAYERS.forEach(L => L.el.style.setProperty('--so', dim ? '0.4' : '1')); starsDim = dim; }
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
    sC += (sT - sC) * (1 - Math.pow(1 - 0.11, dt / 16.667));
    if (Math.abs(sT - sC) < 0.5) { sC = sT; sRaf = null; sLast = 0; } else sRaf = requestAnimationFrame(smoothTick);
    scrollTo({ top: sC, behavior: 'instant' });
  }
  function stopSmooth() { if (sRaf) { cancelAnimationFrame(sRaf); sRaf = null; sLast = 0; } }
  addEventListener('wheel', e => {
    if (!smooth.on || e.ctrlKey || e.defaultPrevented) return;
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

  /* ---------- movimento reduzido ao vivo, nas duas direções ---------- */
  function pinToFinalStates() {
    groups.forEach(g => g.classList.add('in', 'done'));
    lastDraw = -1;
    drawSteps();
    depthEls.forEach(o => { o.el.style.transform = ''; o.y = 0; });
    $$('.tilt, .magnet').forEach(el => { el.style.transform = ''; });
    spotEl.classList.remove('on');
    ptr.tcx = ptr.tcy = ptr.cx = ptr.cy = 0;
  }
  function unpinFinalStates() {
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
