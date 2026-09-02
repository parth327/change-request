// Small hand-built icon set (Feather/Lucide-style outline icons) so views
// don't depend on an external icon font or JS bundle. Bodies are trusted,
// static SVG markup — never built from user input.
const ICONS = {
  "check-circle": `<circle cx="12" cy="12" r="9"/><polyline points="8,12.5 10.5,15 16,9"/>`,
  "x-circle": `<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15.5,14"/>`,
  mail: `<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3,7 12,13 21,7"/>`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>`,
  users: `<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-4 2.5-6.5 5.5-6.5S15 16 15 20"/><circle cx="17.5" cy="9.5" r="2.6"/><path d="M15.8 14c2.6.3 4.5 2.7 4.5 6"/>`,
  sliders: `<line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2"/>`,
  "log-out": `<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><polyline points="15,8 20,12 15,16"/><line x1="20" y1="12" x2="9" y2="12"/>`,
  search: `<circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.3" y2="15.3"/>`,
  filter: `<path d="M4 4h16l-6.5 8.2v6.3l-3 1.8v-8.1z"/>`,
  download: `<path d="M12 3v11"/><polyline points="7,10 12,15 17,10"/><line x1="4" y1="21" x2="20" y2="21"/>`,
  plus: `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  "chevron-left": `<polyline points="15,4 7,12 15,20"/>`,
  "chevron-right": `<polyline points="9,4 17,12 9,20"/>`,
  "arrow-left": `<line x1="20" y1="12" x2="4" y2="12"/><polyline points="10,6 4,12 10,18"/>`,
  "arrow-right": `<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14,6 20,12 14,18"/>`,
  "alert-triangle": `<path d="M12 3l9.5 17H2.5z"/><line x1="12" y1="9.5" x2="12" y2="13.3"/><circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none"/>`,
  "file-text": `<path d="M7 3h7l5 5v13H7z"/><polyline points="14,3 14,8 19,8"/><line x1="9.5" y1="13" x2="14.5" y2="13"/><line x1="9.5" y1="16.5" x2="14.5" y2="16.5"/>`,
  inbox: `<polyline points="4,4 4,15 8,15 10,18 14,18 16,15 20,15 20,4"/><line x1="4" y1="4" x2="20" y2="4"/>`,
  "shield-check": `<path d="M12 3l7.5 3.2v5.3c0 5-3.2 8.6-7.5 10-4.3-1.4-7.5-5-7.5-10V6.2z"/><polyline points="8.5,12 11,14.5 15.5,9.5"/>`,
  refresh: `<path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M5.5 9a7 7 0 0 1 12-3.5L20 8"/><path d="M18.5 15a7 7 0 0 1-12 3.5L4 16"/>`,
  sparkle: `<path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/>`,
  lock: `<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>`,
  "message-square": `<path d="M4 5h16v11H8l-4 4z"/>`,
  edit: `<path d="M4 20h4l11-11-4-4L4 16z"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/>`,
  "trending-up": `<polyline points="3,17 10,10 14,14 21,6"/><polyline points="15,6 21,6 21,12"/>`,
  eye: `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`,
  "layout-grid": `<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>`,
  home: `<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>`
};

function icon(name, className = "w-5 h-5") {
  const body = ICONS[name];
  if (!body) return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true">${body}</svg>`;
}

module.exports = { icon };
