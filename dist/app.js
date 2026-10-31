"use strict";

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const ACCOUNT_KEY = "tsekap.encrypted-account.v1";
const RETENTION_DAYS = 90;
let welcomeAnimation = null;
let motionContext = null;
let routeTransitioning = false;

const CONDITIONS = [
  ["none", "No known health conditions"],
  ["asthma", "Asthma"],
  ["heart", "Heart condition"],
  ["hypertension", "Hypertension (high blood pressure)"],
  ["diabetes", "Diabetes (Type 1 or Type 2)"],
  ["epilepsy", "Epilepsy / seizure disorders"],
  ["arthritis", "Arthritis / joint conditions"],
  ["injury", "Musculoskeletal condition or physical injury"],
  ["allergy", "Food allergies"],
  ["celiac", "Celiac disease / gluten intolerance"],
  ["other", "Other health condition"],
  ["private", "Prefer not to say"]
];

// WHO 2007 BMI-for-age LMS values for completed months 180–228.
// Source: official WHO expanded BMI-for-age z-score tables.
const WHO_LMS = {
  female: [
    [180,-1.1311,20.2125,.13904],[181,-1.1232,20.2595,.1392],[182,-1.1153,20.3053,.13934],[183,-1.1074,20.3499,.13949],
    [184,-1.0996,20.3934,.13963],[185,-1.0917,20.4357,.13977],[186,-1.0838,20.4769,.13991],[187,-1.076,20.517,.14005],
    [188,-1.0681,20.556,.14018],[189,-1.0603,20.5938,.14031],[190,-1.0525,20.6306,.14044],[191,-1.0447,20.6663,.14057],
    [192,-1.0368,20.7008,.1407],[193,-1.029,20.7344,.14082],[194,-1.0212,20.7668,.14094],[195,-1.0134,20.7982,.14106],
    [196,-1.0055,20.8286,.14118],[197,-.9977,20.858,.1413],[198,-.9898,20.8863,.14142],[199,-.9819,20.9137,.14153],
    [200,-.974,20.9401,.14164],[201,-.9661,20.9656,.14176],[202,-.9582,20.9901,.14187],[203,-.9503,21.0138,.14198],
    [204,-.9423,21.0367,.14208],[205,-.9344,21.0587,.14219],[206,-.9264,21.0801,.1423],[207,-.9184,21.1007,.1424],
    [208,-.9104,21.1206,.1425],[209,-.9024,21.1399,.14261],[210,-.8944,21.1586,.14271],[211,-.8863,21.1768,.14281],
    [212,-.8783,21.1944,.14291],[213,-.8703,21.2116,.14301],[214,-.8623,21.2282,.14311],[215,-.8542,21.2444,.1432],
    [216,-.8462,21.2603,.1433],[217,-.8382,21.2757,.1434],[218,-.8301,21.2908,.14349],[219,-.8221,21.3055,.14359],
    [220,-.814,21.32,.14368],[221,-.806,21.3341,.14377],[222,-.798,21.348,.14386],[223,-.7899,21.3617,.14396],
    [224,-.7819,21.3752,.14405],[225,-.7738,21.3884,.14414],[226,-.7658,21.4014,.14423],[227,-.7577,21.4143,.14432],
    [228,-.7496,21.4269,.14441]
  ],
  male: [
    [180,-1.4961,19.7744,.12412],[181,-1.4848,19.8367,.12428],[182,-1.4733,19.8987,.12443],[183,-1.4617,19.9603,.12458],
    [184,-1.45,20.0215,.12473],[185,-1.4382,20.0823,.12487],[186,-1.4263,20.1427,.12501],[187,-1.4143,20.2026,.12514],
    [188,-1.4022,20.2621,.12528],[189,-1.39,20.3211,.12541],[190,-1.3777,20.3796,.12554],[191,-1.3653,20.4376,.12567],
    [192,-1.3529,20.4951,.12579],[193,-1.3403,20.5521,.12591],[194,-1.3277,20.6085,.12603],[195,-1.3149,20.6644,.12615],
    [196,-1.3021,20.7197,.12627],[197,-1.2892,20.7745,.12638],[198,-1.2762,20.8287,.1265],[199,-1.2631,20.8824,.12661],
    [200,-1.2499,20.9355,.12672],[201,-1.2366,20.9881,.12683],[202,-1.2233,21.04,.12694],[203,-1.2098,21.0914,.12704],
    [204,-1.1962,21.1423,.12715],[205,-1.1826,21.1925,.12726],[206,-1.1688,21.2423,.12736],[207,-1.155,21.2914,.12746],
    [208,-1.141,21.34,.12756],[209,-1.127,21.388,.12767],[210,-1.1129,21.4354,.12777],[211,-1.0986,21.4822,.12787],
    [212,-1.0843,21.5285,.12797],[213,-1.0699,21.5742,.12807],[214,-1.0553,21.6193,.12816],[215,-1.0407,21.6638,.12826],
    [216,-1.026,21.7077,.12836],[217,-1.0112,21.751,.12845],[218,-.9962,21.7937,.12855],[219,-.9812,21.8358,.12864],
    [220,-.9661,21.8773,.12874],[221,-.9509,21.9182,.12883],[222,-.9356,21.9585,.12893],[223,-.9202,21.9982,.12902],
    [224,-.9048,22.0374,.12911],[225,-.8892,22.076,.1292],[226,-.8735,22.114,.1293],[227,-.8578,22.1514,.12939],
    [228,-.8419,22.1883,.12948]
  ]
};

const state = {
  route: localStorage.getItem(ACCOUNT_KEY) ? "auth" : "welcome",
  authTab: localStorage.getItem(ACCOUNT_KEY) ? "login" : "new",
  payload: null,
  cryptoKey: null,
  onboardingStep: 0,
  disclaimerAccepted: false,
  draft: {},
  demo: false,
  menuOpen: false
};

