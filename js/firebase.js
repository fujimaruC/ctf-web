// Firebase Configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDZwCUe7QI3tVx8zF1jJ9K0xY4pZ5aB6cD',
  authDomain: 'flagforge-demo.firebaseapp.com',
  projectId: 'flagforge-demo',
  storageBucket: 'flagforge-demo.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456'
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth helpers
async function requireAuth() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(user => {
      if (user) resolve(user);
      else {
        showToast('Please sign in first.', 'error');
        window.location.href = 'login.html';
        reject('Not authenticated');
      }
    });
  });
}

async function requireAdmin() {
  return new Promise(async (resolve, reject) => {
    const user = await requireAuth();
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.data()?.role === 'admin') resolve(user);
    else {
      showToast('Admin access required.', 'error');
      window.location.href = 'dashboard.html';
      reject('Not admin');
    }
  });
}

function redirectIfLoggedIn(destination) {
  auth.onAuthStateChanged(user => {
    if (user) window.location.href = destination;
  });
}

async function signOut() {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch(e) {
    showToast('Sign out failed.', 'error');
  }
}

// Utility functions
function sanitize(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(timestamp) {
  if (!timestamp) return '—';
  const ms = typeof timestamp.toMillis === 'function' ? timestamp.toMillis() : timestamp;
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

function categoryBadge(cat) {
  const colors = {
    Web: 'badge-web',
    Crypto: 'badge-crypto',
    Pwn: 'badge-pwn',
    Forensics: 'badge-forensics',
    Reversing: 'badge-reversing',
    Misc: 'badge-misc'
  };
  return `<span class="badge ${colors[cat] || 'badge-misc'}">${sanitize(cat || 'Misc')}</span>`;
}

function difficultyBadge(diff) {
  const colors = {
    Easy: 'badge-easy',
    Medium: 'badge-medium',
    Hard: 'badge-hard',
    Insane: 'badge-insane'
  };
  return `<span class="badge ${colors[diff] || 'badge-medium'}">${sanitize(diff || 'Medium')}</span>`;
}

function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}
