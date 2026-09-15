/* ═══════════════════════════════════════════════
   FlagForge SVG Icon System
   All icons: viewBox 0 0 24 24, stroke-based
   ═══════════════════════════════════════════════ */

const FF = window.FF || {};
window.FF = FF;

FF.icons = {
  // ── Brand ──
  logo: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#e8a020"/>
    <path d="M8 8v12l4-3.5V8" stroke="#0c0e10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 16.5L20 20V8l-8 3.5" stroke="#0c0e10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="8" y1="8" x2="20" y2="8" stroke="#0c0e10" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  // ── Navigation ──
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,

  challenges: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21l4-4 4 4"/><path d="M4 17v-2a4 4 0 014-4h8a4 4 0 014 4v2"/><path d="M12 3v8"/><path d="M8 7h8"/></svg>`,

  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 1 8 1 4-1 4-1V3s-1 1-4 1-5-1-8-1-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,

  leaderboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M6 4h12l-1.5 6H7.5L6 4z"/><path d="M6 4V2h12v2"/><path d="M7.5 10v3h9v-3"/></svg>`,

  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-4 3.5-7 7-7s7 3 7 7"/></svg>`,

  admin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15v3"/><path d="M9 21h6"/><circle cx="12" cy="8" r="4"/><path d="M5 20c0-4 3.5-7 7-7"/><path d="M19 20c0-4-3.5-7-7-7"/></svg>`,

  signout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,

  // ── Category Icons (authored geometry) ──
  catWeb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9"/><path d="M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9"/></svg>`,

  catCrypto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/><circle cx="12" cy="16" r="1.5"/><path d="M12 17.5V19"/></svg>`,

  catPwn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/><path d="M6 4V2"/><path d="M10 4V2"/><path d="M14 4V2"/><path d="M18 4V2"/><path d="M7 13h2"/><path d="M11 12h4"/><path d="M7 16h10"/></svg>`,

  catForensics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><circle cx="11" cy="11" r="3"/><circle cx="11" cy="11" r="1"/></svg>`,

  catReversing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l-5 8 5 8"/><path d="M17 4l5 8-5 8"/><line x1="12" y1="3" x2="12" y2="21" stroke-dasharray="3 3"/></svg>`,

  catMisc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M10 7h4"/><path d="M7 10v4"/><path d="M17 10v4"/><path d="M10 17h4"/></svg>`,

  // ── Competition States ──
  solved: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 12l3 3 5-5"/></svg>`,

  unsolved: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,

  firstBlood: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c.8 0 1.5.6 1.8 1.5.5 1.5 1.2 3 1.2 4.5 0 1.5-.7 3-1.2 4.5.5 1.5 1.2 3 1.2 4.5 0 1.5-.7 3-1.2 4.5-.3.9-1 1.5-1.8 1.5s-1.5-.6-1.8-1.5c-.5-1.5-1.2-3-1.2-4.5 0-1.5.7-3 1.2-4.5-.5-1.5-1.2-3-1.2-4.5 0-1.5.7-3 1.2-4.5C10.5 2.6 11.2 2 12 2z" fill="currentColor"/></svg>`,

  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9h12"/><path d="M6 9a2 2 0 012-2h8a2 2 0 012 2"/><path d="M6 9v4a6 6 0 0012 0V9"/><path d="M10 4V2h4v2"/></svg>`,

  medal1: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 15l-2 7 5.5-3 5.5 3-2-7"/><text x="12" y="12" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">1</text></svg>`,

  medal2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 15l-2 7 5.5-3 5.5 3-2-7"/><text x="12" y="12" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">2</text></svg>`,

  medal3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 15l-2 7 5.5-3 5.5 3-2-7"/><text x="12" y="12" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">3</text></svg>`,

  // ── Utility Icons ──
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>`,

  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,

  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>`,

  hint: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v1"/><path d="M12 12v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>`,

  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,

  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,

  chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,

  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,

  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`,

  externalLink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,

  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,

  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/></svg>`,

  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,

  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,

  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,

  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,

  eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,

  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 7 12 13 2 7"/></svg>`,

  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-4 3.5-7 7-7s7 3 7 7"/></svg>`,

  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,

  zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,

  database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,

  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,

  // ── Decorative / Technical ──
  cornerCut: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1"><path d="M0 0L32 0L32 32"/></svg>`,

  node: `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="3"/></svg>`,
};

// ── Icon helper ──
FF.icon = function(name, size) {
  const s = size || 16;
  const svg = FF.icons[name] || '';
  return `<span class="ff-icon" style="width:${s}px;height:${s}px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;" aria-hidden="true">${svg}</span>`;
};

// ── Category icon map ──
FF.catIcon = function(cat, size) {
  const map = {
    Web: 'catWeb', Crypto: 'catCrypto', Pwn: 'catPwn',
    Forensics: 'catForensics', Reversing: 'catReversing', Misc: 'catMisc'
  };
  const key = Object.keys(map).find(k => k.toLowerCase() === (cat||'').toLowerCase()) || 'Misc';
  return FF.icon(map[key], size || 16);
};

// ── Category color map ──
FF.catColor = function(cat) {
  const map = {
    Web: 'var(--ff-cat-web)', Crypto: 'var(--ff-cat-crypto)', Pwn: 'var(--ff-cat-pwn)',
    Forensics: 'var(--ff-cat-forensics)', Reversing: 'var(--ff-cat-reversing)', Misc: 'var(--ff-cat-misc)'
  };
  const key = Object.keys(map).find(k => k.toLowerCase() === (cat||'').toLowerCase()) || 'Misc';
  return map[key];
};

FF.catColorSoft = function(cat) {
  const map = {
    Web: 'var(--ff-cat-web-soft)', Crypto: 'var(--ff-cat-crypto-soft)', Pwn: 'var(--ff-cat-pwn-soft)',
    Forensics: 'var(--ff-cat-forensics-soft)', Reversing: 'var(--ff-cat-reversing-soft)', Misc: 'var(--ff-cat-misc-soft)'
  };
  const key = Object.keys(map).find(k => k.toLowerCase() === (cat||'').toLowerCase()) || 'Misc';
  return map[key];
};

// ── Badge helpers ──
FF.diffBadge = function(diff) {
  const map = { Easy: 'easy', Medium: 'medium', Hard: 'hard', Insane: 'insane' };
  return `<span class="badge badge-${map[diff] || 'misc'}">${diff || 'Easy'}</span>`;
};

FF.catBadge = function(cat) {
  const map = { Web: 'web', Crypto: 'crypto', Pwn: 'pwn', Forensics: 'forensics', Reversing: 'rev', Misc: 'misc' };
  const key = Object.keys(map).find(k => k.toLowerCase() === (cat||'').toLowerCase()) || 'misc';
  return `<span class="badge badge-${map[key]}">${cat || 'Misc'}</span>`;
};
