(() => {
  // Respect reduced-motion early (used by multiple features)
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Configurable app URL
  const DEFAULT_APP_URL = 'https://app.juravia.app/';
  const appUrl = (window.JV_APP_URL || window.JURAVIA_APP_URL || DEFAULT_APP_URL);

  document.querySelectorAll('[data-jv-app-link]').forEach((a) => {
    if (a && a.getAttribute('href') != null) a.setAttribute('href', appUrl);
  });

  // Mobile drawer
  const btn = document.querySelector('[data-menu-btn]');
  const drawer = document.querySelector('[data-drawer]');
  const overlay = document.querySelector('[data-drawer-overlay]');

  function closeDrawer() {
    if (!drawer) return;
    drawer.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function openDrawer() {
    if (!drawer) return;
    drawer.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  if (btn && drawer) {
    btn.addEventListener('click', () => {
      const open = drawer.style.display === 'block';
      open ? closeDrawer() : openDrawer();
    });

    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeDrawer));
    if (overlay) overlay.addEventListener('click', closeDrawer);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  // Reveal on scroll (IntersectionObserver)
  const els = Array.from(document.querySelectorAll('.reveal'));

  // Stagger within groups (for a more premium scroll feel)
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    const items = Array.from(group.querySelectorAll('.reveal'));
    items.forEach((el, i) => {
      el.style.setProperty('--d', `${Math.min(i * 70, 420)}ms`);
    });
  });
  if ('IntersectionObserver' in window && els.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach((el) => el.classList.add('is-in'));
  }



  // Active section highlight in nav (home anchors)
  const navLinks = Array.from(document.querySelectorAll('.navlinks a[href^="#"]'));
  if (navLinks.length && 'IntersectionObserver' in window) {
    const map = navLinks
      .map((a) => ({ a, id: a.getAttribute('href') }))
      .filter((x) => x.id && x.id.length > 1)
      .map((x) => ({ ...x, sec: document.querySelector(x.id) }))
      .filter((x) => x.sec);

    const setActive = (id) => {
      map.forEach((x) => x.a.classList.toggle('is-active', x.id === id));
    };

    const ioNav = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActive('#' + en.target.id);
        });
      },
      { root: null, rootMargin: '-35% 0px -55% 0px', threshold: 0.01 }
    );

    map.forEach((x) => ioNav.observe(x.sec));
  }


// Guides search (hub)
const guideSearch = document.querySelector('[data-guide-search]');
if (guideSearch) {
  const items = Array.from(document.querySelectorAll('[data-guide-item]'));
  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
  guideSearch.addEventListener('input', () => {
    const q = norm(guideSearch.value).trim();
    items.forEach((el) => {
      const hay = norm(el.textContent);
      el.style.display = (!q || hay.includes(q)) ? '' : 'none';
    });
  }, { passive: true });
}
// Reviews slider (home)
const revTrack = document.querySelector('[data-rev-track]');
const revPrev = document.querySelector('[data-rev-prev]');
const revNext = document.querySelector('[data-rev-next]');
if (revTrack && revPrev && revNext) {
  const step = (dir) => {
    const amount = Math.max(260, Math.floor(revTrack.clientWidth * 0.85));
    revTrack.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };
  revPrev.addEventListener('click', () => step(-1), { passive: true });
  revNext.addEventListener('click', () => step(1), { passive: true });
}

  // Subtle parallax for key visuals (no libs). Disabled on prefers-reduced-motion.
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight || 800;
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height * 0.5;
        const offset = (center - vh * 0.5) / vh; // roughly -0.5..0.5
        const amt = Math.max(-14, Math.min(14, offset * -16));
        el.style.transform = `translateY(${amt}px)`;
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  // Subtle particles (canvas) — lightweight, disabled on prefers-reduced-motion
  const canvas = document.getElementById('jv-particles');

  const preferSaveData = (navigator && navigator.connection && navigator.connection.saveData) ? true : false;
  const strongDevice = (navigator && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency >= 4 : true;
  const bigScreen = window.matchMedia ? window.matchMedia('(min-width: 900px)').matches : (window.innerWidth >= 900);
  const enableParticles = !preferSaveData && strongDevice && bigScreen;

  if (canvas && (!enableParticles || reduceMotion)) { canvas.style.display = 'none'; }

  if (canvas && !reduceMotion && enableParticles) {
    const ctx = canvas.getContext('2d', { alpha: true });
    let w = 0, h = 0, dpr = 1;
    const count = Math.min(32, Math.max(18, Math.floor((window.innerWidth * window.innerHeight) / 42000)));
    const particles = [];

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) { return min + Math.random() * (max - min); }

    function seed() {
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(0.7, 2.2),
          vx: rand(-0.08, 0.08),
          vy: rand(-0.06, 0.06),
          a: rand(0.14, 0.48),
          c: Math.random() < 0.75 ? '42,107,255' : '212,175,55'
        });
      }
    }

    let raf = 0;
    function frame() {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);

      // gentle fade layer for smoother motion
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(6,8,20,0.10)';
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},${p.a})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    resize();
    seed();
    frame();

    window.addEventListener('resize', () => {
      resize();
      seed();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        frame();
      }
    });
  }

  // Micro-tilt on cards (premium feel). Desktop only, disabled on reduced motion.
  const tiltTargets = Array.from(document.querySelectorAll('[data-tilt]'));
  const canTilt = !reduceMotion && window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (canTilt && tiltTargets.length) {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    tiltTargets.forEach((el) => {
      let raf = 0;
      const onMove = (ev) => {
        const rect = el.getBoundingClientRect();
        const px = (ev.clientX - rect.left) / rect.width;
        const py = (ev.clientY - rect.top) / rect.height;
        const rx = clamp((0.5 - py) * 6.0, -4, 4);
        const ry = clamp((px - 0.5) * 7.0, -5, 5);
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
          el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
        });
      };
      const onLeave = () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      };
      el.addEventListener('mousemove', onMove, { passive: true });
      el.addEventListener('mouseleave', onLeave, { passive: true });
    });
  }
})();