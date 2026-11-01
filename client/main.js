import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence, getAuth, getIdTokenResult,
  onAuthStateChanged, setPersistence, signInWithEmailAndPassword,
  signOut, updatePassword
} from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider, getToken as getAppCheckToken } from "firebase/app-check";
import { calculateBmi, completedAgeMonths } from "../shared/bmi.js";
import { HEALTH_REFERENCES, recommendationsFor } from "../shared/recommendations.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDMtwiGuNlBFkhpUMwIwImSKaLpK4WuaSo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tsekap-student-health.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tsekap-student-health",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:279761429388:web:f0a29c337bfcff9dd0eca9",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "279761429388"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
await setPersistence(auth, browserLocalPersistence);
const appCheck = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
  ? initializeAppCheck(firebaseApp, { provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true })
  : null;

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const LEGACY_ACCOUNT_KEY = "tsekap.encrypted-account.v1";
const CONDITIONS = [
  ["none", "No known health conditions"], ["asthma", "Asthma"], ["heart", "Heart condition"],
  ["hypertension", "Hypertension"], ["diabetes", "Diabetes"], ["epilepsy", "Epilepsy / seizure disorders"],
  ["arthritis", "Arthritis / joint conditions"], ["injury", "Physical injury"], ["allergy", "Food allergies"],
  ["celiac", "Celiac disease"], ["other", "Other"], ["private", "Prefer not to say"]
];

const state = {
  firebaseUser: null, profile: null, checkins: [], claims: {}, route: "home", menuOpen: false,
  authMode: "student-login", loading: true, adminStudents: [], auditLogs: [], adminSearch: "",
  selectedStudent: null, selectedCheckins: [], offlineResult: null,
  publicStep: sessionStorage.getItem("tsekap.disclaimer-acknowledged") ? "auth" : "welcome"
};

const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const icon = (name, cls = "icon") => {
  const paths = {
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.3l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/><path d="m8 12 2 2 4-5"/>',
    home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>', plus:'<path d="M12 5v14M5 12h14"/>',
    chart:'<path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/>', users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    logout:'<path d="M10 17l5-5-5-5M15 12H3M14 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', x:'<path d="m6 6 12 12M18 6 6 18"/>',
    check:'<path d="m5 12 4 4L19 6"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    book:'<path d="M3 4.5A3.5 3.5 0 0 1 6.5 1H11v18H6.5A3.5 3.5 0 0 0 3 22.5Z"/><path d="M21 4.5A3.5 3.5 0 0 0 17.5 1H13v18h4.5a3.5 3.5 0 0 1 3.5 3.5Z"/>',
    download:'<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>', trash:'<path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    eye:'<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>',
    eyeOff:'<path d="m3 3 18 18M10.6 6.1A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.1 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    ruler:'<path d="M4 20 20 4l-4-4L0 16l4 4Z"/><path d="m12 4 2 2m-5 1 2 2m-5 1 2 2m-5 1 2 2"/>',
    scale:'<path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 9a4 4 0 0 1 8 0M12 9l2-2"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    activity:'<path d="M3 12h4l2.2-6 4.1 12 2.2-6H21"/>',
    leaf:'<path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z"/><path d="M4 21c3-5 7-8 12-11"/>'
  };
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.info}</svg>`;
};

function showToast(message, kind = "info") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `${icon(kind === "success" ? "check" : "info", "icon icon-sm")}<span>${esc(message)}</span>`;
  toastRegion.append(toast);
  setTimeout(() => toast.remove(), 4200);
}

function bindPasswordToggles(root = document) {
  root.querySelectorAll("[data-password-toggle]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const control = button.closest(".password-control");
      const input = control?.querySelector("input");
      if (!input) return;
      const willReveal = input.type === "password";
      input.type = willReveal ? "text" : "password";
      button.innerHTML = icon(willReveal ? "eyeOff" : "eye", "icon icon-sm");
      button.setAttribute("aria-label", willReveal ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", String(willReveal));
      control.classList.toggle("is-visible", willReveal);
      control.classList.remove("is-switching");
      void control.offsetWidth;
      control.classList.add("is-switching");
      setTimeout(() => control.classList.remove("is-switching"), 360);
    });
  });
}

async function hashLrn(lrn) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(lrn).replace(/\D/g, "")));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function studentEmail(lrn) {
  return `lrn-${await hashLrn(lrn)}@students.tsekap.app`;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("content-type", "application/json");
  if (auth.currentUser) headers.set("authorization", `Bearer ${await auth.currentUser.getIdToken()}`);
  if (appCheck) {
    const token = await getAppCheckToken(appCheck, false);
    headers.set("x-firebase-appcheck", token.token);
  }
  const response = await fetch(`/api/${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const localApiMissing = response.status === 404 && ["localhost", "127.0.0.1"].includes(location.hostname);
    throw new Error(data.error || (localApiMissing
      ? "The local API is not running. Stop this server and restart it with npm run dev."
      : `The service could not complete this request (${response.status}).`));
  }
  return data;
}

async function loadSession() {
  if (!auth.currentUser) {
    state.profile = null; state.checkins = []; state.claims = {}; state.loading = false; render(); return;
  }
  try {
    const token = await getIdTokenResult(auth.currentUser);
    state.claims = token.claims;
    const data = await api("me");
    state.profile = data.user;
    state.checkins = data.checkins || [];
    if (state.claims.admin) await loadAdmin();
  } catch (error) {
    if (auth.currentUser.email === "newroskoto@gmail.com") {
      try {
        await api("auth/bootstrap-admin", { method: "POST", body: "{}" });
        await auth.currentUser.getIdToken(true);
        return loadSession();
      } catch {}
    }
    showToast(error.message, "warning");
  } finally {
    state.loading = false;
    render();
  }
}

async function loadAdmin() {
  const [students, logs] = await Promise.all([api(`admin/students?search=${encodeURIComponent(state.adminSearch)}`), api("admin/audit")]);
  state.adminStudents = students.users || [];
  state.auditLogs = logs.logs || [];
}

onAuthStateChanged(auth, async (user) => {
  state.firebaseUser = user;
  state.loading = true;
  await loadSession();
});

function render() {
  if (state.loading) renderLoading();
  else if (!state.firebaseUser || !state.profile) renderAuth();
  else if (state.profile.role === "admin" || state.claims.admin) renderAdminShell();
  else if (state.profile.mustChangePassword) renderChangePassword();
  else if (state.profile.status !== "approved") renderPending();
  else renderStudentShell();
  requestAnimationFrame(revealOnScroll);
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let revealObserver;
function revealOnScroll() {
  revealObserver?.disconnect();
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: .08, rootMargin: "0px 0px 30px 0px" });
  document.querySelectorAll(".page > .card, .page > .page-header, .page > .admin-stats, .page > .admin-table, .page > .dashboard-grid, .page > .history-list, .page > .article-grid, .auth-panel-inner, .story-copy").forEach((element) => {
    element.classList.add("reveal-ready");
    revealObserver.observe(element);
  });
}

