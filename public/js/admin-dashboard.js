(function () {
  const tbody = document.getElementById("requests-tbody");
  const tabs = document.querySelectorAll("#status-tabs button");
  const searchInput = document.getElementById("search-input");
  const pagination = document.getElementById("pagination");
  const paginationSummary = document.getElementById("pagination-summary");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const pageSize = window.__DASHBOARD_PAGE_SIZE__ || 20;

  let status = "";
  let q = "";
  let page = 1;
  let debounceTimer = null;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    // changeDate is a calendar date stored as UTC midnight — pin timeZone
    // so it never rolls back a day on a server running behind UTC.
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone: "UTC"
    }).format(new Date(iso));
  }
  function formatDateTime(iso) {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  }
  function daysSince(iso) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  }

  const ICON_SVG = {
    clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15.5,14"/></svg>',
    "check-circle": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8,12.5 10.5,15 16,9"/></svg>',
    "x-circle": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>',
    inbox: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6" aria-hidden="true"><polyline points="4,4 4,15 8,15 10,18 14,18 16,15 20,15 20,4"/><line x1="4" y1="4" x2="20" y2="4"/></svg>'
  };

  const badgeMap = {
    PENDING: { label: "Pending", cls: "badge-pending", ic: "clock" },
    APPROVED: { label: "Approved", cls: "badge-approved", ic: "check-circle" },
    REJECTED: { label: "Rejected", cls: "badge-rejected", ic: "x-circle" }
  };

  const APPROVAL_LABEL = { PENDING: "Pending", NOTIFIED: "Pending", APPROVED: "Approved", REJECTED: "Rejected", SKIPPED: "Not required" };
  const APPROVAL_COLOR_CLASS = { PENDING: "text-pending", NOTIFIED: "text-pending", APPROVED: "text-success", REJECTED: "text-danger", SKIPPED: "text-ink-muted" };
  const APPROVAL_DOT_CLASS = { PENDING: "bg-pending", NOTIFIED: "bg-pending", APPROVED: "bg-success", REJECTED: "bg-danger", SKIPPED: "bg-line" };

  function renderRows(requests) {
    if (requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-ink-muted">${ICON_SVG.inbox}</span>
          <p class="text-ink-muted text-sm">No requests match this view.</p>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = requests
      .map((r) => {
        const badge = badgeMap[r.status] || { label: r.status, cls: "badge-pending", ic: "clock" };
        const pendingNote =
          r.status === "PENDING" && daysSince(r.createdAt) >= 3
            ? ` <span class="text-accent-ink inline-flex items-center gap-1">&middot; <span class="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"></span> ${daysSince(r.createdAt)}d pending</span>`
            : "";
        const approverRows = (r.approvals || [])
          .slice()
          .sort((a, b) => a.level - b.level)
          .map((a) => {
            const label = APPROVAL_LABEL[a.status] || a.status;
            const colorCls = APPROVAL_COLOR_CLASS[a.status] || "text-pending";
            const dotCls = APPROVAL_DOT_CLASS[a.status] || "bg-pending";
            const commentLine = a.comment
              ? `<p class="text-ink-muted italic truncate pl-2.5" title="${escapeHtml(a.comment)}">"${escapeHtml(a.comment)}"</p>`
              : "";
            return `<div class="text-xs leading-snug">
                <span class="inline-block h-1.5 w-1.5 rounded-full ${dotCls} mr-1"></span><span class="text-ink font-medium">${escapeHtml(a.recipient.name)}</span>
                <span class="${colorCls}">&middot; ${label}</span>
                ${commentLine}
              </div>`;
          })
          .join("");
        return `
          <tr class="table-row">
            <td class="px-4 py-3">
              <a href="/admin/requests/${escapeHtml(r.id)}" class="text-accent-ink font-medium hover:underline">${escapeHtml(r.refCode)}</a>
              <p class="text-ink-muted text-xs mt-0.5 max-w-[220px] truncate" title="${escapeHtml(r.description)}">${escapeHtml(r.description)}</p>
            </td>
            <td class="px-4 py-3 text-ink">${escapeHtml(r.submitterEmail)}</td>
            <td class="px-4 py-3 text-ink">${formatDate(r.changeDate)}</td>
            <td class="px-4 py-3 text-ink-muted">${formatDateTime(r.createdAt)}${pendingNote}</td>
            <td class="px-4 py-3"><div class="space-y-1.5 min-w-[180px] max-w-[260px]">${approverRows}</div></td>
            <td class="px-4 py-3"><span class="${badge.cls}">${ICON_SVG[badge.ic]}${badge.label}</span></td>
          </tr>`;
      })
      .join("");
  }

  function updatePagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    pagination.classList.toggle("hidden", total <= pageSize);
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    paginationSummary.textContent = `${start}–${end} of ${total}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
  }

  async function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    params.set("page", String(page));
    tbody.classList.add("opacity-40");
    try {
      const res = await fetch(`/api/admin/requests?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      renderRows(data.requests || []);
      updatePagination(data.total || 0);
    } finally {
      tbody.classList.remove("opacity-40");
    }
  }

  prevBtn.addEventListener("click", () => {
    if (page <= 1) return;
    page -= 1;
    load();
  });
  nextBtn.addEventListener("click", () => {
    page += 1;
    load();
  });

  // Counts up each stat tile from 0 to its real value on load — a small
  // finishing touch, not a data source; the true numbers are already in
  // the DOM via data-count-to and this only animates toward them.
  function animateCounts() {
    document.querySelectorAll("[data-count-to]").forEach((el) => {
      const target = parseInt(el.dataset.countTo, 10) || 0;
      if (target === 0) {
        el.textContent = "0";
        return;
      }
      const duration = 600;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  animateCounts();

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      status = tab.dataset.status;
      page = 1;
      tabs.forEach((t) => t.classList.remove("bg-ink", "text-bg"));
      tabs.forEach((t) => t.classList.add("text-ink-muted"));
      tab.classList.add("bg-ink", "text-bg");
      tab.classList.remove("text-ink-muted");
      load();
    });
  });

  searchInput.addEventListener("input", () => {
    q = searchInput.value;
    page = 1;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 300);
  });

  updatePagination(window.__DASHBOARD_INITIAL_TOTAL__ || 0);
})();