function icon(name, cls = "icon") {
  const paths = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.3l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/><path d="m8 12 2 2 4-5"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chart: '<path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/>',
    book: '<path d="M3 4.5A3.5 3.5 0 0 1 6.5 1H11v18H6.5A3.5 3.5 0 0 0 3 22.5Z"/><path d="M21 4.5A3.5 3.5 0 0 0 17.5 1H13v18h4.5a3.5 3.5 0 0 1 3.5 3.5Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    ruler: '<path d="M7 3h10v18H7zM7 7h4M7 11h4M7 15h4"/>',
    scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 8a3 3 0 0 1 6 0M12 8v3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    activity: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    food: '<path d="M7 2v8M4 2v5a3 3 0 0 0 6 0V2M7 10v12M17 2v20M17 2c3 2 3 7 0 9"/>',
    moon: '<path d="M20 15.5A9 9 0 1 1 8.5 4 7 7 0 0 0 20 15.5Z"/>',
    trash: '<path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 10v7M14 10v7"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3M14 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    external: '<path d="M14 3h7v7M10 14 21 3M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/>',
    wifi: '<path d="M5 12.6a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01"/>',
    offline: '<path d="m3 3 18 18M8.5 16a5 5 0 0 1 4.2-1.4M5 12.6a10 10 0 0 1 3.2-2.1M12 20h.01M15.8 10.5a10 10 0 0 1 3.2 2.1"/>'
  };
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.info}</svg>`;
}

const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const base64ToBytes = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

async function deriveKey(secret, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 180000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPayload(payload, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return { iv: bytesToBase64(iv), data: bytesToBase64(data) };
}

async function savePayload() {
  if (!state.cryptoKey || state.demo) return;
  const account = JSON.parse(localStorage.getItem(ACCOUNT_KEY));
  const encrypted = await encryptPayload(state.payload, state.cryptoKey);
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ ...account, ...encrypted, updatedAt: new Date().toISOString() }));
}

async function createAccount(profile, secret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(secret, salt);
  const payload = { profile, records: [], createdAt: new Date().toISOString() };
  const encrypted = await encryptPayload(payload, key);
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ version: 1, salt: bytesToBase64(salt), ...encrypted, updatedAt: new Date().toISOString() }));
  state.payload = payload;
  state.cryptoKey = key;
  state.demo = false;
}

async function unlockAccount(secret) {
  const account = JSON.parse(localStorage.getItem(ACCOUNT_KEY));
  if (!account) throw new Error("No local profile found.");
  const key = await deriveKey(secret, base64ToBytes(account.salt));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(account.iv) }, key, base64ToBytes(account.data));
  state.cryptoKey = key;
  state.payload = JSON.parse(new TextDecoder().decode(plaintext));
  pruneRecords();
}

function pruneRecords() {
  if (!state.payload) return;
  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  state.payload.records = (state.payload.records || []).filter((record) => new Date(record.date).getTime() >= cutoff);
}

function showToast(message, kind = "info") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `${icon(kind === "success" ? "check" : kind === "warning" ? "info" : "shield", "icon icon-sm")}<span>${esc(message)}</span>`;
  toastRegion.append(toast);
  if (window.gsap && !prefersReducedMotion()) {
    window.gsap.fromTo(toast, { autoAlpha: 0, y: 14, scale: .98 }, { autoAlpha: 1, y: 0, scale: 1, duration: .36, ease: "power3.out" });
  }
  setTimeout(() => {
    if (window.gsap && !prefersReducedMotion()) window.gsap.to(toast, { autoAlpha: 0, y: 8, duration: .22, onComplete: () => toast.remove() });
    else toast.remove();
  }, 4000);
}

function completedAgeMonths(dob, onDate = new Date()) {
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return NaN;
  let months = (onDate.getFullYear() - birth.getFullYear()) * 12 + onDate.getMonth() - birth.getMonth();
  if (onDate.getDate() < birth.getDate()) months -= 1;
  return months;
}

function formatAge(months) {
  return `${Math.floor(months / 12)} years ${months % 12} month${months % 12 === 1 ? "" : "s"}`;
}

function calculateBmi(height, weight, ageMonths, sex) {
  const bmi = weight / ((height / 100) ** 2);
  const row = WHO_LMS[sex]?.find(([month]) => month === ageMonths);
  if (!row) throw new Error("WHO BMI-for-age reference is available here for ages 15–19 only.");
  const [, L, M, S] = row;
  const z = ((bmi / M) ** L - 1) / (L * S);
  const classification = z < -3 ? "Severe thinness" : z < -2 ? "Thinness" : z <= 1 ? "Within expected range" : z <= 2 ? "Overweight" : "Obesity";
  return { bmi, z, classification };
}

function classTone(classification) {
  if (classification === "Within expected range") return "";
  if (classification === "Thinness" || classification === "Overweight") return "warning";
  return "alert";
}

function formatDate(date, style = "long") {
  return new Intl.DateTimeFormat("en-PH", style === "short" ? { month: "short", day: "numeric" } : { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function firstName() {
  return state.payload?.profile?.name?.trim().split(/\s+/)[0] || "Student";
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wrapMotionWords(element) {
  if (!element || element.dataset.motionSplit) return [];
  const label = element.textContent.trim().replace(/\s+/g, " ");
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        fragment.append(document.createTextNode(part));
        return;
      }
      const clip = document.createElement("span");
      clip.className = "motion-word-clip";
      clip.setAttribute("aria-hidden", "true");
      const word = document.createElement("span");
      word.className = "motion-word";
      word.textContent = part;
      clip.append(word);
      fragment.append(clip);
    });
    node.replaceWith(fragment);
  });
  element.dataset.motionSplit = "true";
  if (label) element.setAttribute("aria-label", label);
  return [...element.querySelectorAll(".motion-word")];
}

function initMotion() {
  const gsap = window.gsap;
  if (!gsap || prefersReducedMotion()) return;
  const ScrollTrigger = window.ScrollTrigger;
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  motionContext = gsap.context(() => {
    const title = document.querySelector(".welcome-copy h1, .page-title, .form-card h1, .disclaimer-hero h1, .auth-panel h2");
    const words = wrapMotionWords(title);
    const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (words.length) intro.fromTo(words, { yPercent: 112, rotate: 1.5 }, { yPercent: 0, rotate: 0, duration: .72, stagger: .045 });
    intro.fromTo(
      ".eyebrow, .page-subtitle, .welcome-copy p, .auth-panel > p, .form-card .lead, .disclaimer-hero p",
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: .48, stagger: .06 },
      words.length ? "-=.48" : 0
    );
    intro.fromTo(
      ".page-header .button, .auth-tabs, .auth-form, .privacy-note, .avatar-stage",
      { autoAlpha: 0, y: 16, scale: .985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: .55, stagger: .06 },
      "-=.32"
    );
    intro.fromTo(".auth-logo, .story-item", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .5, stagger: .07 }, "-=.42");

    const revealTargets = gsap.utils.toArray(".page .card, .history-row, .disclaimer-card, .form-card");
    if (ScrollTrigger && revealTargets.length) {
      ScrollTrigger.batch(revealTargets, {
        start: "top 92%",
        once: true,
        onEnter: (batch) => gsap.fromTo(batch, { autoAlpha: 0, y: 30, scale: .988 }, { autoAlpha: 1, y: 0, scale: 1, duration: .68, stagger: .08, ease: "power3.out", clearProps: "transform" })
      });
    } else if (revealTargets.length) {
      gsap.from(revealTargets, { autoAlpha: 0, y: 24, duration: .6, stagger: .07, ease: "power3.out" });
    }

    [".data-row", ".tip", ".value-row", ".settings-row", ".disclaimer-points li"].forEach((selector) => {
      const elements = gsap.utils.toArray(selector);
      if (!elements.length) return;
      gsap.from(elements, { autoAlpha: 0, x: -12, duration: .45, stagger: .065, delay: .18, ease: "power2.out" });
    });

    const metric = document.querySelector(".metric-value");
    if (metric) {
      const finalValue = Number(metric.textContent);
      const counter = { value: 0 };
      gsap.to(counter, { value: finalValue, duration: 1.05, delay: .18, ease: "power3.out", onUpdate: () => { metric.textContent = counter.value.toFixed(1); } });
    }

    document.querySelectorAll(".chart").forEach((chart) => {
      const path = chart.querySelector("path");
      if (path) {
        const length = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.1, delay: .2, ease: "power2.inOut" });
      }
      gsap.from(chart.querySelectorAll("circle, text"), { autoAlpha: 0, scale: .6, duration: .35, stagger: .045, delay: .72, ease: "back.out(1.6)" });
    });

    gsap.fromTo(".range-marker", { autoAlpha: 0 }, { autoAlpha: 1, duration: .6, delay: .55, ease: "power2.out" });
    gsap.from(".rings", { rotate: -90, scale: .72, autoAlpha: 0, duration: .8, delay: .2, ease: "back.out(1.5)" });

    const zoomTargets = document.querySelectorAll(".result-card, .article-card, .history-row, .education-card, .tip, .reference-link, .data-row, .value-row");
    zoomTargets.forEach((element) => {
      element.classList.add("zoom-surface");
      element.addEventListener("pointerenter", () => gsap.to(element, { y: -3, scale: 1.012, duration: .24, ease: "power2.out", overwrite: "auto" }));
      element.addEventListener("pointerleave", () => gsap.to(element, { y: 0, scale: 1, duration: .3, ease: "power2.out", overwrite: "auto" }));
    });

    const progress = document.querySelector(".scroll-progress span");
    if (progress && ScrollTrigger) {
      ScrollTrigger.create({ start: 0, end: () => ScrollTrigger.maxScroll(window), onUpdate: (self) => gsap.set(progress, { scaleX: self.progress }) });
    }
  }, app);
}

function navigateTo(route) {
  if (routeTransitioning) return;
  const finish = () => {
    state.route = route;
    state.menuOpen = false;
    routeTransitioning = false;
    render();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };
  const surface = document.querySelector(".page");
  if (!window.gsap || prefersReducedMotion() || !surface) {
    finish();
    return;
  }
  routeTransitioning = true;
  window.gsap.to(surface, { autoAlpha: 0, y: -10, duration: .18, ease: "power2.in", onComplete: finish });
}

function render() {
  motionContext?.revert();
  motionContext = null;
  welcomeAnimation?.destroy();
  welcomeAnimation = null;
  if (!state.payload) {
    if (state.route === "disclaimer") renderDisclaimer();
    else if (state.route === "onboarding") renderOnboarding();
    else renderWelcome();
  } else if (state.route === "measurement") {
    renderShell(renderMeasurement(), "new");
  } else {
    const routes = { home: renderHome, history: renderHistory, learn: renderLearn, about: renderAbout };
    renderShell((routes[state.route] || renderHome)(), state.route);
  }
  bindEvents();
  if (!state.payload && !["disclaimer", "onboarding"].includes(state.route)) initWelcomeAvatar();
  initMotion();
}

function renderWelcome() {
  const hasAccount = Boolean(localStorage.getItem(ACCOUNT_KEY));
  app.innerHTML = `
    <main class="auth-page" id="main-content">
      <section class="auth-wrap" aria-label="TsekAP welcome">
        <div class="auth-story">
          <div class="auth-logo"><div class="brand-mark">${icon("heart", "icon icon-lg")}</div><div><strong>TsekAP</strong><span>Awareness &amp; Prevention</span></div></div>
          <div class="welcome-hero">
            <div class="welcome-copy">
              <h1>Know your number.<br>Understand your health.</h1>
              <p>A calm, private space for senior high school students to record measurements, understand BMI-for-age, and build healthier everyday habits.</p>
            </div>
            <button class="welcome-avatar" id="welcome-avatar" type="button" aria-label="Replay the doctor’s welcome animation" aria-describedby="avatar-description">
              <span class="avatar-stage">
                <span class="welcome-lottie" id="welcome-lottie" aria-hidden="true"></span>
                <img class="avatar-fallback" src="./assets/icon.svg" alt="">
                <span class="avatar-caption">Tap to say hello again</span>
              </span>
              <span class="sr-only" id="avatar-description">An animated doctor welcomes you to TsekAP.</span>
            </button>
          </div>
          <div class="story-strip">
            <div class="story-item"><strong>WHO reference</strong><span>Age- and sex-specific screening for adolescents.</span></div>
            <div class="story-item"><strong>Private by design</strong><span>Encrypted records stay on this device.</span></div>
            <div class="story-item"><strong>Works offline</strong><span>Core check-ins remain available without internet.</span></div>
          </div>
        </div>
        <div class="auth-panel">
          <h2>${hasAccount ? "Welcome back" : "Welcome to TsekAP"}</h2>
          <p>${hasAccount ? "Unlock the student profile stored on this device." : "Begin with a short safety note, then create a private student profile."}</p>
          <div class="auth-tabs" role="tablist" aria-label="Account options">
            <button class="auth-tab ${state.authTab === "login" ? "active" : ""}" data-auth-tab="login" role="tab" aria-selected="${state.authTab === "login"}">Log in</button>
            <button class="auth-tab ${state.authTab === "new" ? "active" : ""}" data-auth-tab="new" role="tab" aria-selected="${state.authTab === "new"}">New profile</button>
          </div>
          ${state.authTab === "login" ? `
            <form class="auth-form" id="login-form">
              <div class="field"><label for="login-secret">LRN passcode</label><input class="input" id="login-secret" name="secret" type="password" inputmode="numeric" autocomplete="current-password" minlength="6" required><span class="field-hint">Your passcode is used locally to decrypt the profile.</span></div>
              <p class="field-error" id="login-error" hidden></p>
              <button class="button primary full" type="submit">${icon("lock", "icon icon-sm")} Unlock profile</button>
            </form>
          ` : `
            <div class="auth-form">
              <div class="notice">${icon("shield", "icon icon-sm")}<span>This educational prototype keeps one encrypted profile on this device. It does not upload student information.</span></div>
              <button class="button primary full" id="start-monitoring">Start monitoring ${icon("arrow", "icon icon-sm")}</button>
            </div>
          `}
          <button class="button ghost full demo-button" id="try-demo">Explore with illustrative data</button>
          <div class="privacy-note">${icon("info", "icon icon-sm")}<span>TsekAP is an educational screening tool—not a diagnosis, consultation, or substitute for a qualified healthcare professional.</span></div>
        </div>
      </section>
    </main>`;
}

function initWelcomeAvatar() {
  const button = document.querySelector("#welcome-avatar");
  const container = document.querySelector("#welcome-lottie");
  if (!button || !container || !window.lottie) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  welcomeAnimation = window.lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: !reduceMotion,
    path: "./assets/doctor-welcome.json",
    rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true }
  });

  welcomeAnimation.addEventListener("DOMLoaded", () => {
    button.classList.add("is-loaded");
    if (reduceMotion) welcomeAnimation.goToAndStop(96, true);
  });
  welcomeAnimation.addEventListener("data_failed", () => button.classList.add("has-fallback"));

  button.addEventListener("click", () => welcomeAnimation?.goToAndPlay(0, true));
  button.addEventListener("pointermove", (event) => {
    if (reduceMotion) return;
    const bounds = button.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 4;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * -4;
    button.style.setProperty("--avatar-x", `${x.toFixed(2)}deg`);
    button.style.setProperty("--avatar-y", `${y.toFixed(2)}deg`);
  });
  button.addEventListener("pointerleave", () => {
    button.style.setProperty("--avatar-x", "0deg");
    button.style.setProperty("--avatar-y", "0deg");
  });
}

function renderDisclaimer() {
  app.innerHTML = `
    <main class="auth-page" id="main-content">
      <section class="disclaimer">
        <div class="card disclaimer-card">
          <div class="disclaimer-hero">
            <div class="disclaimer-icon">${icon("shield", "icon icon-lg")}</div>
            <h1>Before you continue</h1>
            <p>Please understand what TsekAP can—and cannot—tell you about your health.</p>
          </div>
          <div class="disclaimer-body">
            <ul class="disclaimer-points">
              <li><span class="check-badge">${icon("check", "icon icon-sm")}</span><span>TsekAP supports education, student health monitoring, and awareness.</span></li>
              <li><span class="check-badge">${icon("check", "icon icon-sm")}</span><span>BMI-for-age is a screening indicator. It does not independently determine overall health.</span></li>
              <li><span class="check-badge">${icon("check", "icon icon-sm")}</span><span>Results do not replace medical diagnostics, professional assessment, consultation, or advice.</span></li>
              <li><span class="check-badge">${icon("check", "icon icon-sm")}</span><span>For health concerns or a proper assessment, talk to a qualified healthcare professional.</span></li>
            </ul>
            <label class="agreement"><input type="checkbox" id="disclaimer-check"><span>I understand the purpose and limitations of TsekAP.</span></label>
            <div class="field-actions"><button class="button ghost" id="disclaimer-back">Back</button><button class="button primary" id="disclaimer-continue" disabled>I understand ${icon("arrow", "icon icon-sm")}</button></div>
          </div>
        </div>
      </section>
    </main>`;
}

function renderOnboarding() {
  const draft = state.draft;
  app.innerHTML = `
    <main class="auth-page" id="main-content">
      <section class="form-shell">
        <div class="stepper" aria-label="Profile setup step ${state.onboardingStep + 1} of 2"><span class="step-dot ${state.onboardingStep >= 0 ? "active" : ""}"></span><span class="step-dot ${state.onboardingStep === 1 ? "active" : ""}"></span></div>
        <form class="card form-card" id="onboarding-form">
          ${state.onboardingStep === 0 ? `
            <span class="eyebrow">Step 1 of 2</span>
            <h1>Set up your profile</h1>
            <p class="lead">We use precise age and sex only because WHO adolescent BMI-for-age references are age- and sex-specific.</p>
            <div class="field-grid">
              <div class="field full"><label for="full-name">Student full name</label><input class="input" id="full-name" name="name" autocomplete="name" value="${esc(draft.name)}" required maxlength="80"></div>
              <div class="field"><label for="dob">Date of birth</label><input class="input" id="dob" name="dob" type="date" value="${esc(draft.dob)}" required><span class="field-hint">TsekAP currently supports ages 15–18.</span></div>
              <fieldset class="field" style="border:0;padding:0;margin:0"><legend>Sex used by WHO chart</legend><div class="segment"><label><input type="radio" name="sex" value="female" ${draft.sex === "female" ? "checked" : ""} required><span>Female</span></label><label><input type="radio" name="sex" value="male" ${draft.sex === "male" ? "checked" : ""} required><span>Male</span></label></div></fieldset>
              <div class="field full"><label for="lrn">LRN passcode</label><input class="input" id="lrn" name="lrn" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" maxlength="20" required><span class="field-hint">Used to encrypt and unlock this local profile. TsekAP never stores the passcode itself.</span></div>
            </div>
          ` : `
            <span class="eyebrow">Step 2 of 2</span>
            <h1>Anything we should consider?</h1>
            <p class="lead">This optional information only adjusts general wellness reminders. It does not produce a diagnosis.</p>
            <div class="conditions">
              ${CONDITIONS.map(([value,label]) => `<label class="condition"><input type="checkbox" name="conditions" value="${value}" ${(draft.conditions || []).includes(value) ? "checked" : ""}><span>${label}</span></label>`).join("")}
            </div>
            <div class="field" id="other-condition-field" style="margin-top:16px;${(draft.conditions || []).includes("other") ? "" : "display:none"}"><label for="other-condition">Other condition (optional)</label><textarea class="textarea" id="other-condition" name="otherCondition" maxlength="120">${esc(draft.otherCondition)}</textarea></div>
            <div class="notice" style="margin-top:18px">${icon("lock", "icon icon-sm")}<span>Profile and health-condition selections are encrypted before they are saved on this device.</span></div>
          `}
          <p class="field-error" id="onboarding-error" hidden></p>
          <div class="field-actions"><button class="button ghost" type="button" id="onboarding-back">Back</button><button class="button primary" type="submit">${state.onboardingStep === 0 ? "Continue" : "Create profile"} ${icon("arrow", "icon icon-sm")}</button></div>
        </form>
      </section>
    </main>`;
}

function renderShell(content, active) {
  const online = navigator.onLine;
  const items = [
    ["home", "home", "Home"],
    ["measurement", "plus", "New check-in"],
    ["history", "chart", "History"],
    ["learn", "book", "Learn"],
    ["about", "info", "About"]
  ];
  const nav = items.map(([route, glyph, label]) => `<button class="nav-button ${active === route || (active === "new" && route === "measurement") ? "active" : ""}" data-route="${route}">${icon(glyph)}<span>${label}</span></button>`).join("");
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Primary navigation">
        <div class="brand"><div class="brand-mark">${icon("heart", "icon icon-lg")}</div><div class="brand-copy"><strong>TsekAP</strong><span>Awareness &amp; Prevention</span></div></div>
        <nav class="nav-list">${nav}</nav>
        <div class="sidebar-footer">
          <div class="profile-chip"><div class="avatar">${esc(firstName().slice(0,1).toUpperCase())}</div><div class="profile-meta"><strong>${esc(firstName())}</strong><span>${state.demo ? "Illustrative demo" : "SHS Student"}</span></div></div>
          <div class="connection"><span class="status-dot ${online ? "" : "offline"}"></span><span>${online ? "Online" : "Offline — local mode"}</span></div>
        </div>
      </aside>
      <header class="mobile-bar"><div class="mobile-brand"><div class="brand-mark">${icon("heart")}</div>TsekAP</div><button class="menu-button" id="menu-button" aria-label="Open menu" aria-expanded="${state.menuOpen}">${icon(state.menuOpen ? "x" : "menu")}</button></header>
      <div class="mobile-menu" id="mobile-menu" ${state.menuOpen ? "" : "hidden"}>${nav}<div class="connection" style="padding:12px 14px"><span class="status-dot ${online ? "" : "offline"}"></span><span>${online ? "Online" : "Offline — local mode"}</span></div></div>
      <div class="scroll-progress" aria-hidden="true"><span></span></div>
      <main class="content" id="main-content"><div class="page">${content}</div></main>
    </div>`;
}