function navigate(action) {
  if (reducedMotion.matches || !document.startViewTransition) {
    action();
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!reducedMotion.matches) app.querySelector(".page, .auth-panel-inner")?.animate(
      [{ opacity: .55, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 340, easing: "cubic-bezier(.18,.8,.24,1)" }
    );
    return;
  }
  document.startViewTransition(() => {
    action();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
}

function renderLoading() {
  app.innerHTML = `<main class="center-screen" id="main-content"><div class="loading-mark">${icon("heart","icon icon-lg")}</div><h1>Opening your secure profile…</h1><p>Connecting to Firebase Auth and Firestore.</p></main>`;
}

function renderAuth() {
  if (state.publicStep === "welcome") return renderWelcome();
  if (state.publicStep === "disclaimer") return renderDisclaimer();
  if (state.publicStep === "offline") return renderOfflineCalculator();
  renderCloudAuth();
}

function brandLockup() {
  return `<div class="auth-logo" aria-label="TsekAP Student Health"><div class="auth-logo-mark"><img src="/assets/tsekap-logo-transparent.png" alt=""></div><div class="auth-wordmark"><strong>Tsek<span>AP</span></strong><small>Student Health</small></div></div>`;
}

function renderWelcome() {
  app.innerHTML = `<main class="auth-page welcome-page" id="main-content"><section class="auth-wrap welcome-wrap">
    <div class="auth-story"><div>${brandLockup()}</div><div class="welcome-hero"><div class="welcome-copy"><span class="eyebrow light">Student health awareness</span><h1>Know your number.<br>Understand your health.</h1><p>TsekAP helps students ages 15–18 monitor BMI-for-age and learn practical, health-aware habits.</p></div><button class="welcome-avatar" id="welcome-avatar" type="button" aria-label="Play the welcome animation"><span class="avatar-stage"><span class="welcome-lottie" id="welcome-lottie"></span><img class="avatar-fallback" src="/assets/tsekap-logo-transparent.png" alt=""><span class="avatar-caption">Tap to welcome</span></span></button></div><div class="story-strip"><div class="story-item"><strong>1. Understand</strong><span>Read the educational disclaimer.</span></div><div class="story-item"><strong>2. Check in</strong><span>Enter measured height and weight.</span></div><div class="story-item"><strong>3. Learn</strong><span>Review guidance and trends.</span></div></div></div>
    <section class="auth-panel"><div class="auth-panel-inner"><span class="eyebrow">Welcome to TsekAP</span><h2>A clearer way to monitor student health</h2><p>Results use the WHO BMI-for-age reference and are designed for awareness and prevention—not diagnosis.</p><div class="welcome-actions"><button class="button primary full" id="start-monitoring">Start monitoring</button><button class="button secondary full" id="offline-calculator">Use offline calculator</button><button class="text-button" id="admin-access">Administrator sign in</button></div><div class="notice">${icon("shield","icon icon-sm")}<span>Cloud records require an approved account. Offline calculations are not saved on this device.</span></div></div></section>
  </section></main>`;
  document.querySelector("#start-monitoring").addEventListener("click", () => navigate(() => { state.publicStep = "disclaimer"; render(); }));
  document.querySelector("#offline-calculator").addEventListener("click", () => navigate(() => { state.publicStep = "offline"; render(); }));
  document.querySelector("#admin-access").addEventListener("click", () => navigate(() => { state.publicStep = "auth"; state.authMode = "admin-login"; render(); }));
  bindWelcomeAvatar();
}

function bindWelcomeAvatar() {
  const host = document.querySelector("#welcome-avatar");
  const target = document.querySelector("#welcome-lottie");
  if (!host || !target || !window.lottie) return setTimeout(bindWelcomeAvatar, 120);
  const animation = window.lottie.loadAnimation({ container: target, renderer: "svg", loop: true, autoplay: true, path: "/assets/doctor-welcome.json" });
  animation.addEventListener("DOMLoaded", () => host.classList.add("is-loaded"));
  host.addEventListener("click", () => { animation.goToAndPlay(0, true); host.animate([{transform:"scale(.98)"},{transform:"scale(1)"}],{duration:420,easing:"cubic-bezier(.18,.8,.24,1)"}); });
}

function renderDisclaimer() {
  const points = [
    "TsekAP provides educational BMI-for-age screening and does not diagnose a medical condition.",
    "Results should be considered with growth history, symptoms, nutrition, activity, and professional advice.",
    "Cloud health check-ins require an approved account and are automatically removed after 90 days.",
    "If you have symptoms, rapid changes, or health concerns, speak with a qualified healthcare professional."
  ];
  app.innerHTML = `<main class="auth-page" id="main-content"><section class="disclaimer"><article class="card disclaimer-card"><div class="disclaimer-hero"><div class="disclaimer-icon">${icon("info","icon icon-lg")}</div><span class="eyebrow">Before your first check-in</span><h1>Please understand the result</h1><p>This short notice keeps TsekAP’s purpose clear and your health information handled responsibly.</p></div><div class="disclaimer-body"><ul class="disclaimer-points">${points.map((point)=>`<li><span class="check-badge">${icon("check","icon icon-sm")}</span><span>${esc(point)}</span></li>`).join("")}</ul><label class="agreement"><input id="disclaimer-agreement" type="checkbox"><span><strong>I understand.</strong><br>I will use TsekAP as an awareness tool and seek professional guidance when appropriate.</span></label><div class="field-actions"><button class="button ghost" id="disclaimer-back">Back</button><button class="button primary" id="accept-disclaimer" disabled>I understand — continue</button></div></div></article></section></main>`;
  const agreement = document.querySelector("#disclaimer-agreement");
  const accept = document.querySelector("#accept-disclaimer");
  agreement.addEventListener("change", () => { accept.disabled = !agreement.checked; });
  document.querySelector("#disclaimer-back").addEventListener("click", () => navigate(() => { state.publicStep = "welcome"; render(); }));
  accept.addEventListener("click", () => navigate(() => { sessionStorage.setItem("tsekap.disclaimer-acknowledged", "true"); state.publicStep = "auth"; state.authMode = "student-login"; render(); }));
}

function renderOfflineCalculator() {
  app.innerHTML = `<main class="auth-page" id="main-content"><section class="disclaimer"><article class="card offline-calculator"><div class="disclaimer-hero"><div class="disclaimer-icon">${icon("activity","icon icon-lg")}</div><span class="eyebrow">Private on-device calculation</span><h1>Offline BMI-for-age</h1><p>Calculate an educational result without signing in. Nothing entered here is saved or uploaded.</p></div><form class="disclaimer-body" id="offline-form"><div class="field-grid"><div class="field"><label for="offline-dob">Date of birth</label><input class="input" id="offline-dob" name="dob" type="date" required></div><div class="field"><label for="offline-sex">WHO reference sex</label><select class="input" id="offline-sex" name="sex" required><option value="">Select</option><option value="female">Female</option><option value="male">Male</option></select></div><div class="field"><label for="offline-height">Height (cm)</label><input class="input" id="offline-height" name="height" type="number" min="100" max="220" step=".1" required></div><div class="field"><label for="offline-weight">Weight (kg)</label><input class="input" id="offline-weight" name="weight" type="number" min="25" max="200" step=".1" required></div></div><div id="offline-result" aria-live="polite"></div><p class="field-error" id="offline-error" hidden></p><div class="field-actions"><button class="button ghost" type="button" id="offline-back">Back</button><button class="button primary" type="submit">Calculate result</button></div></form></article></section></main>`;
  document.querySelector("#offline-back").addEventListener("click", () => navigate(() => { state.publicStep = "welcome"; render(); }));
  document.querySelector("#offline-form").addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try {
      const result = calculateBmi(data.get("height"), data.get("weight"), completedAgeMonths(data.get("dob"), new Date()), data.get("sex"));
      const guidance = recommendationsFor(result.classification);
      document.querySelector("#offline-error").hidden = true;
      document.querySelector("#offline-result").innerHTML = `<section class="offline-result"><span class="eyebrow">Your educational result</span><div class="offline-result-number">${result.bmi.toFixed(1)}</div><span class="classification-pill ${tone(result.classification)}">${esc(result.classification)}</span><p>WHO BMI-for-age z-score: <strong>${signed(result.z)}</strong></p><div class="mini-guidance">${guidance.slice(0,2).map((item)=>`<div><strong>${esc(item.title)}</strong><span>${esc(item.body)}</span></div>`).join("")}</div><p class="micro-note">This calculation is not saved. It is a screening result, not a diagnosis.</p></section>`;
    } catch (error) { fieldError("offline-error", error.message); }
  });
}

