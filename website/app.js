/**
 * CervicalSentinel – Website JavaScript
 * Handles: navbar scroll, mobile menu, live demo simulation,
 *          hero phone mockup animation, tab switching, copy buttons.
 */

// ── Thresholds (mirrors firmware PostureClassifier.h & sensorSimulator.js) ──
const EMG_THR = { NORMAL: 300, MODERATE: 600, HIGH: 850 };
const NECK_THR_WARN = 30;
const SHOULDER_THR_WARN = 20;

const STRAIN_LABELS  = ['Normal', 'Mild Strain', 'Moderate Strain', 'High Strain'];
const POSTURE_LABELS = ['Good Posture', 'Forward Head', 'Rounded Shoulders', 'Forward Head + Rounded Shoulders'];
const ALERT_LEVELS   = ['OK', 'WARN', 'CRIT'];

function classifyStrain(emg) {
  if (emg <= EMG_THR.NORMAL)   return 0;
  if (emg <= EMG_THR.MODERATE) return 1;
  if (emg <= EMG_THR.HIGH)     return 2;
  return 3;
}
function classifyPosture(neck, shoulder) {
  const n = neck > NECK_THR_WARN;
  const s = shoulder > SHOULDER_THR_WARN;
  if (n && s) return 3;
  if (n)      return 1;
  if (s)      return 2;
  return 0;
}
function alertLevel(sc, pc) {
  if (sc === 3 || pc === 3) return 2;
  if (sc >= 2 || pc >= 1)  return 1;
  return 0;
}