function renderHome() {
  const records = [...(state.payload.records || [])].sort((a,b) => new Date(a.date) - new Date(b.date));
  if (!records.length) {
    return `<header class="page-header"><div><span class="eyebrow">Student dashboard</span><h1 class="page-title">${greeting()}, ${esc(firstName())}</h1><p class="page-subtitle">Your private health awareness space is ready.</p></div></header>
      <section class="card empty-state"><div class="empty-icon">${icon("activity", "icon icon-lg")}</div><h2>Ready for your first check-in?</h2><p>Enter the height and weight measured with your school’s equipment. TsekAP will calculate BMI and compare it with the WHO BMI-for-age reference.</p><button class="button primary" data-route="measurement">Start first check-in ${icon("arrow", "icon icon-sm")}</button></section>`;
  }
  const latest = records.at(-1);
  const tone = classTone(latest.classification);
  const marker = Math.max(2, Math.min(98, ((latest.z + 3) / 6) * 100));
  const tips = getTips(state.payload.profile.conditions || []);
  return `
    <header class="page-header"><div><span class="eyebrow">Student dashboard</span><h1 class="page-title">${greeting()}, ${esc(firstName())}</h1><p class="page-subtitle">Here’s your latest health check-in.</p></div><button class="button primary" data-route="measurement">${icon("plus", "icon icon-sm")} New check-in</button></header>
    <div class="dashboard-grid">
      <section class="card result-card" aria-labelledby="result-title">
        <div class="result-top"><div><div class="metric-label" id="result-title">BMI</div><div class="metric-value">${latest.bmi.toFixed(1)}</div><div class="classification-pill ${tone}">${icon(tone ? "info" : "check", "icon icon-sm")} ${esc(latest.classification)}</div></div><div class="result-explainer">Your BMI-for-age is <strong>${latest.z >= 0 ? "+" : ""}${latest.z.toFixed(2)} SD</strong> from the WHO reference median for your age and sex. This is a screening result, not a diagnosis.</div></div>
        <div class="range-wrap"><div class="range-meta"><strong>WHO BMI-for-age reference</strong><span>z-score</span></div><div class="range-track"><span class="range-marker" style="left:${marker}%" aria-label="Your result at z-score ${latest.z.toFixed(2)}"></span></div><div class="range-labels"><span>−3</span><span>−2</span><span>+1</span><span>+2</span><span>+3</span></div><div class="legend"><span><i class="swatch" style="background:#ff9aab"></i>Below expected</span><span><i class="swatch" style="background:#78dca8"></i>Expected range</span><span><i class="swatch" style="background:#ffd36e"></i>Above expected</span></div></div>
      </section>
      <section class="card measurements"><h2 class="section-title">Your measurements</h2><div class="data-list"><div class="data-row">${icon("ruler")}<span>Height</span><strong>${latest.height.toFixed(1)} cm</strong></div><div class="data-row">${icon("scale")}<span>Weight</span><strong>${latest.weight.toFixed(1)} kg</strong></div><div class="data-row">${icon("calendar")}<span>Age</span><strong>${formatAge(latest.ageMonths)}</strong></div><div class="data-row">${icon("clock")}<span>Checked</span><strong>${formatDate(latest.date)}</strong></div></div></section>
      <section class="card recommend-card"><h2 class="section-title">Small, healthy choices you can keep building</h2><div class="recommend-layout"><div class="tips">${tips.map((tip,index) => `<div class="tip"><div class="tip-icon">${icon(["activity","food","moon"][index] || "heart")}</div><div><strong>${esc(tip.title)}</strong><span>${esc(tip.body)}</span></div></div>`).join("")}</div><div class="wellness-motif"><div class="rings" aria-hidden="true"></div><div class="motif-copy">Your result is one piece of a bigger health picture.<div class="micro-note">${icon("info", "icon icon-sm")} Educational only</div></div></div></div></section>
      <div class="bottom-grid">
        <section class="card history-card"><h2 class="section-title">Your BMI history <span style="color:var(--muted);font-weight:600">(last 3 months)</span></h2>${renderChart(records)}</section>
        <section class="card education-card"><div class="book-visual">${icon("book", "icon icon-lg")}</div><div><h2 class="section-title">Understanding BMI-for-age</h2><p>Unlike adult cutoffs, adolescent BMI is compared with an age- and sex-specific growth reference.</p><button class="button secondary" data-route="learn">Learn more ${icon("arrow", "icon icon-sm")}</button></div></section>
      </div>
    </div>`;
}

