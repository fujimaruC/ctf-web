// js/ui.js
// DOM manipulation utilities — toasts, loaders, render helpers.

/** Escape HTML special characters to prevent XSS */
export function sanitize(str) {
  if (typeof str !== "string") return String(str);
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, char => map[char]);
}

/** Show a toast notification */
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
    <span class="toast__msg">${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  setTimeout(() => {
    toast.classList.add("exit");
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function createToastContainer() {
  const div = document.createElement("div");
  div.id = "toast-container";
  document.body.appendChild(div);
  return div;
}

/** Toggle loading state on a button */
export function setButtonLoading(btn, loading, originalText = "Submit") {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span>`
    : originalText;
}

/** Debounce — returns a function that fires after `wait` ms of inactivity */
export function debounce(fn, wait = 5000) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Cooldown — fires immediately, then blocks for `ms` milliseconds */
export function cooldown(fn, ms = 5000) {
  let lastCall = 0;
  return async function (...args) {
    const now = Date.now();
    if (now - lastCall < ms) return;
    lastCall = now;
    return fn.apply(this, args);
  };
}

/** Render a category badge */
export function categoryBadge(cat) {
  const map = {
    Web:       "badge--web",
    Crypto:    "badge--crypto",
    Forensics: "badge--forensics",
    Pwn:       "badge--pwn",
    Rev:       "badge--rev",
    OSINT:     "badge--osint",
    Misc:      "badge--misc",
  };
  return `<span class="badge ${map[cat] || "badge--misc"}">${cat}</span>`;
}

/** Format a Firestore Timestamp or Date to a human-readable string */
export function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Countdown timer — updates element text every second, adds warning/critical classes */
export function startCountdown(elementId, targetDate, onExpire) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const tick = () => {
    const diff = targetDate - Date.now();
    if (diff <= 0) {
      el.textContent = "00:00:00";
      el.classList.remove("countdown--warning", "countdown--critical");
      onExpire?.();
      return;
    }
    const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    el.textContent = `${h}:${m}:${s}`;
    
    // Add warning class if < 1 hour, critical if < 10 minutes
    if (diff < 600000) { // < 10 min
      el.classList.add("countdown--critical");
      el.classList.remove("countdown--warning");
    } else if (diff < 3600000) { // < 1 hour
      el.classList.add("countdown--warning");
      el.classList.remove("countdown--critical");
    } else {
      el.classList.remove("countdown--warning", "countdown--critical");
    }
  };
  tick();
  return setInterval(tick, 1000);
}

/** Time-ago formatter — converts timestamp to human-readable relative time */
export function timeAgo(timestamp) {
  if (!timestamp) return "—";
  const ts = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - ts) / 1000);
  
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Animate counter from 0 to target number over duration ms */
export function animateCounter(element, targetNumber, duration = 1200) {
  const startValue = 0;
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentValue = Math.floor(progress * (targetNumber - startValue) + startValue);
    element.textContent = currentValue.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
}

/** Logout confirmation — button text changes to confirm, reverts after 3s, executes on second click */
export function setupLogoutConfirmation(btnElement, logoutFn) {
  let expecting = false;
  let confirmTimeout = null;
  const originalText = btnElement.textContent;
  
  btnElement.addEventListener("click", async e => {
    e.preventDefault();
    if (!expecting) {
      expecting = true;
      btnElement.textContent = "Sure? Click again";
      confirmTimeout = setTimeout(() => {
        expecting = false;
        btnElement.textContent = originalText;
      }, 3000);
      return;
    }
    if (confirmTimeout) clearTimeout(confirmTimeout);
    await logoutFn();
  });
}