// ── Colour helpers ──────────────────────────────────────────────────────────
function emgColor(emg) {
  if (emg <= EMG_THR.NORMAL)   return '#4CAF50';
  if (emg <= EMG_THR.MODERATE) return '#FF9800';
  if (emg <= EMG_THR.HIGH)     return '#FF5722';
  return '#F44336';
}
function strainClass(sc) {
  if (sc === 0) return '';
  if (sc === 1) return '';
  return sc === 3 ? 'crit' : 'warn';
}
function alertClass(al) {
  if (al === 0) return '';
  return al === 2 ? 'crit' : 'warn';
}
function alertIcon(al)  { return al === 0 ? '✅' : al === 1 ? '⚠️' : '🚨'; }
function alertText(al, sc, pc) {
  if (al === 0) return 'All clear — great posture!';
  if (al === 2 && sc === 3) return 'CRITICAL: High muscle strain detected — take a break now!';
  if (al === 2 && pc === 3) return 'CRITICAL: Forward head + rounded shoulders — correct immediately!';
  if (pc === 1) return 'WARNING: Forward head posture detected — lift your chin.';
  if (pc === 2) return 'WARNING: Rounded shoulders — pull your shoulder blades back.';
  return 'WARNING: Moderate muscle strain — consider resting.';
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. NAVBAR – scroll shadow + mobile hamburger
// ══════════════════════════════════════════════════════════════════════════════
(function initNavbar() {
  const navbar  = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Close mobile menu when a link is clicked
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
})();

// ══════════════════════════════════════════════════════════════════════════════
// 2. HERO PHONE MOCKUP – animated mini live feed
// ══════════════════════════════════════════════════════════════════════════════
(function initHeroMockup() {
  const BARS = 20;
  const chartEl  = document.getElementById('heroChart');
  const emgBarEl = document.getElementById('heroEmgBar');
  const emgValEl = document.getElementById('heroEmgVal');
  const strainEl = document.getElementById('heroStrain');
  const postureEl= document.getElementById('heroPosture');
  const scoreEl  = document.getElementById('heroScore');
  const alertsEl = document.getElementById('heroAlerts');

  if (!chartEl) return;

  // Initialise chart bars
  const bars = [];
  for (let i = 0; i < BARS; i++) {
    const b = document.createElement('div');
    b.className = 'mini-bar';
    b.style.cssText = 'flex:1; border-radius:2px 2px 0 0; background:#CFD8DC; height:4px;';
    chartEl.appendChild(b);
    bars.push(b);
  }

  let history = Array(BARS).fill(150);
  let alertCount = 0;
  let totalScore = 100;
  let tick = 0;

  function heroTick() {
    tick++;
    const isBad = (tick % 12) >= 9; // bad phase for ~3s every 12s
    const base = isBad ? 620 : 180;
    const emg  = Math.round(Math.max(0, Math.min(1023, base + (Math.random() - 0.5) * 120)));

    history = [...history.slice(1), emg];

    const sc  = classifyStrain(emg);
    const nk  = isBad ? 35 : 11;
    const sh  = isBad ? 22 : 7;
    const pc  = classifyPosture(nk, sh);
    const al  = alertLevel(sc, pc);

    // Update bar chart
    const maxH = Math.max(...history) || 1;
    bars.forEach((b, i) => {
      const pct = (history[i] / maxH) * 100;
      b.style.height = Math.max(4, pct * 0.28) + 'px';
      b.style.background = emgColor(history[i]);
    });

    // Update stats
    const barPct = Math.min(100, (emg / 1023) * 100);
    emgBarEl.style.width = barPct + '%';
    emgBarEl.style.background = emgColor(emg);
    emgValEl.textContent = emg;

    strainEl.textContent  = STRAIN_LABELS[sc];
    strainEl.style.color  = sc === 0 ? '#4CAF50' : sc === 1 ? '#FF9800' : '#F44336';
    postureEl.textContent = pc === 0 ? 'Good' : pc === 3 ? 'Combined' : POSTURE_LABELS[pc];
    postureEl.style.color = pc === 0 ? '#4CAF50' : '#FF9800';

    if (al > 0) alertCount++;
    totalScore = Math.max(0, Math.min(100, 100 - alertCount * 3));
    scoreEl.textContent  = totalScore + '%';
    alertsEl.textContent = alertCount;
  }

  setInterval(heroTick, 1200);
  heroTick();
})();

// ══════════════════════════════════════════════════════════════════════════════
// 3. LIVE DEMO – sliders + preset buttons
// ══════════════════════════════════════════════════════════════════════════════
(function initDemo() {
  const emgSlider      = document.getElementById('emgSlider');
  const neckSlider     = document.getElementById('neckSlider');
  const shoulderSlider = document.getElementById('shoulderSlider');
  if (!emgSlider) return;

  const CHART_BARS = 20;
  const chartEl = document.getElementById('demoChart');
  const demoBars = [];
  for (let i = 0; i < CHART_BARS; i++) {
    const b = document.createElement('div');
    b.style.cssText = 'flex:1; border-radius:2px 2px 0 0; background:#CFD8DC; height:4px;';
    chartEl.appendChild(b);
    demoBars.push(b);
  }
  let demoHistory = Array(CHART_BARS).fill(0);

  function updateDemo() {
    const emg      = parseInt(emgSlider.value);
    const neck     = parseFloat(neckSlider.value);
    const shoulder = parseFloat(shoulderSlider.value);

    const sc = classifyStrain(emg);
    const pc = classifyPosture(neck, shoulder);
    const al = alertLevel(sc, pc);

    // Values
    document.getElementById('demoEmgVal').textContent      = emg;
    document.getElementById('demoNeckVal').textContent     = neck + '°';
    document.getElementById('demoShoulderVal').textContent = shoulder + '°';

    // Badges
    const strainBadge  = document.getElementById('demoStrainBadge');
    const postureBadge = document.getElementById('demoPostureBadge');
    strainBadge.textContent  = STRAIN_LABELS[sc];
    postureBadge.textContent = POSTURE_LABELS[pc];
    strainBadge.className    = 'class-badge ' + strainClass(sc);
    postureBadge.className   = 'class-badge ' + (pc === 0 ? '' : pc === 3 ? 'crit' : 'warn');

    // Alert banner
    const banner = document.getElementById('demoAlertBanner');
    document.getElementById('demoAlertIcon').textContent = alertIcon(al);
    document.getElementById('demoAlertText').textContent = alertText(al, sc, pc);
    banner.className = 'alert-banner ' + alertClass(al);

    // BLE packet
    document.getElementById('demoBlePacket').textContent =
      `{"e":${emg},"n":${neck.toFixed(1)},"s":${shoulder.toFixed(1)},"sc":${sc},"pc":${pc},"al":${al},"b":85}`;

    // Update chart history
    demoHistory = [...demoHistory.slice(1), emg];
    const maxH = Math.max(...demoHistory) || 1;
    demoBars.forEach((b, i) => {
      const pct = (demoHistory[i] / maxH) * 100;
      b.style.height = Math.max(4, pct * 0.44) + 'px';
      b.style.background = emgColor(demoHistory[i]);
    });
  }

  emgSlider.addEventListener('input', updateDemo);
  neckSlider.addEventListener('input', updateDemo);
  shoulderSlider.addEventListener('input', updateDemo);

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      emgSlider.value      = btn.dataset.emg;
      neckSlider.value     = btn.dataset.neck;
      shoulderSlider.value = btn.dataset.shoulder;
      updateDemo();
    });
  });

  updateDemo();
})();

// ══════════════════════════════════════════════════════════════════════════════
// 4. TABS – Get Started section
// ══════════════════════════════════════════════════════════════════════════════
(function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const content = document.getElementById('tab-' + target);
      if (content) content.classList.add('active');
    });
  });
})();

// ══════════════════════════════════════════════════════════════════════════════
// 5. COPY BUTTONS
// ══════════════════════════════════════════════════════════════════════════════
(function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.textContent = '✓ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
})();

// ══════════════════════════════════════════════════════════════════════════════
// 6. SCROLL ANIMATION – fade-in on scroll
// ══════════════════════════════════════════════════════════════════════════════
(function initScrollAnim() {
  const cards = document.querySelectorAll('.feature-card, .hw-card, .step, .gs-step');
  if (!('IntersectionObserver' in window)) return;

  const style = document.createElement('style');
  style.textContent = `
    .anim-hidden { opacity: 0; transform: translateY(28px); transition: opacity 0.5s ease, transform 0.5s ease; }
    .anim-visible { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(style);

  cards.forEach(c => c.classList.add('anim-hidden'));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('anim-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  cards.forEach(c => obs.observe(c));
})();