function getTips(conditions) {
  const tips = [
    { title: "Move in ways you enjoy", body: "Build regular movement into your day and increase activity gradually." },
    { title: "Choose varied, balanced meals", body: "Include fruits, vegetables, whole grains, and protein foods when available." },
    { title: "Protect your sleep", body: "Keep a consistent sleep routine and give yourself time to wind down." }
  ];
  if (conditions.includes("asthma")) tips[0] = { title: "Plan activity with asthma in mind", body: "Follow your healthcare provider’s asthma guidance when being active." };
  if (conditions.includes("heart") || conditions.includes("hypertension")) tips[0] = { title: "Use your care plan", body: "Ask a qualified healthcare professional what level of activity is right for you." };
  if (conditions.includes("injury") || conditions.includes("arthritis")) tips[0] = { title: "Choose comfortable movement", body: "Avoid movements that worsen pain and follow your healthcare provider’s guidance." };
  if (conditions.includes("diabetes")) tips[1] = { title: "Follow your diabetes care plan", body: "Keep meals, activity, and monitoring aligned with your healthcare team’s advice." };
  if (conditions.includes("allergy") || conditions.includes("celiac")) tips[1] = { title: "Choose foods that are safe for you", body: "Follow your allergy or gluten-safety plan when making balanced food choices." };
  return tips;
}

