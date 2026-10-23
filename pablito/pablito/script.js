(() => {
  'use strict';

  const root = document.documentElement;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Accesibilidad: texto más grande ---------- */
  const a11y = document.getElementById('a11y');
  if (a11y) {
    a11y.addEventListener('click', () => {
      const on = root.classList.toggle('big-text');
      a11y.setAttribute('aria-pressed', String(on));
    });
  }

  /* ---------- 2. Entrada escalonada de las tarjetas ---------- */
  const cards = [...document.querySelectorAll('.passion')];
  cards.forEach((c, i) => c.style.setProperty('--i', i));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    cards.forEach((c) => io.observe(c));
  } else {
    cards.forEach((c) => c.classList.add('in'));
  }

  // Todo lo que sigue necesita mouse real
  if (!fine) return;

  /* ---------- 3. Tarjetas: foco de luz + inclinación 3D ---------- */
  cards.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      if (!reduce) {
        card.style.transform =
          `perspective(900px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateY(-4px)`;
      }
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });

  /* ---------- 4. Botón CV magnético ---------- */
  const cv = document.querySelector('.btn-cv');
  if (cv && !reduce) {
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.25;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
      cv.style.translate = `${dx}px ${dy}px`;
    });
    cv.addEventListener('pointerleave', () => { cv.style.translate = ''; });
  }

  /* ---------- 5. Parallax suave de la foto ---------- */
  const section = document.querySelector('.life');
  const photo = document.getElementById('photo');
  const photoWrap = photo && photo.querySelector('.photo-wrap');
  const photoImg = photo && photo.querySelector('img');

  if (section && photoWrap && !reduce) {
    section.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      photoWrap.style.transform = `translate3d(${nx * -16}px, ${ny * -12}px, 0) rotate(${nx * 2}deg)`;
    });
    section.addEventListener('pointerleave', () => { photoWrap.style.transform = ''; });
  }

  /* ---------- 6. Cursor circular ----------
     - Sobre la foto: círculo con la misma foto (efecto lupa).
       Si #photo tiene data-cursor="ruta.jpg", usa esa imagen fija.
     - Sobre cada tarjeta: círculo con la imagen de su data-cursor
       (si el archivo no existe, muestra el emoji de la tarjeta). */
  if (!photo || !photoImg) return;

  root.classList.add('has-lens');

  const lens = document.createElement('div');
  lens.className = 'lens';
  lens.setAttribute('aria-hidden', 'true');
  lens.innerHTML = '<div class="lens-img"></div><span class="lens-emoji"></span>';
  document.body.appendChild(lens);

  const lensImg = lens.querySelector('.lens-img');
  const lensEmoji = lens.querySelector('.lens-emoji');
  const SIZE = lens.offsetWidth || 150;
  const ZOOM = 2.1;
  const ease = reduce ? 1 : 0.22;

  let mx = -300, my = -300, x = -300, y = -300;
  let mode = null, active = null, token = 0;

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  // Revisa si una imagen existe antes de usarla como cursor
  const probeCache = new Map();
  const probe = (src) => {
    if (!src) return Promise.resolve(false);
    if (!probeCache.has(src)) {
      probeCache.set(src, new Promise((res) => {
        const im = new Image();
        im.onload = () => res(true);
        im.onerror = () => res(false);
        im.src = src;
      }));
    }
    return probeCache.get(src);
  };
  cards.forEach((c) => probe(c.dataset.cursor));
  if (photo.dataset.cursor) probe(photo.dataset.cursor);

  function loop() {
    x += (mx - x) * ease;
    y += (my - y) * ease;
    lens.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    if (mode === 'zoom') {
      const r = photoImg.getBoundingClientRect();
      lensImg.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
      lensImg.style.backgroundPosition =
        `${SIZE / 2 - (x - r.left) * ZOOM}px ${SIZE / 2 - (y - r.top) * ZOOM}px`;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function setImage(src, emoji) {
    const myToken = ++token;
    lensEmoji.textContent = emoji || '';
    lensImg.style.backgroundImage = '';
    lensImg.style.backgroundSize = 'cover';
    lensImg.style.backgroundPosition = 'center';
    lens.classList.add('no-img');
    if (!src) return;
    probe(src).then((ok) => {
      if (!ok || myToken !== token) return;
      lensImg.style.backgroundImage = `url("${src}")`;
      lens.classList.remove('no-img');
    });
  }

  function show(kind, el) {
    if (!lens.classList.contains('on')) { x = mx; y = my; }
    active = el;

    if (kind === 'card') {
      mode = 'card';
      lens.dataset.mode = 'card';
      const icon = el.querySelector('.passion-icon');
      setImage(el.dataset.cursor, icon ? icon.textContent.trim() : '');
    } else if (el.dataset.cursor) {            // foto con imagen fija
      mode = 'static';
      lens.dataset.mode = 'photo';
      setImage(el.dataset.cursor, '');
    } else {                                   // foto con lupa
      mode = 'zoom';
      lens.dataset.mode = 'photo';
      token++;
      lens.classList.remove('no-img');
      lensImg.style.backgroundImage = `url("${photoImg.currentSrc || photoImg.src}")`;
      lensImg.style.backgroundRepeat = 'no-repeat';
    }
    lens.classList.add('on');
  }

  function hide(el) {
    if (el && active !== el) return;
    lens.classList.remove('on');
    mode = null;
    active = null;
  }

  function bind(el, kind) {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      show(kind, el);
    });
    el.addEventListener('pointerleave', () => hide(el));
  }

  bind(photo, 'photo');
  cards.forEach((c) => bind(c, 'card'));
  document.addEventListener('mouseleave', () => hide());
  addEventListener('blur', () => hide());
})();