function renderCloudAuth() {
  const mode = state.authMode;
  const isRegister = mode === "student-register";
  const isAdmin = mode === "admin-login";
  app.innerHTML = `<main class="auth-page cloud-auth" id="main-content">
    <section class="auth-wrap">
      <div class="auth-story">
        ${brandLockup()}
        <div class="story-copy"><span class="eyebrow">Student health awareness</span><h1>Know your number.<br>Understand your health.</h1><p>Secure school health monitoring with careful, educational BMI-for-age guidance.</p>
          <div class="story-list"><div class="story-item"><strong>Protected cloud profile</strong><span>Firebase Auth controls access to every record.</span></div><div class="story-item"><strong>Administrator approval</strong><span>New student accounts remain private and pending until reviewed.</span></div></div>
        </div>
      </div>
      <section class="auth-panel">
        <div class="auth-panel-inner">
          <span class="eyebrow">${isAdmin ? "Administrator portal" : isRegister ? "Student registration" : "Student access"}</span>
          <h2>${isAdmin ? "Manage TsekAP" : isRegister ? "Request an account" : "Welcome back"}</h2>
          <p>${isAdmin ? "Sign in with the authorized administrator email." : isRegister ? "Your request will be reviewed before records become available." : "Use your 12-digit LRN and password."}</p>
          <div class="auth-tabs" role="tablist"><button class="auth-tab ${!isAdmin ? "active" : ""}" data-auth-mode="student-login">Student</button><button class="auth-tab ${isAdmin ? "active" : ""}" data-auth-mode="admin-login">Administrator</button></div>
          ${isRegister ? registrationForm() : loginForm(isAdmin)}
          ${!isAdmin ? `<button class="text-button" data-auth-mode="${isRegister ? "student-login" : "student-register"}">${isRegister ? "Already registered? Sign in" : "New student? Request an account"}</button>` : ""}
          <div class="notice">${icon("shield","icon icon-sm")}<span>Health records require an approved account, use a 90-day retention period, and need an internet connection. TsekAP is educational and does not diagnose.</span></div>
          <button class="text-button" id="auth-home">Back to welcome</button>
        </div>
      </section>
    </section>
  </main>`;
  bindAuth();
  document.querySelector("#auth-home").addEventListener("click", () => navigate(() => { state.publicStep = "welcome"; render(); }));
}

function loginForm(admin) {
  return `<form class="auth-form" id="login-form">
    <div class="field"><label for="identity">${admin ? "Administrator email" : "Learner Reference Number (LRN)"}</label><input class="input" id="identity" name="identity" ${admin ? 'type="email" autocomplete="username"' : 'inputmode="numeric" pattern="\\d{12}" maxlength="12" autocomplete="username"'} required></div>
    <div class="field"><label for="password">Password</label><div class="password-control"><input class="input" id="password" name="password" type="password" minlength="8" autocomplete="current-password" required><button class="password-toggle" type="button" data-password-toggle aria-label="Show password" aria-pressed="false">${icon("eye","icon icon-sm")}</button></div></div>
    <p class="field-error" id="auth-error" role="alert" hidden></p>
    <button class="button primary full" type="submit">${icon("lock","icon icon-sm")} Sign in</button>
  </form>`;
}

function registrationForm() {
  const conditionOptions = CONDITIONS.map(([value,label]) => `<label class="check-card"><input type="checkbox" name="conditions" value="${value}"><span>${esc(label)}</span></label>`).join("");
  return `<form class="auth-form compact-form" id="register-form">
    <div class="field-grid"><div class="field full"><label for="name">Full name</label><input class="input" id="name" name="name" maxlength="100" required></div>
    <div class="field"><label for="dob">Date of birth</label><input class="input" id="dob" name="dob" type="date" required></div><div class="field"><label for="sex">WHO reference sex</label><select class="input" id="sex" name="sex" required><option value="">Select</option><option value="female">Female</option><option value="male">Male</option></select></div>
    <div class="field"><label for="lrn">12-digit LRN</label><input class="input" id="lrn" name="lrn" inputmode="numeric" pattern="\\d{12}" maxlength="12" required></div><div class="field"><label for="new-password">Password</label><div class="password-control"><input class="input" id="new-password" name="password" type="password" minlength="8" pattern="(?=.*[A-Za-z])(?=.*\\d).{8,}" title="Use at least 8 characters with a letter and a number." autocomplete="new-password" required><button class="password-toggle" type="button" data-password-toggle aria-label="Show password" aria-pressed="false">${icon("eye","icon icon-sm")}</button></div><span class="field-hint">At least 8 characters with a letter and number.</span></div></div>
    <details class="conditions-disclosure"><summary>Health conditions (optional)</summary><div class="conditions compact">${conditionOptions}</div><div class="field other-condition-field" id="other-condition-field" hidden><label for="other-condition">Other health condition</label><input class="input" id="other-condition" name="otherCondition" maxlength="160" placeholder="Describe only what is helpful for guidance"></div></details>
    <p class="field-error" id="auth-error" role="alert" hidden></p><button class="button primary full" type="submit">Submit for approval</button>
  </form>`;
}

function bindAuth() {
  bindPasswordToggles();
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => navigate(() => { state.authMode = button.dataset.authMode; render(); })));
  document.querySelector("#login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const button = event.submitter; button.disabled = true;
    try {
      const identity = String(data.get("identity")).trim();
      const email = state.authMode === "admin-login" ? identity : await studentEmail(identity);
      await signInWithEmailAndPassword(auth, email, String(data.get("password")));
    } catch (error) { fieldError("auth-error", friendlyAuthError(error)); button.disabled = false; }
  });
  document.querySelector("#register-form")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const button = event.submitter; const label = button.textContent; button.disabled = true; button.textContent = "Submitting…"; event.currentTarget.setAttribute("aria-busy", "true");
    let registered = false;
    try {
      const payload = { lrn:data.get("lrn"), password:data.get("password"), profile:{ name:data.get("name"), dob:data.get("dob"), sex:data.get("sex"), conditions:data.getAll("conditions"), otherCondition:data.get("otherCondition") || "" } };
      await api("auth/register", { method:"POST", body:JSON.stringify(payload) });
      registered = true;
      await signInWithEmailAndPassword(auth, await studentEmail(payload.lrn), String(payload.password));
      showToast("Registration submitted for administrator approval.", "success");
    } catch (error) {
      if (registered) {
        state.authMode = "student-login"; render();
        fieldError("auth-error", "Registration was saved. Sign in with the LRN and password you just created.");
      } else {
        fieldError("auth-error", friendlyAuthError(error)); button.disabled = false; button.textContent = label; event.currentTarget.removeAttribute("aria-busy");
      }
    }
  });
  const conditionBoxes = [...document.querySelectorAll('input[name="conditions"]')];
  conditionBoxes.forEach((box) => box.addEventListener("change", () => {
    if (box.checked) {
      if (box.value === "none") conditionBoxes.forEach((other) => { if (other !== box) other.checked = false; });
      else conditionBoxes.find((other) => other.value === "none").checked = false;
    }
    const otherField = document.querySelector("#other-condition-field");
    const otherInput = document.querySelector("#other-condition");
    const showOther = conditionBoxes.some((item) => item.value === "other" && item.checked);
    if (otherField) otherField.hidden = !showOther;
    if (otherInput) otherInput.required = showOther;
  }));
}

