const firebaseConfig = {
  apiKey: "AIzaSyDy4KPReIescItC0wLT7AaGh2cngs6BQ7E",
  authDomain: "ctf-daily.firebaseapp.com",
  projectId: "ctf-daily",
  storageBucket: "ctf-daily.firebasestorage.app",
  messagingSenderId: "513878659657",
  appId: "1:513878659657:web:4e6c59a9d76f784a48e598",
  measurementId: "G-1VY7EK4ZBM"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

async function syncUserToFirestore(user) {
  if (!user) return null;
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
 
  if (!snap.exists) {
    const rawName = user.displayName || user.email?.split('@')[0] || 'Player';
    const username = rawName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
      + Math.floor(Math.random() * 9000 + 1000);
 
    const profile = {
      uid:         user.uid,
      displayName: rawName,
      email:       user.email || '',
      username,
      avatar:      user.photoURL || null,
      role:        'student',
      points:      0,
      solves:      0,
      firstBloods: 0,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
    };
 
    await ref.set(profile);
 
    // Reserve username slot
    await db.collection('usernames')
      .doc(username.toLowerCase())
      .set({ uid: user.uid });
 
    return profile;
  }
 
  // Existing user — patch avatar/displayName if they changed in Google account
  const updates = {};
  if (user.photoURL && snap.data().avatar !== user.photoURL)
    updates.avatar = user.photoURL;
  if (user.displayName && !snap.data().displayName)
    updates.displayName = user.displayName;
  if (Object.keys(updates).length)
    await ref.update(updates);
 
  return snap.data();
}
 
// ── Auth State ──
function requireAuth(redirectTo = 'login.html') {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async user => {
      if (!user) { window.location.href = redirectTo; reject(); return; }
      // Always ensure Firestore record exists (covers Google Sign-In edge cases)
      await syncUserToFirestore(user);
      resolve(user);
    });
  });
}
 
function requireAdmin(redirectTo = 'dashboard.html') {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async user => {
      if (!user) { window.location.href = 'login.html'; reject(); return; }
      await syncUserToFirestore(user);
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists && doc.data().role === 'admin') resolve(user);
      else { window.location.href = redirectTo; reject(); }
    });
  });
}
 
function redirectIfLoggedIn(redirectTo = 'dashboard.html') {
  auth.onAuthStateChanged(user => {
    if (user) window.location.href = redirectTo;
  });
}
 
async function signOut() {
  await auth.signOut();
  window.location.href = 'login.html';
}
 
// ── Toast notifications ──
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}
 
// ── Modal helpers ──
function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
 
// ── Relative time ──
function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - (ts?.toMillis ? ts.toMillis() : ts)) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
 
// ── Difficulty color ──
function difficultyBadge(diff) {
  const map = { Easy: 'easy', Medium: 'medium', Hard: 'hard', Insane: 'insane' };
  return `<span class="badge badge-${map[diff] || 'misc'}">${diff}</span>`;
}
 
// ── Category badge ──
function categoryBadge(cat) {
  const map = { Web: 'web', Crypto: 'crypto', Pwn: 'pwn', Forensics: 'forensics', Reversing: 'rev', Misc: 'misc' };
  const key = Object.keys(map).find(k => k.toLowerCase() === cat?.toLowerCase()) || 'misc';
  return `<span class="badge badge-${map[key]}">${cat}</span>`;
}
 
// ── Format points ──
function formatPoints(n) { return n >= 1000 ? (n/1000).toFixed(1)+'k' : n; }
 
// ── Sanitize HTML input ──
function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
 
// ── Local storage helpers ──
const storage = {
  get: (k, def = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  remove: (k) => localStorage.removeItem(k)
};
 
// ── Debounce ──
function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
 
// ── Copy to clipboard ──
async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); showToast('Copied to clipboard', 'success'); }
  catch { showToast('Failed to copy', 'error'); }
}
 
// ── Generate avatar initials ──
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Mobile responsive app menu  ──
function initMobileNavigation() {
  const appLayout = document.querySelector('.app-layout');
  if (!appLayout || !document.querySelector('.sidebar') || window.innerWidth > 900) return;
  if (document.querySelector('.mobile-bottom-nav')) return;

  const bottomNav = document.createElement('div');
  bottomNav.className = 'mobile-bottom-nav';
  const currentPath = window.location.pathname;
  const isActive = (path) => currentPath.includes(path) ? 'active' : '';
  bottomNav.innerHTML = `
    <a href="dashboard.html" class="nav-item ${isActive('dashboard')}">
      <span class="nav-icon">⊞</span>
      <span>Dashboard</span>
    </a>
    <a href="challenges.html" class="nav-item ${isActive('challenges')}">
      <span class="nav-icon">⚑</span>
      <span>Challenges</span>
    </a>
    <a href="leaderboard.html" class="nav-item ${isActive('leaderboard')}">
      <span class="nav-icon">🏆</span>
      <span>Leaderboard</span>
    </a>
    <a href="profile.html" class="nav-item ${isActive('profile')}">
      <span class="nav-icon">👤</span>
      <span>Profile</span>
    </a>
  `;
  document.body.appendChild(bottomNav);
}

document.addEventListener('DOMContentLoaded', initMobileNavigation);
 