/* ═══════════════════════════════════════════════
   FlagForge Shared Navigation Shell
   Renders: mobile topbar, sidebar nav, sidebar footer,
   mobile bottom nav, admin nav section.
   ═══════════════════════════════════════════════ */

const FF = window.FF || {};
window.FF = FF;

const FF_NAV_MAIN = [
  { page: 'dashboard', path: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
  { page: 'challenges', path: 'challenges.html', label: 'Challenges', icon: 'flag' },
  { page: 'leaderboard', path: 'leaderboard.html', label: 'Leaderboard', icon: 'leaderboard' },
];

const FF_NAV_ACCOUNT = [
  { page: 'profile', path: 'profile.html', label: 'Profile', icon: 'profile' },
];

FF.getActivePage = function() {
  return document.body.dataset.page || '';
};

FF.renderMobileTopbar = function() {
  if (document.querySelector('.mobile-topbar')) return;
  const topbar = document.createElement('div');
  topbar.className = 'mobile-topbar';
  topbar.innerHTML = `
    <button class="mobile-menu-btn" aria-label="Open navigation" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
    </button>
    <span class="mobile-title">FlagForge</span>
    <a href="profile.html" aria-label="Profile">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;color:var(--ff-text-secondary);"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-4 3.5-7 7-7s7 3 7 7"/></svg>
    </a>`;
  document.body.prepend(topbar);
};

FF.renderMobileOverlay = function() {
  if (document.querySelector('.mobile-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'mobile-overlay';
  document.body.appendChild(overlay);
};

FF.renderSidebarNav = function() {
  const sidebarNav = document.querySelector('.sidebar-nav');
  if (!sidebarNav) return;
  const activePage = FF.getActivePage();

  const mainItems = FF_NAV_MAIN.map(item => `
    <a href="${item.path}" class="nav-item ${item.page === activePage ? 'active' : ''}">
      <span class="nav-icon">${FF.icons[item.icon]}</span>
      <span>${item.label}</span>
    </a>`).join('');

  const accountItems = FF_NAV_ACCOUNT.map(item => `
    <a href="${item.path}" class="nav-item ${item.page === activePage ? 'active' : ''}">
      <span class="nav-icon">${FF.icons[item.icon]}</span>
      <span>${item.label}</span>
    </a>`).join('');

  sidebarNav.innerHTML = `
    <div class="nav-section-label">Competition</div>
    ${mainItems}
    <div class="nav-section-label">Account</div>
    ${accountItems}
    <button class="nav-item" onclick="signOut()" style="color:var(--ff-danger);cursor:pointer;">
      <span class="nav-icon">${FF.icons.signout}</span>
      <span>Sign Out</span>
    </button>
    <div class="ff-admin-slot"></div>`;
};

FF.renderSidebarFooter = function() {
  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;
  footer.innerHTML = `
    <div class="sidebar-user">
      <div class="sidebar-avatar" id="nav-avatar">?</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" id="nav-name">…</div>
        <div class="sidebar-user-pts" id="nav-pts">0 pts</div>
      </div>
    </div>`;
};

FF.renderMobileNav = function() {
  if (document.querySelector('.mobile-bottom-nav')) return;
  const activePage = FF.getActivePage();
  const bottomNav = document.createElement('div');
  bottomNav.className = 'mobile-bottom-nav';

  const items = [
    { page: 'dashboard', path: 'dashboard.html', label: 'Home', icon: 'dashboard' },
    { page: 'challenges', path: 'challenges.html', label: 'Challenges', icon: 'flag' },
    { page: 'leaderboard', path: 'leaderboard.html', label: 'Ranks', icon: 'leaderboard' },
    { page: 'profile', path: 'profile.html', label: 'Profile', icon: 'profile' },
  ];

  bottomNav.innerHTML = items.map(item => `
    <a href="${item.path}" class="nav-item ${item.page === activePage ? 'active' : ''}">
      <span class="nav-icon">${FF.icons[item.icon]}</span>
      <span>${item.label}</span>
    </a>`).join('');

  document.body.appendChild(bottomNav);
};

FF.initSidebarDrawer = function() {
  const appLayout = document.querySelector('.app-layout');
  const body = document.body;
  if (!appLayout) return;

  const toggle = (open) => {
    appLayout.classList.toggle('sidebar-open', open);
    body.style.overflow = open ? 'hidden' : '';
    const btn = document.querySelector('.mobile-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', open);
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('.mobile-menu-btn')) {
      toggle(!appLayout.classList.contains('sidebar-open'));
    } else if (e.target.closest('.mobile-overlay')) {
      toggle(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && appLayout.classList.contains('sidebar-open')) toggle(false);
  });
};

FF.initShell = function() {
  FF.renderMobileTopbar();
  FF.renderMobileOverlay();
  FF.renderSidebarNav();
  FF.renderSidebarFooter();
  FF.renderMobileNav();
  FF.initSidebarDrawer();
};

FF.setNavUser = function(userData, user) {
  const nameEl = document.getElementById('nav-name');
  const ptsEl = document.getElementById('nav-pts');
  const avatarEl = document.getElementById('nav-avatar');

  if (nameEl) nameEl.textContent = userData?.displayName || user?.displayName || 'Player';
  if (ptsEl) ptsEl.textContent = ((userData?.points || 0)).toLocaleString() + ' pts';

  if (avatarEl) {
    const photo = userData?.avatar || user?.photoURL;
    if (photo) {
      avatarEl.innerHTML = `<img src="${photo}" alt="" />`;
    } else {
      avatarEl.textContent = getInitials(userData?.displayName || user?.displayName);
    }
  }
};

FF.setAdminNav = function() {
  const slot = document.querySelector('.ff-admin-slot');
  if (!slot) return;
  const activePage = FF.getActivePage();
  slot.innerHTML = `
    <div class="nav-section-label">Admin</div>
    <a href="admin.html" class="nav-item ${activePage === 'admin' ? 'active' : ''}">
      <span class="nav-icon">${FF.icons.admin}</span>
      <span>Admin Dashboard</span>
    </a>`;
};

// Auto-init — scripts run at end of body, DOM is ready
ffInitShell();