function renderPending() {
  const rejected = state.profile.status === "rejected";
  app.innerHTML = `<main class="center-screen pending-screen" id="main-content"><div class="pending-icon ${rejected ? "rejected" : ""}">${icon(rejected ? "info" : "clock","icon icon-lg")}</div><span class="eyebrow">${rejected ? "Review completed" : "Awaiting approval"}</span><h1>${rejected ? "Your request needs attention" : "Your account is pending"}</h1><p>${rejected ? esc(state.profile.approvalNote || "Please contact your TsekAP administrator.") : "An administrator must confirm your registration before health records become available."}</p><div class="pending-details"><span>Student</span><strong>${esc(state.profile.name)}</strong><span>LRN</span><strong>${esc(state.profile.lrn)}</strong></div><div class="field-actions"><button class="button secondary" id="refresh-status">Refresh status</button><button class="button ghost" data-logout>Log out</button></div></main>`;
  document.querySelector("#refresh-status").addEventListener("click", async () => { state.loading = true; render(); await loadSession(); });
  bindLogout();
}

function renderChangePassword() {
  app.innerHTML = `<main class="center-screen" id="main-content"><div class="pending-icon">${icon("lock","icon icon-lg")}</div><span class="eyebrow">Account security</span><h1>Create your own password</h1><p>Your administrator issued a temporary password. Replace it before continuing.</p><form class="card password-card" id="change-password-form"><div class="field"><label for="fresh-password">New password</label><div class="password-control"><input class="input" id="fresh-password" name="password" type="password" minlength="8" autocomplete="new-password" required><button class="password-toggle" type="button" data-password-toggle aria-label="Show password" aria-pressed="false">${icon("eye","icon icon-sm")}</button></div></div><p class="field-error" id="password-error" hidden></p><button class="button primary full">Update password</button></form></main>`;
  bindPasswordToggles();
  document.querySelector("#change-password-form").addEventListener("submit", async (event) => { event.preventDefault(); const password = new FormData(event.currentTarget).get("password"); try { await updatePassword(auth.currentUser, password); await api("account/change-password",{method:"POST",body:JSON.stringify({password})}); showToast("Password updated.","success"); await loadSession(); } catch(error){ fieldError("password-error",friendlyAuthError(error)); } });
}