function renderChart(records) {
  const recent = records.slice(-5);
  if (!recent.length) return `<p class="section-copy">No saved check-ins yet.</p>`;
  const width = 520, height = 150, padX = 35, padTop = 20, padBottom = 28;
  const values = recent.map((r) => r.bmi);
  const min = Math.floor(Math.min(...values) - 1), max = Math.ceil(Math.max(...values) + 1);
  const span = Math.max(2, max - min);
  const points = recent.map((record, i) => {
    const x = recent.length === 1 ? width / 2 : padX + i * ((width - padX * 2) / (recent.length - 1));
    const y = padTop + (max - record.bmi) / span * (height - padTop - padBottom);
    return { x, y, record };
  });
  const path = points.map((p,i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="BMI history chart">
    <line x1="${padX}" y1="${height-padBottom}" x2="${width-padX}" y2="${height-padBottom}" stroke="#dbe5ef"/>
    <path d="${path}" fill="none" stroke="#0a84ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#0a84ff"/><text x="${p.x}" y="${p.y-11}" text-anchor="middle" font-weight="700">${p.record.bmi.toFixed(1)}</text><text x="${p.x}" y="${height-8}" text-anchor="middle">${formatDate(p.record.date,"short")}</text>`).join("")}
  </svg>`;
}

function renderMeasurement() {
  const ageMonths = completedAgeMonths(state.payload.profile.dob);
  return `<div class="form-shell"><div class="stepper"><span class="step-dot active"></span><span class="step-dot active"></span><span class="step-dot active"></span></div><form class="card form-card" id="measurement-form"><span class="eyebrow">New check-in</span><h1>Enter your measurements</h1><p class="lead">Use the height and weight measured with your school’s equipment. Values are checked before calculation.</p><div class="notice" style="margin-bottom:22px">${icon("info", "icon icon-sm")}<span>Profile: ${esc(formatAge(ageMonths))}, ${state.payload.profile.sex === "female" ? "female" : "male"} WHO chart.</span></div><div class="field-grid"><div class="field"><label for="height">Height (cm)</label><input class="input" id="height" name="height" type="number" inputmode="decimal" min="100" max="220" step="0.1" placeholder="e.g. 162.0" required><span class="field-hint">Enter a value from 100 to 220 cm.</span></div><div class="field"><label for="weight">Weight (kg)</label><input class="input" id="weight" name="weight" type="number" inputmode="decimal" min="25" max="200" step="0.1" placeholder="e.g. 54.6" required><span class="field-hint">Enter a value from 25 to 200 kg.</span></div></div><p class="field-error" id="measurement-error" hidden></p><div class="notice warning" style="margin-top:22px">${icon("shield", "icon icon-sm")}<span>BMI-for-age is a screening indicator. A healthcare professional should assess health concerns.</span></div><div class="field-actions"><button class="button ghost" type="button" data-route="home">Cancel</button><button class="button primary" type="submit">Calculate BMI ${icon("arrow", "icon icon-sm")}</button></div></form></div>`;
}

function renderHistory() {
  const records = [...(state.payload.records || [])].sort((a,b) => new Date(b.date) - new Date(a.date));
  return `<header class="page-header"><div><span class="eyebrow">Monitoring history</span><h1 class="page-title">Your recent check-ins</h1><p class="page-subtitle">Records are automatically removed after three months.</p></div><button class="button primary" data-route="measurement">${icon("plus", "icon icon-sm")} New check-in</button></header>${records.length ? `<section class="card card-pad"><h2 class="section-title">Trend</h2>${renderChart([...records].reverse())}</section><div class="history-list">${records.map((record) => `<article class="card history-row"><div class="history-date"><strong>${formatDate(record.date,"short")}</strong><span>${new Date(record.date).getFullYear()}</span></div><div><div class="history-bmi">${record.bmi.toFixed(1)}</div><span class="classification-pill ${classTone(record.classification)}" style="margin-top:8px;padding:6px 9px;font-size:12px">${esc(record.classification)}</span></div><div class="history-measure">Height<strong>${record.height.toFixed(1)} cm</strong></div><div class="history-measure">Weight<strong>${record.weight.toFixed(1)} kg</strong></div><div class="history-measure">WHO z-score<strong>${record.z >= 0 ? "+" : ""}${record.z.toFixed(2)}</strong></div></article>`).join("")}</div>` : `<section class="card empty-state"><div class="empty-icon">${icon("chart", "icon icon-lg")}</div><h2>No monitoring history yet</h2><p>Your first check-in will appear here and stay on this device for up to three months.</p><button class="button primary" data-route="measurement">Start a check-in</button></section>`}`;
}

function renderLearn() {
  return `<header class="page-header"><div><span class="eyebrow">Health education</span><h1 class="page-title">Understand the result—not just the number</h1><p class="page-subtitle">A short guide to BMI-for-age, its meaning, and its limits.</p></div></header>
    <div class="article-grid">
      <article class="card article-card"><div class="article-icon">${icon("activity")}</div><h2 class="section-title">What is BMI?</h2><p>Body mass index (BMI) relates weight to height. It is calculated as weight in kilograms divided by height in metres squared.</p><details><summary>Show the formula</summary><p><strong>BMI = weight (kg) ÷ height² (m²)</strong></p></details></article>
      <article class="card article-card"><div class="article-icon">${icon("chart")}</div><h2 class="section-title">Why BMI-for-age?</h2><p>Young people are still growing. TsekAP compares BMI with the WHO 2007 reference for the same completed age in months and sex, then expresses the result as a z-score.</p><details><summary>How are categories defined?</summary><p>WHO cutoffs are: severe thinness below −3 SD, thinness below −2 SD, overweight above +1 SD, and obesity above +2 SD.</p></details></article>
      <article class="card article-card"><div class="article-icon">${icon("info")}</div><h2 class="section-title">What BMI cannot tell you</h2><p>BMI does not directly measure body fat, fitness, nutrition, or overall health. A result should be considered alongside growth, medical history, and professional assessment.</p></article>
      <article class="card article-card"><div class="article-icon">${icon("heart")}</div><h2 class="section-title">Why monitor over time?</h2><p>A series of measurements can help you notice change. Measurement conditions should be consistent, and any concern or unexpected change should be discussed with a qualified healthcare professional.</p></article>
      <section class="card article-card" style="grid-column:1/-1"><h2 class="section-title">Official references</h2><p>These sources explain the reference and interpretation used by TsekAP.</p><div class="reference-list"><a class="reference-link" href="https://www.who.int/toolkits/growth-reference-data-for-5to19-years/indicators/bmi-for-age" target="_blank" rel="noopener"><span><strong>WHO BMI-for-age (5–19 years)</strong><br><small>Charts, tables, and interpretation of cutoffs</small></span>${icon("external")}</a><a class="reference-link" href="https://www.who.int/tools/growth-reference-data-for-5to19-years" target="_blank" rel="noopener"><span><strong>WHO 2007 growth reference</strong><br><small>Reference data for school-age children and adolescents</small></span>${icon("external")}</a></div></section>
    </div>`;
}

function renderAbout() {
  return `<header class="page-header"><div><span class="eyebrow">About the project</span><h1 class="page-title">Awareness before assumptions</h1><p class="page-subtitle">TsekAP turns a measurement into clear, careful, student-friendly education.</p></div></header>
    <div class="about-hero"><section class="card about-copy"><h2 class="section-title">What TsekAP means</h2><p><strong>TsekAP</strong> is a student health awareness and prevention capstone project. Its goal is to help senior high school students record measured height and weight, understand an age-appropriate BMI screening result, and receive general wellness reminders.</p><p>The app intentionally avoids diagnosis. Its calculations use the official WHO 2007 BMI-for-age LMS reference included in the app for offline use.</p><div class="notice">${icon("shield", "icon icon-sm")}<span>This static prototype keeps data locally. It does not provide a school database, clinician portal, or online account sync.</span></div></section><aside class="card about-values"><div class="value-row"><div class="value-icon">${icon("check")}</div><div><strong>Accurate reference</strong><span>Sex- and age-specific WHO data.</span></div></div><div class="value-row"><div class="value-icon">${icon("book")}</div><div><strong>Educational language</strong><span>Clear explanations and careful limitations.</span></div></div><div class="value-row"><div class="value-icon">${icon("wifi")}</div><div><strong>Offline-capable</strong><span>Core screens and calculations are cached.</span></div></div><div class="value-row"><div class="value-icon">${icon("lock")}</div><div><strong>Private on device</strong><span>Encrypted local profile and check-ins.</span></div></div></aside></div>
    <section class="card settings-card"><h2 class="section-title">Data &amp; session</h2><div class="settings-row"><div><strong>Export a local copy</strong><p>Download the currently unlocked profile and records as JSON.</p></div><button class="button secondary" id="export-data">${icon("download", "icon icon-sm")} Export</button></div><div class="settings-row"><div><strong>Lock this profile</strong><p>Return to the passcode screen without deleting data.</p></div><button class="button secondary" id="lock-profile">${icon("logout", "icon icon-sm")} Lock</button></div>${state.demo ? "" : `<div class="settings-row"><div><strong>Delete local profile</strong><p>Permanently remove the encrypted profile and all records from this browser.</p></div><button class="button danger" id="delete-profile">${icon("trash", "icon icon-sm")} Delete</button></div>`}</section>`;
}

function showFieldError(id, message) {
  const target = document.querySelector(`#${id}`);
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
}

function loadDemo() {
  const now = new Date();
  const dob = new Date(now.getFullYear() - 16, now.getMonth() - 4, Math.min(now.getDate(), 28));
  const dateString = (date) => date.toISOString();
  const makeRecord = (daysAgo, height, weight) => {
    const date = new Date(now.getTime() - daysAgo * 86400000);
    const ageMonths = completedAgeMonths(dob.toISOString().slice(0,10), date);
    const result = calculateBmi(height, weight, ageMonths, "female");
    return { id: crypto.randomUUID(), date: dateString(date), height, weight, ageMonths, ...result };
  };
  state.payload = {
    profile: { name: "Mika Santos", dob: dob.toISOString().slice(0,10), sex: "female", conditions: ["none"], otherCondition: "" },
    records: [makeRecord(58,162,51), makeRecord(29,162,52.8), makeRecord(0,162,54.6)]
  };
  state.cryptoKey = null;
  state.demo = true;
  state.route = "home";
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    navigateTo(button.dataset.route);
  }));

  document.querySelectorAll("[data-auth-tab]").forEach((button) => button.addEventListener("click", () => {
    state.authTab = button.dataset.authTab;
    render();
  }));

  document.querySelector("#menu-button")?.addEventListener("click", () => { state.menuOpen = !state.menuOpen; render(); });
  document.querySelector("#start-monitoring")?.addEventListener("click", () => {
    if (localStorage.getItem(ACCOUNT_KEY)) { state.authTab = "login"; showToast("This device already has a local profile. Unlock or delete it first.", "warning"); render(); return; }
    state.route = "disclaimer"; render();
  });
  document.querySelector("#try-demo")?.addEventListener("click", () => { loadDemo(); render(); });

  const disclaimerCheck = document.querySelector("#disclaimer-check");
  disclaimerCheck?.addEventListener("change", () => { document.querySelector("#disclaimer-continue").disabled = !disclaimerCheck.checked; });
  document.querySelector("#disclaimer-back")?.addEventListener("click", () => { state.route = "welcome"; render(); });
  document.querySelector("#disclaimer-continue")?.addEventListener("click", () => { state.disclaimerAccepted = true; state.route = "onboarding"; state.onboardingStep = 0; render(); });

  document.querySelector("#login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.submitter;
    submit.disabled = true;
    submit.textContent = "Unlocking…";
    try {
      const secret = new FormData(event.currentTarget).get("secret").trim();
      await unlockAccount(secret);
      state.route = "home";
      state.demo = false;
      render();
      showToast("Profile unlocked.", "success");
    } catch (error) {
      showFieldError("login-error", "That LRN passcode could not unlock this profile.");
      submit.disabled = false;
      submit.innerHTML = `${icon("lock", "icon icon-sm")} Unlock profile`;
    }
  });

  const onboardingForm = document.querySelector("#onboarding-form");
  onboardingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (state.onboardingStep === 0) {
      const ageMonths = completedAgeMonths(data.get("dob"));
      if (!Number.isFinite(ageMonths) || ageMonths < 180 || ageMonths > 227) {
        showFieldError("onboarding-error", "TsekAP currently supports students aged 15 through 18.");
        return;
      }
      state.draft = { ...state.draft, name: data.get("name").trim(), dob: data.get("dob"), sex: data.get("sex"), secret: data.get("lrn") };
      state.onboardingStep = 1;
      render();
      return;
    }
    const selected = data.getAll("conditions");
    state.draft.conditions = selected.length ? selected : ["none"];
    state.draft.otherCondition = data.get("otherCondition")?.trim() || "";
    const submit = event.submitter;
    submit.disabled = true;
    submit.textContent = "Securing profile…";
    try {
      await createAccount({ name: state.draft.name, dob: state.draft.dob, sex: state.draft.sex, conditions: state.draft.conditions, otherCondition: state.draft.otherCondition }, state.draft.secret);
      state.draft = {};
      state.route = "measurement";
      render();
      showToast("Profile created and encrypted on this device.", "success");
    } catch (error) {
      showFieldError("onboarding-error", "The profile could not be saved. Please try again in a modern browser.");
      submit.disabled = false;
      submit.textContent = "Create profile";
    }
  });

  document.querySelector("#onboarding-back")?.addEventListener("click", () => {
    if (state.onboardingStep === 1) state.onboardingStep = 0;
    else state.route = "disclaimer";
    render();
  });

  document.querySelectorAll('input[name="conditions"]').forEach((checkbox) => checkbox.addEventListener("change", (event) => {
    const boxes = [...document.querySelectorAll('input[name="conditions"]')];
    if (event.target.checked && ["none","private"].includes(event.target.value)) boxes.filter((box) => box !== event.target).forEach((box) => { box.checked = false; });
    if (event.target.checked && !["none","private"].includes(event.target.value)) boxes.filter((box) => ["none","private"].includes(box.value)).forEach((box) => { box.checked = false; });
    const other = document.querySelector("#other-condition-field");
    if (other) other.style.display = boxes.find((box) => box.value === "other")?.checked ? "grid" : "none";
  }));

  document.querySelector("#measurement-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const height = Number(data.get("height"));
    const weight = Number(data.get("weight"));
    if (!Number.isFinite(height) || height < 100 || height > 220 || !Number.isFinite(weight) || weight < 25 || weight > 200) {
      showFieldError("measurement-error", "Enter a height from 100–220 cm and a weight from 25–200 kg.");
      return;
    }
    const ageMonths = completedAgeMonths(state.payload.profile.dob);
    try {
      const result = calculateBmi(height, weight, ageMonths, state.payload.profile.sex);
      state.payload.records.push({ id: crypto.randomUUID(), date: new Date().toISOString(), height, weight, ageMonths, ...result });
      pruneRecords();
      await savePayload();
      state.route = "home";
      render();
      window.scrollTo({ top: 0, behavior: "instant" });
      showToast("Check-in calculated and saved.", "success");
    } catch (error) {
      showFieldError("measurement-error", error.message);
    }
  });

  document.querySelector("#lock-profile")?.addEventListener("click", () => {
    state.payload = null; state.cryptoKey = null; state.demo = false; state.route = "auth"; state.authTab = "login"; render();
  });
  document.querySelector("#export-data")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `tsekap-export-${new Date().toISOString().slice(0,10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Local data export downloaded.", "success");
  });
  document.querySelector("#delete-profile")?.addEventListener("click", () => {
    if (!confirm("Delete this local TsekAP profile and all saved check-ins? This cannot be undone.")) return;
    localStorage.removeItem(ACCOUNT_KEY);
    state.payload = null; state.cryptoKey = null; state.route = "welcome"; state.authTab = "new"; state.draft = {}; render();
    showToast("Local profile deleted.", "success");
  });
}

window.addEventListener("online", () => { if (state.payload) { render(); showToast("Connection restored. TsekAP remains local on this device.", "success"); } });
window.addEventListener("offline", () => { if (state.payload) { render(); showToast("You’re offline. Core check-ins are still available.", "warning"); } });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

render();
