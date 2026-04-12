(() => {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isAndroid = /Android/i.test((navigator && navigator.userAgent) || '');
  const coarsePointer = window.matchMedia ? window.matchMedia('(hover: none), (pointer: coarse)').matches : (window.innerWidth <= 900);
  const stableMobile = !!(isAndroid || coarsePointer);
  if (stableMobile) {
    document.documentElement.classList.add('jv-stable-mobile-root');
  }
  const DEFAULT_APP_URL = 'https://app.juravia.app/';
  const DEFAULT_GA4_ID = (window.JV_GA4_ID || window.JURAVIA_GA4_ID || 'G-M9PX0ZVVF2');
  const appUrl = (window.JV_APP_URL || window.JURAVIA_APP_URL || DEFAULT_APP_URL);
  const ATTR_KEYS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_page', 'landing_title'];

  function storage() {
    try { return window.sessionStorage; } catch (e) { return null; }
  }

  function pageMeta() {
    const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    const last = path === '/' ? 'home' : (path.split('/').pop() || 'page').replace(/\.html$/i, '');
    let pageType = 'landing';
    if (last === 'home') pageType = 'home';
    else if (last.startsWith('guia_') || last === 'guias') pageType = 'guide';
    else if (last.startsWith('recurrir_multa_')) pageType = 'landing';
    else if (['precios', 'como-funciona', 'ejemplos', 'quienes_somos', 'avisos', 'privacidad'].includes(last)) pageType = 'support';
    return {
      page_name: last,
      page_type: pageType,
      page_path: path,
      page_title: document.title || ''
    };
  }

  function parseQuery() {
    const out = {};
    try {
      const qp = new URLSearchParams(window.location.search || '');
      ATTR_KEYS.forEach((key) => {
        const value = qp.get(key);
        if (value) out[key] = value;
      });
    } catch (e) {}
    return out;
  }

  function storedAttrib() {
    try {
      const raw = storage() && storage().getItem('jv_attrib');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function persistAttrib(extra) {
    const merged = Object.assign({}, storedAttrib(), extra || {});
    merged.landing_page = pageMeta().page_path;
    merged.landing_title = pageMeta().page_title;
    try {
      if (storage()) storage().setItem('jv_attrib', JSON.stringify(merged));
    } catch (e) {}
    return merged;
  }

  function initGA() {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function(){ window.dataLayer.push(arguments); };
    }
    if (!document.querySelector('script[data-jv-ga4="1"]') && !document.querySelector(`script[src*="gtag/js?id=${encodeURIComponent(DEFAULT_GA4_ID)}"]`)) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(DEFAULT_GA4_ID);
      s.setAttribute('data-jv-ga4', '1');
      document.head.appendChild(s);
    }
    if (!window.__jvGaConfigured) {
      window.gtag('js', new Date());
      window.gtag('config', DEFAULT_GA4_ID, { send_page_view: true });
      window.__jvGaConfigured = true;
    }
  }

  function track(eventName, params) {
    try {
      initGA();
      const payload = Object.assign({}, persistAttrib(parseQuery()), pageMeta(), params || {});
      window.gtag('event', eventName, payload);
    } catch (e) {}
  }

  window.jvTrack = track;
  const attrib = persistAttrib(parseQuery());
  if (stableMobile && document.body) {
    document.body.classList.add('jv-stable-mobile');
  } else {
    window.addEventListener('DOMContentLoaded', () => { if (stableMobile) document.body.classList.add('jv-stable-mobile'); }, { once: true });
  }
  track('landing_view', { source_surface: 'site' });

  function inferPosition(el) {
    try {
      const rect = el.getBoundingClientRect();
      const y = rect.top + (window.scrollY || 0);
      const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 1);
      const ratio = y / docH;
      if (ratio < 0.25) return 'hero';
      if (ratio > 0.75) return 'footer';
      return 'middle';
    } catch (e) {
      return 'unknown';
    }
  }

  document.querySelectorAll('[data-jv-app-link]').forEach((a) => {
    if (!a || a.getAttribute('href') == null) return;
    try {
      const url = new URL(appUrl, window.location.href);
      Object.entries(attrib).forEach(([k, v]) => {
        if (v && !url.searchParams.get(k)) url.searchParams.set(k, v);
      });
      url.searchParams.set('landing_page', pageMeta().page_path);
      url.searchParams.set('landing_title', pageMeta().page_title);
      a.setAttribute('href', url.toString());
    } catch (e) {
      a.setAttribute('href', appUrl);
    }
    a.addEventListener('click', () => {
      const position = a.dataset.ctaPosition || inferPosition(a);
      track('landing_cta_click', {
        cta_position: position,
        cta_text: (a.textContent || '').trim().slice(0, 120),
        target_surface: 'app'
      });
      track('outbound_to_app', {
        cta_position: position,
        target_surface: 'app'
      });
    }, { passive: true });
  });

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

  const els = Array.from(document.querySelectorAll('.reveal'));
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    const items = Array.from(group.querySelectorAll('.reveal'));
    items.forEach((el, i) => {
      el.style.setProperty('--d', `${Math.min(i * 70, 420)}ms`);
    });
  });
  if ('IntersectionObserver' in window && els.length && !stableMobile) {
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

  const guideSearch = document.querySelector('[data-guide-search]');
  if (guideSearch) {
    const items = Array.from(document.querySelectorAll('[data-guide-item]'));
    const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
    let searchTracked = false;
    guideSearch.addEventListener('input', () => {
      const q = norm(guideSearch.value).trim();
      items.forEach((el) => {
        const hay = norm(el.textContent);
        el.style.display = (!q || hay.includes(q)) ? '' : 'none';
      });
      if (q && !searchTracked) {
        searchTracked = true;
        track('guide_search_used', { search_query: q.slice(0, 80) });
      }
    }, { passive: true });
  }

  document.querySelectorAll('.faq-list details, details').forEach((det) => {
    det.addEventListener('toggle', () => {
      if (!det.open) return;
      const summary = det.querySelector('summary');
      track('faq_open', { faq_question: ((summary && summary.textContent) || '').trim().slice(0, 120) });
    });
  });

  let scrollTracked = false;
  window.addEventListener('scroll', () => {
    if (scrollTracked) return;
    const doc = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
    if (doc <= 0) return;
    const pct = ((window.scrollY || window.pageYOffset || 0) / doc) * 100;
    if (pct >= 75) {
      scrollTracked = true;
      track('scroll_75', { scroll_percent: 75 });
    }
  }, { passive: true });

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

  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  if (parallaxEls.length && !reduceMotion && !stableMobile) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight || 800;
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height * 0.5;
        const offset = (center - vh * 0.5) / vh;
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



  function createStickyCTA() {
    if (!stableMobile) return;
    if (document.querySelector('.mobile-sticky-cta')) return;
    const hero = document.getElementById('hero');
    const primarySource = hero ? hero.querySelector('.hero-ctas .btn.primary, .hero-ctas .btn, .hero-ctas [data-jv-app-link], .btn.primary[data-jv-app-link]') : null;
    const fallback = document.querySelector('[data-jv-app-link].btn, [data-jv-app-link]');
    const source = primarySource || fallback;
    if (!source) return;
    const href = source.getAttribute('href') || appUrl;
    const wrapper = document.createElement('div');
    wrapper.className = 'mobile-sticky-cta';
    wrapper.innerHTML = `
      <div class="mobile-sticky-cta__copy">
        <span class="mobile-sticky-cta__eyebrow">Juravia</span>
        <span class="mobile-sticky-cta__title">Análisis gratis · escrito desde 6,99 € solo si descargas</span>
      </div>
      <a class="btn primary" data-jv-app-link href="${href}" rel="nofollow">Analizar gratis</a>
    `;
    document.body.appendChild(wrapper);
    document.body.classList.add('has-mobile-sticky-cta');

    const stickyLink = wrapper.querySelector('[data-jv-app-link]');
    if (stickyLink) {
      stickyLink.addEventListener('click', () => track('cta_click', { cta_name: 'sticky_mobile', cta_position: 'sticky', cta_page: pageMeta().page_name }), { passive: true });
    }

    let visible = false;
    let ticking = false;
    const heroHeight = hero ? Math.max(hero.offsetHeight || 0, 320) : 420;
    const showAfter = Math.max(180, Math.min(Math.round(heroHeight * 0.42), 420));
    const hideBefore = 88;

    const setVisible = (next) => {
      if (next === visible) return;
      visible = next;
      wrapper.classList.toggle('is-visible', visible);
    };

    const updateSticky = () => {
      ticking = false;
      const y = window.scrollY || window.pageYOffset || 0;
      if (visible) {
        if (y <= hideBefore) setVisible(false);
      } else if (y >= showAfter) {
        setVisible(true);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateSticky);
    };

    updateSticky();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('orientationchange', onScroll, { passive: true });
  }

  createStickyCTA();

  const canvas = document.getElementById('jv-particles');
  const preferSaveData = (navigator && navigator.connection && navigator.connection.saveData) ? true : false;
  const strongDevice = (navigator && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency >= 4 : true;
  const bigScreen = window.matchMedia ? window.matchMedia('(min-width: 900px)').matches : (window.innerWidth >= 900);
  const enableParticles = !preferSaveData && strongDevice && bigScreen && !stableMobile;

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
    window.addEventListener('resize', () => { resize(); seed(); }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { frame(); }
    });
  }
})();