function renderStudentShell() {
  const items = [["home","home","Home"],["measurement","plus","New check-in"],["history","chart","History"],["learn","book","Learn"],["about","info","About"],["account","shield","Account"]];
  const nav = items.map(([route,glyph,label]) => `<button class="nav-button ${state.route===route?"active":""}" data-route="${route}">${icon(glyph)}<span>${label}</span></button>`).join("");
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark"><img class="brand-logo" src="/assets/tsekap-logo-transparent.png" alt=""></div><div class="brand-copy"><strong>Tsek<b>AP</b></strong><span>Awareness & Prevention</span></div></div><nav class="nav-list">${nav}</nav><div class="sidebar-footer"><div class="profile-chip"><div class="avatar">${esc(state.profile.name[0])}</div><div class="profile-meta"><strong>${esc(state.profile.name)}</strong><span>Approved student</span></div></div><button class="logout-button" data-logout>${icon("logout")}<span>Log out</span></button><div class="connection"><span class="status-dot ${navigator.onLine?"":"offline"}"></span><span>${navigator.onLine?"Online":"Connection required"}</span></div></div></aside>
  <header class="mobile-bar"><div class="mobile-brand"><div class="brand-mark"><img class="brand-logo" src="/assets/tsekap-logo-transparent.png" alt=""></div><span>TsekAP</span></div><button class="menu-button" id="menu-button" aria-label="${state.menuOpen?"Close":"Open"} menu" aria-expanded="${state.menuOpen}" aria-controls="mobile-menu">${icon(state.menuOpen?"x":"menu")}</button></header>
  <div class="mobile-menu" id="mobile-menu" ${state.menuOpen?"":"hidden"}>${nav}<button class="logout-button" data-logout>${icon("logout")}<span>Log out</span></button></div>
  <main class="content" id="main-content"><div class="page">${studentRoute()}</div></main></div>`;
  bindShell();
  bindStudentRoute();
}

function studentRoute() {
  if (state.route === "measurement") return measurementView();
  if (state.route === "history") return historyView();
  if (state.route === "learn") return learnView();
  if (state.route === "about") return aboutView();
  if (state.route === "account") return accountView();
  return studentHome();
}

function studentHome() {
  const latest = state.offlineResult || state.checkins[0];
  if (!latest) return `<header class="page-header"><div><span class="eyebrow">Student dashboard</span><h1 class="page-title">Welcome, ${esc(firstName())}</h1><p class="page-subtitle">Your protected cloud profile is ready.</p></div></header><section class="card empty-state"><div class="empty-icon">${icon("plus","icon icon-lg")}</div><h2>Ready for your first check-in?</h2><p>Enter your measured height and weight to calculate an educational WHO BMI-for-age result.</p><button class="button primary" data-route="measurement">Start a check-in</button></section>`;
  const z = Number(latest.z);
  const marker = Math.max(0, Math.min(100, ((z + 3) / 6) * 100));
  const guidance = recommendationsFor(latest.classification, state.profile.conditions);
  return `<header class="page-header"><div><span class="eyebrow">Student dashboard</span><h1 class="page-title">Welcome, ${esc(firstName())}</h1><p class="page-subtitle">Here is your latest protected health check-in.</p></div><button class="button primary" data-route="measurement">${icon("plus","icon icon-sm")} New check-in</button></header>
  ${latest.offline ? `<div class="notice warning offline-banner">${icon("info","icon icon-sm")}<span>This result was calculated offline and was not saved to your cloud history.</span></div>` : ""}
  <div class="dashboard-grid">
    <section class="card result-card" aria-labelledby="latest-result-title">
      <div class="result-top"><div><span class="metric-label" id="latest-result-title">BMI-for-age</span><div class="metric-value">${Number(latest.bmi).toFixed(1)}</div><span class="classification-pill ${tone(latest.classification)}">${esc(latest.classification)}</span></div><div class="result-explainer"><strong>Screening result</strong><p>Your z-score is <b>${signed(latest.z)}</b>. Use this result for awareness—not as a diagnosis.</p></div></div>
      <div class="range-wrap"><div class="range-meta"><span>WHO BMI-for-age z-score</span><strong>${signed(latest.z)}</strong></div><div class="range-track" aria-hidden="true"><span class="range-marker" style="left:${marker.toFixed(2)}%"></span></div><div class="range-labels" aria-hidden="true"><span>−3</span><span>−2</span><span>+1</span><span>+2</span><span>+3</span></div><div class="legend"><span><i class="swatch low"></i>Thinness</span><span><i class="swatch expected"></i>Expected range</span><span><i class="swatch elevated"></i>Overweight</span><span><i class="swatch high"></i>Obesity</span></div></div>
    </section>
    <section class="card measurements" aria-labelledby="measurements-title"><span class="eyebrow">Latest check-in</span><h2 class="section-title" id="measurements-title">Your measurements</h2><div class="data-list"><div class="data-row">${icon("ruler","icon icon-sm")}<span>Height</span><strong>${Number(latest.height).toFixed(1)} cm</strong></div><div class="data-row">${icon("scale","icon icon-sm")}<span>Weight</span><strong>${Number(latest.weight).toFixed(1)} kg</strong></div><div class="data-row">${icon("calendar","icon icon-sm")}<span>Checked</span><strong>${formatDate(latest.date)}</strong></div></div><p class="micro-note">${icon(latest.offline?"info":"shield","icon icon-sm")} ${latest.offline?"Not saved":"Protected for up to 90 days"}</p></section>
    <section class="card recommend-card"><span class="eyebrow">Guidance for your profile</span><h2 class="section-title">Supportive next steps</h2><div class="recommend-layout"><div class="tips">${guidance.map((item)=>`<div class="tip"><div class="tip-icon">${icon(item.icon)}</div><div><strong>${esc(item.title)}</strong><span>${esc(item.body)}</span><a class="tip-source" href="${item.href}" target="_blank" rel="noopener">${esc(item.source)} ↗</a></div></div>`).join("")}</div><div class="wellness-motif"><div class="rings" aria-hidden="true"></div><div class="motif-copy"><strong>Guidance adapts carefully.</strong><br>It considers the BMI category and optional conditions in your profile, but never replaces professional advice.</div></div></div></section>
  </div>`;
}

function measurementView() {
  return `<div class="form-shell"><form class="card form-card" id="checkin-form"><span class="eyebrow">New check-in</span><h1>Enter your measurements</h1><p class="lead">Use height and weight measured with your school’s equipment.</p><div class="field-grid"><div class="field"><label for="height">Height (cm)</label><input class="input" id="height" name="height" type="number" min="100" max="220" step=".1" required></div><div class="field"><label for="weight">Weight (kg)</label><input class="input" id="weight" name="weight" type="number" min="25" max="200" step=".1" required></div></div><p class="field-error" id="checkin-error" hidden></p><div class="notice warning">${icon("info","icon icon-sm")}<span>${navigator.onLine?"BMI-for-age is a screening indicator. Saved check-ins are removed after 90 days.":"You are offline. TsekAP can calculate this result on your device, but it will not be saved."}</span></div><div class="field-actions"><button class="button ghost" type="button" data-route="home">Cancel</button><button class="button primary" type="submit">${navigator.onLine?"Calculate and save":"Calculate offline"}</button></div></form></div>`;
}

function historyView() {
  return `<header class="page-header"><div><span class="eyebrow">Monitoring history</span><h1 class="page-title">Your check-ins</h1><p class="page-subtitle">Cloud check-ins are automatically removed 90 days after measurement.</p></div></header>${state.checkins.length ? `${historyChart(state.checkins)}<div class="history-list">${state.checkins.map((record) => `<article class="card history-row"><div class="history-date"><strong>${formatDate(record.date,"short")}</strong></div><div><div class="history-bmi">${Number(record.bmi).toFixed(1)}</div><span class="classification-pill ${tone(record.classification)}">${esc(record.classification)}</span></div><div class="history-measure">Height<strong>${Number(record.height).toFixed(1)} cm</strong></div><div class="history-measure">Weight<strong>${Number(record.weight).toFixed(1)} kg</strong></div><div class="history-measure">WHO z-score<strong>${signed(record.z)}</strong></div></article>`).join("")}</div>` : '<section class="card empty-state"><h2>No history yet</h2><p>Your first check-in will appear here.</p></section>'}`;
}

function historyChart(records) {
  const values = records.slice(0, 8).reverse().map((item) => ({ bmi:Number(item.bmi), date:item.date })).filter((item) => Number.isFinite(item.bmi));
  if (values.length < 2) return "";
  const min = Math.min(...values.map((item)=>item.bmi)) - 1;
  const max = Math.max(...values.map((item)=>item.bmi)) + 1;
  const points = values.map((item,index)=>({ ...item, x:28 + index * (544 / (values.length - 1)), y:132 - ((item.bmi - min) / Math.max(1, max-min)) * 102 }));
  const path = points.map((point,index)=>`${index?"L":"M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return `<section class="card history-chart-card"><div class="section-heading"><div><span class="eyebrow">Recent trend</span><h2>BMI history</h2></div><span class="chart-note">Educational context only</span></div><svg class="chart" viewBox="0 0 600 160" role="img" aria-label="Line chart of recent BMI results"><path class="chart-grid" d="M28 30H572M28 81H572M28 132H572"/><path class="chart-line" d="${path}"/>${points.map((point)=>`<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="5"><title>${formatDate(point.date,"short")}: BMI ${point.bmi.toFixed(1)}</title></circle>`).join("")}${points.map((point)=>`<text x="${point.x}" y="153" text-anchor="middle">${new Intl.DateTimeFormat("en-PH",{month:"short",day:"numeric"}).format(new Date(point.date))}</text>`).join("")}</svg></section>`;
}

function learnView() {
  return `<header class="page-header"><div><span class="eyebrow">Health education</span><h1 class="page-title">Understand the result carefully</h1><p class="page-subtitle">BMI-for-age is one screening indicator—not a diagnosis or a judgment.</p></div></header><div class="article-grid"><article class="card article-card formula-card"><div class="article-icon">${icon("activity")}</div><h2>How BMI is calculated</h2><p class="formula">weight (kg) ÷ height (m)²</p><p>For adolescents, the number is then compared with an age- and sex-specific WHO reference and expressed as a z-score.</p></article><article class="card article-card"><div class="article-icon">${icon("chart")}</div><h2>WHO BMI-for-age categories</h2><div class="category-list"><span><strong>Below −3 SD</strong> Severe thinness</span><span><strong>−3 to below −2 SD</strong> Thinness</span><span><strong>−2 to +1 SD</strong> Within expected range</span><span><strong>Above +1 to +2 SD</strong> Overweight</span><span><strong>Above +2 SD</strong> Obesity</span></div></article><article class="card article-card"><div class="article-icon">${icon("info")}</div><h2>Why monitoring helps</h2><p>A pattern over time can provide more context than one number. Growth history, symptoms, food access, movement, sleep, and health conditions also matter.</p></article><article class="card article-card"><div class="article-icon">${icon("heart")}</div><h2>When to ask for help</h2><p>Discuss rapid or unexpected changes, symptoms, or concerns with a qualified healthcare professional. Never use TsekAP to self-diagnose or start a restrictive diet.</p></article><article class="card article-card references-card"><div class="article-icon">${icon("book")}</div><h2>Official references</h2><div class="reference-list">${referenceLinks()}</div></article></div>`;
}

function referenceLinks() {
  return [["WHO growth reference for ages 5–19",HEALTH_REFERENCES.whoGrowth],["WHO healthy diet guidance",HEALTH_REFERENCES.whoDiet],["WHO physical activity guidance",HEALTH_REFERENCES.whoActivity],["Philippine DOH health advisories",HEALTH_REFERENCES.dohAdolescent]].map(([label,href])=>`<a class="reference-link" href="${href}" target="_blank" rel="noopener"><span>${esc(label)}</span><strong>Open ↗</strong></a>`).join("");
}

function aboutView() {
  return `<header class="page-header"><div><span class="eyebrow">About TsekAP</span><h1 class="page-title">Awareness and prevention, designed for students</h1><p class="page-subtitle">A school health-monitoring experience grounded in education, privacy, and responsible guidance.</p></div></header><div class="about-hero"><article class="card about-copy"><h2>What TsekAP means</h2><p><strong>TsekAP</strong> brings together the idea of a health “check” with awareness and prevention. It supports students ages 15–18 in understanding BMI-for-age results without presenting them as a diagnosis.</p><p>The system combines careful measurement, WHO reference data, short-term trend monitoring, and condition-aware educational recommendations.</p></article><aside class="card about-values"><div class="value-row"><span class="value-icon">${icon("shield")}</span><div><strong>Privacy by design</strong><span>Approved access, protected profiles, and 90-day check-in retention.</span></div></div><div class="value-row"><span class="value-icon">${icon("book")}</span><div><strong>Education first</strong><span>Clear explanations and official reference links.</span></div></div><div class="value-row"><span class="value-icon">${icon("activity")}</span><div><strong>Useful offline</strong><span>Private on-device calculation when the network is unavailable.</span></div></div></aside></div><section class="card article-card about-references"><h2>Evidence and references</h2><p>TsekAP’s BMI-for-age calculation uses the WHO 2007 reference for ages 5–19. Health guidance is educational and links back to official sources.</p><div class="reference-list">${referenceLinks()}</div></section>`;
}

function accountView() {
  const legacy = Boolean(localStorage.getItem(LEGACY_ACCOUNT_KEY)) && !state.profile.migrationCompletedAt;
  return `<header class="page-header"><div><span class="eyebrow">Account</span><h1 class="page-title">Profile and privacy</h1><p class="page-subtitle">Your cloud profile is protected by Firebase Authentication.</p></div></header><section class="card settings-card"><div class="settings-row"><div><strong>Full name</strong><p>${esc(state.profile.name)}</p></div></div><div class="settings-row"><div><strong>Learner Reference Number</strong><p>${esc(state.profile.lrn)}</p></div></div><div class="settings-row"><div><strong>Check-in retention</strong><p>Each cloud health check-in is automatically removed 90 days after its measurement date.</p></div><span class="status-badge approved">90 days</span></div><div class="settings-row"><div><strong>Offline calculation</strong><p>Offline results stay in memory only and are not uploaded or saved to this device.</p></div></div>${legacy?`<div class="settings-row"><div><strong>Import old device records</strong><p>An encrypted local profile was found on this device.</p></div><button class="button secondary" id="import-local">Import</button></div>`:""}<div class="settings-row"><div><strong>Delete account</strong><p>Permanently remove this profile and all current check-ins.</p></div><button class="button danger" id="delete-account">${icon("trash","icon icon-sm")} Delete</button></div></section>`;
}

function bindStudentRoute() {
  document.querySelector("#checkin-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const data=new FormData(event.currentTarget); const button=event.submitter; button.disabled=true; try { if (!navigator.onLine) { const measuredAt = new Date(); const result = calculateBmi(data.get("height"),data.get("weight"),completedAgeMonths(state.profile.dob,measuredAt),state.profile.sex); state.offlineResult={date:measuredAt.toISOString(),height:Number(data.get("height")),weight:Number(data.get("weight")),...result,offline:true}; state.route="home"; render(); showToast("Calculated offline. This result was not saved.","success"); return; } await api("checkins",{method:"POST",body:JSON.stringify({height:data.get("height"),weight:data.get("weight")})}); state.offlineResult=null; showToast("Check-in calculated and saved for up to 90 days.","success"); state.route="home"; await loadSession(); } catch(error){ fieldError("checkin-error",error.message); button.disabled=false; } });
  document.querySelector("#import-local")?.addEventListener("click", importLegacy);
  document.querySelector("#delete-account")?.addEventListener("click", async () => { if (!confirm("Permanently delete your TsekAP account and every saved check-in?")) return; try { await api("account",{method:"DELETE"}); await signOut(auth); localStorage.removeItem(LEGACY_ACCOUNT_KEY); showToast("Account deleted.","success"); } catch(error){ showToast(error.message,"warning"); } });
}

async function importLegacy() {
  const passcode = prompt("Enter the old local-profile passcode to unlock the encrypted backup.");
  if (!passcode) return;
  try {
    const payload = await unlockLegacy(passcode);
    if (!confirm(`Import ${payload.records?.length || 0} local check-in(s) into ${state.profile.name}’s cloud profile?`)) return;
    const result = await api("migrations/local-profile",{method:"POST",body:JSON.stringify(payload)});
    showToast(`${result.imported} local check-in(s) imported. The encrypted local copy is still on this device.`,"success");
    await loadSession();
  } catch(error){ showToast(error.message || "The old passcode could not unlock this profile.","warning"); }
}

async function unlockLegacy(secret) {
  const account = JSON.parse(localStorage.getItem(LEGACY_ACCOUNT_KEY));
  const salt = Uint8Array.from(atob(account.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(account.iv), (c) => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(account.data), (c) => c.charCodeAt(0));
  const material = await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),"PBKDF2",false,["deriveKey"]);
  const key = await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:180000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({name:"AES-GCM",iv},key,cipher);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

function renderAdminShell() {
  const nav = [["admin-home","home","Overview"],["students","users","Students"],["audit","shield","Audit log"]].map(([route,glyph,label]) => `<button class="nav-button ${state.route===route||state.route==="home"&&route==="admin-home"?"active":""}" data-route="${route}">${icon(glyph)}<span>${label}</span></button>`).join("");
  app.innerHTML = `<div class="app-shell admin-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark"><img class="brand-logo" src="/assets/tsekap-logo-transparent.png" alt=""></div><div class="brand-copy"><strong>Tsek<b>AP</b> Admin</strong><span>Management console</span></div></div><nav class="nav-list">${nav}</nav><div class="sidebar-footer"><div class="profile-chip"><div class="avatar">A</div><div class="profile-meta"><strong>Administrator</strong><span>${esc(state.firebaseUser.email)}</span></div></div><button class="logout-button" data-logout>${icon("logout")}<span>Log out</span></button></div></aside><header class="mobile-bar"><div class="mobile-brand"><div class="brand-mark"><img class="brand-logo" src="/assets/tsekap-logo-transparent.png" alt=""></div><span>TsekAP Admin</span></div><button class="menu-button" id="menu-button" aria-label="${state.menuOpen?"Close":"Open"} menu" aria-expanded="${state.menuOpen}" aria-controls="mobile-menu">${icon(state.menuOpen?"x":"menu")}</button></header><div class="mobile-menu" id="mobile-menu" ${state.menuOpen?"":"hidden"}>${nav}<button class="logout-button" data-logout>${icon("logout")}<span>Log out</span></button></div><main class="content" id="main-content"><div class="page">${adminRoute()}</div></main></div>`;
  bindShell(); bindAdmin();
}

function adminRoute() {
  if (state.route === "students") return adminStudentsView();
  if (state.route === "audit") return adminAuditView();
  const pending = state.adminStudents.filter((student) => student.status === "pending");
  return `<header class="page-header"><div><span class="eyebrow">Administration</span><h1 class="page-title">Health program overview</h1><p class="page-subtitle">Review access, manage records, and monitor administrator actions.</p></div><button class="button primary" id="new-student">${icon("plus","icon icon-sm")} Add student</button></header><div class="admin-stats"><div class="card stat-card"><span>Students</span><strong>${state.adminStudents.length}</strong></div><div class="card stat-card"><span>Pending approval</span><strong>${pending.length}</strong></div><div class="card stat-card"><span>Approved</span><strong>${state.adminStudents.filter((student)=>student.status==="approved").length}</strong></div></div><section class="card card-pad"><div class="section-heading"><div><span class="eyebrow">Requires attention</span><h2>Pending registrations</h2></div></div>${pending.length?pending.map(adminStudentRow).join(""):'<div class="empty-inline">No pending registrations.</div>'}</section>`;
}

function adminStudentsView() {
  return `<header class="page-header"><div><span class="eyebrow">Student directory</span><h1 class="page-title">Manage students</h1><p class="page-subtitle">Search by full name or readable LRN.</p></div><div class="header-actions"><button class="button secondary" id="csv-import">Import CSV</button><button class="button secondary" id="csv-export">${icon("download","icon icon-sm")} Export</button><button class="button primary" id="new-student">Add student</button></div></header><div class="card directory-tools"><label class="field"><span class="sr-only">Search students</span><input class="input" id="student-search" placeholder="Search name or LRN" value="${esc(state.adminSearch)}"></label></div><section class="card admin-table"><div class="admin-table-head"><span>Student</span><span>LRN</span><span>Status</span><span>Actions</span></div>${state.adminStudents.length?state.adminStudents.map(adminStudentRow).join(""):'<div class="empty-inline">No matching students.</div>'}</section><input id="csv-file" type="file" accept=".csv,text/csv" hidden>`;
}

function adminStudentRow(student) {
  return `<div class="admin-table-row" data-student-row="${student.uid}"><div><strong>${esc(student.name)}</strong><small>${esc(student.sex)} · ${esc(student.dob)}</small></div><span class="tabular">${esc(student.lrn)}</span><span class="status-badge ${esc(student.status)}">${esc(student.status)}</span><div class="row-actions">${student.status==="pending"?`<button class="button mini success" data-admin-action="approve" data-uid="${student.uid}">Approve</button><button class="button mini ghost" data-admin-action="reject" data-uid="${student.uid}">Reject</button>`:`<button class="button mini secondary" data-admin-action="view" data-uid="${student.uid}">Open</button>`}<button class="icon-button danger-quiet" aria-label="Delete ${esc(student.name)}" data-admin-action="delete" data-uid="${student.uid}">${icon("trash","icon icon-sm")}</button></div></div>`;
}

function adminAuditView() {
  return `<header class="page-header"><div><span class="eyebrow">Accountability</span><h1 class="page-title">Administrator audit log</h1><p class="page-subtitle">Privileged actions are recorded without passwords or unnecessary health-data copies.</p></div></header><section class="card admin-table"><div class="admin-table-head audit-head"><span>Action</span><span>Target</span><span>Administrator</span><span>Time</span></div>${state.auditLogs.length?state.auditLogs.map((log)=>`<div class="admin-table-row audit-row"><strong>${esc(log.action)}</strong><span class="tabular">${esc(log.targetUid||"—")}</span><span>${esc(log.actorEmail||"Administrator")}</span><time>${log.createdAt?formatDate(log.createdAt):"Just now"}</time></div>`).join(""):'<div class="empty-inline">No administrator actions yet.</div>'}</section>`;
}

function bindAdmin() {
  document.querySelector("#student-search")?.addEventListener("input", debounce(async (event) => { state.adminSearch=event.target.value; await loadAdmin(); render(); },350));
  document.querySelector("#new-student")?.addEventListener("click", showCreateStudent);
  document.querySelector("#csv-import")?.addEventListener("click",()=>document.querySelector("#csv-file").click());
  document.querySelector("#csv-file")?.addEventListener("change", importCsv);
  document.querySelector("#csv-export")?.addEventListener("click", exportCsv);
  document.querySelectorAll("[data-admin-action]").forEach((button)=>button.addEventListener("click",()=>adminAction(button.dataset.adminAction,button.dataset.uid)));
}

async function adminAction(action, uid) {
  const student = state.adminStudents.find((item)=>item.uid===uid);
  try {
    if(action==="approve"||action==="reject"){
      const note = action==="reject" ? prompt("Optional note for the student:") || "" : "";
      await api(`admin/users/${uid}/${action}`,{method:"POST",body:JSON.stringify({note})});
      showToast(`Registration ${action==="approve"?"approved":"rejected"}.`,"success");
    } else if(action==="delete"){
      if(!confirm(`Permanently delete ${student.name} and every check-in?`)) return;
      await api(`admin/users/${uid}`,{method:"DELETE"}); showToast("Student account deleted.","success");
    } else if(action==="view"){ await showStudentDetail(student); return; }
    await loadAdmin(); render();
  } catch(error){ showToast(error.message,"warning"); }
}

async function showStudentDetail(student) {
  const data = await api(`admin/users/${student.uid}/checkins`);
  state.selectedStudent=student; state.selectedCheckins=data.checkins||[];
  const dialog=document.createElement("dialog"); dialog.className="detail-dialog"; dialog.innerHTML=`<form method="dialog"><button class="dialog-close" aria-label="Close">${icon("x")}</button></form><span class="eyebrow">Student record</span><h2>${esc(student.name)}</h2><div class="student-detail-grid"><div><span>LRN</span><strong>${esc(student.lrn)}</strong></div><div><span>Status</span><strong>${esc(student.status)}</strong></div><div><span>Date of birth</span><strong>${esc(student.dob)}</strong></div><div><span>Reference sex</span><strong>${esc(student.sex)}</strong></div></div><div class="dialog-actions"><button class="button secondary" id="edit-student">Edit profile</button><button class="button secondary" id="reset-student">Reset password</button><button class="button secondary" id="toggle-student">${student.disabled?"Enable":"Disable"} account</button></div><h3>Check-ins</h3><div class="detail-checkins">${state.selectedCheckins.length?state.selectedCheckins.map((record)=>`<div class="detail-checkin"><div><strong>${formatDate(record.date)}</strong><span>BMI ${Number(record.bmi).toFixed(1)} · ${esc(record.classification)}</span></div><button class="button mini ghost" data-edit-checkin="${record.id}">Edit</button><button class="icon-button danger-quiet" data-delete-checkin="${record.id}">${icon("trash","icon icon-sm")}</button></div>`).join(""):'<p>No check-ins.</p>'}</div>`; document.body.append(dialog); dialog.showModal();
  dialog.addEventListener("close",()=>dialog.remove());
  dialog.querySelector("#edit-student").addEventListener("click",async()=>{const name=prompt("Full name",student.name);if(!name)return;await api(`admin/users/${student.uid}`,{method:"PATCH",body:JSON.stringify({name})});dialog.close();await loadAdmin();render();showToast("Profile updated.","success");});
  dialog.querySelector("#reset-student").addEventListener("click",async()=>{const result=await api(`admin/users/${student.uid}/reset-password`,{method:"POST",body:"{}"});prompt("Copy this one-time temporary password. It will not be shown again.",result.temporaryPassword);});
  dialog.querySelector("#toggle-student").addEventListener("click",async()=>{await api(`admin/users/${student.uid}/disabled`,{method:"PATCH",body:JSON.stringify({disabled:!student.disabled})});dialog.close();await loadAdmin();render();showToast(`Account ${student.disabled?"enabled":"disabled"}.`,"success");});
  dialog.querySelectorAll("[data-delete-checkin]").forEach((button)=>button.addEventListener("click",async()=>{if(!confirm("Delete this check-in?"))return;await api(`admin/users/${student.uid}/checkins/${button.dataset.deleteCheckin}`,{method:"DELETE"});dialog.close();await showStudentDetail(student);}));
  dialog.querySelectorAll("[data-edit-checkin]").forEach((button)=>button.addEventListener("click",async()=>{const record=state.selectedCheckins.find((item)=>item.id===button.dataset.editCheckin);const height=prompt("Height (cm)",record.height);if(!height)return;const weight=prompt("Weight (kg)",record.weight);if(!weight)return;await api(`admin/users/${student.uid}/checkins/${record.id}`,{method:"PATCH",body:JSON.stringify({height,weight,date:record.date})});dialog.close();await showStudentDetail(student);}));
}

function showCreateStudent() {
  const dialog=document.createElement("dialog"); dialog.className="detail-dialog"; dialog.innerHTML=`<form id="admin-create-form"><button type="button" class="dialog-close" aria-label="Close">${icon("x")}</button><span class="eyebrow">Administrator enrollment</span><h2>Add a student</h2><div class="field-grid"><div class="field full"><label>Full name<input class="input" name="name" required></label></div><div class="field"><label>LRN<input class="input" name="lrn" pattern="\\d{12}" maxlength="12" required></label></div><div class="field"><label>Date of birth<input class="input" name="dob" type="date" required></label></div><div class="field"><label>Reference sex<select class="input" name="sex" required><option value="female">Female</option><option value="male">Male</option></select></label></div><div class="field"><label for="admin-temp-password">Temporary password</label><div class="password-control"><input class="input" id="admin-temp-password" name="password" type="password" autocomplete="new-password" placeholder="Leave blank to generate"><button class="password-toggle" type="button" data-password-toggle aria-label="Show password" aria-pressed="false">${icon("eye","icon icon-sm")}</button></div></div></div><p class="field-error" id="create-error" hidden></p><div class="field-actions"><button type="button" class="button ghost dialog-cancel">Cancel</button><button class="button primary">Create approved account</button></div></form>`;document.body.append(dialog);dialog.showModal();
  bindPasswordToggles(dialog);
  dialog.querySelectorAll(".dialog-close,.dialog-cancel").forEach((button)=>button.addEventListener("click",()=>dialog.close()));
  dialog.addEventListener("close",()=>dialog.remove());
  dialog.querySelector("form").addEventListener("submit",async(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);try{const result=await api("admin/users",{method:"POST",body:JSON.stringify({lrn:data.get("lrn"),password:data.get("password")||undefined,profile:{name:data.get("name"),dob:data.get("dob"),sex:data.get("sex"),conditions:["none"]},status:"approved"})});prompt("Copy this temporary password. It will not be shown again.",result.temporaryPassword);dialog.close();await loadAdmin();render();showToast("Approved student account created.","success");}catch(error){fieldError("create-error",error.message);}});
}

async function exportCsv(){try{const data=await api("admin/export",{method:"POST",body:"{}"});const headers=["uid","lrn","name","date","height","weight","bmi","z","classification"];const csv=[headers.join(","),...data.rows.map((row)=>headers.map((key)=>`"${String(row[key]??"").replaceAll('"','""')}"`).join(","))].join("\n");downloadBlob(csv,"tsekap-student-checkins.csv","text/csv");showToast("CSV export downloaded.","success");}catch(error){showToast(error.message,"warning");}}
async function importCsv(event){const file=event.target.files[0];if(!file)return;const lines=(await file.text()).split(/\r?\n/).filter(Boolean);const headers=lines.shift().split(",").map((value)=>value.trim());let created=0;for(const line of lines){const values=line.split(",").map((value)=>value.trim().replace(/^"|"$/g,""));const row=Object.fromEntries(headers.map((key,index)=>[key,values[index]]));try{await api("admin/users",{method:"POST",body:JSON.stringify({lrn:row.lrn,password:row.password||undefined,profile:{name:row.name,dob:row.dob,sex:row.sex,conditions:["none"]},status:row.status||"approved"})});created++;}catch(error){showToast(`CSV row ${row.lrn||"unknown"}: ${error.message}`,"warning");}}await loadAdmin();render();showToast(`${created} student account(s) imported.`,"success");}

function bindShell(){document.querySelectorAll("[data-route]").forEach((button)=>button.addEventListener("click",()=>navigate(()=>{state.route=button.dataset.route;state.menuOpen=false;render();})));document.querySelector("#menu-button")?.addEventListener("click",()=>{state.menuOpen=!state.menuOpen;render();});bindLogout();}
function bindLogout(){document.querySelectorAll("[data-logout]").forEach((button)=>button.addEventListener("click",async()=>{await signOut(auth);state.route="home";showToast("You’re logged out.","success");}));}
function fieldError(id,message){const target=document.querySelector(`#${id}`);if(target){target.setAttribute("role","alert");target.textContent=message;target.hidden=false;target.scrollIntoView({block:"nearest",behavior:reducedMotion.matches?"auto":"smooth"});}}
function friendlyAuthError(error){const map={"auth/invalid-credential":"The credentials were not recognized.","auth/user-disabled":"This account is disabled. Contact the administrator.","auth/too-many-requests":"Too many attempts. Please wait and try again.","auth/email-already-in-use":"An account already exists."};return map[error.code]||error.message||"Authentication failed.";}
function firstName(){return state.profile?.name?.trim().split(/\s+/)[0]||"Student";}
function formatDate(value,style="long"){return new Intl.DateTimeFormat("en-PH",style==="short"?{month:"short",day:"numeric",year:"numeric"}:{day:"numeric",month:"short",year:"numeric"}).format(new Date(value));}
function signed(value){const number=Number(value);return `${number>=0?"+":""}${number.toFixed(2)} SD`;}
function tone(classification){return classification==="Within expected range"?"":classification==="Thinness"||classification==="Overweight"?"warning":"alert";}
function debounce(fn,delay){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay);};}
function downloadBlob(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

window.addEventListener("online",()=>showToast("Connection restored.","success"));
window.addEventListener("offline",()=>showToast("Health records require an internet connection.","warning"));
if ("serviceWorker" in navigator) window.addEventListener("load", () => {
  if (import.meta.env.PROD) navigator.serviceWorker.register("/sw.js").catch(() => {});
  else navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()));
});
render();
