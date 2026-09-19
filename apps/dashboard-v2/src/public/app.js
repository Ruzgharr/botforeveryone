function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const originalWindowFetch = window.fetch;

function getStoredDashboardToken() {
  return localStorage.getItem("bfe_dashboard_token") || "";
}

function setStoredDashboardToken(token) {
  if (token) {
    localStorage.setItem("bfe_dashboard_token", token);
  } else {
    localStorage.removeItem("bfe_dashboard_token");
  }
}

async function checkSetupStatus() {
  try {
    const res = await originalWindowFetch("/api/auth/setup-status");
    if (!res.ok) return { setupRequired: false };
    return await res.json();
  } catch {
    return { setupRequired: false };
  }
}

let currentTemp2faToken = "";

async function showDashboardAuthModal(errorMessage = "") {
  const modal = document.getElementById("auth-modal-backdrop");
  const errEl = document.getElementById("auth-error-msg");
  const setupBox = document.getElementById("auth-setup-container");
  const loginBox = document.getElementById("auth-login-container");
  const twoFactorBox = document.getElementById("auth-2fa-container");
  const titleEl = document.getElementById("auth-modal-title");
  const subEl = document.getElementById("auth-modal-sub");

  if (!modal) return;

  currentTemp2faToken = "";
  if (twoFactorBox) twoFactorBox.style.display = "none";

  const status = await checkSetupStatus();
  if (status.setupRequired) {
    if (setupBox) setupBox.style.display = "block";
    if (loginBox) loginBox.style.display = "none";
    if (titleEl) titleEl.textContent = "Sistem İlk Kurulumu";
    if (subEl) subEl.textContent = "Tek seferlik yönetici hesabı oluşturma";
  } else {
    if (setupBox) setupBox.style.display = "none";
    if (loginBox) loginBox.style.display = "block";
    if (titleEl) titleEl.textContent = "Yönetici Girişi";
    if (subEl) subEl.textContent = "Panel erişimi için kimlik doğrulaması gereklidir";
  }

  modal.style.display = "flex";
  if (errEl) {
    if (errorMessage) {
      errEl.textContent = errorMessage;
      errEl.style.display = "block";
    } else {
      errEl.style.display = "none";
    }
  }
}

function hideDashboardAuthModal() {
  const modal = document.getElementById("auth-modal-backdrop");
  if (modal) {
    modal.style.display = "none";
  }
  currentTemp2faToken = "";
}

window.handleDashboardSetupSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const usernameInput = document.getElementById("setup-username-input");
  const passwordInput = document.getElementById("setup-password-input");
  const confirmInput = document.getElementById("setup-password-confirm");
  const btn = document.getElementById("setup-submit-btn");
  const errEl = document.getElementById("auth-error-msg");

  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";
  const confirm = confirmInput ? confirmInput.value : "";

  if (!username || !password) return;
  if (password !== confirm) {
    if (errEl) {
      errEl.textContent = "Girdiğiniz parolalar birbiriyle eşleşmiyor.";
      errEl.style.display = "block";
    }
    return;
  }

  if (btn) btn.disabled = true;
  try {
    const res = await originalWindowFetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setStoredDashboardToken(data.token);
      hideDashboardAuthModal();
      window.location.reload();
    } else {
      if (errEl) {
        errEl.textContent = data.error || "Kurulum sırasında hata oluştu.";
        errEl.style.display = "block";
      }
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = "Bağlantı hatası: " + err.message;
      errEl.style.display = "block";
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.handleDashboardAuthSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const userInput = document.getElementById("auth-username-input");
  const passInput = document.getElementById("auth-password-input");
  const btn = document.getElementById("auth-submit-btn");
  const errEl = document.getElementById("auth-error-msg");
  const loginBox = document.getElementById("auth-login-container");
  const twoFactorBox = document.getElementById("auth-2fa-container");
  const titleEl = document.getElementById("auth-modal-title");
  const subEl = document.getElementById("auth-modal-sub");

  const usernameVal = userInput ? userInput.value.trim() : "";
  const passwordVal = passInput ? passInput.value : "";
  if (!usernameVal || !passwordVal) return;

  const payload = { username: usernameVal, password: passwordVal };

  if (btn) btn.disabled = true;
  try {
    const res = await originalWindowFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.requires2fa && data.tempToken) {
        currentTemp2faToken = data.tempToken;
        if (loginBox) loginBox.style.display = "none";
        if (twoFactorBox) twoFactorBox.style.display = "block";
        if (titleEl) titleEl.textContent = "İki Aşamalı Doğrulama (2FA)";
        if (subEl) subEl.textContent = "Lütfen Authenticator kodunuzu giriniz";
        const codeInput = document.getElementById("auth-2fa-code-input");
        if (codeInput) {
          codeInput.value = "";
          codeInput.focus();
        }
        if (errEl) errEl.style.display = "none";
        return;
      }

      if (data.token) {
        setStoredDashboardToken(data.token);
        hideDashboardAuthModal();
        window.location.reload();
      }
    } else {
      if (errEl) {
        errEl.textContent = data.error || "Giriş başarısız.";
        errEl.style.display = "block";
      }
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = "Bağlantı hatası: " + err.message;
      errEl.style.display = "block";
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.handleDashboard2faSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const codeInput = document.getElementById("auth-2fa-code-input");
  const btn = document.getElementById("auth-2fa-submit-btn");
  const errEl = document.getElementById("auth-error-msg");

  const code = codeInput ? codeInput.value.trim() : "";
  if (!code || !currentTemp2faToken) return;

  if (btn) btn.disabled = true;
  try {
    const res = await originalWindowFetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken: currentTemp2faToken, code })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setStoredDashboardToken(data.token);
      hideDashboardAuthModal();
      window.location.reload();
    } else {
      if (errEl) {
        errEl.textContent = data.error || "2FA doğrulama kodu geçersiz.";
        errEl.style.display = "block";
      }
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = "Bağlantı hatası: " + err.message;
      errEl.style.display = "block";
    }
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.cancel2faLoginFlow = function() {
  currentTemp2faToken = "";
  const loginBox = document.getElementById("auth-login-container");
  const twoFactorBox = document.getElementById("auth-2fa-container");
  const titleEl = document.getElementById("auth-modal-title");
  const subEl = document.getElementById("auth-modal-sub");
  const errEl = document.getElementById("auth-error-msg");

  if (twoFactorBox) twoFactorBox.style.display = "none";
  if (loginBox) loginBox.style.display = "block";
  if (titleEl) titleEl.textContent = "Yönetici Girişi";
  if (subEl) subEl.textContent = "Panel erişimi için kimlik doğrulaması gereklidir";
  if (errEl) errEl.style.display = "none";
};

let lastUserActivity = Date.now();
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

function recordUserActivity() {
  lastUserActivity = Date.now();
}

["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach((evt) => {
  window.addEventListener(evt, recordUserActivity, { passive: true });
});

setInterval(() => {
  const token = getStoredDashboardToken();
  if (!token) return;
  if (Date.now() - lastUserActivity > IDLE_TIMEOUT_MS) {
    setStoredDashboardToken("");
    showDashboardAuthModal("Güvenlik gerekçesiyle 15 dakika boyunca hareketsiz kaldığınız için oturumunuz otomatik olarak sonlandırıldı.");
  }
}, 30000);

window.handleDashboardLogout = async function() {
  try {
    await originalWindowFetch("/api/auth/logout", {
      method: "POST",
      headers: { "Authorization": "Bearer " + getStoredDashboardToken() }
    });
  } catch {}
  setStoredDashboardToken("");
  window.location.reload();
};

window.fetch = async function(resource, init = {}) {
  init = init || {};
  const token = getStoredDashboardToken();

  if (token) {
    if (init.headers instanceof Headers) {
      if (!init.headers.has("Authorization")) {
        init.headers.set("Authorization", "Bearer " + token);
      }
      if (!init.headers.has("x-dashboard-key")) {
        init.headers.set("x-dashboard-key", token);
      }
    } else {
      init.headers = init.headers || {};
      if (!init.headers["Authorization"]) {
        init.headers["Authorization"] = "Bearer " + token;
      }
      if (!init.headers["x-dashboard-key"]) {
        init.headers["x-dashboard-key"] = token;
      }
    }
  }

  const response = await originalWindowFetch(resource, init);

  if (response.status === 401) {
    const url = typeof resource === "string" ? resource : (resource && resource.url ? resource.url : "");
    if (url.includes("/api/") && !url.includes("/api/auth/")) {
      showDashboardAuthModal("Oturum süresi doldu veya yetkisiz istek. Lütfen tekrar giriş yapınız.");
    }
  }

  return response;
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const token = getStoredDashboardToken();
    if (!token) {
      await showDashboardAuthModal();
    } else {
      const res = await originalWindowFetch("/api/auth/verify", {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) {
        await showDashboardAuthModal();
      }
    }
  } catch {
    await showDashboardAuthModal();
  }
});

const indicator = document.getElementById("nav-active-indicator");
const navItems = document.querySelectorAll(".nav-item");
const layoutContainer = document.querySelector(".layout-container");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
const sidebarCloseBtn = document.getElementById("sidebar-close-btn");

function positionIndicator(btn, immediate = false) {
  if (!indicator || !btn) return;
  const top = btn.offsetTop;
  const height = btn.offsetHeight;
  if (immediate) {
    const prevTransition = indicator.style.transition;
    indicator.style.transition = "none";
    indicator.style.transform = `translate3d(0, ${top}px, 0)`;
    indicator.style.height = `${height}px`;
    indicator.style.opacity = "1";
    void indicator.offsetHeight;
    indicator.style.transition = prevTransition;
  } else {
    indicator.style.transform = `translate3d(0, ${top}px, 0)`;
    indicator.style.height = `${height}px`;
    indicator.style.opacity = "1";
  }
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    navItems.forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".page-pane").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    positionIndicator(btn);

    const target = btn.getAttribute("data-tab");
    const pageTitle = btn.getAttribute("data-title") || "Panel";
    const pane = document.getElementById(target);
    if (pane) pane.classList.add("active");

    const breadcrumb = document.getElementById("active-breadcrumb-title");
    if (breadcrumb) breadcrumb.textContent = pageTitle;

    if (target === "tab-fleet") {
      loadFleetPage();
    }
    if (target === "tab-config") {
      loadConfigPage();
    }
    if (target === "tab-metrics") {
      startMetricsPolling();
    } else {
      stopMetricsPolling();
    }
    if (target === "tab-terminal") {
      startTerminalPolling();
    } else {
      stopTerminalPolling();
    }
    if (target === "tab-git-update") {
      loadGitUpdatePage();
      startGitStatusPolling();
    } else {
      stopGitStatusPolling();
    }
    if (target === "tab-security") {
      loadSecurityTab();
    }
    if (target === "tab-commands") {
      loadCommandsPage();
    }
    if (target === "tab-messages") {
      loadMessagesPage();
    }
    if (target === "tab-autoresponders") {
      loadAutoRespondersPage();
    }
    if (target === "tab-voice") {
      loadVoicePage();
    }
    if (target === "tab-economy") {
      loadEconomyPage();
    }
    if (target === "tab-casino") {
      loadCasinoPage();
    }
    if (target === "tab-clans") {
      loadClansPage();
    }
    if (target === "tab-badges") {
      loadBadgesPage();
    }
    if (target === "tab-pets") {
      loadPetsPage();
    }
    if (target === "tab-battlepass") {
      loadBattlePassPage();
    }
    if (target === "tab-guard") {
      loadGuardPage();
    }
    if (target === "tab-penalties") {
      loadPenaltiesPage();
    }
    if (target === "tab-staff-tasks") {
      loadStaffTasksPage();
    }
    if (target === "tab-tickets") {
      loadTicketsPage();
    }
    if (target === "tab-leaderboard") {
      loadLeaderboardPage();
    }
    if (target === "tab-invites") {
      loadInvitesPage();
    }
    if (target === "tab-backups") {
      loadBackupsPage();
    }
  });
});

function toggleSidebar() {
  if (!layoutContainer) return;
  const isCollapsed = layoutContainer.classList.toggle("sidebar-collapsed");
  localStorage.setItem("bfe_sidebar_collapsed", isCollapsed ? "true" : "false");
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", toggleSidebar);
}

if (sidebarCloseBtn) {
  sidebarCloseBtn.addEventListener("click", toggleSidebar);
}

if (localStorage.getItem("bfe_sidebar_collapsed") === "true" && layoutContainer) {
  layoutContainer.classList.add("sidebar-collapsed");
}

const toastContainer = document.getElementById("toast-container");

window.showToast = function (message, type = "info", duration = 3500) {
  const container = document.getElementById("toast-container") || document.body;
  if (!container) return;
  const item = document.createElement("div");
  item.className = `toast-item toast-${type}`;

  const iconSvg = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  }[type] || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  item.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-body">${message}</div>
    <button type="button" class="toast-close" aria-label="Kapat">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  container.appendChild(item);
  requestAnimationFrame(() => {
    item.classList.add("show");
  });

  const removeToast = () => {
    item.classList.remove("show");
    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 220);
  };

  const closeBtn = item.querySelector(".toast-close");
  if (closeBtn) closeBtn.addEventListener("click", removeToast);
  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
};

const dirtyStateBar = document.getElementById("dirty-state-bar");
const dirtyBtnReset = document.getElementById("dirty-btn-reset");
const dirtyBtnSave = document.getElementById("dirty-btn-save");

let activeSaveCallback = null;
let activeResetCallback = null;

window.setDirtyState = function (isDirty, onSave = null, onReset = null) {
  if (!dirtyStateBar) return;
  activeSaveCallback = onSave;
  activeResetCallback = onReset;

  if (isDirty) {
    dirtyStateBar.classList.add("active");
  } else {
    dirtyStateBar.classList.remove("active");
  }
};

function markDirty() {
  window.setDirtyState(true);
}
window.markDirty = markDirty;

function clearDirty() {
  window.setDirtyState(false);
}
window.clearDirty = clearDirty;

if (dirtyBtnReset) {
  dirtyBtnReset.addEventListener("click", () => {
    if (typeof activeResetCallback === "function") {
      activeResetCallback();
    }
    window.setDirtyState(false);
    window.showToast("Değişiklikler geri alındı.", "info");
  });
}

if (dirtyBtnSave) {
  dirtyBtnSave.addEventListener("click", async () => {
    if (typeof activeSaveCallback === "function") {
      try {
        await activeSaveCallback();
        window.setDirtyState(false);
        window.showToast("Değişiklikler başarıyla kaydedildi.", "success");
      } catch (err) {
        window.showToast("Kaydetme sırasında bir hata oluştu: " + (err.message || err), "error");
      }
    } else {
      window.setDirtyState(false);
      window.showToast("Değişiklikler başarıyla kaydedildi.", "success");
    }
  });
}

const paletteBackdrop = document.getElementById("command-palette-backdrop");
const paletteModal = document.querySelector(".command-palette-modal");
const paletteInput = document.getElementById("palette-search-input");
const paletteResults = document.getElementById("palette-results");
const navSearchTrigger = document.getElementById("nav-search-trigger");

function getPaletteItems() {
  const items = [];
  document.querySelectorAll(".nav-item").forEach((btn) => {
    const tab = btn.getAttribute("data-tab");
    const title = btn.getAttribute("data-title") || btn.innerText.trim();
    const groupEl = btn.previousElementSibling ? btn.previousElementSibling.closest(".nav-group-title") : null;
    const group = groupEl ? groupEl.textContent : "Navigasyon";
    const svgClone = btn.querySelector("svg") ? btn.querySelector("svg").outerHTML : "";
    items.push({
      id: tab,
      title,
      category: group,
      svg: svgClone,
      action: () => {
        btn.click();
      }
    });
  });

  items.push({
    id: "action-refresh",
    title: "Sayfayı Yenile",
    category: "Hızlı Eylemler",
    svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    action: () => location.reload()
  });

  items.push({
    id: "action-toggle-sidebar",
    title: "Yan Menüyü Gizle / Göster",
    category: "Görünüm",
    svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`,
    action: () => toggleSidebar()
  });

  return items;
}

let paletteSelectedIndex = 0;
let filteredPaletteItems = [];

function openCommandPalette() {
  if (!paletteBackdrop || !paletteModal) return;
  renderPaletteResults("");
  paletteBackdrop.classList.add("active");

  if (navSearchTrigger) {
    const btnRect = navSearchTrigger.getBoundingClientRect();
    const modalRect = paletteModal.getBoundingClientRect();

    const deltaX = (btnRect.left + btnRect.width / 2) - (modalRect.left + modalRect.width / 2);
    const deltaY = (btnRect.top + btnRect.height / 2) - (modalRect.top + modalRect.height / 2);
    const scaleX = Math.max(btnRect.width / modalRect.width, 0.25);
    const scaleY = Math.max(btnRect.height / modalRect.height, 0.1);

    paletteModal.style.transition = "none";
    paletteModal.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale3d(${scaleX}, ${scaleY}, 1)`;
    paletteModal.style.opacity = "0.2";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        paletteModal.style.transition = "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease";
        paletteModal.style.transform = "translate3d(0, 0, 0) scale3d(1, 1, 1)";
        paletteModal.style.opacity = "1";
      });
    });
  } else {
    paletteModal.style.transition = "transform 0.22s ease, opacity 0.18s ease";
    paletteModal.style.transform = "translate3d(0, 0, 0) scale3d(1, 1, 1)";
    paletteModal.style.opacity = "1";
  }

  if (paletteInput) {
    paletteInput.value = "";
    setTimeout(() => paletteInput.focus(), 60);
  }
}

function closeCommandPalette() {
  if (!paletteBackdrop || !paletteModal) return;
  if (navSearchTrigger) {
    const btnRect = navSearchTrigger.getBoundingClientRect();
    const modalRect = paletteModal.getBoundingClientRect();

    const deltaX = (btnRect.left + btnRect.width / 2) - (modalRect.left + modalRect.width / 2);
    const deltaY = (btnRect.top + btnRect.height / 2) - (modalRect.top + modalRect.height / 2);
    const scaleX = Math.max(btnRect.width / modalRect.width, 0.25);
    const scaleY = Math.max(btnRect.height / modalRect.height, 0.1);

    paletteModal.style.transition = "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease";
    paletteModal.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale3d(${scaleX}, ${scaleY}, 1)`;
    paletteModal.style.opacity = "0";

    setTimeout(() => {
      paletteBackdrop.classList.remove("active");
      paletteModal.style.transform = "none";
    }, 190);
  } else {
    paletteBackdrop.classList.remove("active");
  }
}

function renderPaletteResults(query = "") {
  if (!paletteResults) return;
  const q = query.trim().toLowerCase();
  const allItems = getPaletteItems();
  filteredPaletteItems = allItems.filter((it) => it.title.toLowerCase().includes(q) || it.category.toLowerCase().includes(q));

  paletteSelectedIndex = 0;
  paletteResults.innerHTML = "";

  if (filteredPaletteItems.length === 0) {
    paletteResults.innerHTML = `<div class="palette-empty">Eşleşen modül veya komut bulunamadı.</div>`;
    return;
  }

  filteredPaletteItems.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = `palette-item${index === 0 ? " selected" : ""}`;
    el.innerHTML = `
      <div class="palette-item-left">
        ${item.svg}
        <span>${item.title}</span>
      </div>
      <span class="palette-item-category">${item.category}</span>
    `;
    el.addEventListener("click", () => {
      closeCommandPalette();
      item.action();
    });
    paletteResults.appendChild(el);
  });
}

function updatePaletteSelection(newIndex) {
  const items = paletteResults ? paletteResults.querySelectorAll(".palette-item") : [];
  if (!items || items.length === 0) return;
  if (newIndex < 0) newIndex = items.length - 1;
  if (newIndex >= items.length) newIndex = 0;
  paletteSelectedIndex = newIndex;
  items.forEach((it, idx) => {
    it.classList.toggle("selected", idx === paletteSelectedIndex);
    if (idx === paletteSelectedIndex) {
      it.scrollIntoView({ block: "nearest" });
    }
  });
}

if (paletteInput) {
  paletteInput.addEventListener("input", (e) => {
    renderPaletteResults(e.target.value);
  });

  paletteInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      updatePaletteSelection(paletteSelectedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updatePaletteSelection(paletteSelectedIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredPaletteItems[paletteSelectedIndex]) {
        closeCommandPalette();
        filteredPaletteItems[paletteSelectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeCommandPalette();
    }
  });
}

if (paletteBackdrop) {
  paletteBackdrop.addEventListener("click", (e) => {
    if (e.target === paletteBackdrop) {
      closeCommandPalette();
    }
  });
}

if (navSearchTrigger) {
  navSearchTrigger.addEventListener("click", openCommandPalette);
}

window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (paletteBackdrop && paletteBackdrop.classList.contains("active")) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
  } else if (e.key === "Escape" && paletteBackdrop && paletteBackdrop.classList.contains("active")) {
    closeCommandPalette();
  }
});

const navToastPreviewBtn = document.getElementById("nav-toast-preview-btn");
const demoToastMessages = [
  { msg: "Değişiklikler başarıyla kaydedildi.", type: "success" },
  { msg: "Sunucu bağlantısında kısa süreli gecikme algılandı.", type: "warning" },
  { msg: "İşlem yetki yetersizliği nedeniyle reddedildi.", type: "error" },
  { msg: "BFE Yönetim Konsolu canlı senkronizasyonu aktif.", type: "info" }
];
let demoToastIndex = 0;

if (navToastPreviewBtn) {
  navToastPreviewBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/system-events");
      if (res.ok) {
        const events = await res.json();
        if (Array.isArray(events) && events.length > 0) {
          const ev = events[0];
          window.showToast(`[${ev.tag}] ${ev.message}`, ev.type || "info", 4000);
          return;
        }
      }
    } catch {
    }
    window.showToast("Tüm ekosistem servisleri aktif ve senkronize.", "info", 3000);
  });
}

const trNumberFormat = new Intl.NumberFormat("tr-TR");

function formatUptime(seconds = 0) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}g ${h}s ${m}d`;
  if (h > 0) return `${h}s ${m}d ${s}sn`;
  if (m > 0) return `${m}d ${s}sn`;
  return `${s}sn`;
}

async function loadOverviewMetrics() {
  try {
    const res = await fetch("/api/overview");
    if (!res.ok) return;
    const data = await res.json();

    const botsCountEl = document.getElementById("metric-bots-count");
    if (botsCountEl && data.cluster) {
      botsCountEl.textContent = `${data.cluster.onlineBots} / ${data.cluster.totalBots}`;
    }
    const botsUptimeEl = document.getElementById("metric-bots-uptime");
    if (botsUptimeEl && data.cluster) {
      botsUptimeEl.textContent = `Uptime ${data.cluster.avgUptime}`;
    }
    const botsPingEl = document.getElementById("metric-bots-ping");
    if (botsPingEl && data.cluster) {
      botsPingEl.textContent = `Ortalama ${data.cluster.avgPing}ms`;
    }

    const dbProviderEl = document.getElementById("metric-db-provider");
    if (dbProviderEl) {
      dbProviderEl.textContent = data.databaseProvider === "POSTGRESQL" ? "PostgreSQL" : (data.databaseProvider || "Aktif DB");
    }
    const dbStatusEl = document.getElementById("metric-db-status");
    if (dbStatusEl) {
      dbStatusEl.textContent = data.databaseConnected ? "Bağlı" : "Kopuk";
      dbStatusEl.className = data.databaseConnected ? "metric-pill pill-success" : "metric-pill pill-warning";
    }
    const dbEngineEl = document.getElementById("metric-db-engine");
    if (dbEngineEl) {
      dbEngineEl.textContent = data.databaseName || "Enterprise Cluster";
    }

    const usersCountEl = document.getElementById("metric-users-count");
    if (usersCountEl) {
      usersCountEl.textContent = trNumberFormat.format(data.stats?.registeredUsers || 0);
    }
    const trackedCountEl = document.getElementById("metric-tracked-count");
    if (trackedCountEl) {
      trackedCountEl.textContent = `${trNumberFormat.format(data.stats?.trackedMembers || 0)} İstatistik Profili`;
    }
    const clansCountEl = document.getElementById("metric-clans-count");
    if (clansCountEl) {
      clansCountEl.textContent = `${data.stats?.clansCount || 0} Klan`;
    }

    const ramUsageEl = document.getElementById("metric-ram-usage");
    if (ramUsageEl) {
      ramUsageEl.textContent = `${data.memoryUsageMb || 0} MB`;
    }
    const nodeVersionEl = document.getElementById("metric-node-version");
    if (nodeVersionEl) {
      nodeVersionEl.textContent = data.nodeVersion || "Node.js";
    }
    const uptimeStrEl = document.getElementById("metric-uptime-str");
    if (uptimeStrEl) {
      uptimeStrEl.textContent = `Süre: ${formatUptime(data.uptimeSeconds || 0)}`;
    }
    const penaltiesCountEl = document.getElementById("metric-penalties-count");
    if (penaltiesCountEl) {
      penaltiesCountEl.textContent = `${data.stats?.activePenalties || 0} Aktif Ceza`;
    }

    const resourceEcoEl = document.getElementById("resource-eco-total");
    if (resourceEcoEl) {
      resourceEcoEl.textContent = `${trNumberFormat.format(data.stats?.totalEconomyCirculation || 0)} Coin`;
    }
    const resourceVoiceEl = document.getElementById("resource-voice-total");
    if (resourceVoiceEl) {
      resourceVoiceEl.textContent = `${data.stats?.voiceBotsActive || 0} / ${data.stats?.voiceBotsTotal || 0} Aktif`;
    }
    const resourcePenaltiesEl = document.getElementById("resource-penalties-total");
    if (resourcePenaltiesEl) {
      resourcePenaltiesEl.textContent = `${data.stats?.activePenalties || 0} Kayıt`;
    }
    const resourceClansEl = document.getElementById("resource-clans-total");
    if (resourceClansEl) {
      resourceClansEl.textContent = `${data.stats?.clansCount || 0} Kurulu Klan`;
    }
    const resourcePetsEl = document.getElementById("resource-pets-total");
    if (resourcePetsEl) {
      resourcePetsEl.textContent = `${data.stats?.petsCount || 0} Kayıtlı Pet`;
    }

    if (data.maintenanceMode !== undefined) {
      const maintenanceDesc = document.getElementById("maintenance-status-desc");
      if (maintenanceDesc) {
        maintenanceDesc.textContent = data.maintenanceMode ? "Bakım modu etkin (Kullanıcılara kapalı)" : "Şu anda devre dışı (Aktif sistem)";
      }
      const btnMaintenance = document.getElementById("action-btn-maintenance");
      if (btnMaintenance) {
        if (data.maintenanceMode) {
          btnMaintenance.classList.add("maintenance-active");
        } else {
          btnMaintenance.classList.remove("maintenance-active");
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadOverviewBotFleet() {
  const tbody = document.getElementById("overview-bot-fleet-rows");
  if (!tbody) return;
  try {
    const res = await fetch("/api/bot-fleet");
    if (!res.ok) return;
    const data = await res.json();
    const bots = data.bots || [];

    if (bots.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-loading-cell">Aktif bot kaydı bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = bots.map((bot) => `
      <tr>
        <td>
          <div class="bot-table-name-cell">
            <span class="bot-table-title">${escapeHtml(bot.name)}</span>
            <span class="bot-table-key">${escapeHtml(bot.key || bot.id)}</span>
          </div>
        </td>
        <td>${escapeHtml(bot.role)}</td>
        <td>
          <span class="bot-ping-badge">
            <span class="ping-indicator-dot"></span>
            <span>${Number(bot.ping) || 20}ms</span>
          </span>
        </td>
        <td>${Number(bot.memoryMb) || 40} MB</td>
        <td>${escapeHtml(bot.uptime || "100.0%")}</td>
        <td><span class="metric-pill pill-success">Çevrim İçi</span></td>
        <td style="text-align: right;">
          <button type="button" class="btn-table-action" onclick="restartSingleBot('${escapeHtml(bot.id)}', '${escapeHtml(bot.name)}')">Yeniden Başlat</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading-cell">Bot listesi alınırken hata oluştu.</td></tr>`;
  }
}

async function loadOverviewEvents() {
  const container = document.getElementById("overview-event-feed");
  if (!container) return;
  try {
    const res = await fetch("/api/system-events");
    if (!res.ok) return;
    const events = await res.json();
    if (!Array.isArray(events) || events.length === 0) {
      container.innerHTML = `<div class="feed-empty-state">Henüz kayıtlı sistem olayı bulunmuyor.</div>`;
      return;
    }

    container.innerHTML = events.map((ev) => `
      <div class="event-feed-item">
        <div class="event-feed-left">
          <span class="event-tag tag-${escapeHtml(ev.type || 'info')}">${escapeHtml(ev.tag || 'Sistem')}</span>
          <span class="event-message">${escapeHtml(ev.message)}</span>
        </div>
        <span class="event-time">${escapeHtml(ev.time)}</span>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<div class="feed-empty-state">Olay kayıtları yüklenemedi.</div>`;
  }
}

window.restartSingleBot = async function(botId, botName) {
  try {
    const res = await fetch("/api/overview/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restart-bots", botId })
    });
    const result = await res.json();
    window.showToast(result.message || `${botName} başarıyla yeniden başlatıldı.`, "success");
    await Promise.all([loadOverviewMetrics(), loadOverviewBotFleet(), loadOverviewEvents()]);
  } catch (e) {
    window.showToast("Bot yeniden başlatılamadı.", "error");
  }
};

async function performOverviewAction(action, successMsg) {
  try {
    const res = await fetch("/api/overview/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const result = await res.json();
    const isMaintenance = action === "toggle-maintenance";
    const toastType = isMaintenance ? (result.maintenanceMode ? "warning" : "success") : "success";
    window.showToast(result.message || successMsg, toastType);
    await Promise.all([loadOverviewMetrics(), loadOverviewBotFleet(), loadOverviewEvents()]);
  } catch (err) {
    window.showToast("İşlem sırasında bir hata oluştu.", "error");
  }
}

function initOverviewEvents() {
  const btnRefresh = document.getElementById("btn-refresh-overview");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      const svg = btnRefresh.querySelector("svg");
      if (svg) svg.classList.add("spin");
      await Promise.all([loadOverviewMetrics(), loadOverviewBotFleet(), loadOverviewEvents()]);
      setTimeout(() => {
        if (svg) svg.classList.remove("spin");
      }, 500);
      window.showToast("Genel bakış metrikleri ve bot kümesi güncellendi.", "info", 2500);
    });
  }

  const btnSnapshot = document.getElementById("btn-quick-snapshot");
  if (btnSnapshot) {
    btnSnapshot.addEventListener("click", () => {
      performOverviewAction("create-snapshot", "Sistem snapshot yedeği oluşturuldu.");
    });
  }

  const btnRestartCluster = document.getElementById("action-btn-restart-cluster");
  if (btnRestartCluster) {
    btnRestartCluster.addEventListener("click", () => {
      performOverviewAction("restart-bots", "8 botluk servis kümesi yeniden başlatıldı.");
    });
  }

  const btnClearCache = document.getElementById("action-btn-clear-cache");
  if (btnClearCache) {
    btnClearCache.addEventListener("click", () => {
      performOverviewAction("clear-cache", "Önbellek temizlendi.");
    });
  }

  const btnSnapshotCard = document.getElementById("action-btn-snapshot");
  if (btnSnapshotCard) {
    btnSnapshotCard.addEventListener("click", () => {
      performOverviewAction("create-snapshot", "Sistem snapshot yedeği oluşturuldu.");
    });
  }

  const btnMaintenance = document.getElementById("action-btn-maintenance");
  if (btnMaintenance) {
    btnMaintenance.addEventListener("click", () => {
      performOverviewAction("toggle-maintenance", "Bakım modu güncellendi.");
    });
  }

  const btnRefreshEvents = document.getElementById("btn-refresh-events");
  if (btnRefreshEvents) {
    btnRefreshEvents.addEventListener("click", async () => {
      btnRefreshEvents.textContent = "Yenileniyor...";
      await loadOverviewEvents();
      setTimeout(() => {
        btnRefreshEvents.textContent = "Güncelle";
      }, 400);
      window.showToast("Olay akışı güncellendi.", "info", 2000);
    });
  }
}

function onInit() {
  const activeBtn = document.querySelector(".nav-item.active");
  if (activeBtn) {
    positionIndicator(activeBtn, true);
  }
  initOverviewEvents();
  loadOverviewMetrics();
  loadOverviewBotFleet();
  loadOverviewEvents();
  setInterval(() => {
    loadOverviewMetrics();
  }, 30000);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", onInit);
} else {
  onInit();
}

window.addEventListener("resize", () => {
  const activeBtn = document.querySelector(".nav-item.active");
  if (activeBtn) {
    positionIndicator(activeBtn, true);
  }
});

let fleetBots = [];
let GUILD_ID = window._GUILD_ID || "1546253954248085647";

function formatFleetUptime(seconds) {
  if (!seconds || seconds < 1) return "0s";
  if (seconds < 60) return seconds + "s";
  if (seconds < 3600) return Math.floor(seconds / 60) + "dk";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "sa";
  return Math.floor(seconds / 86400) + "g";
}

function formatPing(ping) {
  if (!ping || ping === 0) return "-";
  return ping + "ms";
}

function buildBotCard(bot) {
  const isOnline = bot.status === "ONLINE";
  const safeServiceKey = escapeHtml(bot.serviceKey);
  const safeName = escapeHtml(bot.name);
  const safeTag = escapeHtml(bot.tag || bot.serviceKey);
  const safeRole = escapeHtml(bot.role || "-");
  const avatarHtml = bot.avatar
    ? `<img class="fleet-bot-avatar" src="${escapeHtml(bot.avatar)}" alt="${safeName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="fleet-bot-avatar-fallback" style="display:none">${safeName.charAt(0)}</div>`
    : `<div class="fleet-bot-avatar-fallback">${safeName.charAt(0)}</div>`;

  const actionButtons = isOnline
    ? `
      <button class="fleet-card-btn danger" onclick="stopSingleBot('${safeServiceKey}', this)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
        Durdur
      </button>
      <button class="fleet-card-btn primary" onclick="restartSingleBot('${safeServiceKey}', this)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Yeniden Başlat
      </button>
      <button class="fleet-card-btn" onclick="openBotEditor('${safeServiceKey}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Düzenle
      </button>
    `
    : `
      <button class="fleet-card-btn success" onclick="startSingleBot('${safeServiceKey}', this)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Başlat
      </button>
      <button class="fleet-card-btn" onclick="openBotEditor('${safeServiceKey}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Düzenle
      </button>
    `;

  return `<div class="fleet-bot-card${isOnline ? "" : " offline"}" data-service-key="${safeServiceKey}">
    <div class="fleet-card-header">
      ${avatarHtml}
      <div class="fleet-card-title-group">
        <div class="fleet-bot-name">${safeName}</div>
        <div class="fleet-bot-tag">${safeTag}</div>
      </div>
      <div class="fleet-status-dot ${isOnline ? "online" : "offline"}" title="${isOnline ? "Çevrimiçi" : "Çevrim Dışı"}"></div>
    </div>
    <div class="fleet-card-role">${safeRole}</div>
    <div class="fleet-card-metrics">
      <div class="fleet-metric">
        <div class="fleet-metric-value">${formatPing(bot.ping)}</div>
        <div class="fleet-metric-label">Gecikme</div>
      </div>
      <div class="fleet-metric">
        <div class="fleet-metric-value">${formatFleetUptime(bot.uptimeSeconds)}</div>
        <div class="fleet-metric-label">Çalışma</div>
      </div>
      <div class="fleet-metric">
        <div class="fleet-metric-value">${Number(bot.guildCount) || 1}</div>
        <div class="fleet-metric-label">Sunucu</div>
      </div>
    </div>
    <div class="fleet-card-actions">
      ${actionButtons}
    </div>
  </div>`;
}

async function loadFleetPage() {
  const grid = document.getElementById("fleet-cluster-grid");
  if (!grid) return;
  grid.innerHTML = `<div class="fleet-loading-state">Bot verileri yükleniyor...</div>`;
  loadBotOwners();

  try {
    const res = await fetch("/api/bot-fleet");
    const data = await res.json();
    fleetBots = data.bots || [];

    if (fleetBots.length === 0) {
      grid.innerHTML = `<div class="fleet-loading-state">Henüz kayıtlı bot servisi bulunamadı.</div>`;
      return;
    }

    grid.innerHTML = fleetBots.map(buildBotCard).join("");
  } catch (err) {
    grid.innerHTML = `<div class="fleet-loading-state">Hata: ${err.message}</div>`;
  }
}

async function loadBotOwners() {
  const list = document.getElementById("bot-owners-list");
  if (!list) return;
  try {
    const res = await fetch(`/api/bot-owners/${GUILD_ID}`);
    const data = await res.json();
    const owners = data.botOwners || [];
    if (owners.length === 0) {
      list.innerHTML = `<div class="feed-empty-state">Henüz bot yetkilisi eklenmemiş.</div>`;
      return;
    }
    list.innerHTML = owners.map((id) => `
      <div class="bot-owner-row">
        <span class="bot-owner-id">${escapeHtml(id)}</span>
        <button class="bot-owner-remove" onclick="removeBotOwner('${escapeHtml(id)}')">Kaldır</button>
      </div>
    `).join("");
  } catch {}
}

const MODAL_OPTIONS = {
  "activity-type": {
    title: "Aktivite Türü Seçin",
    options: [
      { value: "PLAYING", label: "Oynuyor" },
      { value: "WATCHING", label: "İzliyor" },
      { value: "LISTENING", label: "Dinliyor" },
      { value: "COMPETING", label: "Yarışıyor" },
      { value: "CUSTOM", label: "Özel Durum" }
    ]
  },
  "discord-status": {
    title: "Çevrimiçi Durumu Seçin",
    options: [
      { value: "ONLINE", label: "Çevrimiçi" },
      { value: "IDLE", label: "Boşta" },
      { value: "DND", label: "Rahatsız Etme" }
    ]
  },
  "enabled": {
    title: "Servis Durumu Seçin",
    options: [
      { value: "true", label: "Aktif" },
      { value: "false", label: "Devre Dışı" }
    ]
  }
};

window.openOptionModal = function(fieldKey) {
  const cfg = MODAL_OPTIONS[fieldKey];
  if (!cfg) return;
  const currentVal = document.getElementById("editor-" + fieldKey)?.value;
  document.getElementById("fleet-option-modal-title").textContent = cfg.title;

  const list = document.getElementById("fleet-option-modal-list");
  list.innerHTML = cfg.options.map((opt) => `
    <div class="fleet-option-item${opt.value === currentVal ? " selected" : ""}" onclick="selectModalOption('${fieldKey}', '${opt.value}', '${opt.label}')">
      <span>${opt.label}</span>
      ${opt.value === currentVal ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
    </div>
  `).join("");

  document.getElementById("fleet-option-modal-backdrop").style.display = "flex";
};

window.closeOptionModal = function() {
  const modal = document.getElementById("fleet-option-modal-backdrop");
  if (modal) modal.style.display = "none";
};

window.selectModalOption = function(fieldKey, val, label) {
  const hiddenInput = document.getElementById("editor-" + fieldKey);
  if (hiddenInput) hiddenInput.value = val;
  const labelSpan = document.getElementById("label-" + fieldKey);
  if (labelSpan) labelSpan.textContent = label;
  closeOptionModal();
};

window.openBotEditor = function(serviceKey) {
  const bot = fleetBots.find((b) => b.serviceKey === serviceKey);
  if (!bot) return;

  document.getElementById("editor-service-key").value = serviceKey;
  document.getElementById("fleet-editor-title").textContent = bot.name + " Ayarları";
  document.getElementById("fleet-editor-subtitle").textContent = bot.tag || serviceKey;
  document.getElementById("editor-token").value = "";
  document.getElementById("editor-client-id").value = bot.clientId || "";

  const actVal = bot.activityType || "PLAYING";
  document.getElementById("editor-activity-type").value = actVal;
  const actOpt = MODAL_OPTIONS["activity-type"].options.find((o) => o.value === actVal);
  document.getElementById("label-activity-type").textContent = actOpt ? actOpt.label : actVal;

  document.getElementById("editor-activity-text").value = bot.activityText || "";

  const stVal = bot.discordStatus || "ONLINE";
  document.getElementById("editor-discord-status").value = stVal;
  const stOpt = MODAL_OPTIONS["discord-status"].options.find((o) => o.value === stVal);
  document.getElementById("label-discord-status").textContent = stOpt ? stOpt.label : stVal;

  const enVal = bot.enabled !== false ? "true" : "false";
  document.getElementById("editor-enabled").value = enVal;
  const enOpt = MODAL_OPTIONS["enabled"].options.find((o) => o.value === enVal);
  document.getElementById("label-enabled").textContent = enOpt ? enOpt.label : (enVal === "true" ? "Aktif" : "Devre Dışı");

  const editor = document.getElementById("fleet-bot-editor");
  editor.style.display = "block";
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.startSingleBot = async function(serviceKey, btn) {
  if (btn) { btn.disabled = true; btn.textContent = "Başlatılıyor..."; }
  try {
    const res = await fetch("/api/overview/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start-bots", botId: serviceKey })
    });
    const data = await res.json();
    window.showToast(data.message || serviceKey + " başlatıldı.", data.success ? "success" : "error");
    setTimeout(() => loadFleetPage(), 1200);
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Başlat`; }
  }
};

window.stopSingleBot = async function(serviceKey, btn) {
  if (btn) { btn.disabled = true; btn.textContent = "Durduruluyor..."; }
  try {
    const res = await fetch("/api/overview/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop-bots", botId: serviceKey })
    });
    const data = await res.json();
    window.showToast(data.message || serviceKey + " durduruldu.", data.success ? "info" : "error");
    setTimeout(() => loadFleetPage(), 1200);
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg> Durdur`; }
  }
};

window.restartSingleBot = async function(serviceKey, btn) {
  if (btn) { btn.disabled = true; btn.textContent = "Yeniden Başlatılıyor..."; }
  try {
    const res = await fetch("/api/overview/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restart-bots", botId: serviceKey })
    });
    const data = await res.json();
    window.showToast(data.message || serviceKey + " yeniden başlatıldı.", data.success ? "success" : "error");
    setTimeout(() => loadFleetPage(), 1500);
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Yeniden Başlat`; }
  }
};

window.removeBotOwner = async function(userId) {
  try {
    const res = await fetch(`/api/bot-owners/${GUILD_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", userId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Yetkili kaldırıldı.", "info");
      loadBotOwners();
    }
  } catch (err) {
    window.showToast("Hata: " + err.message, "error");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const btnFleetRefresh = document.getElementById("btn-fleet-refresh");
  if (btnFleetRefresh) btnFleetRefresh.addEventListener("click", () => loadFleetPage());

  const btnFleetStartAll = document.getElementById("btn-fleet-start-all");
  if (btnFleetStartAll) {
    btnFleetStartAll.addEventListener("click", async () => {
      btnFleetStartAll.disabled = true;
      btnFleetStartAll.querySelector("span").textContent = "Başlatılıyor...";
      try {
        const res = await fetch("/api/overview/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start-bots", botId: "ALL" })
        });
        const data = await res.json();
        window.showToast(data.success ? data.message : (data.error || "Hata."), data.success ? "success" : "error", 5000);
        if (data.success) setTimeout(() => loadFleetPage(), 2500);
      } catch (err) {
        window.showToast("Bağlantı hatası: " + err.message, "error");
      } finally {
        btnFleetStartAll.disabled = false;
        btnFleetStartAll.querySelector("span").textContent = "Tüm Kümeyi Başlat";
      }
    });
  }

  const btnFleetStopAll = document.getElementById("btn-fleet-stop-all");
  if (btnFleetStopAll) {
    btnFleetStopAll.addEventListener("click", async () => {
      btnFleetStopAll.disabled = true;
      btnFleetStopAll.querySelector("span").textContent = "Durduruluyor...";
      try {
        const res = await fetch("/api/overview/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop-bots", botId: "ALL" })
        });
        const data = await res.json();
        window.showToast(data.success ? data.message : (data.error || "Hata."), data.success ? "info" : "error", 5000);
        if (data.success) setTimeout(() => loadFleetPage(), 2000);
      } catch (err) {
        window.showToast("Bağlantı hatası: " + err.message, "error");
      } finally {
        btnFleetStopAll.disabled = false;
        btnFleetStopAll.querySelector("span").textContent = "Tüm Kümeyi Durdur";
      }
    });
  }

  const btnFleetRestartAll = document.getElementById("btn-fleet-restart-all");
  if (btnFleetRestartAll) {
    btnFleetRestartAll.addEventListener("click", async () => {
      btnFleetRestartAll.disabled = true;
      btnFleetRestartAll.querySelector("span").textContent = "Yeniden Başlatılıyor...";
      try {
        const res = await fetch("/api/overview/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restart-bots", botId: "ALL" })
        });
        const data = await res.json();
        window.showToast(data.success ? data.message : (data.error || "Hata."), data.success ? "success" : "error", 6000);
        if (data.success) setTimeout(() => loadFleetPage(), 3000);
      } catch (err) {
        window.showToast("Bağlantı hatası: " + err.message, "error");
      } finally {
        btnFleetRestartAll.disabled = false;
        btnFleetRestartAll.querySelector("span").textContent = "Tüm Kümeyi Yeniden Başlat";
      }
    });
  }

  const btnEditorClose = document.getElementById("btn-fleet-editor-close");
  if (btnEditorClose) {
    btnEditorClose.addEventListener("click", () => {
      document.getElementById("fleet-bot-editor").style.display = "none";
    });
  }

  const btnToggleToken = document.getElementById("btn-toggle-token-visibility");
  if (btnToggleToken) {
    btnToggleToken.addEventListener("click", () => {
      const input = document.getElementById("editor-token");
      if (input.type === "password") { input.type = "text"; btnToggleToken.textContent = "Gizle"; }
      else { input.type = "password"; btnToggleToken.textContent = "Göster"; }
    });
  }

  const btnFleetSave = document.getElementById("btn-fleet-save");
  if (btnFleetSave) {
    btnFleetSave.addEventListener("click", async () => {
      const serviceKey = document.getElementById("editor-service-key").value;
      if (!serviceKey) return;

      const payload = {
        serviceKey,
        clientId: document.getElementById("editor-client-id").value,
        activityType: document.getElementById("editor-activity-type").value,
        activityText: document.getElementById("editor-activity-text").value,
        status: document.getElementById("editor-discord-status").value,
        enabled: document.getElementById("editor-enabled").value === "true"
      };
      const tokenVal = document.getElementById("editor-token").value.trim();
      if (tokenVal) payload.token = tokenVal;

      btnFleetSave.disabled = true;
      btnFleetSave.querySelector("span").textContent = "Kaydediliyor...";
      try {
        const res = await fetch("/api/bot-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          window.showToast(serviceKey + " bot ayarları kaydedildi ve Discord aktivitesi güncellendi.", "success");
          document.getElementById("fleet-bot-editor").style.display = "none";
          setTimeout(() => loadFleetPage(), 800);
        } else {
          window.showToast(data.error || "Kaydetme başarısız.", "error");
        }
      } catch (err) {
        window.showToast("Hata: " + err.message, "error");
      } finally {
        btnFleetSave.disabled = false;
        btnFleetSave.querySelector("span").textContent = "Kaydet";
      }
    });
  }

  const btnFleetStartSingle = document.getElementById("btn-fleet-start-single");
  if (btnFleetStartSingle) {
    btnFleetStartSingle.addEventListener("click", async () => {
      const serviceKey = document.getElementById("editor-service-key").value;
      if (!serviceKey) return;
      await window.startSingleBot(serviceKey, btnFleetStartSingle);
    });
  }

  const btnFleetStopSingle = document.getElementById("btn-fleet-stop-single");
  if (btnFleetStopSingle) {
    btnFleetStopSingle.addEventListener("click", async () => {
      const serviceKey = document.getElementById("editor-service-key").value;
      if (!serviceKey) return;
      await window.stopSingleBot(serviceKey, btnFleetStopSingle);
    });
  }

  const btnFleetRestartSingle = document.getElementById("btn-fleet-restart-single");
  if (btnFleetRestartSingle) {
    btnFleetRestartSingle.addEventListener("click", async () => {
      const serviceKey = document.getElementById("editor-service-key").value;
      if (!serviceKey) return;
      await window.restartSingleBot(serviceKey, btnFleetRestartSingle);
    });
  }

  const btnAddOwner = document.getElementById("btn-add-bot-owner");
  if (btnAddOwner) {
    btnAddOwner.addEventListener("click", async () => {
      const input = document.getElementById("bot-owner-input");
      const userId = input.value.trim();
      if (!userId || !/^\d{15,20}$/.test(userId)) {
        window.showToast("Geçerli bir Discord kullanıcı ID giriniz (15-20 rakam).", "warning");
        return;
      }
      try {
        const res = await fetch(`/api/bot-owners/${GUILD_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", userId })
        });
        const data = await res.json();
        if (data.success) {
          window.showToast("Yetkili eklendi: " + userId, "success");
          input.value = "";
          loadBotOwners();
        } else {
          window.showToast(data.error || "Eklenemedi.", "error");
        }
      } catch (err) {
        window.showToast("Hata: " + err.message, "error");
      }
    });
  }

  const btnConfigSave = document.getElementById("btn-config-save");
  const btnConfigSaveBottom = document.getElementById("btn-config-save-bottom");
  if (btnConfigSave) btnConfigSave.addEventListener("click", () => saveGuildConfig(btnConfigSave));
  if (btnConfigSaveBottom) btnConfigSaveBottom.addEventListener("click", () => saveGuildConfig(btnConfigSaveBottom));

  const btnConfigExport = document.getElementById("btn-config-export");
  if (btnConfigExport) {
    btnConfigExport.addEventListener("click", () => {
      window.location.href = `/api/config/export/${GUILD_ID}`;
    });
  }

  const btnImportTrigger = document.getElementById("btn-config-import-trigger");
  const fileImportInput = document.getElementById("cfg-import-file-input");
  if (btnImportTrigger && fileImportInput) {
    btnImportTrigger.addEventListener("click", () => fileImportInput.click());
    fileImportInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const res = await fetch(`/api/config/import/${GUILD_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json)
        });
        const data = await res.json();
        if (data.success) {
          window.showToast("Yapılandırma dosyası başarıyla içe aktarıldı.", "success");
          loadConfigPage();
        } else {
          window.showToast(data.error || "İçe aktarma başarısız.", "error");
        }
      } catch (err) {
        window.showToast("Geçersiz JSON dosyası: " + err.message, "error");
      } finally {
        fileImportInput.value = "";
      }
    });
  }

  const btnConfigReset = document.getElementById("btn-config-reset");
  if (btnConfigReset) {
    btnConfigReset.addEventListener("click", () => {
      if (confirm("Tüm ayarları varsayılana döndürmek istediğinize emin misiniz?")) {
        loadConfigPage(true);
      }
    });
  }

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
      const configPane = document.getElementById("tab-config");
      if (configPane && configPane.classList.contains("active")) {
        e.preventDefault();
        saveGuildConfig(btnConfigSave);
      }
    }
  });

  const anchorLinks = document.querySelectorAll(".config-nav-link");
  anchorLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      anchorLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      const targetId = link.getAttribute("href")?.substring(1);
      const targetElem = document.getElementById(targetId);
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});

let currentDiscordMeta = null;
const DEFAULT_GUILD_ID = "1546253954248085647";

async function ensureDiscordMeta(forcedGuildId = null) {
  if (currentDiscordMeta && Array.isArray(currentDiscordMeta.channels) && currentDiscordMeta.channels.length > 0 && !forcedGuildId) {
    return currentDiscordMeta;
  }
  try {
    const targetGId = forcedGuildId || (typeof getSelectedGuildId === "function" ? getSelectedGuildId() : null) || (typeof GUILD_ID !== "undefined" && GUILD_ID) || DEFAULT_GUILD_ID;
    const res = await fetch(`/api/guild-meta/${targetGId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.found || (Array.isArray(data.channels) && data.channels.length > 0))) {
        currentDiscordMeta = data;
        window.currentDiscordMeta = data;
        return data;
      }
    }
  } catch (err) {}
  return currentDiscordMeta;
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDiscordMeta();
});
setTimeout(() => {
  ensureDiscordMeta();
}, 200);

const multiPickerState = {};

function renderMultiChips(key, items, isChannel = false) {
  const chipsContainer = document.getElementById(isChannel ? `chips-channel-${key}` : `chips-role-${key}`);
  if (!chipsContainer) return;
  chipsContainer.innerHTML = "";
  const values = multiPickerState[key] || [];

  values.forEach((id) => {
    const item = (items || []).find((i) => i.id === id);
    const chip = document.createElement("span");
    chip.className = `multi-chip ${isChannel ? "channel-chip" : ""}`;
    chip.dataset.id = id;

    const labelSpan = document.createElement("span");
    labelSpan.className = "multi-chip-label";
    if (item) {
      const prefix = isChannel ? (item.type === 2 ? "🔊 " : (item.type === 4 ? "📁 " : "# ")) : "@";
      labelSpan.textContent = `${prefix}${item.name}`;
      labelSpan.title = `${item.name} (${id})`;
    } else {
      labelSpan.textContent = id;
      labelSpan.title = id;
    }
    chip.appendChild(labelSpan);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "multi-chip-remove";
    removeBtn.title = "Kaldır";
    removeBtn.innerHTML = "&times;";
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      multiPickerState[key] = (multiPickerState[key] || []).filter((v) => v !== id);
      renderMultiChips(key, items, isChannel);
    };
    chip.appendChild(removeBtn);

    chipsContainer.appendChild(chip);
  });
}

function setupMultiPicker(key, items, initialValues, isChannel = false) {
  const rawVals = Array.isArray(initialValues) ? initialValues : (initialValues ? [initialValues] : []);
  multiPickerState[key] = [...new Set(rawVals.map((v) => String(v).trim()).filter(Boolean))];

  const select = document.getElementById(isChannel ? `cfg-channel-${key}` : `cfg-role-${key}`);
  if (select) {
    select.innerHTML = `<option value="">${isChannel ? "+ Ses Kanalı Listesinden Ekle..." : "+ Rol Listesinden Ekle..."}</option>`;
    (items || []).forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      if (isChannel) {
        const prefix = item.type === 2 ? "🔊 " : (item.type === 4 ? "📁 " : "# ");
        opt.textContent = `${prefix}${item.name} (${item.id})`;
      } else {
        opt.textContent = `@${item.name} (${item.id})`;
      }
      select.appendChild(opt);
    });

    select.onchange = () => {
      const val = select.value;
      if (val) {
        if (!multiPickerState[key]) multiPickerState[key] = [];
        if (!multiPickerState[key].includes(val)) {
          multiPickerState[key].push(val);
        }
        select.value = "";
        renderMultiChips(key, items, isChannel);
      }
    };
  }

  const customInput = document.getElementById(isChannel ? `cfg-channel-${key}-custom` : `cfg-role-${key}-custom`);
  const addBtn = document.querySelector(`.btn-chip-add[data-target="${key}"]`);

  const addCustomValues = () => {
    if (!customInput) return;
    const raw = customInput.value.trim();
    if (!raw) return;
    const ids = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (!multiPickerState[key]) multiPickerState[key] = [];
    ids.forEach((id) => {
      if (!multiPickerState[key].includes(id)) {
        multiPickerState[key].push(id);
      }
    });
    customInput.value = "";
    renderMultiChips(key, items, isChannel);
  };

  if (addBtn) {
    addBtn.onclick = (e) => {
      e.preventDefault();
      addCustomValues();
    };
  }

  if (customInput) {
    customInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCustomValues();
      }
    };
  }

  renderMultiChips(key, items, isChannel);
}

function populatePicker(selectId, items, selectedValue, customInputId, isChannel = false) {
  const select = document.getElementById(selectId);
  const customInput = document.getElementById(customInputId);
  if (!select) return;

  const resolvedVal = Array.isArray(selectedValue) ? (selectedValue[0] || "") : (selectedValue || "");

  select.innerHTML = '<option value="">-- Seçiniz veya Özel ID Giriniz --</option>';

  let matchFound = false;
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    if (isChannel) {
      const prefix = item.type === 2 ? "🔊 " : (item.type === 4 ? "📁 " : "# ");
      opt.textContent = `${prefix}${item.name} (${item.id})`;
    } else {
      opt.textContent = `${item.name} (${item.id})`;
    }
    if (item.id === resolvedVal) {
      opt.selected = true;
      matchFound = true;
    }
    select.appendChild(opt);
  });

  if (customInput) {
    customInput.value = matchFound ? "" : resolvedVal;
    select.onchange = () => {
      if (select.value) customInput.value = "";
    };
    customInput.oninput = () => {
      if (customInput.value.trim()) select.value = "";
    };
  }
}

function getPickerValue(selectId, customInputId, asArray = false) {
  const select = document.getElementById(selectId);
  const customInput = document.getElementById(customInputId);
  const val = (customInput && customInput.value.trim()) ? customInput.value.trim() : (select ? select.value : "");
  if (asArray) {
    return val ? [val] : [];
  }
  return val;
}

function getMultiPickerValues(key) {
  return (multiPickerState[key] || []).filter(Boolean);
}

async function loadConfigPage(useDefaults = false) {
  const statusLabel = document.getElementById("config-status-label");
  if (statusLabel) statusLabel.textContent = "Sunucu ve Discord verileri yükleniyor...";

  try {
    const [metaRes, configRes] = await Promise.all([
      fetch(`/api/guild-meta/${GUILD_ID}`).catch(() => null),
      fetch(`/api/config/${GUILD_ID}`).catch(() => null)
    ]);

    if (metaRes && metaRes.ok) {
      currentDiscordMeta = await metaRes.json();
    }

    let config = null;
    if (configRes && configRes.ok) {
      config = await configRes.json();
    }

    if (!config && !useDefaults) return;

    if (useDefaults) {
      config = {
        prefix: ".",
        tag: "",
        secondaryTag: "",
        roles: {},
        channels: {},
        limits: { banLimit: 3, kickLimit: 3, jailLimit: 5, roleDeleteLimit: 1, roleCreateLimit: 2, channelDeleteLimit: 1, channelCreateLimit: 2, pointLimit: 100 },
        penaltyThresholds: { mute: 40, jail: 80, ban: 150 }
      };
    }

    const guildNameEl = document.getElementById("cfg-guild-name");
    const guildIconEl = document.getElementById("cfg-guild-icon");
    const guildIconFallback = document.getElementById("cfg-guild-icon-fallback");
    const guildIdDisplay = document.getElementById("cfg-guild-id-display");
    const guildMemberCount = document.getElementById("cfg-guild-member-count");
    const guildRoleCount = document.getElementById("cfg-guild-role-count");
    const guildChannelCount = document.getElementById("cfg-guild-channel-count");

    if (currentDiscordMeta && currentDiscordMeta.found) {
      if (guildNameEl) guildNameEl.textContent = currentDiscordMeta.name;
      if (guildIdDisplay) guildIdDisplay.textContent = currentDiscordMeta.id;
      if (guildMemberCount) guildMemberCount.textContent = currentDiscordMeta.memberCount || 1;
      if (guildRoleCount) guildRoleCount.textContent = (currentDiscordMeta.roles || []).length;
      if (guildChannelCount) guildChannelCount.textContent = (currentDiscordMeta.channels || []).length;

      if (currentDiscordMeta.icon && guildIconEl && guildIconFallback) {
        guildIconEl.src = currentDiscordMeta.icon;
        guildIconEl.style.display = "block";
        guildIconFallback.style.display = "none";
      } else if (guildIconEl && guildIconFallback) {
        guildIconEl.style.display = "none";
        guildIconFallback.style.display = "flex";
        guildIconFallback.textContent = (currentDiscordMeta.name || "B").charAt(0).toUpperCase();
      }
    }

    const roles = currentDiscordMeta?.roles || [];
    const allChannels = currentDiscordMeta?.channels || [];
    const textChannels = allChannels.filter((c) => c.type === 0 || c.type === 5);
    const voiceChannels = allChannels.filter((c) => c.type === 2);
    const categoryChannels = allChannels.filter((c) => c.type === 4);

    document.getElementById("cfg-prefix").value = config.prefix || ".";
    document.getElementById("cfg-tag").value = config.tag || "";
    document.getElementById("cfg-secondaryTag").value = config.secondaryTag || "";
    document.getElementById("cfg-guild-id-input").value = config.guildId || GUILD_ID;

    const cfgRoles = config.roles || {};
    setupMultiPicker("unregistered", roles, cfgRoles.unregistered);
    setupMultiPicker("member", roles, cfgRoles.member);
    setupMultiPicker("man", roles, cfgRoles.man);
    setupMultiPicker("woman", roles, cfgRoles.woman);
    setupMultiPicker("vip", roles, cfgRoles.vip);
    setupMultiPicker("booster", roles, cfgRoles.booster);
    setupMultiPicker("tagRole", roles, cfgRoles.tagRole);
    setupMultiPicker("suspicious", roles, cfgRoles.suspicious);
    setupMultiPicker("jail", roles, cfgRoles.jail);
    setupMultiPicker("chatMute", roles, cfgRoles.chatMute);
    setupMultiPicker("voiceMute", roles, cfgRoles.voiceMute);
    setupMultiPicker("staffRoles", roles, cfgRoles.staffRoles);
    setupMultiPicker("registerStaff", roles, cfgRoles.registerStaff);
    setupMultiPicker("moderationStaff", roles, cfgRoles.moderationStaff);

    const cfgChannels = config.channels || {};
    populatePicker("cfg-channel-generalChat", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.generalChat, "cfg-channel-generalChat-custom", true);
    populatePicker("cfg-channel-registerChat", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.registerChat, "cfg-channel-registerChat-custom", true);
    setupMultiPicker("welcomeVoice", voiceChannels.length > 0 ? voiceChannels : allChannels, cfgChannels.welcomeVoice, true);
    populatePicker("cfg-channel-penaltyLog", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.penaltyLog, "cfg-channel-penaltyLog-custom", true);
    populatePicker("cfg-channel-registerLog", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.registerLog, "cfg-channel-registerLog-custom", true);
    populatePicker("cfg-channel-voiceLog", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.voiceLog, "cfg-channel-voiceLog-custom", true);
    populatePicker("cfg-channel-messageLog", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.messageLog, "cfg-channel-messageLog-custom", true);
    populatePicker("cfg-channel-inviteLog", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.inviteLog, "cfg-channel-inviteLog-custom", true);
    populatePicker("cfg-channel-guardLog", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.guardLog, "cfg-channel-guardLog-custom", true);
    populatePicker("cfg-channel-weeklyRewardLog", textChannels.length > 0 ? textChannels : allChannels, cfgChannels.weeklyRewardLog, "cfg-channel-weeklyRewardLog-custom", true);

    populatePicker("cfg-channel-ticketCategory", categoryChannels.length > 0 ? categoryChannels : allChannels, cfgChannels.ticketCategory, "cfg-channel-ticketCategory-custom", true);
    populatePicker("cfg-channel-customVoiceCategory", categoryChannels.length > 0 ? categoryChannels : allChannels, cfgChannels.customVoiceCategory, "cfg-channel-customVoiceCategory-custom", true);
    populatePicker("cfg-channel-customVoiceChannel", voiceChannels.length > 0 ? voiceChannels : allChannels, cfgChannels.customVoiceChannel, "cfg-channel-customVoiceChannel-custom", true);

    const cfgLimits = config.limits || {};
    document.getElementById("cfg-limit-banLimit").value = cfgLimits.banLimit ?? 3;
    document.getElementById("cfg-limit-kickLimit").value = cfgLimits.kickLimit ?? 3;
    document.getElementById("cfg-limit-jailLimit").value = cfgLimits.jailLimit ?? 5;
    document.getElementById("cfg-limit-roleDeleteLimit").value = cfgLimits.roleDeleteLimit ?? 1;
    document.getElementById("cfg-limit-roleCreateLimit").value = cfgLimits.roleCreateLimit ?? 2;
    document.getElementById("cfg-limit-channelDeleteLimit").value = cfgLimits.channelDeleteLimit ?? 1;
    document.getElementById("cfg-limit-channelCreateLimit").value = cfgLimits.channelCreateLimit ?? 2;
    document.getElementById("cfg-limit-pointLimit").value = cfgLimits.pointLimit ?? 100;

    const cfgThresholds = config.penaltyThresholds || {};
    document.getElementById("cfg-thresh-mute").value = cfgThresholds.mute ?? 40;
    document.getElementById("cfg-thresh-jail").value = cfgThresholds.jail ?? 80;
    document.getElementById("cfg-thresh-ban").value = cfgThresholds.ban ?? 150;

    if (statusLabel) statusLabel.textContent = "Sunucu yapılandırması güncel ve PostgreSQL ile senkronize.";
  } catch (err) {
    if (statusLabel) statusLabel.textContent = "Hata: " + err.message;
  }
}

async function saveGuildConfig(btn) {
  const origText = btn ? btn.querySelector("span")?.textContent : "";
  if (btn) {
    btn.disabled = true;
    if (btn.querySelector("span")) btn.querySelector("span").textContent = "Kaydediliyor...";
  }

  const payload = {
    prefix: document.getElementById("cfg-prefix").value.trim() || ".",
    tag: document.getElementById("cfg-tag").value.trim(),
    secondaryTag: document.getElementById("cfg-secondaryTag").value.trim(),
    roles: {
      unregistered: getMultiPickerValues("unregistered"),
      member: getMultiPickerValues("member"),
      man: getMultiPickerValues("man"),
      woman: getMultiPickerValues("woman"),
      vip: getMultiPickerValues("vip"),
      booster: getMultiPickerValues("booster"),
      tagRole: getMultiPickerValues("tagRole"),
      suspicious: getMultiPickerValues("suspicious"),
      jail: getMultiPickerValues("jail"),
      chatMute: getMultiPickerValues("chatMute"),
      voiceMute: getMultiPickerValues("voiceMute"),
      staffRoles: getMultiPickerValues("staffRoles"),
      registerStaff: getMultiPickerValues("registerStaff"),
      moderationStaff: getMultiPickerValues("moderationStaff")
    },
    channels: {
      generalChat: getPickerValue("cfg-channel-generalChat", "cfg-channel-generalChat-custom"),
      registerChat: getPickerValue("cfg-channel-registerChat", "cfg-channel-registerChat-custom"),
      welcomeVoice: getMultiPickerValues("welcomeVoice"),
      penaltyLog: getPickerValue("cfg-channel-penaltyLog", "cfg-channel-penaltyLog-custom"),
      registerLog: getPickerValue("cfg-channel-registerLog", "cfg-channel-registerLog-custom"),
      voiceLog: getPickerValue("cfg-channel-voiceLog", "cfg-channel-voiceLog-custom"),
      messageLog: getPickerValue("cfg-channel-messageLog", "cfg-channel-messageLog-custom"),
      inviteLog: getPickerValue("cfg-channel-inviteLog", "cfg-channel-inviteLog-custom"),
      guardLog: getPickerValue("cfg-channel-guardLog", "cfg-channel-guardLog-custom"),
      weeklyRewardLog: getPickerValue("cfg-channel-weeklyRewardLog", "cfg-channel-weeklyRewardLog-custom"),
      ticketCategory: getPickerValue("cfg-channel-ticketCategory", "cfg-channel-ticketCategory-custom"),
      customVoiceCategory: getPickerValue("cfg-channel-customVoiceCategory", "cfg-channel-customVoiceCategory-custom"),
      customVoiceChannel: getPickerValue("cfg-channel-customVoiceChannel", "cfg-channel-customVoiceChannel-custom")
    },
    limits: {
      banLimit: Number(document.getElementById("cfg-limit-banLimit").value) || 3,
      kickLimit: Number(document.getElementById("cfg-limit-kickLimit").value) || 3,
      jailLimit: Number(document.getElementById("cfg-limit-jailLimit").value) || 5,
      roleDeleteLimit: Number(document.getElementById("cfg-limit-roleDeleteLimit").value) || 1,
      roleCreateLimit: Number(document.getElementById("cfg-limit-roleCreateLimit").value) || 2,
      channelDeleteLimit: Number(document.getElementById("cfg-limit-channelDeleteLimit").value) || 1,
      channelCreateLimit: Number(document.getElementById("cfg-limit-channelCreateLimit").value) || 2,
      pointLimit: Number(document.getElementById("cfg-limit-pointLimit").value) || 100
    },
    penaltyThresholds: {
      mute: Number(document.getElementById("cfg-thresh-mute").value) || 40,
      jail: Number(document.getElementById("cfg-thresh-jail").value) || 80,
      ban: Number(document.getElementById("cfg-thresh-ban").value) || 150
    }
  };

  try {
    const res = await fetch(`/api/config/${GUILD_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Sunucu yapılandırması başarıyla PostgreSQL'e kaydedildi.", "success");
      const statusLabel = document.getElementById("config-status-label");
      if (statusLabel) statusLabel.textContent = `Son kayıt: ${new Date().toLocaleTimeString("tr-TR")} (PostgreSQL Senkronize)`;
    } else {
      window.showToast(data.error || "Kaydetme hatası.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btn.querySelector("span")) btn.querySelector("span").textContent = origText || "Değişiklikleri Kaydet";
    }
  }
}

let metricsInterval = null;
const cpuDataPoints = [];
const ramDataPoints = [];
const MAX_METRIC_POINTS = 30;

function formatDurationSeconds(sec) {
  if (!sec || sec <= 0) return "0 sn";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d} gün ${h} saat`;
  if (h > 0) return `${h} saat ${m} dk`;
  if (m > 0) return `${m} dk ${s} sn`;
  return `${s} sn`;
}

function drawSmoothCanvasChart(canvasId, dataPoints, strokeColor, fillColor, minVal = 0, maxVal = 100) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }
  ctx.save();
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (dataPoints.length < 2) {
    ctx.restore();
    return;
  }

  const effectiveMin = minVal !== undefined ? minVal : Math.min(...dataPoints);
  const effectiveMax = maxVal !== undefined ? Math.max(maxVal, Math.max(...dataPoints)) : Math.max(1, Math.max(...dataPoints));
  const range = Math.max(1, effectiveMax - effectiveMin);

  const stepX = w / (MAX_METRIC_POINTS - 1);
  const points = dataPoints.map((val, idx) => {
    const offsetIdx = idx + (MAX_METRIC_POINTS - dataPoints.length);
    const x = offsetIdx * stepX;
    const y = h - ((val - effectiveMin) / range) * (h - 24) - 12;
    return { x, y, val };
  });

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, fillColor || "rgba(99, 102, 241, 0.35)");
  grad.addColorStop(1, "rgba(99, 102, 241, 0.0)");

  ctx.beginPath();
  ctx.moveTo(points[0].x, h);
  ctx.lineTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.lineTo(last.x, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  ctx.lineTo(last.x, last.y);
  ctx.strokeStyle = strokeColor || "#6366f1";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = strokeColor || "#6366f1";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

async function fetchSystemMetrics() {
  const refreshBtn = document.getElementById("btn-metrics-refresh");
  if (refreshBtn) refreshBtn.classList.add("loading");

  try {
    const res = await fetch("/api/metrics");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    const cpuPct = Number(data.system?.cpuPercent ?? 0);
    const cpuValEl = document.getElementById("metric-cpu-val");
    if (cpuValEl) cpuValEl.textContent = `${cpuPct}%`;

    const cpuPill = document.getElementById("metric-cpu-pill");
    if (cpuPill) {
      cpuPill.textContent = cpuPct > 80 ? "Yüksek Yük" : (cpuPct > 50 ? "Orta" : "Optimal");
      cpuPill.className = `metric-pill ${cpuPct > 80 ? "pill-warning" : "pill-success"}`;
    }

    const cpuBar = document.getElementById("metric-cpu-bar");
    if (cpuBar) {
      cpuBar.style.width = `${Math.min(100, Math.max(5, cpuPct))}%`;
      cpuBar.className = `metrics-progress-fill ${cpuPct > 80 ? "fill-rose" : (cpuPct > 50 ? "fill-amber" : "fill-emerald")}`;
    }

    const cpuSub = document.getElementById("metric-cpu-sub");
    if (cpuSub) {
      cpuSub.textContent = `${data.system?.cpuModel || "Processor"} (${data.system?.cpuCores || 8} Çekirdek - ${data.system?.cpuSpeedMhz || 0} MHz)`;
    }

    const mem = data.system?.memory || {};
    const ramPct = Number(mem.usagePercent ?? 0);
    const ramValEl = document.getElementById("metric-ram-val");
    if (ramValEl) ramValEl.textContent = `${(mem.usedMb / 1024).toFixed(2)} GB / ${(mem.totalMb / 1024).toFixed(2)} GB`;

    const ramPill = document.getElementById("metric-ram-pill");
    if (ramPill) {
      ramPill.textContent = `${ramPct}%`;
      ramPill.className = `metric-pill ${ramPct > 85 ? "pill-warning" : "pill-neutral"}`;
    }

    const ramBar = document.getElementById("metric-ram-bar");
    if (ramBar) {
      ramBar.style.width = `${Math.min(100, ramPct)}%`;
      ramBar.className = `metrics-progress-fill ${ramPct > 85 ? "fill-rose" : (ramPct > 70 ? "fill-amber" : "fill-emerald")}`;
    }

    const ramSub = document.getElementById("metric-ram-sub");
    if (ramSub) {
      ramSub.textContent = `Boş RAM: ${(mem.freeMb / 1024).toFixed(2)} GB (${mem.freeMb} MB)`;
    }

    const db = data.database || {};
    const dbStatusEl = document.getElementById("metric-db-status");
    const dbPill = document.getElementById("metric-db-pill");
    const dbSub = document.getElementById("metric-db-sub");
    if (dbStatusEl) dbStatusEl.textContent = db.connected ? "Bağlı (OK)" : "Bağlantı Yok";
    if (dbPill) {
      dbPill.textContent = `${db.latencyMs ?? 1}ms`;
      dbPill.className = `metric-pill ${db.connected ? "pill-success" : "pill-warning"}`;
    }
    if (dbSub) {
      const gCount = db.collections?.guildConfigs ?? 1;
      const bCount = db.collections?.backups ?? 0;
      dbSub.textContent = `Port: 5433 | Yapılandırma: ${gCount} | Yedek: ${bCount}`;
    }

    const cluster = data.cluster || {};
    const clusterCountEl = document.getElementById("metric-cluster-count");
    const clusterPill = document.getElementById("metric-cluster-pill");
    const clusterBar = document.getElementById("metric-cluster-bar");
    const clusterSub = document.getElementById("metric-cluster-sub");

    const online = cluster.online ?? 8;
    const total = cluster.total ?? 8;
    if (clusterCountEl) clusterCountEl.textContent = `${online} / ${total} Çevrim İçi`;
    if (clusterPill) {
      clusterPill.textContent = `${cluster.avgPing || 0}ms Ping`;
      clusterPill.className = `metric-pill ${online === total ? "pill-success" : "pill-warning"}`;
    }
    if (clusterBar) {
      const clusterPercent = total > 0 ? (online / total) * 100 : 0;
      clusterBar.style.width = `${clusterPercent}%`;
      clusterBar.className = `metrics-progress-fill ${online === total ? "fill-emerald" : "fill-amber"}`;
    }
    if (clusterSub) {
      clusterSub.textContent = `Ortalama Discord Gateway Gecikmesi: ${cluster.avgPing || 0} ms`;
    }

    cpuDataPoints.push(cpuPct);
    if (cpuDataPoints.length > MAX_METRIC_POINTS) cpuDataPoints.shift();

    const procRss = Number(data.process?.rssMb ?? 0);
    ramDataPoints.push(procRss);
    if (ramDataPoints.length > MAX_METRIC_POINTS) ramDataPoints.shift();

    const cpuMin = Math.min(...cpuDataPoints);
    const cpuMax = Math.max(...cpuDataPoints);
    const cpuAvg = Math.round(cpuDataPoints.reduce((a, b) => a + b, 0) / cpuDataPoints.length);

    const chartCpuBadge = document.getElementById("chart-cpu-current-badge");
    if (chartCpuBadge) chartCpuBadge.textContent = `Anlık: ${cpuPct}%`;
    const chartCpuMin = document.getElementById("chart-cpu-min");
    if (chartCpuMin) chartCpuMin.textContent = `${cpuMin}%`;
    const chartCpuAvg = document.getElementById("chart-cpu-avg");
    if (chartCpuAvg) chartCpuAvg.textContent = `${cpuAvg}%`;
    const chartCpuMax = document.getElementById("chart-cpu-max");
    if (chartCpuMax) chartCpuMax.textContent = `${cpuMax}%`;

    drawSmoothCanvasChart("canvas-cpu-history", cpuDataPoints, "#6366f1", "rgba(99, 102, 241, 0.25)", 0, 100);

    const chartRamBadge = document.getElementById("chart-ram-current-badge");
    if (chartRamBadge) chartRamBadge.textContent = `RSS: ${procRss} MB`;
    const chartHeapUsed = document.getElementById("chart-heap-used");
    if (chartHeapUsed) chartHeapUsed.textContent = `${data.process?.heapUsedMb ?? 0} MB`;
    const chartHeapTotal = document.getElementById("chart-heap-total");
    if (chartHeapTotal) chartHeapTotal.textContent = `${data.process?.heapTotalMb ?? 0} MB`;
    const chartExternal = document.getElementById("chart-ram-external");
    if (chartExternal) chartExternal.textContent = `${data.process?.externalMb ?? 0} MB`;

    const maxRamPoint = Math.max(150, ...ramDataPoints);
    drawSmoothCanvasChart("canvas-ram-history", ramDataPoints, "#a855f7", "rgba(168, 85, 247, 0.25)", 0, maxRamPoint);

    const setSpec = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? "-";
    };

    setSpec("spec-platform", `${data.system?.platform || "win32"} (${data.system?.arch || "x64"})`);
    setSpec("spec-cpu-model", data.system?.cpuModel || "-");
    setSpec("spec-cores", `${data.system?.cpuCores || 8} İş Parçacığı / Çekirdek`);
    setSpec("spec-hostname", data.system?.hostname || "localhost");
    setSpec("spec-node-version", data.process?.version || "v22.x");
    setSpec("spec-pid", data.process?.pid || "-");
    setSpec("spec-system-uptime", formatDurationSeconds(data.system?.uptimeSeconds || 0));
    setSpec("spec-process-uptime", formatDurationSeconds(data.process?.uptimeSeconds || 0));

    setSpec("spec-db-provider", data.database?.provider || "PostgreSQL 16");
    setSpec("spec-db-uri", data.database?.uri || "127.0.0.1:5433");
    setSpec("spec-db-latency", `${data.database?.latencyMs ?? 1} ms (OK)`);
    setSpec("spec-db-guilds", data.database?.collections?.guildConfigs ?? 1);
    setSpec("spec-db-backups", data.database?.collections?.backups ?? 0);
    setSpec("spec-db-penalties", data.database?.collections?.penalties ?? 0);
    setSpec("spec-db-economy", data.database?.collections?.economyAccounts ?? 1);
    setSpec("spec-db-tickets", data.database?.collections?.tickets ?? 0);

    const tbody = document.getElementById("metrics-bots-table-body");
    if (tbody && cluster.services && cluster.services.length > 0) {
      tbody.innerHTML = "";
      cluster.services.forEach((bot) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border-subtle)";

        const isOnline = bot.status === "ONLINE";
        const pingVal = bot.ping ?? 0;
        const pingBadge = isOnline
          ? `<span class="metric-pill ${pingVal < 160 ? "pill-success" : (pingVal < 250 ? "pill-warning" : "pill-rose")}">${pingVal} ms</span>`
          : `<span class="metric-pill pill-neutral">0 ms</span>`;

        const statusBadge = isOnline
          ? `<span class="metric-pill pill-success" style="display:inline-flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>Çevrim İçi</span>`
          : `<span class="metric-pill pill-neutral" style="display:inline-flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></span>Çevrim Dışı</span>`;

        tr.innerHTML = `
          <td style="padding: 12px 14px; font-weight: 600; color: #f1f5f9;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="status-indicator-dot ${isOnline ? "online" : "offline"}"></span>
              <span>${bot.serviceKey || bot.name}</span>
            </div>
          </td>
          <td style="padding: 12px 14px; color: var(--text-secondary); font-family: monospace;">${bot.tag || bot.name || "-"}</td>
          <td style="padding: 12px 14px;">${pingBadge}</td>
          <td style="padding: 12px 14px;">${statusBadge}</td>
          <td style="padding: 12px 14px; color: #e2e8f0; font-family: monospace;">${Math.round(procRss / 8)} MB</td>
          <td style="padding: 12px 14px; color: var(--text-muted);">${formatDurationSeconds(bot.uptime || 0)}</td>
          <td style="padding: 12px 14px; color: var(--text-secondary);">${bot.guildCount || 1} Sunucu</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Metrikler güncellenirken hata:", err);
  } finally {
    if (refreshBtn) refreshBtn.classList.remove("loading");
  }
}

function startMetricsPolling() {
  fetchSystemMetrics();
  if (!metricsInterval) {
    metricsInterval = setInterval(fetchSystemMetrics, 3000);
  }
}

function stopMetricsPolling() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}

const btnMetricsRefresh = document.getElementById("btn-metrics-refresh");
if (btnMetricsRefresh) {
  btnMetricsRefresh.addEventListener("click", () => fetchSystemMetrics());
}

const btnMetricsGc = document.getElementById("btn-metrics-gc");
if (btnMetricsGc) {
  btnMetricsGc.addEventListener("click", async () => {
    btnMetricsGc.disabled = true;
    try {
      const res = await fetch("/api/overview/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-cache" })
      });
      const d = await res.json();
      if (d.success) {
        window.showToast(d.message || "Önbellek temizlendi.", "success");
        fetchSystemMetrics();
      } else {
        window.showToast(d.error || "Temizleme hatası.", "error");
      }
    } catch (e) {
      window.showToast("Hata: " + e.message, "error");
    } finally {
      btnMetricsGc.disabled = false;
    }
  });
}

let terminalInterval = null;
let terminalIsPaused = false;
let terminalAutoScroll = true;
let terminalClearedSince = null;
let serverLogsCache = [];
let terminalCliEntries = [];
let terminalHistory = [];
let terminalHistoryIdx = -1;

function clearTerminalScreen() {
  terminalClearedSince = new Date().toISOString();
  serverLogsCache = [];
  terminalCliEntries = [];
  if (termScreen) {
    termScreen.innerHTML = '<div style="color: #64748b; font-style: italic; padding: 10px 0;" id="term-placeholder">Terminal temizlendi. Yeni loglar bekleniyor...</div>';
  }
  updateTerminalCounters([]);
}

const termScreen = document.getElementById("term-screen");
const termConnStatus = document.getElementById("terminal-conn-status");
const termFilterService = document.getElementById("term-filter-service");
const termFilterLevel = document.getElementById("term-filter-level");
const termFilterSearch = document.getElementById("term-filter-search");
const termStatTotal = document.getElementById("term-stat-total");
const termStatInfo = document.getElementById("term-stat-info");
const termStatWarn = document.getElementById("term-stat-warn");
const termStatError = document.getElementById("term-stat-error");
const btnTermAutoscroll = document.getElementById("btn-term-autoscroll");
const termAutoscrollDot = document.getElementById("term-autoscroll-dot");
const termAutoscrollText = document.getElementById("term-autoscroll-text");
const btnTermClear = document.getElementById("btn-term-clear");
const btnTermDownload = document.getElementById("btn-term-download");
const btnTermPause = document.getElementById("btn-term-pause");
const termPauseText = document.getElementById("term-pause-text");
const termCliInput = document.getElementById("term-cli-input");
const btnTermSend = document.getElementById("btn-term-send");

function formatTermTime(iso) {
  if (!iso) return "00:00:00";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "00:00:00";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "00:00:00";
  }
}

function escapeTermHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTermServiceClass(s) {
  const lower = (s || "").toLowerCase().replace(/[-_]/g, "");
  if (lower.includes("moderation")) return "service-moderation";
  if (lower.includes("register")) return "service-register";
  if (lower.includes("stats")) return "service-stats";
  if (lower.includes("guarddistributor")) return "service-guarddistributor";
  if (lower.includes("guard")) return "service-guardmain";
  if (lower.includes("voice")) return "service-voicewelcome";
  if (lower.includes("economy")) return "service-economy";
  if (lower.includes("utility")) return "service-utility";
  if (lower.includes("dashboard")) return "service-dashboard";
  return "";
}

function getTermLevelClass(l) {
  const lvl = (l || "").toLowerCase();
  if (lvl === "info") return "level-info";
  if (lvl === "success") return "level-success";
  if (lvl === "warn" || lvl === "warning") return "level-warn";
  if (lvl === "error") return "level-error";
  return "level-info";
}

function updateTerminalCounters(logs) {
  if (!Array.isArray(logs)) return;
  let total = 0;
  let infoCount = 0;
  let warnCount = 0;
  let errorCount = 0;

  for (const item of logs) {
    if (item.isCli) continue;
    total++;
    const lvl = (item.level || "").toUpperCase();
    if (lvl === "WARN" || lvl === "WARNING") {
      warnCount++;
    } else if (lvl === "ERROR") {
      errorCount++;
    } else {
      infoCount++;
    }
  }

  if (termStatTotal) termStatTotal.textContent = String(total);
  if (termStatInfo) termStatInfo.textContent = String(infoCount);
  if (termStatWarn) termStatWarn.textContent = String(warnCount);
  if (termStatError) termStatError.textContent = String(errorCount);
}

function renderTerminalLines(items) {
  if (!termScreen) return;
  if (!items || items.length === 0) {
    termScreen.innerHTML = '<div style="color: #64748b; font-style: italic; padding: 10px 0;" id="term-placeholder">Eşleşen log kaydı bulunamadı.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    if (item.isCli) {
      const cliRow = document.createElement("div");
      cliRow.className = "terminal-line";
      cliRow.style.borderLeft = "2px solid #10b981";
      cliRow.style.background = "rgba(16, 185, 129, 0.05)";
      cliRow.innerHTML = `
        <span class="term-time">${formatTermTime(item.time)}</span>
        <span class="terminal-prompt-label" style="font-size:11px;">bfe@root:~#</span>
        <span style="color:#f8fafc; font-weight:600; font-family:monospace;">${escapeTermHtml(item.command)}</span>
      `;
      fragment.appendChild(cliRow);

      if (item.output) {
        const out = document.createElement("div");
        out.className = "terminal-cmd-output";
        if (item.isError) {
          out.style.borderColor = "#ef4444";
          out.style.color = "#fca5a5";
        }
        out.textContent = item.output;
        fragment.appendChild(out);
      } else if (item.pending) {
        const pend = document.createElement("div");
        pend.className = "terminal-cmd-output";
        pend.style.opacity = "0.6";
        pend.textContent = "Komut işleniyor...";
        fragment.appendChild(pend);
      }
      continue;
    }

    const row = document.createElement("div");
    row.className = "terminal-line";
    const sClass = getTermServiceClass(item.service);
    const lClass = getTermLevelClass(item.level);

    row.innerHTML = `
      <span class="term-time">${formatTermTime(item.time)}</span>
      <span class="term-service ${sClass}">[${escapeTermHtml(item.service || "CLUSTER")}]</span>
      <span class="term-level ${lClass}">[${escapeTermHtml(item.level || "INFO")}]</span>
      <span class="term-msg">${escapeTermHtml(item.message || "")}</span>
    `;
    fragment.appendChild(row);
  }

  termScreen.innerHTML = "";
  termScreen.appendChild(fragment);

  if (terminalAutoScroll) {
    termScreen.scrollTop = termScreen.scrollHeight;
  }
}

function applyTerminalFiltersAndRender() {
  const serviceVal = (termFilterService?.value || "ALL").toUpperCase();
  const levelVal = (termFilterLevel?.value || "ALL").toUpperCase();
  const searchVal = (termFilterSearch?.value || "").trim().toLowerCase();

  const combined = [...serverLogsCache, ...terminalCliEntries].sort((a, b) => {
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  });

  let filtered = combined;

  if (terminalClearedSince) {
    const clearTs = new Date(terminalClearedSince).getTime();
    filtered = filtered.filter((l) => {
      const itemTs = new Date(l.time).getTime();
      return isNaN(itemTs) || itemTs >= clearTs;
    });
  }

  if (serviceVal !== "ALL") {
    filtered = filtered.filter((l) => {
      if (l.isCli) return true;
      const s = (l.service || "").toUpperCase().replace(/[-_]/g, "");
      const target = serviceVal.replace(/[-_]/g, "");
      return s.includes(target) || target.includes(s);
    });
  }

  if (levelVal !== "ALL") {
    filtered = filtered.filter((l) => {
      if (l.isCli) return true;
      return (l.level || "").toUpperCase() === levelVal;
    });
  }

  if (searchVal) {
    filtered = filtered.filter((l) => {
      if (l.isCli) {
        return (l.command || "").toLowerCase().includes(searchVal) || (l.output || "").toLowerCase().includes(searchVal);
      }
      const msg = (l.message || "").toLowerCase();
      const s = (l.service || "").toLowerCase();
      return msg.includes(searchVal) || s.includes(searchVal);
    });
  }

  updateTerminalCounters(filtered);
  renderTerminalLines(filtered);
}

async function fetchTerminalLogs() {
  if (terminalIsPaused) return;

  try {
    let fetchUrl = "/api/terminal/logs?limit=300";
    if (terminalClearedSince) {
      fetchUrl += `&since=${encodeURIComponent(terminalClearedSince)}`;
    }
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.logs)) {
      serverLogsCache = data.logs;
      applyTerminalFiltersAndRender();
      if (termConnStatus && !terminalIsPaused) {
        termConnStatus.className = "metric-pill pill-success";
        termConnStatus.textContent = "CANLI BAĞLANTI";
      }
    }
  } catch (err) {
    if (termConnStatus) {
      termConnStatus.className = "metric-pill pill-danger";
      termConnStatus.textContent = "BAĞLANTI HATASI";
    }
  }
}

function startTerminalPolling() {
  fetchTerminalLogs();
  if (!terminalInterval) {
    terminalInterval = setInterval(fetchTerminalLogs, 2000);
  }
}

function stopTerminalPolling() {
  if (terminalInterval) {
    clearInterval(terminalInterval);
    terminalInterval = null;
  }
}

async function sendTerminalCommand() {
  if (!termCliInput) return;
  const cmd = termCliInput.value.trim();
  if (!cmd) return;

  termCliInput.value = "";
  terminalHistory.push(cmd);
  terminalHistoryIdx = terminalHistory.length;

  if (cmd.toLowerCase() === "clear") {
    clearTerminalScreen();
    return;
  }

  const cliEntry = {
    isCli: true,
    command: cmd,
    time: new Date().toISOString(),
    pending: true,
    output: null,
    isError: false
  };
  terminalCliEntries.push(cliEntry);
  applyTerminalFiltersAndRender();

  try {
    const res = await fetch("/api/terminal/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: cmd })
    });
    const data = await res.json();
    cliEntry.pending = false;

    if (!data.success && data.error) {
      cliEntry.isError = true;
      cliEntry.output = "Hata: " + data.error;
    } else {
      cliEntry.output = data.output || "Komut başarıyla çalıştırıldı.";
    }
  } catch (err) {
    cliEntry.pending = false;
    cliEntry.isError = true;
    cliEntry.output = "Komut gönderilirken hata oluştu: " + err.message;
  }

  applyTerminalFiltersAndRender();
}

if (btnTermSend) {
  btnTermSend.addEventListener("click", sendTerminalCommand);
}

if (termCliInput) {
  termCliInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendTerminalCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (terminalHistory.length > 0 && terminalHistoryIdx > 0) {
        terminalHistoryIdx--;
        termCliInput.value = terminalHistory[terminalHistoryIdx] || "";
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (terminalHistoryIdx < terminalHistory.length - 1) {
        terminalHistoryIdx++;
        termCliInput.value = terminalHistory[terminalHistoryIdx] || "";
      } else {
        terminalHistoryIdx = terminalHistory.length;
        termCliInput.value = "";
      }
    }
  });
}

if (btnTermAutoscroll) {
  btnTermAutoscroll.addEventListener("click", () => {
    terminalAutoScroll = !terminalAutoScroll;
    if (termAutoscrollDot) {
      termAutoscrollDot.style.background = terminalAutoScroll ? "#10b981" : "#64748b";
    }
    if (termAutoscrollText) {
      termAutoscrollText.textContent = `Otomatik Kaydır: ${terminalAutoScroll ? "Açık" : "Kapalı"}`;
    }
    if (terminalAutoScroll && termScreen) {
      termScreen.scrollTop = termScreen.scrollHeight;
    }
  });
}

if (btnTermPause) {
  btnTermPause.addEventListener("click", () => {
    terminalIsPaused = !terminalIsPaused;
    if (termPauseText) {
      termPauseText.textContent = terminalIsPaused ? "Canlı Akışı Devam Ettir" : "Canlı Akışı Duraklat";
    }
    if (termConnStatus) {
      if (terminalIsPaused) {
        termConnStatus.className = "metric-pill pill-warning";
        termConnStatus.textContent = "DURAKLATILDI";
      } else {
        termConnStatus.className = "metric-pill pill-success";
        termConnStatus.textContent = "CANLI BAĞLANTI";
      }
    }
  });
}

if (btnTermClear) {
  btnTermClear.addEventListener("click", () => {
    clearTerminalScreen();
  });
}

if (btnTermDownload) {
  btnTermDownload.addEventListener("click", () => {
    if ((!serverLogsCache || serverLogsCache.length === 0) && (!terminalCliEntries || terminalCliEntries.length === 0)) {
      window.showToast("İndirilecek log kaydı bulunmuyor.", "warning");
      return;
    }
    const combined = [...serverLogsCache, ...terminalCliEntries].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const lines = combined.map((l) => {
      if (l.isCli) {
        return `[${l.time}] [CLI] [COMMAND]: bfe@root:~# ${l.command}\n${l.output || ""}`;
      }
      return `[${l.time}] [${l.service || "CLUSTER"}] [${l.level || "INFO"}]: ${l.message || ""}`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const nowStr = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `bfe-console-logs-${nowStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast("Log dosyası başarıyla indirildi.", "success");
  });
}

if (termFilterService) {
  termFilterService.addEventListener("change", applyTerminalFiltersAndRender);
}

if (termFilterLevel) {
  termFilterLevel.addEventListener("change", applyTerminalFiltersAndRender);
}

if (termFilterSearch) {
  termFilterSearch.addEventListener("input", applyTerminalFiltersAndRender);
}

const btnGitRefresh = document.getElementById("btn-git-refresh");
const btnGitManualBackup = document.getElementById("btn-git-manual-backup");
const btnGitUpdateTrigger = document.getElementById("btn-git-update-trigger");
const btnGitBackupsRefresh = document.getElementById("btn-git-backups-refresh");

let gitStatusInterval = null;

function startGitStatusPolling() {
  fetchGitStatus(true);
  if (!gitStatusInterval) {
    gitStatusInterval = setInterval(() => fetchGitStatus(true), 25000);
  }
}

function stopGitStatusPolling() {
  if (gitStatusInterval) {
    clearInterval(gitStatusInterval);
    gitStatusInterval = null;
  }
}

async function fetchGitStatus(silent = false) {
  const branchVal = document.getElementById("git-branch-val");
  const repoUrl = document.getElementById("git-repo-url");
  const commitHash = document.getElementById("git-commit-hash");
  const commitMsg = document.getElementById("git-commit-msg");
  const behindVal = document.getElementById("git-behind-val");
  const behindBadge = document.getElementById("git-behind-badge");
  const behindDesc = document.getElementById("git-behind-desc");
  const localVal = document.getElementById("git-local-val");
  const localBadge = document.getElementById("git-local-badge");
  const localDesc = document.getElementById("git-local-desc");
  const lastChecked = document.getElementById("git-last-checked");
  const pendingPanel = document.getElementById("git-pending-panel");
  const pendingCountPill = document.getElementById("git-pending-count-pill");
  const pendingList = document.getElementById("git-pending-list");

  if (!silent && btnGitRefresh) {
    btnGitRefresh.classList.add("loading");
    btnGitRefresh.disabled = true;
  }

  try {
    const res = await fetch("/api/system/git-status");
    const data = await res.json();

    if (data.success) {
      if (lastChecked) {
        const timeStr = new Date().toLocaleTimeString("tr-TR");
        lastChecked.textContent = `Otomatik Denetim: ${timeStr} (GitHub ile senkronize)`;
      }

      if (branchVal) branchVal.textContent = data.branch || "main";
      if (repoUrl) repoUrl.textContent = data.remoteUrl || "https://github.com/Ruzgharr/botforeveryone.git";
      if (commitHash) commitHash.textContent = data.shortHash || "HEAD";
      if (commitMsg) commitMsg.textContent = data.commitMessage || "Son commit bilgisi bulunamadı.";

      if (behindVal) {
        if (!data.remoteAvailable) {
          behindVal.textContent = "Bağlantı Yok";
          if (behindBadge) {
            behindBadge.textContent = "OFFLINE";
            behindBadge.className = "metric-pill pill-danger";
          }
          if (behindDesc) behindDesc.textContent = "GitHub uzak sunucusuna erişilemedi.";
          if (pendingPanel) pendingPanel.style.display = "none";
        } else if (data.commitsBehind > 0) {
          behindVal.textContent = `${data.commitsBehind} Yeni Commit`;
          if (behindBadge) {
            behindBadge.textContent = "YENİ SÜRÜM MEVCUT";
            behindBadge.className = "metric-pill pill-warning";
          }
          if (behindDesc) behindDesc.textContent = "GitHub üzerinde henüz çekilmemiş güncellemeler var.";

          if (pendingPanel) {
            pendingPanel.style.display = "block";
            if (pendingCountPill) pendingCountPill.textContent = `${data.commitsBehind} YENİ COMMİT`;
            if (pendingList && Array.isArray(data.pendingCommits) && data.pendingCommits.length > 0) {
              pendingList.innerHTML = data.pendingCommits.map((c) => `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-family:monospace; font-size:12px;">
                  <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
                    <code style="background:rgba(245,158,11,0.15); color:#fde047; padding:2px 6px; border-radius:4px; font-weight:600;">${c.hash}</code>
                    <span style="color:#f8fafc; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeTermHtml(c.message)}</span>
                  </div>
                  <span style="color:var(--text-muted); font-size:11px; white-space:nowrap; flex-shrink:0;">${escapeTermHtml(c.author || "")} • ${escapeTermHtml(c.date || "")}</span>
                </div>
              `).join("");
            }
          }
        } else {
          behindVal.textContent = "En Son Sürüm";
          if (behindBadge) {
            behindBadge.textContent = "GÜNCEL";
            behindBadge.className = "metric-pill pill-success";
          }
          if (behindDesc) behindDesc.textContent = "Sisteminiz GitHub ile tam senkronize. Bekleyen yeni commit yok.";
          if (pendingPanel) pendingPanel.style.display = "none";
        }
      }

      if (localVal) {
        if (data.hasLocalChanges) {
          localVal.textContent = `${data.uncommittedCount} Dosya`;
          if (localBadge) {
            localBadge.textContent = "KORUMADA";
            localBadge.className = "metric-pill pill-warning";
          }
          if (localDesc) localDesc.textContent = "Yerel dosyalar güvenlik kalkanı altında saklanır.";
        } else {
          localVal.textContent = "0 Dosya";
          if (localBadge) {
            localBadge.textContent = "TEMİZ";
            localBadge.className = "metric-pill pill-success";
          }
          if (localDesc) localDesc.textContent = "Bekleyen yerel değişiklik bulunmuyor.";
        }
      }
    }
  } catch (err) {
    if (commitMsg) commitMsg.textContent = "Git durum bilgisi alınamadı: " + err.message;
  } finally {
    if (!silent && btnGitRefresh) {
      btnGitRefresh.classList.remove("loading");
      btnGitRefresh.disabled = false;
    }
  }
}

async function fetchGitBackups() {
  const tbody = document.getElementById("git-backups-tbody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/system/backups");
    const list = await res.json();

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Henüz sistem snapshot yedeği bulunmuyor. "Anlık Tam Yedek Al" butonunu kullanarak oluşturabilirsiniz.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((b) => {
      const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleString("tr-TR") : "-";
      const shortCommit = b.commitHash ? b.commitHash.slice(0, 7) : "-";
      return `
        <tr>
          <td><strong style="color: #f1f5f9; font-family: monospace;">${escapeTermHtml(b.backupName)}</strong></td>
          <td style="color: var(--text-muted); font-size: 12px;">${dateStr}</td>
          <td><span class="metric-pill pill-indigo">${b.fileCount || 0} Dosya</span></td>
          <td><code style="background: rgba(15, 23, 42, 0.6); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${shortCommit}</code></td>
          <td style="text-align: right;">
            <button type="button" class="btn-panel-action" onclick="restoreSystemBackup('${escapeTermHtml(b.backupName)}')">
              <span>↩️ Geri Yükle</span>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #f87171; padding: 24px;">
          Yedekler yüklenirken hata oluştu: ${err.message}
        </td>
      </tr>
    `;
  }
}

async function createManualBackup() {
  if (btnGitManualBackup) {
    btnGitManualBackup.disabled = true;
    btnGitManualBackup.classList.add("loading");
  }

  window.showToast("Projenin tam sistem yedeği alınıyor...", "info");

  try {
    const res = await fetch("/api/system/backup-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();

    if (data.success) {
      window.showToast(`Tam sistem yedeği oluşturuldu (${data.fileCount} dosya: ${data.backupName})`, "success");
      fetchGitBackups();
    } else {
      window.showToast(data.error || "Yedek oluşturulamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  } finally {
    if (btnGitManualBackup) {
      btnGitManualBackup.disabled = false;
      btnGitManualBackup.classList.remove("loading");
    }
  }
}

async function runGitUpdate() {
  const confirmed = confirm("GitHub üzerinden en güncel kodlar çekilecek.\n\nİşlem öncesinde tüm projenin tam bir yedeği alınacak, .env ve veritabanı ayarlarınız korunacaktır.\n\nDevam etmek istiyor musunuz?");
  if (!confirmed) return;

  const logScreen = document.getElementById("git-console-logs");
  const statusPill = document.getElementById("git-update-status-pill");

  if (btnGitUpdateTrigger) {
    btnGitUpdateTrigger.disabled = true;
    btnGitUpdateTrigger.classList.add("loading");
  }

  if (statusPill) {
    statusPill.textContent = "GÜNCELLENİYOR...";
    statusPill.className = "metric-pill pill-warning";
  }

  if (logScreen) {
    logScreen.innerHTML = `
      <div class="git-log-line">
        <span class="git-log-time">${new Date().toLocaleTimeString("tr-TR")}</span>
        <span class="git-log-icon">⏳</span>
        <span class="git-log-text log-ok">Güvenli güncelleme süreci başlatıldı, lütfen bekleyin...</span>
      </div>
    `;
  }

  try {
    const res = await fetch("/api/system/git-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch: "main" })
    });
    const data = await res.json();

    if (logScreen && data.logs && Array.isArray(data.logs)) {
      logScreen.innerHTML = data.logs.map((l) => {
        const timeStr = l.time ? new Date(l.time).toLocaleTimeString("tr-TR") : new Date().toLocaleTimeString("tr-TR");
        let icon = "ℹ️";
        let cls = "log-ok";
        if (l.status === "success") {
          icon = "✅";
          cls = "log-success";
        } else if (l.status === "warn") {
          icon = "⚠️";
          cls = "log-warn";
        } else if (l.status === "error") {
          icon = "❌";
          cls = "log-error";
        }
        return `
          <div class="git-log-line">
            <span class="git-log-time">${timeStr}</span>
            <span class="git-log-icon">${icon}</span>
            <span class="git-log-text ${cls}">${escapeTermHtml(l.message)}</span>
          </div>
        `;
      }).join("");
      logScreen.scrollTop = logScreen.scrollHeight;
    }

    if (data.success) {
      window.showToast("GitHub güncellemesi ve bağımlılık kontrolü başarıyla tamamlandı!", "success");
      if (statusPill) {
        statusPill.textContent = "BAŞARILI";
        statusPill.className = "metric-pill pill-success";
      }
      fetchGitStatus();
      fetchGitBackups();
    } else {
      window.showToast(data.error || "Güncelleme sırasında hata oluştu.", "error");
      if (statusPill) {
        statusPill.textContent = "HATA";
        statusPill.className = "metric-pill pill-danger";
      }
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
    if (statusPill) {
      statusPill.textContent = "BAĞLANTI HATASI";
      statusPill.className = "metric-pill pill-danger";
    }
  } finally {
    if (btnGitUpdateTrigger) {
      btnGitUpdateTrigger.disabled = false;
      btnGitUpdateTrigger.classList.remove("loading");
    }
  }
}

window.restoreSystemBackup = async function(backupName) {
  if (!backupName) return;
  const confirmed = confirm(`"${backupName}" yedeğine geri dönülecek.\n\nProje dosyaları bu anlık görüntünün durumuna geri yüklenecektir.\n\nDevam etmek istiyor musunuz?`);
  if (!confirmed) return;

  window.showToast(`"${backupName}" yedeği geri yükleniyor...`, "info");

  try {
    const res = await fetch("/api/system/restore-backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupName })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      window.showToast(data.message || "Yedek başarıyla geri yüklendi!", "success");
      fetchGitStatus();
      fetchGitBackups();
    } else {
      window.showToast(data.error || "Geri yükleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
};

function loadGitUpdatePage() {
  fetchGitStatus();
  fetchGitBackups();
}

if (btnGitRefresh) {
  btnGitRefresh.addEventListener("click", () => {
    fetchGitStatus();
    window.showToast("Git durumu güncellendi.", "info");
  });
}

if (btnGitManualBackup) {
  btnGitManualBackup.addEventListener("click", createManualBackup);
}

if (btnGitUpdateTrigger) {
  btnGitUpdateTrigger.addEventListener("click", runGitUpdate);
}

if (btnGitBackupsRefresh) {
  btnGitBackupsRefresh.addEventListener("click", () => {
    fetchGitBackups();
    window.showToast("Snapshot listesi yenilendi.", "info");
  });
}

const commandsCatalog = [
  { name: "ban", cat: "mod", catLabel: "Moderasyon" },
  { name: "unban", cat: "mod", catLabel: "Moderasyon" },
  { name: "jail", cat: "mod", catLabel: "Moderasyon" },
  { name: "unjail", cat: "mod", catLabel: "Moderasyon" },
  { name: "mute", cat: "mod", catLabel: "Moderasyon" },
  { name: "unmute", cat: "mod", catLabel: "Moderasyon" },
  { name: "vmute", cat: "mod", catLabel: "Moderasyon" },
  { name: "unvmute", cat: "mod", catLabel: "Moderasyon" },
  { name: "kick", cat: "mod", catLabel: "Moderasyon" },
  { name: "sicil", cat: "mod", catLabel: "Moderasyon" },
  { name: "ceza", cat: "mod", catLabel: "Moderasyon" },
  { name: "cezapuan", cat: "mod", catLabel: "Moderasyon" },
  { name: "forceban", cat: "mod", catLabel: "Moderasyon" },
  { name: "unforceban", cat: "mod", catLabel: "Moderasyon" },
  { name: "kilit", cat: "mod", catLabel: "Moderasyon" },
  { name: "toplorol", cat: "mod", catLabel: "Moderasyon" },
  { name: "medyakanal", cat: "mod", catLabel: "Moderasyon" },
  { name: "uyar", cat: "mod", catLabel: "Moderasyon" },
  { name: "uyarilar", cat: "mod", catLabel: "Moderasyon" },
  { name: "uyarisil", cat: "mod", catLabel: "Moderasyon" },
  { name: "otocevap", cat: "mod", catLabel: "Moderasyon" },
  { name: "seskapat", cat: "mod", catLabel: "Moderasyon" },
  { name: "sesac", cat: "mod", catLabel: "Moderasyon" },
  { name: "afk", cat: "mod", catLabel: "Moderasyon" },
  { name: "snipe", cat: "mod", catLabel: "Moderasyon" },
  { name: "say", cat: "mod", catLabel: "Moderasyon" },
  { name: "kpi", cat: "mod", catLabel: "Moderasyon" },
  { name: "slowmode", cat: "mod", catLabel: "Moderasyon" },
  { name: "sil", cat: "mod", catLabel: "Moderasyon" },
  { name: "siciltemizle", cat: "mod", catLabel: "Moderasyon" },
  { name: "karantinatemizle", cat: "mod", catLabel: "Moderasyon" },
  { name: "rolver", cat: "mod", catLabel: "Moderasyon" },
  { name: "rolal", cat: "mod", catLabel: "Moderasyon" },
  { name: "rolsuzver", cat: "mod", catLabel: "Moderasyon" },

  { name: "kayit", cat: "reg", catLabel: "Kayıt" },
  { name: "erkek", cat: "reg", catLabel: "Kayıt" },
  { name: "kadin", cat: "reg", catLabel: "Kayıt" },
  { name: "isim", cat: "reg", catLabel: "Kayıt" },
  { name: "isimler", cat: "reg", catLabel: "Kayıt" },
  { name: "gckontrol", cat: "reg", catLabel: "Kayıt" },
  { name: "dogrulama", cat: "reg", catLabel: "Kayıt" },
  { name: "cihaz", cat: "reg", catLabel: "Kayıt" },
  { name: "kayitsifirla", cat: "reg", catLabel: "Kayıt" },
  { name: "teyitsifirla", cat: "reg", catLabel: "Kayıt" },
  { name: "kayitbilgi", cat: "reg", catLabel: "Kayıt" },
  { name: "topteyit", cat: "reg", catLabel: "Kayıt" },
  { name: "davet", cat: "reg", catLabel: "Kayıt" },
  { name: "davetekle", cat: "reg", catLabel: "Kayıt" },
  { name: "tagtara", cat: "reg", catLabel: "Kayıt" },
  { name: "vip", cat: "reg", catLabel: "Kayıt" },
  { name: "kayitsiz", cat: "reg", catLabel: "Kayıt" },

  { name: "stat", cat: "stat", catLabel: "İstatistik" },
  { name: "topstat", cat: "stat", catLabel: "İstatistik" },
  { name: "seviye", cat: "stat", catLabel: "İstatistik" },
  { name: "topseviye", cat: "stat", catLabel: "İstatistik" },
  { name: "yetkilistat", cat: "stat", catLabel: "İstatistik" },
  { name: "yetkililer", cat: "stat", catLabel: "İstatistik" },
  { name: "gorev", cat: "stat", catLabel: "İstatistik" },
  { name: "toplanti", cat: "stat", catLabel: "İstatistik" },
  { name: "yoklama", cat: "stat", catLabel: "İstatistik" },
  { name: "grafik", cat: "stat", catLabel: "İstatistik" },
  { name: "topkanal", cat: "stat", catLabel: "İstatistik" },
  { name: "me", cat: "stat", catLabel: "İstatistik" },
  { name: "ses", cat: "stat", catLabel: "İstatistik" },
  { name: "resetstat", cat: "stat", catLabel: "İstatistik" },
  { name: "bilet", cat: "stat", catLabel: "İstatistik" },
  { name: "tema", cat: "stat", catLabel: "İstatistik" },

  { name: "coin", cat: "eco", catLabel: "Ekonomi" },
  { name: "coinver", cat: "eco", catLabel: "Ekonomi" },
  { name: "gunluk", cat: "eco", catLabel: "Ekonomi" },
  { name: "calis", cat: "eco", catLabel: "Ekonomi" },
  { name: "gonder", cat: "eco", catLabel: "Ekonomi" },
  { name: "banka", cat: "eco", catLabel: "Ekonomi" },
  { name: "market", cat: "eco", catLabel: "Ekonomi" },
  { name: "itemmarket", cat: "eco", catLabel: "Ekonomi" },
  { name: "kullan", cat: "eco", catLabel: "Ekonomi" },
  { name: "esyagonder", cat: "eco", catLabel: "Ekonomi" },
  { name: "esyasat", cat: "eco", catLabel: "Ekonomi" },
  { name: "klan", cat: "eco", catLabel: "Ekonomi" },
  { name: "klantop", cat: "eco", catLabel: "Ekonomi" },
  { name: "al", cat: "eco", catLabel: "Ekonomi" },
  { name: "sat", cat: "eco", catLabel: "Ekonomi" },
  { name: "envanter", cat: "eco", catLabel: "Ekonomi" },
  { name: "topcoin", cat: "eco", catLabel: "Ekonomi" },
  { name: "soygun", cat: "eco", catLabel: "Ekonomi" },
  { name: "blackjack", cat: "eco", catLabel: "Ekonomi" },
  { name: "slot", cat: "eco", catLabel: "Ekonomi" },
  { name: "rulet", cat: "eco", catLabel: "Ekonomi" },
  { name: "yazitura", cat: "eco", catLabel: "Ekonomi" },
  { name: "borsa", cat: "eco", catLabel: "Ekonomi" },
  { name: "satinal", cat: "eco", catLabel: "Ekonomi" },
  { name: "mevduat", cat: "eco", catLabel: "Ekonomi" },
  { name: "sirket", cat: "eco", catLabel: "Ekonomi" },
  { name: "emlak", cat: "eco", catLabel: "Ekonomi" },
  { name: "piyango", cat: "eco", catLabel: "Ekonomi" },
  { name: "kazikazan", cat: "eco", catLabel: "Ekonomi" },
  { name: "balik", cat: "eco", catLabel: "Ekonomi" },
  { name: "maden", cat: "eco", catLabel: "Ekonomi" },
  { name: "transfer", cat: "eco", catLabel: "Ekonomi" },

  { name: "yardim", cat: "util", catLabel: "Yardımcı" },
  { name: "avatar", cat: "util", catLabel: "Yardımcı" },
  { name: "banner", cat: "util", catLabel: "Yardımcı" },
  { name: "kullanicibilgi", cat: "util", catLabel: "Yardımcı" },
  { name: "sunucubilgi", cat: "util", catLabel: "Yardımcı" },
  { name: "rolbilgi", cat: "util", catLabel: "Yardımcı" },
  { name: "kanalbilgi", cat: "util", catLabel: "Yardımcı" },
  { name: "kurallar", cat: "util", catLabel: "Yardımcı" },
  { name: "ping", cat: "util", catLabel: "Yardımcı" },
  { name: "ticketkur", cat: "util", catLabel: "Yardımcı" },
  { name: "biletolustur", cat: "util", catLabel: "Yardımcı" },
  { name: "biletkapat", cat: "util", catLabel: "Yardımcı" },
  { name: "anket", cat: "util", catLabel: "Yardımcı" },
  { name: "cekilis", cat: "util", catLabel: "Yardımcı" },
  { name: "reroll", cat: "util", catLabel: "Yardımcı" },
  { name: "butonrol", cat: "util", catLabel: "Yardımcı" },
  { name: "odapanel", cat: "util", catLabel: "Yardımcı" },
  { name: "radyo", cat: "util", catLabel: "Yardımcı" },
  { name: "birlikte", cat: "util", catLabel: "Yardımcı" },
  { name: "oneri", cat: "util", catLabel: "Yardımcı" },
  { name: "itiraf", cat: "util", catLabel: "Yardımcı" },
  { name: "dogumgunu", cat: "util", catLabel: "Yardımcı" },

  { name: "korumabilgi", cat: "guard", catLabel: "Güvenlik" },
  { name: "guvenli", cat: "guard", catLabel: "Güvenlik" },
  { name: "yedekal", cat: "guard", catLabel: "Güvenlik" },
  { name: "yedekyukle", cat: "guard", catLabel: "Güvenlik" },
  { name: "yedekliste", cat: "guard", catLabel: "Güvenlik" }
];

let localCommandsConfig = {};
let activeCmdCategory = "all";
let activeCmdStatusFilter = "all";
let cmdSearchQuery = "";
let currentEditingCmdName = null;

function ensureCmdConfig(name) {
  if (!localCommandsConfig[name]) {
    localCommandsConfig[name] = {
      enabled: true,
      mode: "BOTH",
      customName: "",
      customAliases: [],
      allowedRoles: []
    };
  }
  return localCommandsConfig[name];
}

function getRoleNameById(roleId) {
  const roles = currentDiscordMeta?.roles || [];
  const found = roles.find((r) => String(r.id) === String(roleId));
  return found ? found.name : roleId;
}

async function loadCommandsPage() {
  const tbody = document.getElementById("commands-tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Komut kataloğu ve sunucu yapılandırması yükleniyor...</td></tr>`;
  }
  if (!currentDiscordMeta) {
    try {
      const gId = (typeof GUILD_ID !== "undefined" && GUILD_ID) ? GUILD_ID : "1546253954248085647";
      const metaRes = await fetch(`/api/guild-meta/${gId}`);
      if (metaRes.ok) currentDiscordMeta = await metaRes.json();
    } catch (e) {}
  }
  try {
    const res = await fetch("/api/commands");
    const data = await res.json();
    if (data.success && data.commands) {
      localCommandsConfig = data.commands;
    }
  } catch (e) {}
  renderCommandsTable();
  updateCommandsStats();
}

function updateCommandsStats() {
  const total = commandsCatalog.length;
  let active = 0;
  let disabled = 0;
  let customized = 0;

  commandsCatalog.forEach((cmd) => {
    const cfg = localCommandsConfig[cmd.name] || {};
    const mode = cfg.mode || (cfg.enabled === false ? "DISABLED" : "BOTH");
    if (mode === "DISABLED") {
      disabled++;
    } else {
      active++;
    }
    const hasCustomName = Boolean(cfg.customName && cfg.customName.trim());
    const hasCustomAliases = Array.isArray(cfg.customAliases) && cfg.customAliases.length > 0;
    const hasAllowedRoles = Array.isArray(cfg.allowedRoles) && cfg.allowedRoles.length > 0;
    const hasCustomMode = mode !== "BOTH";
    if (hasCustomName || hasCustomAliases || hasAllowedRoles || hasCustomMode) {
      customized++;
    }
  });

  const elTotal = document.getElementById("cmd-stat-total");
  const elActive = document.getElementById("cmd-stat-active");
  const elDisabled = document.getElementById("cmd-stat-disabled");
  const elCustomized = document.getElementById("cmd-stat-customized");
  const badgeDisabled = document.getElementById("cmd-stat-disabled-badge");
  const badgeCustom = document.getElementById("cmd-stat-custom-badge");

  if (elTotal) elTotal.textContent = total + " Komut";
  if (elActive) elActive.textContent = active + " Komut";
  if (elDisabled) elDisabled.textContent = disabled + " Komut";
  if (elCustomized) elCustomized.textContent = customized + " Komut";
  if (badgeDisabled) badgeDisabled.textContent = disabled + " KAPALI";
  if (badgeCustom) badgeCustom.textContent = customized + " ÖZEL";
}

function renderCommandsTable() {
  const tbody = document.getElementById("commands-tbody");
  if (!tbody) return;

  const filtered = commandsCatalog.filter((cmd) => {
    if (activeCmdCategory !== "all" && cmd.cat !== activeCmdCategory) return false;
    const cfg = localCommandsConfig[cmd.name] || {};
    const mode = cfg.mode || (cfg.enabled === false ? "DISABLED" : "BOTH");
    if (activeCmdStatusFilter === "enabled" && mode === "DISABLED") return false;
    if (activeCmdStatusFilter === "disabled" && mode !== "DISABLED") return false;
    if (activeCmdStatusFilter === "customized") {
      const hasCustomName = Boolean(cfg.customName && cfg.customName.trim());
      const hasCustomAliases = Array.isArray(cfg.customAliases) && cfg.customAliases.length > 0;
      const hasAllowedRoles = Array.isArray(cfg.allowedRoles) && cfg.allowedRoles.length > 0;
      const hasCustomMode = mode !== "BOTH";
      if (!hasCustomName && !hasCustomAliases && !hasAllowedRoles && !hasCustomMode) return false;
    }
    if (cmdSearchQuery) {
      const q = cmdSearchQuery.toLowerCase();
      const inName = cmd.name.toLowerCase().includes(q);
      const inCustom = (cfg.customName || "").toLowerCase().includes(q);
      const inAliases = (cfg.customAliases || []).some((a) => a.toLowerCase().includes(q));
      if (!inName && !inCustom && !inAliases) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 28px;">Arama kriterlerine uyan komut bulunamadı.</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((cmd) => {
    const cfg = localCommandsConfig[cmd.name] || {};
    const mode = cfg.mode || (cfg.enabled === false ? "DISABLED" : "BOTH");
    const allowedRoles = cfg.allowedRoles || [];

    let rolesHtml = `<div class="cmd-roles-wrapper">`;
    if (allowedRoles.length === 0) {
      rolesHtml += `<span style="font-size: 12px; color: var(--text-muted);">Herkes</span>`;
    } else {
      allowedRoles.forEach((rId) => {
        const rName = getRoleNameById(rId);
        rolesHtml += `<span class="cmd-role-badge-tag">${escapeHtml(rName)} <span class="cmd-role-badge-remove" onclick="removeCmdRole('${cmd.name}', '${rId}')" title="Kaldır">×</span></span>`;
      });
    }
    rolesHtml += `<button type="button" class="cmd-role-add-btn" onclick="openCmdRolesModal('${cmd.name}')">+ Rol</button></div>`;

    const statusBadge = mode === "DISABLED"
      ? `<span class="metric-pill pill-danger">KAPALI</span>`
      : `<span class="metric-pill pill-success">AÇIK</span>`;

    html += `
      <tr>
        <td><span class="cmd-code-name">/${escapeHtml(cmd.name)}</span></td>
        <td><span class="cmd-cat-badge cat-${cmd.cat}">${cmd.catLabel}</span></td>
        <td><input type="text" class="cmd-field-input" placeholder="${cmd.name}" value="${escapeHtml(cfg.customName || "")}" onchange="updateCmdCustomName('${cmd.name}', this.value)" /></td>
        <td><input type="text" class="cmd-field-input" placeholder="virgülle ayırın" value="${escapeHtml((cfg.customAliases || []).join(', '))}" onchange="updateCmdAliases('${cmd.name}', this.value)" /></td>
        <td>
          <select class="cmd-select-mode" onchange="updateCmdMode('${cmd.name}', this.value)">
            <option value="BOTH" ${mode === "BOTH" ? "selected" : ""}>Prefix + Slash</option>
            <option value="SLASH" ${mode === "SLASH" ? "selected" : ""}>Yalnız Slash</option>
            <option value="PREFIX" ${mode === "PREFIX" ? "selected" : ""}>Yalnız Prefix</option>
            <option value="DISABLED" ${mode === "DISABLED" ? "selected" : ""}>Devre Dışı</option>
          </select>
        </td>
        <td>${rolesHtml}</td>
        <td style="text-align: center;">${statusBadge}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function updateCmdCustomName(name, val) {
  const cfg = ensureCmdConfig(name);
  cfg.customName = val.trim();
  updateCommandsStats();
}

function updateCmdAliases(name, val) {
  const cfg = ensureCmdConfig(name);
  cfg.customAliases = val.split(",").map((s) => s.trim()).filter(Boolean);
  updateCommandsStats();
}

function updateCmdMode(name, val) {
  const cfg = ensureCmdConfig(name);
  cfg.mode = val;
  cfg.enabled = val !== "DISABLED";
  renderCommandsTable();
  updateCommandsStats();
}

function removeCmdRole(name, roleId) {
  const cfg = ensureCmdConfig(name);
  cfg.allowedRoles = (cfg.allowedRoles || []).filter((id) => String(id) !== String(roleId));
  renderCommandsTable();
  updateCommandsStats();
}

function openCmdRolesModal(cmdName) {
  currentEditingCmdName = cmdName;
  const modal = document.getElementById("cmd-roles-modal-backdrop");
  const title = document.getElementById("cmd-roles-modal-title");
  const list = document.getElementById("cmd-roles-modal-list");
  if (!modal || !list) return;

  if (title) title.textContent = `/${cmdName} Komut Yetkili Rolleri`;

  const roles = currentDiscordMeta?.roles || [];
  const cfg = localCommandsConfig[cmdName] || {};
  const allowed = cfg.allowedRoles || [];

  if (roles.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Sunucuya ait rol bulunamadı veya bot henüz rolleri önbelleğe almadı.</div>`;
  } else {
    let html = "";
    roles.forEach((r) => {
      const isChecked = allowed.includes(String(r.id));
      const roleColor = r.color ? (String(r.color).startsWith("#") ? r.color : ('#' + Number(r.color).toString(16).padStart(6, '0'))) : '#f1f5f9';
      html += `
        <label class="cmd-role-checkbox-item">
          <input type="checkbox" value="${r.id}" ${isChecked ? "checked" : ""} />
          <span class="cmd-role-checkbox-label" style="color: ${roleColor};">@${escapeHtml(r.name)}</span>
          <span class="cmd-role-checkbox-id">${r.id}</span>
        </label>
      `;
    });
    list.innerHTML = html;
  }

  modal.style.display = "flex";
}

function closeCmdRolesModal() {
  const modal = document.getElementById("cmd-roles-modal-backdrop");
  if (modal) modal.style.display = "none";
  currentEditingCmdName = null;
}

function saveCmdRolesSelection() {
  if (!currentEditingCmdName) return;
  const list = document.getElementById("cmd-roles-modal-list");
  if (!list) return;

  const checkedInputs = list.querySelectorAll('input[type="checkbox"]:checked');
  const selectedIds = Array.from(checkedInputs).map((el) => el.value);

  const cfg = ensureCmdConfig(currentEditingCmdName);
  cfg.allowedRoles = selectedIds;

  closeCmdRolesModal();
  renderCommandsTable();
  updateCommandsStats();
  window.showToast("Komut yetkili rolleri güncellendi.", "info");
}

function clearCmdRolesSelection() {
  if (!currentEditingCmdName) return;
  const cfg = ensureCmdConfig(currentEditingCmdName);
  cfg.allowedRoles = [];

  closeCmdRolesModal();
  renderCommandsTable();
  updateCommandsStats();
  window.showToast("Rol yetkileri temizlendi. Komut herkese açık.", "info");
}

window.openCmdRolesModal = openCmdRolesModal;
window.closeCmdRolesModal = closeCmdRolesModal;
window.saveCmdRolesSelection = saveCmdRolesSelection;
window.clearCmdRolesSelection = clearCmdRolesSelection;
window.removeCmdRole = removeCmdRole;
window.updateCmdCustomName = updateCmdCustomName;
window.updateCmdAliases = updateCmdAliases;
window.updateCmdMode = updateCmdMode;

const catPills = document.querySelectorAll(".cmd-cat-pill");
catPills.forEach((btn) => {
  btn.addEventListener("click", () => {
    catPills.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCmdCategory = btn.getAttribute("data-cat") || "all";
    renderCommandsTable();
  });
});

const filterStatusSelect = document.getElementById("cmd-filter-status");
if (filterStatusSelect) {
  filterStatusSelect.addEventListener("change", (e) => {
    activeCmdStatusFilter = e.target.value;
    renderCommandsTable();
  });
}

const searchInput = document.getElementById("cmd-search-input");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    cmdSearchQuery = e.target.value.trim();
    renderCommandsTable();
  });
}

const btnCmdEnableAll = document.getElementById("btn-cmd-enable-all");
if (btnCmdEnableAll) {
  btnCmdEnableAll.addEventListener("click", () => {
    commandsCatalog.forEach((cmd) => {
      const cfg = ensureCmdConfig(cmd.name);
      cfg.mode = "BOTH";
      cfg.enabled = true;
    });
    renderCommandsTable();
    updateCommandsStats();
    window.showToast("Tüm komutlar aktif moda (Prefix + Slash) alındı.", "info");
  });
}

const btnCmdDisableAll = document.getElementById("btn-cmd-disable-all");
if (btnCmdDisableAll) {
  btnCmdDisableAll.addEventListener("click", () => {
    commandsCatalog.forEach((cmd) => {
      const cfg = ensureCmdConfig(cmd.name);
      cfg.mode = "DISABLED";
      cfg.enabled = false;
    });
    renderCommandsTable();
    updateCommandsStats();
    window.showToast("Tüm komutlar devre dışı bırakıldı.", "warn");
  });
}

const btnCmdResetDefault = document.getElementById("btn-cmd-reset-default");
if (btnCmdResetDefault) {
  btnCmdResetDefault.addEventListener("click", () => {
    localCommandsConfig = {};
    renderCommandsTable();
    updateCommandsStats();
    window.showToast("Tüm komut ayarları varsayılana sıfırlandı.", "info");
  });
}

const btnCmdSaveAll = document.getElementById("btn-cmd-save-all");
if (btnCmdSaveAll) {
  btnCmdSaveAll.addEventListener("click", async () => {
    btnCmdSaveAll.disabled = true;
    btnCmdSaveAll.innerHTML = `<span>Kaydediliyor...</span>`;
    try {
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands: localCommandsConfig })
      });
      const data = await res.json();
      if (data.success) {
        window.showToast("126 komut yapılandırması başarıyla kaydedildi.", "success");
      } else {
        window.showToast(data.error || "Komutlar kaydedilemedi.", "error");
      }
    } catch (err) {
      window.showToast("Bağlantı hatası: " + err.message, "error");
    } finally {
      btnCmdSaveAll.disabled = false;
      btnCmdSaveAll.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>Değişiklikleri Kaydet</span>
      `;
    }
  });
}

const messagesCatalog = [
  { key: "jailPunish", cat: "mod", catLabel: "Moderasyon", title: "Karantina Protokolü Uygulandı", desc: "Üye karantinaya alındığında gönderilir.", vars: ["user", "staff", "points", "reason"] },
  { key: "jailLift", cat: "mod", catLabel: "Moderasyon", title: "Karantina Cezası Kaldırıldı", desc: "Karantina cezası kaldırıldığında gönderilir.", vars: ["user", "staff"] },
  { key: "mutePunish", cat: "mod", catLabel: "Moderasyon", title: "Metin Susturma (Mute) Uygulandı", desc: "Yazı kanallarında susturma uygulandığında gönderilir.", vars: ["user", "staff", "reason"] },
  { key: "muteLift", cat: "mod", catLabel: "Moderasyon", title: "Metin Susturması Kaldırıldı", desc: "Metin susturma kaldırıldığında gönderilir.", vars: ["user", "staff"] },
  { key: "vmutePunish", cat: "mod", catLabel: "Moderasyon", title: "Ses Susturma (VMute) Uygulandı", desc: "Ses kanallarında susturma uygulandığında gönderilir.", vars: ["user", "staff", "reason"] },
  { key: "vmuteLift", cat: "mod", catLabel: "Moderasyon", title: "Ses Susturması Kaldırıldı", desc: "Ses susturması kaldırıldığında gönderilir.", vars: ["user", "staff"] },
  { key: "banPunish", cat: "mod", catLabel: "Moderasyon", title: "Sunucudan Uzaklaştırıldı (Ban)", desc: "Üye sunucudan yasaklandığında gönderilir.", vars: ["user", "staff", "reason"] },
  { key: "banLift", cat: "mod", catLabel: "Moderasyon", title: "Sunucu Yasağı Kaldırıldı", desc: "Yasaklama kaldırıldığında gönderilir.", vars: ["user", "staff"] },
  { key: "warnAdd", cat: "mod", catLabel: "Moderasyon", title: "Resmi Ceza Uyarısı Verildi", desc: "Üyeye resmi uyarı verildiğinde gönderilir.", vars: ["user", "staff", "reason"] },
  { key: "warnClean", cat: "mod", catLabel: "Moderasyon", title: "Uyarı Sicili Temizlendi", desc: "Uyarı sicili sıfırlandığında gönderilir.", vars: ["user", "staff"] },
  { key: "lockChannel", cat: "mod", catLabel: "Moderasyon", title: "Kanal Erişime Kapatıldı", desc: "Kanal kilitlendiğinde gönderilir.", vars: ["staff", "duration"] },
  { key: "unlockChannel", cat: "mod", catLabel: "Moderasyon", title: "Kanal Erişime Açıldı", desc: "Kanal kilidi açıldığında gönderilir.", vars: [] },
  { key: "sicilClean", cat: "mod", catLabel: "Moderasyon", title: "Sicil ve Ceza Kaydı Temiz", desc: "Sicili temiz üyeler için gösterilir.", vars: ["user"] },
  { key: "sicilRecord", cat: "mod", catLabel: "Moderasyon", title: "Sicil ve Ceza Dosyası", desc: "Üyenin ceza dökümü listelenirken gönderilir.", vars: ["user", "points", "records"] },
  { key: "penaltyPoints", cat: "mod", catLabel: "Moderasyon", title: "Aktif Ceza Puanı Durumu", desc: "Ceza puanı sorgulandığında gönderilir.", vars: ["user", "points", "limit"] },

  { key: "registerWelcome", cat: "reg", catLabel: "Kayıt", title: "Hoş Geldin Bildirimi", desc: "Sunucuya yeni üye katıldığında gönderilir.", vars: ["user"] },
  { key: "registerSuccess", cat: "reg", catLabel: "Kayıt", title: "Kayıt İşlemi Tamamlandı", desc: "Üye başarıyla kaydedildiğinde gönderilir.", vars: ["user", "staff", "gender"] },
  { key: "suspiciousAlert", cat: "reg", catLabel: "Kayıt", title: "Şüpheli Hesap Karantinası", desc: "Yeni açılmış şüpheli hesap tespitinde gönderilir.", vars: ["user"] },
  { key: "nameChanged", cat: "reg", catLabel: "Kayıt", title: "İsim Değişikliği Onaylandı", desc: "Üyenin sunucu içi ismi güncellendiğinde gönderilir.", vars: ["user", "name"] },
  { key: "nameHistory", cat: "reg", catLabel: "Kayıt", title: "İsim Değişiklik Geçmişi", desc: "Geçmiş isim kayıtları listelenirken gönderilir.", vars: ["user", "count", "records"] },

  { key: "userStats", cat: "stat", catLabel: "İstatistik", title: "Kullanıcı Aktivite İstatistikleri", desc: "Kişisel ses ve mesaj istatistikleri.", vars: ["user", "totalVoice", "weeklyVoice", "dailyVoice", "totalMsgs", "weeklyMsgs", "dailyMsgs"] },
  { key: "serverStats", cat: "stat", catLabel: "İstatistik", title: "Sunucu İstatistik Paneli", desc: "Sunucu toplam üye ve ses durumu.", vars: ["total", "tagged", "voice", "boosts"] },
  { key: "topStats", cat: "stat", catLabel: "İstatistik", title: "En Aktifler Liderlik Tablosu", desc: "Haftalık ve genel aktivite sıralaması.", vars: ["guild", "ranking"] },
  { key: "staffTask", cat: "stat", catLabel: "İstatistik", title: "Yetkili Haftalık Görev Durumu", desc: "Yetkili performans ve puan durumu.", vars: ["user", "voiceHours", "msgs", "regs", "points"] },
  { key: "attendanceReport", cat: "stat", catLabel: "İstatistik", title: "Toplantı Yoklama Raporu", desc: "Toplantı katılım ve devamsızlık dökümü.", vars: ["channel", "attendedCount", "missingCount", "attendedList"] },

  { key: "coinBalance", cat: "eco", catLabel: "Ekonomi", title: "Bakiye ve Finansal Durum", desc: "Cüzdan ve banka bakiyesi görüntülendiğinde gönderilir.", vars: ["user", "wallet", "bank"] },
  { key: "dailyReward", cat: "eco", catLabel: "Ekonomi", title: "Günlük Maaş / Ödül Alındı", desc: "Günlük bonus toplandığında gönderilir.", vars: ["user", "amount"] },
  { key: "coinTransferSuccess", cat: "eco", catLabel: "Ekonomi", title: "Para Transferi Onaylandı", desc: "Kullanıcılar arası coin gönderildiğinde gönderilir.", vars: ["user", "target", "amount"] },
  { key: "blackjackTable", cat: "eco", catLabel: "Ekonomi", title: "21 (Blackjack) Masası", desc: "Blackjack oyunu başladığında masa durumu.", vars: ["bet", "cards", "total", "dealer"] },
  { key: "blackjackWin", cat: "eco", catLabel: "Ekonomi", title: "Blackjack Zafer", desc: "Blackjack kazanıldığında gönderilir.", vars: ["amount", "balance"] },
  { key: "blackjackLose", cat: "eco", catLabel: "Ekonomi", title: "Blackjack Kayıp", desc: "Blackjack kaybedildiğinde gönderilir.", vars: ["amount", "balance"] },
  { key: "blackjackPush", cat: "eco", catLabel: "Ekonomi", title: "Blackjack Berabere (Push)", desc: "Blackjack berabere bittiğinde gönderilir.", vars: ["amount", "balance"] },
  { key: "slotWin", cat: "eco", catLabel: "Ekonomi", title: "Slot Makinesi Jackpot", desc: "Slot oyunu kazanıldığında gönderilir.", vars: ["reel1", "reel2", "reel3", "multiplier", "amount", "balance"] },
  { key: "slotLose", cat: "eco", catLabel: "Ekonomi", title: "Slot Makinesi Kayıp", desc: "Slot oyunu kaybedildiğinde gönderilir.", vars: ["reel1", "reel2", "reel3", "amount", "balance"] },
  { key: "ruletWin", cat: "eco", catLabel: "Ekonomi", title: "Rulet Kazanç", desc: "Rulet çarkında kazanıldığında gönderilir.", vars: ["color", "number", "amount", "balance"] },
  { key: "ruletLose", cat: "eco", catLabel: "Ekonomi", title: "Rulet Kayıp", desc: "Rulet çarkında kaybedildiğinde gönderilir.", vars: ["color", "number", "amount", "balance"] },
  { key: "depositSuccess", cat: "eco", catLabel: "Ekonomi", title: "Vadeli Mevduat Hesabı Açıldı", desc: "Bankaya mevduat yatırıldığında gönderilir.", vars: ["amount"] },
  { key: "companyCreated", cat: "eco", catLabel: "Ekonomi", title: "Kurumsal Şirket Kuruluşu", desc: "Yeni şirket kurulduğunda gönderilir.", vars: ["name"] },
  { key: "propertyBought", cat: "eco", catLabel: "Ekonomi", title: "Gayrimenkul Yatırımı Yapıldı", desc: "Mülk satın alındığında gönderilir.", vars: ["type"] },
  { key: "lotteryWin", cat: "eco", catLabel: "Ekonomi", title: "Piyango Büyük İkramiye", desc: "Piyango çekilişi kazanıldığında gönderilir.", vars: ["amount"] },
  { key: "mineSuccess", cat: "eco", catLabel: "Ekonomi", title: "Maden Kazısı Başarılı", desc: "Maden kazısından cevher çıkarıldığında gönderilir.", vars: ["mineral", "amount"] },
  { key: "fishSuccess", cat: "eco", catLabel: "Ekonomi", title: "Balık Avı Başarılı", desc: "Balık tutulduğunda gönderilir.", vars: ["fish", "amount"] },

  { key: "customRoomCreated", cat: "util", catLabel: "Yardımcı", title: "Özel Ses Odası Oluşturuldu", desc: "Geçici özel ses kanalı açıldığında gönderilir.", vars: ["user", "channel"] },
  { key: "roomLocked", cat: "util", catLabel: "Yardımcı", title: "Özel Oda Kilitlendi", desc: "Özel ses odası kilitlendiğinde gönderilir.", vars: [] },
  { key: "roomUnlocked", cat: "util", catLabel: "Yardımcı", title: "Özel Oda Kilidi Açıldı", desc: "Özel ses odasının kilidi açıldığında gönderilir.", vars: [] },
  { key: "ticketCreated", cat: "util", catLabel: "Yardımcı", title: "Destek Talebi Açıldı", desc: "Yeni bir destek bileti açıldığında gönderilir.", vars: ["user", "channel"] },
  { key: "ticketClosed", cat: "util", catLabel: "Yardımcı", title: "Destek Talebi Sonlandırıldı", desc: "Destek bileti kapatıldığında gönderilir.", vars: [] },
  { key: "afkSet", cat: "util", catLabel: "Yardımcı", title: "AFK Moduna Geçildi", desc: "Kullanıcı AFK moduna girdiğinde gönderilir.", vars: ["user", "reason"] },
  { key: "suggestionNew", cat: "util", catLabel: "Yardımcı", title: "Yeni Sunucu Önerisi", desc: "Topluluk önerisi paylaşıldığında gönderilir.", vars: ["user", "content"] },
  { key: "confessionNew", cat: "util", catLabel: "Yardımcı", title: "Anonim İtiraf Kutusu", desc: "Anonim itiraf mesajı gönderildiğinde gönderilir.", vars: ["content"] },
  { key: "birthdayWish", cat: "util", catLabel: "Yardımcı", title: "Doğum Günü Kutlaması", desc: "Üyenin doğum gününde gönderilir.", vars: ["user"] },
  { key: "radioStart", cat: "util", catLabel: "Yardımcı", title: "Canlı Radyo Yayını Başlatıldı", desc: "Ses kanalında radyo başlatıldığında gönderilir.", vars: ["station", "url"] },

  { key: "guardAlert", cat: "guard", catLabel: "Güvenlik", title: "Güvenlik Bildirimi (Guard)", desc: "İhlal engellendiğinde guard kanallarına gönderilir.", vars: ["user", "reason"] },
  { key: "snipeEmpty", cat: "guard", catLabel: "Güvenlik", title: "Silinen Mesaj Kaydı Yok", desc: "Snipe kanalda silinen mesaj bulamadığında gönderilir.", vars: [] },
  { key: "snipeMessage", cat: "guard", catLabel: "Güvenlik", title: "Yakalanan Silinmiş Mesaj", desc: "Son silinen mesaj gösterilirken gönderilir.", vars: ["authorId", "time", "content"] }
];

const sampleVarValues = {
  user: "@Kullanıcı",
  staff: "@Yetkili",
  points: "25",
  reason: "Spam ve Flood Yapmak",
  duration: "10 Dakika",
  name: "Ahmet",
  count: "3",
  records: "1. Ahmet (01.01.2026)\n2. Mehmet (15.02.2026)",
  gender: "Erkek",
  total: "1,250",
  tagged: "340",
  voice: "85",
  boosts: "14 (Seviye 3)",
  totalVoice: "42 Saat",
  weeklyVoice: "12 Saat",
  dailyVoice: "3 Saat",
  totalMsgs: "3,420",
  weeklyMsgs: "850",
  dailyMsgs: "190",
  guild: "BFE Official Server",
  ranking: "1. 👑 @Ahmet • 45 Saat\n2. 🥈 @Mehmet • 38 Saat\n3. 🥉 @Ayşe • 32 Saat",
  voiceHours: "15",
  msgs: "520",
  regs: "18",
  channel: "#destek-01",
  attendedCount: "12",
  missingCount: "2",
  attendedList: "@Ali, @Veli, @Ahmet, @Ayşe",
  wallet: "4,500",
  bank: "25,000",
  amount: "500",
  target: "@AlıcıÜye",
  bet: "200",
  cards: "A♠ 10♥",
  dealer: "9♦",
  balance: "4,800",
  reel1: "🍒",
  reel2: "🍒",
  reel3: "🍒",
  multiplier: "10",
  color: "Kırmızı",
  number: "7",
  type: "Lüks Rezidans Dairesi",
  mineral: "Zümrüt Taşı",
  fish: "Kılıç Balığı",
  content: "Bu bir canlı simülasyon örnek mesaj metnidir.",
  station: "Fenomen Türk FM",
  url: "https://radyo.stream/canli",
  authorId: "1546253954248085647",
  time: "2 dakika önce",
  limit: "100"
};

let localMessagesConfig = {};
let defaultMessagesConfig = {};
let activeMsgCategory = "all";
let msgSearchQuery = "";
let selectedMsgKey = "jailPunish";

function parseDiscordMarkdown(rawText, format) {
  if (!rawText) return '<span style="color:#64748b; font-style:italic;">İçerik boş.</span>';

  let text = rawText;
  for (const [key, val] of Object.entries(sampleVarValues)) {
    const rgx = new RegExp(`\\{${key}\\}`, "g");
    text = text.replace(rgx, val);
  }

  const lines = text.split("\n");
  let out = "";
  let inCodeBlock = false;
  let codeBlockBuffer = "";

  for (let line of lines) {
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockBuffer = "";
      } else {
        inCodeBlock = false;
        out += `<div class="discord-preview-codeblock">${escapeHtml(codeBlockBuffer)}</div>`;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockBuffer += (codeBlockBuffer ? "\n" : "") + line;
      continue;
    }

    if (line.startsWith("### ")) {
      out += `<div class="discord-preview-h3">${escapeHtml(line.slice(4))}</div>`;
      continue;
    }

    if (line.startsWith("-# ")) {
      out += `<div class="discord-preview-subtext">${escapeHtml(line.slice(3))}</div>`;
      continue;
    }

    let parsed = escapeHtml(line);
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/`(.*?)`/g, '<span class="discord-preview-code">$1</span>');

    if (parsed.startsWith("▫️ ") || parsed.startsWith("• ")) {
      out += `<div class="discord-preview-bullet"><span style="color:#94a3b8;">▫️</span><span>${parsed.slice(2)}</span></div>`;
    } else if (parsed.trim()) {
      out += `<div>${parsed}</div>`;
    } else {
      out += `<div style="height:6px;"></div>`;
    }
  }

  return out;
}

async function loadMessagesPage() {
  try {
    const res = await fetch("/api/messages");
    const data = await res.json();
    if (data.success) {
      localMessagesConfig = data.messages || {};
      defaultMessagesConfig = data.defaults || {};
    }
  } catch (e) {}

  renderMessagesList();
  selectMessageTemplate(selectedMsgKey);
  updateMessagesStats();
}

function updateMessagesStats() {
  const total = messagesCatalog.length;
  let v2Count = 0;
  let customCount = 0;

  messagesCatalog.forEach((item) => {
    const cfg = localMessagesConfig[item.key] || defaultMessagesConfig[item.key] || {};
    const fmt = cfg.format || "COMPONENTS_V2";
    if (fmt === "COMPONENTS_V2") v2Count++;

    const def = defaultMessagesConfig[item.key] || {};
    if (cfg.content && def.content && cfg.content !== def.content) {
      customCount++;
    } else if (cfg.format && def.format && cfg.format !== def.format) {
      customCount++;
    }
  });

  const elTotal = document.getElementById("msg-stat-total");
  const elV2 = document.getElementById("msg-stat-v2");
  const elCustom = document.getElementById("msg-stat-custom");
  const badgeCustom = document.getElementById("msg-stat-custom-badge");

  if (elTotal) elTotal.textContent = total + " Şablon";
  if (elV2) elV2.textContent = v2Count + " Şablon";
  if (elCustom) elCustom.textContent = customCount + " Şablon";
  if (badgeCustom) badgeCustom.textContent = customCount + " ÖZEL";
}

function renderMessagesList() {
  const listEl = document.getElementById("msg-template-list");
  if (!listEl) return;

  const filtered = messagesCatalog.filter((item) => {
    if (activeMsgCategory !== "all" && item.cat !== activeMsgCategory) return false;
    if (msgSearchQuery) {
      const q = msgSearchQuery.toLowerCase();
      const inKey = item.key.toLowerCase().includes(q);
      const inTitle = item.title.toLowerCase().includes(q);
      const inDesc = item.desc.toLowerCase().includes(q);
      if (!inKey && !inTitle && !inDesc) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">Arama kriterlerine uyan şablon bulunamadı.</div>`;
    return;
  }

  let html = "";
  filtered.forEach((item) => {
    const cfg = localMessagesConfig[item.key] || defaultMessagesConfig[item.key] || {};
    const fmt = cfg.format || "COMPONENTS_V2";
    const isActive = item.key === selectedMsgKey;

    const def = defaultMessagesConfig[item.key] || {};
    const isCustomized = Boolean(cfg.content && def.content && cfg.content !== def.content);

    html += `
      <div class="msg-item-card ${isActive ? "active" : ""}" onclick="selectMessageTemplate('${item.key}')">
        <div class="msg-item-top">
          <span class="msg-item-title">${escapeHtml(item.title)}</span>
          <span class="cmd-cat-badge cat-${item.cat}">${item.catLabel}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <span class="msg-item-key">${item.key}</span>
          ${isCustomized ? '<span class="metric-pill pill-indigo" style="font-size:10px; padding:1px 5px;">ÖZEL</span>' : ''}
        </div>
        <div class="msg-item-desc">${escapeHtml(item.desc)}</div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

function selectMessageTemplate(key) {
  selectedMsgKey = key;
  const item = messagesCatalog.find((m) => m.key === key) || messagesCatalog[0];
  if (!item) return;

  const cards = document.querySelectorAll(".msg-item-card");
  cards.forEach((c) => c.classList.remove("active"));
  const clickedCard = Array.from(cards).find((c) => c.querySelector(".msg-item-key")?.textContent === key);
  if (clickedCard) clickedCard.classList.add("active");

  const cfg = localMessagesConfig[item.key] || defaultMessagesConfig[item.key] || {};
  const currentFormat = cfg.format || "COMPONENTS_V2";
  const currentContent = cfg.content || "";

  const elKey = document.getElementById("msg-detail-key");
  const elCat = document.getElementById("msg-detail-cat");
  const elTitle = document.getElementById("msg-detail-title");
  const elDesc = document.getElementById("msg-detail-desc");
  const elTextarea = document.getElementById("msg-content-input");
  const elVarsList = document.getElementById("msg-variables-list");

  if (elKey) elKey.textContent = item.key;
  if (elCat) {
    elCat.textContent = item.catLabel;
    elCat.className = `cmd-cat-badge cat-${item.cat}`;
  }
  if (elTitle) elTitle.textContent = item.title;
  if (elDesc) elDesc.textContent = item.desc;
  if (elTextarea) elTextarea.value = currentContent;

  const formatBtns = document.querySelectorAll(".msg-format-btn");
  formatBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-format") === currentFormat);
  });

  if (elVarsList) {
    if (item.vars && item.vars.length > 0) {
      elVarsList.innerHTML = item.vars.map((v) => `
        <button type="button" class="msg-var-badge" onclick="insertVariableTag('{${v}}')">
          <span>+{${v}}</span>
        </button>
      `).join("");
    } else {
      elVarsList.innerHTML = `<span style="font-size: 11.5px; color: var(--text-muted);">Bu şablon için özel değişken bulunmuyor.</span>`;
    }
  }

  updateLivePreview();
}

function updateLivePreview() {
  const textarea = document.getElementById("msg-content-input");
  const previewBody = document.getElementById("discord-preview-body");
  if (!textarea || !previewBody) return;

  const activeFormatBtn = document.querySelector(".msg-format-btn.active");
  const format = activeFormatBtn?.getAttribute("data-format") || "COMPONENTS_V2";

  previewBody.className = "discord-container-box";
  if (format === "EMBED") previewBody.classList.add("mode-embed");
  if (format === "PLAIN") previewBody.classList.add("mode-plain");

  previewBody.innerHTML = parseDiscordMarkdown(textarea.value, format);
}

function insertVariableTag(tag) {
  const textarea = document.getElementById("msg-content-input");
  if (!textarea) return;

  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value;

  textarea.value = val.substring(0, start) + tag + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + tag.length;
  textarea.focus();

  onTemplateContentChange();
}

function onTemplateContentChange() {
  const textarea = document.getElementById("msg-content-input");
  if (!textarea || !selectedMsgKey) return;

  if (!localMessagesConfig[selectedMsgKey]) {
    localMessagesConfig[selectedMsgKey] = {
      format: "COMPONENTS_V2",
      content: ""
    };
  }
  localMessagesConfig[selectedMsgKey].content = textarea.value;

  updateLivePreview();
  updateMessagesStats();
  renderMessagesList();
}

function onTemplateFormatChange(newFormat) {
  if (!selectedMsgKey) return;

  if (!localMessagesConfig[selectedMsgKey]) {
    localMessagesConfig[selectedMsgKey] = {
      format: "COMPONENTS_V2",
      content: ""
    };
  }
  localMessagesConfig[selectedMsgKey].format = newFormat;

  const formatBtns = document.querySelectorAll(".msg-format-btn");
  formatBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-format") === newFormat);
  });

  updateLivePreview();
  updateMessagesStats();
}

window.selectMessageTemplate = selectMessageTemplate;
window.insertVariableTag = insertVariableTag;

const msgTextarea = document.getElementById("msg-content-input");
if (msgTextarea) {
  msgTextarea.addEventListener("input", onTemplateContentChange);
}

const msgFormatButtons = document.querySelectorAll(".msg-format-btn");
msgFormatButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const fmt = btn.getAttribute("data-format");
    if (fmt) onTemplateFormatChange(fmt);
  });
});

const msgCatPills = document.querySelectorAll("#msg-cat-pills .cmd-cat-pill");
msgCatPills.forEach((btn) => {
  btn.addEventListener("click", () => {
    msgCatPills.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeMsgCategory = btn.getAttribute("data-cat") || "all";
    renderMessagesList();
  });
});

const msgSearchInput = document.getElementById("msg-search-input");
if (msgSearchInput) {
  msgSearchInput.addEventListener("input", (e) => {
    msgSearchQuery = e.target.value.trim();
    renderMessagesList();
  });
}

const btnMsgItemReset = document.getElementById("btn-msg-item-reset");
if (btnMsgItemReset) {
  btnMsgItemReset.addEventListener("click", () => {
    if (!selectedMsgKey) return;
    const def = defaultMessagesConfig[selectedMsgKey];
    if (def) {
      localMessagesConfig[selectedMsgKey] = { ...def };
      selectMessageTemplate(selectedMsgKey);
      updateMessagesStats();
      renderMessagesList();
      window.showToast(`/${selectedMsgKey} şablonu varsayılana sıfırlandı.`, "info");
    }
  });
}

const btnMsgResetDefault = document.getElementById("btn-msg-reset-default");
if (btnMsgResetDefault) {
  btnMsgResetDefault.addEventListener("click", () => {
    localMessagesConfig = JSON.parse(JSON.stringify(defaultMessagesConfig));
    selectMessageTemplate(selectedMsgKey);
    updateMessagesStats();
    renderMessagesList();
    window.showToast("Tüm şablonlar varsayılana sıfırlandı.", "info");
  });
}

const btnMsgSaveAll = document.getElementById("btn-msg-save-all");
if (btnMsgSaveAll) {
  btnMsgSaveAll.addEventListener("click", async () => {
    btnMsgSaveAll.disabled = true;
    btnMsgSaveAll.innerHTML = `<span>Kaydediliyor...</span>`;
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: localMessagesConfig })
      });
      const data = await res.json();
      if (data.success) {
        window.showToast("55 mesaj şablonu başarıyla kaydedildi.", "success");
      } else {
        window.showToast(data.error || "Şablonlar kaydedilemedi.", "error");
      }
    } catch (err) {
      window.showToast("Bağlantı hatası: " + err.message, "error");
    } finally {
      btnMsgSaveAll.disabled = false;
      btnMsgSaveAll.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>Değişiklikleri Kaydet</span>
      `;
    }
  });
}

let localAutoResponders = [];
let localMediaChannels = [];
let activeAutoType = "all";
let autoSearchQuery = "";
let currentEditingAutoId = null;

function getChannelNameById(cId) {
  const channels = currentDiscordMeta?.channels || [];
  const found = channels.find((c) => String(c.id) === String(cId));
  return found ? found.name : cId;
}

async function loadAutoRespondersPage() {
  const tbody = document.getElementById("auto-tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">Otomatik yanıt kuralları ve medya kanalları yükleniyor...</td></tr>`;
  }
  if (!currentDiscordMeta) {
    try {
      const gId = (typeof GUILD_ID !== "undefined" && GUILD_ID) ? GUILD_ID : "1546253954248085647";
      const metaRes = await fetch(`/api/guild-meta/${gId}`);
      if (metaRes.ok) currentDiscordMeta = await metaRes.json();
    } catch (e) {}
  }
  try {
    const res = await fetch("/api/autoresponders");
    const data = await res.json();
    if (data.success) {
      localAutoResponders = Array.isArray(data.autoResponders) ? data.autoResponders : [];
      localMediaChannels = Array.isArray(data.mediaChannels) ? data.mediaChannels : [];
    }
  } catch (e) {}

  renderAutoRespondersTable();
  renderMediaChannelsBadges();
  updateAutoStats();
}

function updateAutoStats() {
  const total = localAutoResponders.length;
  const active = localAutoResponders.filter((r) => r.enabled !== false).length;
  const media = localMediaChannels.length;

  const elTotal = document.getElementById("auto-stat-total");
  const elActive = document.getElementById("auto-stat-active");
  const elMedia = document.getElementById("auto-stat-media");
  const badgeActive = document.getElementById("auto-stat-active-badge");
  const badgeMedia = document.getElementById("auto-stat-media-badge");

  if (elTotal) elTotal.textContent = total + " Kural";
  if (elActive) elActive.textContent = active + " Kural";
  if (elMedia) elMedia.textContent = media + " Kanal";
  if (badgeActive) badgeActive.textContent = active + " AÇIK";
  if (badgeMedia) badgeMedia.textContent = media + " KANAL";
}

function renderMediaChannelsBadges() {
  const wrapper = document.getElementById("auto-media-channels-wrapper");
  if (!wrapper) return;

  if (localMediaChannels.length === 0) {
    wrapper.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">Henüz medya zorunlu kanal seçilmedi. "+ Medya Kanalı Ekle" butonuna basarak ekleyebilirsiniz.</span>`;
    return;
  }

  let html = "";
  localMediaChannels.forEach((cId) => {
    const cName = getChannelNameById(cId);
    html += `
      <span class="cmd-role-badge-tag" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: #6ee7b7;">
        #${escapeHtml(cName)}
        <span class="cmd-role-badge-remove" onclick="removeMediaChannel('${cId}')" title="Kaldır">×</span>
      </span>
    `;
  });
  wrapper.innerHTML = html;
}

function removeMediaChannel(cId) {
  localMediaChannels = localMediaChannels.filter((id) => String(id) !== String(cId));
  renderMediaChannelsBadges();
  updateAutoStats();
}

function renderAutoRespondersTable() {
  const tbody = document.getElementById("auto-tbody");
  if (!tbody) return;

  const filtered = localAutoResponders.filter((item) => {
    if (activeAutoType !== "all" && (item.matchType || "exact") !== activeAutoType) return false;
    if (autoSearchQuery) {
      const q = autoSearchQuery.toLowerCase();
      const inTrig = (item.trigger || "").toLowerCase().includes(q);
      const inResp = (item.response || "").toLowerCase().includes(q);
      if (!inTrig && !inResp) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 28px;">Henüz kayıtlı otomatik yanıtlayıcı kuralı bulunmuyor. "+ Yeni Otomatik Yanıt Ekle" ile oluşturabilirsiniz.</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((item, index) => {
    const id = item.id || `auto-${index}`;
    item.id = id;
    const isEnabled = item.enabled !== false;
    const matchType = item.matchType || "exact";

    let typeLabel = "Tam Eşleşme";
    let typeClass = "cat-reg";
    if (matchType === "contains") {
      typeLabel = "İçerir";
      typeClass = "cat-stat";
    } else if (matchType === "startsWith") {
      typeLabel = "İle Başlar";
      typeClass = "cat-eco";
    }

    let channelsLabel = `<span style="font-size: 11.5px; color: var(--text-muted);">Tüm Kanallar</span>`;
    if (Array.isArray(item.channels) && item.channels.length > 0) {
      channelsLabel = item.channels.map((cId) => `<span class="cmd-role-badge-tag" style="font-size:10px;">#${escapeHtml(getChannelNameById(cId))}</span>`).join(" ");
    }

    const statusBadge = isEnabled
      ? `<span class="metric-pill pill-success" style="cursor:pointer;" onclick="toggleAutoResponder('${id}')">AÇIK</span>`
      : `<span class="metric-pill pill-danger" style="cursor:pointer;" onclick="toggleAutoResponder('${id}')">KAPALI</span>`;

    html += `
      <tr>
        <td><span class="cmd-code-name">${escapeHtml(item.trigger)}</span></td>
        <td><span class="cmd-cat-badge ${typeClass}">${typeLabel}</span></td>
        <td style="max-width: 320px; word-break: break-word; font-size: 13px; color: #cbd5e1;">${escapeHtml(item.response)}</td>
        <td><div style="display:flex; gap:4px; flex-wrap:wrap;">${channelsLabel}</div></td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-action-secondary" style="padding: 4px 8px; font-size: 11.5px;" onclick="openAutoModal('${id}')">Düzenle</button>
          <button type="button" class="btn-action-secondary" style="padding: 4px 8px; font-size: 11.5px; color: #f87171;" onclick="deleteAutoResponder('${id}')">Sil</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

async function persistAutoResponders() {
  try {
    const res = await fetch("/api/autoresponders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoResponders: localAutoResponders,
        mediaChannels: localMediaChannels
      })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function toggleAutoResponder(id) {
  const item = localAutoResponders.find((r) => String(r.id) === String(id));
  if (item) {
    item.enabled = item.enabled === false ? true : false;
    renderAutoRespondersTable();
    updateAutoStats();
    await persistAutoResponders();
  }
}

async function deleteAutoResponder(id) {
  if (confirm("Bu otomatik yanıt kuralını silmek istediğinize emin misiniz?")) {
    localAutoResponders = localAutoResponders.filter((r) => String(r.id) !== String(id));
    renderAutoRespondersTable();
    updateAutoStats();
    const saveRes = await persistAutoResponders();
    if (saveRes.success) {
      window.showToast("Otomatik yanıt kuralı veritabanından silindi.", "info");
    } else {
      window.showToast("Silindi fakat sunucuya kaydedilemedi: " + (saveRes.error || ""), "warn");
    }
  }
}

function openAutoModal(editId = null) {
  currentEditingAutoId = editId;
  const modal = document.getElementById("auto-responder-modal-backdrop");
  const title = document.getElementById("auto-modal-title");
  const inTrigger = document.getElementById("auto-input-trigger");
  const inType = document.getElementById("auto-input-matchtype");
  const inResponse = document.getElementById("auto-input-response");
  const channelsList = document.getElementById("auto-modal-channels-list");
  if (!modal) return;

  const allChannels = currentDiscordMeta?.channels || [];
  const textChannels = allChannels.filter((c) => c.type === 0 || c.type === 5);

  let selectedChannels = [];
  if (editId) {
    const existing = localAutoResponders.find((r) => String(r.id) === String(editId));
    if (existing) {
      if (title) title.textContent = "Otomatik Yanıt Kuralını Düzenle";
      if (inTrigger) inTrigger.value = existing.trigger || "";
      if (inType) inType.value = existing.matchType || "exact";
      if (inResponse) inResponse.value = existing.response || "";
      selectedChannels = Array.isArray(existing.channels) ? existing.channels.map(String) : [];
    }
  } else {
    if (title) title.textContent = "Yeni Otomatik Yanıt Kuralı";
    if (inTrigger) inTrigger.value = "";
    if (inType) inType.value = "exact";
    if (inResponse) inResponse.value = "";
  }

  if (channelsList) {
    if (textChannels.length === 0) {
      channelsList.innerHTML = `<span style="font-size:11.5px; color:var(--text-muted);">Metin kanalı bulunamadı.</span>`;
    } else {
      channelsList.innerHTML = textChannels.map((c) => `
        <label class="cmd-role-checkbox-item" style="padding: 4px 6px;">
          <input type="checkbox" value="${c.id}" ${selectedChannels.includes(String(c.id)) ? "checked" : ""} />
          <span class="cmd-role-checkbox-label" style="font-size: 12px;">#${escapeHtml(c.name)}</span>
        </label>
      `).join("");
    }
  }

  modal.style.display = "flex";
}

function closeAutoModal() {
  const modal = document.getElementById("auto-responder-modal-backdrop");
  if (modal) modal.style.display = "none";
  currentEditingAutoId = null;
}

async function saveAutoResponderItem() {
  const inTrigger = document.getElementById("auto-input-trigger");
  const inType = document.getElementById("auto-input-matchtype");
  const inResponse = document.getElementById("auto-input-response");
  const channelsList = document.getElementById("auto-modal-channels-list");

  const trigger = inTrigger?.value.trim() || "";
  const matchType = inType?.value || "exact";
  const response = inResponse?.value.trim() || "";

  if (!trigger) {
    window.showToast("Lütfen tetikleyici metni girin.", "warn");
    return;
  }
  if (!response) {
    window.showToast("Lütfen botun vereceği yanıtı girin.", "warn");
    return;
  }

  const checkedChannels = channelsList ? Array.from(channelsList.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value) : [];

  if (currentEditingAutoId) {
    const existing = localAutoResponders.find((r) => String(r.id) === String(currentEditingAutoId));
    if (existing) {
      existing.trigger = trigger;
      existing.matchType = matchType;
      existing.response = response;
      existing.channels = checkedChannels;
    }
  } else {
    localAutoResponders.push({
      id: "auto-" + Date.now(),
      trigger,
      matchType,
      response,
      channels: checkedChannels,
      enabled: true
    });
  }

  closeAutoModal();
  renderAutoRespondersTable();
  updateAutoStats();
  const saveRes = await persistAutoResponders();
  if (saveRes.success) {
    window.showToast("Otomatik yanıt kuralı veritabanına kaydedildi.", "success");
  } else {
    window.showToast("Kural uygulandı fakat sunucuya kaydedilemedi: " + (saveRes.error || ""), "warn");
  }
}

function openMediaChannelsModal() {
  const modal = document.getElementById("media-channels-modal-backdrop");
  const list = document.getElementById("media-channels-modal-list");
  if (!modal || !list) return;

  const allChannels = currentDiscordMeta?.channels || [];
  const textChannels = allChannels.filter((c) => c.type === 0 || c.type === 5);

  if (textChannels.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Metin kanalı bulunamadı.</div>`;
  } else {
    list.innerHTML = textChannels.map((c) => {
      const isChecked = localMediaChannels.map(String).includes(String(c.id));
      return `
        <label class="cmd-role-checkbox-item">
          <input type="checkbox" value="${c.id}" ${isChecked ? "checked" : ""} />
          <span class="cmd-role-checkbox-label">#${escapeHtml(c.name)}</span>
          <span class="cmd-role-checkbox-id">${c.id}</span>
        </label>
      `;
    }).join("");
  }

  modal.style.display = "flex";
}

function closeMediaChannelsModal() {
  const modal = document.getElementById("media-channels-modal-backdrop");
  if (modal) modal.style.display = "none";
}

function saveMediaChannelsSelection() {
  const list = document.getElementById("media-channels-modal-list");
  if (!list) return;

  const checked = list.querySelectorAll('input[type="checkbox"]:checked');
  localMediaChannels = Array.from(checked).map((el) => el.value);

  closeMediaChannelsModal();
  renderMediaChannelsBadges();
  updateAutoStats();
  window.showToast("Medya kanalları güncellendi.", "info");
}

function clearMediaChannelsSelection() {
  localMediaChannels = [];
  closeMediaChannelsModal();
  renderMediaChannelsBadges();
  updateAutoStats();
  window.showToast("Medya kanalları temizlendi.", "info");
}

window.openAutoModal = openAutoModal;
window.closeAutoModal = closeAutoModal;
window.saveAutoResponderItem = saveAutoResponderItem;
window.deleteAutoResponder = deleteAutoResponder;
window.toggleAutoResponder = toggleAutoResponder;
window.openMediaChannelsModal = openMediaChannelsModal;
window.closeMediaChannelsModal = closeMediaChannelsModal;
window.saveMediaChannelsSelection = saveMediaChannelsSelection;
window.clearMediaChannelsSelection = clearMediaChannelsSelection;
window.removeMediaChannel = removeMediaChannel;

const autoNewBtn = document.getElementById("btn-auto-new-modal");
if (autoNewBtn) {
  autoNewBtn.addEventListener("click", () => openAutoModal());
}

const autoTypePills = document.querySelectorAll("#auto-type-pills .cmd-cat-pill");
autoTypePills.forEach((btn) => {
  btn.addEventListener("click", () => {
    autoTypePills.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeAutoType = btn.getAttribute("data-type") || "all";
    renderAutoRespondersTable();
  });
});

const autoSearchInput = document.getElementById("auto-search-input");
if (autoSearchInput) {
  autoSearchInput.addEventListener("input", (e) => {
    autoSearchQuery = e.target.value.trim();
    renderAutoRespondersTable();
  });
}

const btnAutoSaveAll = document.getElementById("btn-auto-save-all");
if (btnAutoSaveAll) {
  btnAutoSaveAll.addEventListener("click", async () => {
    btnAutoSaveAll.disabled = true;
    btnAutoSaveAll.innerHTML = `<span>Kaydediliyor...</span>`;
    try {
      const res = await fetch("/api/autoresponders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoResponders: localAutoResponders,
          mediaChannels: localMediaChannels
        })
      });
      const data = await res.json();
      if (data.success) {
        window.showToast("Otomatik yanıtlar ve medya kanalları başarıyla kaydedildi.", "success");
      } else {
        window.showToast(data.error || "Kaydedilemedi.", "error");
      }
    } catch (err) {
      window.showToast("Bağlantı hatası: " + err.message, "error");
    } finally {
      btnAutoSaveAll.disabled = false;
      btnAutoSaveAll.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>Değişiklikleri Kaydet</span>
      `;
    }
  });
}

let localVoiceBots = [];
let localVoiceChannels = [];
let voiceSearchQuery = "";
let currentEditingVoiceBotId = null;

function getVoiceChannelNameById(cId) {
  if (!cId) return "";
  const channels = currentDiscordMeta?.channels || [];
  const found = channels.find((c) => String(c.id) === String(cId));
  return found ? found.name : cId;
}

async function loadVoicePage() {
  const tbody = document.getElementById("voice-tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Ses botları ve kanallar yükleniyor...</td></tr>`;
  }

  if (!currentDiscordMeta) {
    try {
      const gId = (typeof GUILD_ID !== "undefined" && GUILD_ID) ? GUILD_ID : "1546253954248085647";
      const metaRes = await fetch(`/api/guild-meta/${gId}`);
      if (metaRes.ok) currentDiscordMeta = await metaRes.json();
    } catch (e) {}
  }

  try {
    const res = await fetch("/api/voice");
    const data = await res.json();
    if (data.success) {
      localVoiceBots = Array.isArray(data.voiceBots) ? data.voiceBots : [];
      localVoiceChannels = Array.isArray(data.welcomeVoiceChannels) ? data.welcomeVoiceChannels : [];
    }
  } catch (e) {}

  renderVoiceBotsTable();
  renderVoiceChannelsBadges();
  updateVoiceStats();
}

function updateVoiceStats() {
  const total = localVoiceBots.length;
  const active = localVoiceBots.filter((b) => b.status === "CONNECTED" || b.status === "ACTIVE").length;
  const channelsCount = localVoiceChannels.length;

  const elTotal = document.getElementById("voice-stat-total");
  const elActive = document.getElementById("voice-stat-active");
  const elChannels = document.getElementById("voice-stat-channels");
  const badgeActive = document.getElementById("voice-stat-active-badge");
  const badgeChannels = document.getElementById("voice-stat-channels-badge");
  const badgeCount = document.getElementById("voice-table-count-badge");

  if (elTotal) elTotal.textContent = `${total} Bot`;
  if (elActive) elActive.textContent = `${active} Bot`;
  if (elChannels) elChannels.textContent = `${channelsCount} Kanal`;
  if (badgeActive) badgeActive.textContent = `${active} AKTİF`;
  if (badgeChannels) badgeChannels.textContent = `${channelsCount} ODA`;
  if (badgeCount) badgeCount.textContent = `${total} BOT`;
}

function renderVoiceChannelsBadges() {
  const wrapper = document.getElementById("voice-channels-badges-wrapper");
  if (!wrapper) return;

  if (localVoiceChannels.length === 0) {
    wrapper.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">Henüz karşılama ses odası seçilmedi. "+ Ses Odası Ekle / Düzenle" butonuna tıklayarak ekleyin.</span>`;
    return;
  }

  let html = "";
  localVoiceChannels.forEach((cId) => {
    const cName = getVoiceChannelNameById(cId);
    html += `
      <span class="cmd-role-badge-tag" style="background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.3); color: #a5b4fc;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        ${escapeHtml(cName)}
        <span class="cmd-role-badge-remove" onclick="removeVoiceChannel('${cId}')" title="Kaldır">×</span>
      </span>
    `;
  });
  wrapper.innerHTML = html;
}

function removeVoiceChannel(cId) {
  localVoiceChannels = localVoiceChannels.filter((id) => String(id) !== String(cId));
  renderVoiceChannelsBadges();
  updateVoiceStats();
}

function renderVoiceBotsTable() {
  const tbody = document.getElementById("voice-tbody");
  if (!tbody) return;

  const filtered = localVoiceBots.filter((item) => {
    if (voiceSearchQuery) {
      const q = voiceSearchQuery.toLowerCase();
      const inName = (item.name || "").toLowerCase().includes(q);
      const inChan = getVoiceChannelNameById(item.channelId).toLowerCase().includes(q);
      const inMsg = (item.welcomeMessage || "").toLowerCase().includes(q);
      if (!inName && !inChan && !inMsg) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 28px;">Henüz kayıtlı ses karşılama botu bulunmuyor. "+ Yeni Ses Botu Ekle" ile oluşturabilirsiniz.</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((item, index) => {
    const id = item.id || `voice-${index}`;
    const isAutoReconnect = item.autoReconnect !== false;
    const status = (item.status || "ACTIVE").toUpperCase();

    let statusBadge = `<span class="metric-pill pill-indigo">HAZIR</span>`;
    if (status === "CONNECTED") {
      statusBadge = `<span class="metric-pill pill-success">ODADA</span>`;
    } else if (status === "DISABLED") {
      statusBadge = `<span class="metric-pill pill-neutral">DEVRE DIŞI</span>`;
    } else if (status === "ERROR") {
      statusBadge = `<span class="metric-pill pill-danger">BAĞLANTI HATASI</span>`;
    }

    const channelName = item.channelId ? `#${getVoiceChannelNameById(item.channelId)}` : "Havuzdan Otomatik Seç";
    const masked = item.maskedToken || "••••••••••••";

    html += `
      <tr>
        <td style="font-weight: 600; color: #f1f5f9;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(99, 102, 241, 0.2); display: flex; align-items: center; justify-content: center; color: #a5b4fc;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            </div>
            <div>
              <div style="color: #f8fafc; font-size: 13px;">${escapeHtml(item.name)}</div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">ID: ${id.substring(0, 10)}...</div>
            </div>
          </div>
        </td>
        <td>
          <code style="background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 4px; font-size: 11px; color: #94a3b8;">${escapeHtml(masked)}</code>
        </td>
        <td>
          <span class="cmd-role-badge-tag" style="font-size: 11px; background: rgba(99, 102, 241, 0.1); color: #c7d2fe;">
            ${escapeHtml(channelName)}
          </span>
        </td>
        <td style="text-align: center;">
          <span class="metric-pill ${isAutoReconnect ? "pill-success" : "pill-neutral"}" style="cursor: pointer;" onclick="toggleVoiceBotReconnect('${id}')">
            ${isAutoReconnect ? "AÇIK" : "KAPALI"}
          </span>
        </td>
        <td style="max-width: 260px; word-break: break-word; font-size: 12px; color: #cbd5e1;">
          <div style="margin-bottom: 4px;">${escapeHtml(item.welcomeMessage || "Sunucumuza hoş geldiniz {user}.")}</div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <span class="cmd-role-badge-tag" style="font-size: 10px; background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.25); color: #6ee7b7;">
              Bekleme: ${item.welcomeDelay !== undefined ? item.welcomeDelay : 2.5} sn
            </span>
            <span class="cmd-role-badge-tag" style="font-size: 10px; background: rgba(99, 102, 241, 0.12); border-color: rgba(99, 102, 241, 0.25); color: #c7d2fe;">
              Ses: ${item.voiceSpeaker === "tr-TR-EmelNeural" ? "Emel (Doğal)" : (item.voiceSpeaker === "google-tr" ? "Google TTS" : "Ahmet (Doğal)")}
            </span>
          </div>
        </td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-action-secondary" style="padding: 4px 8px; font-size: 11.5px;" onclick="openVoiceBotModal('${id}')">Düzenle</button>
          <button type="button" class="btn-action-secondary" style="padding: 4px 8px; font-size: 11.5px; color: #f87171;" onclick="deleteVoiceBot('${id}')">Sil</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function openVoiceBotModal(editId = null) {
  currentEditingVoiceBotId = editId;
  const modal = document.getElementById("voice-bot-modal-backdrop");
  const title = document.getElementById("voice-modal-title");
  const inName = document.getElementById("voice-input-name");
  const inToken = document.getElementById("voice-input-token");
  const hintToken = document.getElementById("voice-token-hint");
  const inChannel = document.getElementById("voice-input-channel");
  const inReconnect = document.getElementById("voice-input-reconnect");
  const inDelay = document.getElementById("voice-input-delay");
  const inSpeaker = document.getElementById("voice-input-speaker");
  const inMsg = document.getElementById("voice-input-message");
  if (!modal) return;

  const allChannels = currentDiscordMeta?.channels || [];
  const voiceChannels = allChannels.filter((c) => c.type === 2);

  if (inChannel) {
    let optionsHtml = `<option value="">Havuzdaki Sıradaki Odaya Otomatik Bağlan</option>`;
    voiceChannels.forEach((c) => {
      optionsHtml += `<option value="${c.id}">🔊 #${escapeHtml(c.name)}</option>`;
    });
    inChannel.innerHTML = optionsHtml;
  }

  if (editId) {
    const existing = localVoiceBots.find((b) => String(b.id) === String(editId));
    if (existing) {
      if (title) title.textContent = "Ses Karşılama Botunu Düzenle";
      if (inName) inName.value = existing.name || "";
      if (inToken) inToken.value = "";
      if (hintToken) hintToken.textContent = "Değiştirmek istemiyorsanız boş bırakın";
      if (inChannel) inChannel.value = existing.channelId || "";
      if (inReconnect) inReconnect.checked = existing.autoReconnect !== false;
      if (inDelay) inDelay.value = existing.welcomeDelay !== undefined ? existing.welcomeDelay : 2.5;
      if (inSpeaker) inSpeaker.value = existing.voiceSpeaker || "tr-TR-AhmetNeural";
      if (inMsg) inMsg.value = existing.welcomeMessage || "";
    }
  } else {
    if (title) title.textContent = "Yeni Ses Karşılama Botu Ekle";
    if (inName) inName.value = `Ses Karşılama ${localVoiceBots.length + 1}`;
    if (inToken) inToken.value = "";
    if (hintToken) hintToken.textContent = "Yeni bot için zorunludur";
    if (inChannel) inChannel.value = "";
    if (inReconnect) inReconnect.checked = true;
    if (inDelay) inDelay.value = 2.5;
    if (inSpeaker) inSpeaker.value = "tr-TR-AhmetNeural";
    if (inMsg) inMsg.value = "Sunucumuza hoş geldiniz {user}. Kayıt için yetkililerimizi bekleyiniz.";
  }

  modal.style.display = "flex";
}

function closeVoiceBotModal() {
  const modal = document.getElementById("voice-bot-modal-backdrop");
  if (modal) modal.style.display = "none";
  currentEditingVoiceBotId = null;
}

async function saveVoiceBotModal() {
  const inName = document.getElementById("voice-input-name");
  const inToken = document.getElementById("voice-input-token");
  const inChannel = document.getElementById("voice-input-channel");
  const inReconnect = document.getElementById("voice-input-reconnect");
  const inDelay = document.getElementById("voice-input-delay");
  const inSpeaker = document.getElementById("voice-input-speaker");
  const inMsg = document.getElementById("voice-input-message");

  const name = inName?.value.trim() || "";
  const token = inToken?.value.trim() || "";
  const channelId = inChannel?.value || "";
  const autoReconnect = inReconnect ? inReconnect.checked : true;
  const welcomeDelay = inDelay ? Number(inDelay.value) : 2.5;
  const voiceSpeaker = inSpeaker ? inSpeaker.value : "tr-TR-AhmetNeural";
  const welcomeMessage = inMsg?.value.trim() || "";

  if (!name) {
    window.showToast("Lütfen bot adı girin.", "warn");
    return;
  }

  if (!currentEditingVoiceBotId && !token) {
    window.showToast("Lütfen bot tokenini girin.", "warn");
    return;
  }

  try {
    const res = await fetch("/api/voice/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: currentEditingVoiceBotId,
        name,
        token,
        channelId,
        autoReconnect,
        welcomeDelay,
        voiceSpeaker,
        welcomeMessage,
        status: "ACTIVE"
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Ses botu başarıyla kaydedildi.", "success");
      closeVoiceBotModal();
      await loadVoicePage();
    } else {
      window.showToast(data.error || "Ses botu kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function toggleVoiceBotReconnect(id) {
  const item = localVoiceBots.find((b) => String(b.id) === String(id));
  if (!item) return;

  item.autoReconnect = !item.autoReconnect;
  try {
    await fetch("/api/voice/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        autoReconnect: item.autoReconnect
      })
    });
    renderVoiceBotsTable();
    window.showToast(`Otomatik yeniden bağlanma ${item.autoReconnect ? "açıldı" : "kapatıldı"}.`, "info");
  } catch (e) {
    renderVoiceBotsTable();
  }
}

async function deleteVoiceBot(id) {
  if (!confirm("Bu ses karşılama botunu silmek istediğinize emin misiniz?")) return;

  try {
    const res = await fetch(`/api/voice/bot/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      window.showToast("Ses botu başarıyla silindi.", "info");
      await loadVoicePage();
    } else {
      window.showToast(data.error || "Silinemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openVoiceChannelsModal() {
  const modal = document.getElementById("voice-channels-modal-backdrop");
  const list = document.getElementById("voice-channels-modal-list");
  if (!modal || !list) return;

  const allChannels = currentDiscordMeta?.channels || [];
  const voiceChannels = allChannels.filter((c) => c.type === 2);

  if (voiceChannels.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Sunucuda ses kanalı bulunamadı.</div>`;
  } else {
    list.innerHTML = voiceChannels.map((c) => {
      const isChecked = localVoiceChannels.map(String).includes(String(c.id));
      return `
        <label class="cmd-role-checkbox-item">
          <input type="checkbox" value="${c.id}" ${isChecked ? "checked" : ""} />
          <span class="cmd-role-checkbox-label" style="display: flex; align-items: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            ${escapeHtml(c.name)}
          </span>
          <span class="cmd-role-checkbox-id">${c.id}</span>
        </label>
      `;
    }).join("");
  }

  modal.style.display = "flex";
}

function closeVoiceChannelsModal() {
  const modal = document.getElementById("voice-channels-modal-backdrop");
  if (modal) modal.style.display = "none";
}

function saveVoiceChannelsSelection() {
  const list = document.getElementById("voice-channels-modal-list");
  if (!list) return;

  const checked = list.querySelectorAll('input[type="checkbox"]:checked');
  localVoiceChannels = Array.from(checked).map((el) => el.value);

  closeVoiceChannelsModal();
  renderVoiceChannelsBadges();
  updateVoiceStats();
  window.showToast("Karşılama ses odaları seçildi.", "info");
}

function clearVoiceChannelsSelection() {
  localVoiceChannels = [];
  closeVoiceChannelsModal();
  renderVoiceChannelsBadges();
  updateVoiceStats();
  window.showToast("Ses odaları temizlendi.", "info");
}

window.loadVoicePage = loadVoicePage;
window.openVoiceBotModal = openVoiceBotModal;
window.closeVoiceBotModal = closeVoiceBotModal;
window.saveVoiceBotModal = saveVoiceBotModal;
window.deleteVoiceBot = deleteVoiceBot;
window.toggleVoiceBotReconnect = toggleVoiceBotReconnect;
window.openVoiceChannelsModal = openVoiceChannelsModal;
window.closeVoiceChannelsModal = closeVoiceChannelsModal;
window.saveVoiceChannelsSelection = saveVoiceChannelsSelection;
window.clearVoiceChannelsSelection = clearVoiceChannelsSelection;
window.removeVoiceChannel = removeVoiceChannel;

const btnVoiceNewModal = document.getElementById("btn-voice-new-modal");
if (btnVoiceNewModal) {
  btnVoiceNewModal.addEventListener("click", () => openVoiceBotModal());
}

const voiceSearchInput = document.getElementById("voice-search-input");
if (voiceSearchInput) {
  voiceSearchInput.addEventListener("input", (e) => {
    voiceSearchQuery = e.target.value.trim();
    renderVoiceBotsTable();
  });
}

const btnVoiceSaveAll = document.getElementById("btn-voice-save-all");
if (btnVoiceSaveAll) {
  btnVoiceSaveAll.addEventListener("click", async () => {
    btnVoiceSaveAll.disabled = true;
    btnVoiceSaveAll.innerHTML = `<span>Kaydediliyor...</span>`;
    try {
      const res = await fetch("/api/voice/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ welcomeVoiceChannels: localVoiceChannels })
      });
      const data = await res.json();
      if (data.success) {
        window.showToast("Karşılama ses odaları ve ayarlar başarıyla kaydedildi.", "success");
      } else {
        window.showToast(data.error || "Kaydedilemedi.", "error");
      }
    } catch (err) {
      window.showToast("Bağlantı hatası: " + err.message, "error");
    } finally {
      btnVoiceSaveAll.disabled = false;
      btnVoiceSaveAll.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>Değişiklikleri Kaydet</span>
      `;
    }
  });
}

const btnVoiceSyncTrigger = document.getElementById("btn-voice-sync-trigger");
if (btnVoiceSyncTrigger) {
  btnVoiceSyncTrigger.addEventListener("click", async () => {
    btnVoiceSyncTrigger.disabled = true;
    btnVoiceSyncTrigger.innerHTML = `<span>Bağlanıyor...</span>`;
    try {
      const res = await fetch("/api/voice/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        window.showToast("Ses botları kanallara bağlandı ve senkronize edildi.", "success");
        await loadVoicePage();
      } else {
        window.showToast(data.error || "Senkronizasyon hatası.", "error");
      }
    } catch (err) {
      window.showToast("Bağlantı hatası: " + err.message, "error");
    } finally {
      btnVoiceSyncTrigger.disabled = false;
      btnVoiceSyncTrigger.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <span>Botları Kanallara Bağla</span>
      `;
    }
  });
}

function getSelectedGuildId() {
  if (currentDiscordMeta && currentDiscordMeta.id) return currentDiscordMeta.id;
  if (typeof GUILD_ID !== "undefined" && GUILD_ID) return GUILD_ID;
  return DEFAULT_GUILD_ID;
}

let localEconomyChannels = [];
let localShopItems = [];
let localTopRichest = [];
let localEconomyConfig = {};
let localEconomyMarket = {};
let shopSearchQuery = "";
let richSearchQuery = "";

async function loadEconomyPage() {
  const gId = getSelectedGuildId();
  try {
    await ensureDiscordMeta(gId);
    const url = gId ? `/api/economy/${gId}` : "/api/economy";
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Ekonomi verileri alınamadı.", "error");
      return;
    }

    localEconomyConfig = data.economyConfig || {};
    localEconomyMarket = data.economyMarket || {};
    localShopItems = data.shopItems || [];
    localTopRichest = data.topRichest || [];
    localEconomyChannels = Array.isArray(localEconomyConfig.channels) ? [...localEconomyConfig.channels] : [];

    renderEconomyStats(data.stats, localEconomyConfig);

    const setInput = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : "";
    };

    setInput("eco-currency-name", localEconomyConfig.currencyName || "Coin");
    setInput("eco-currency-symbol", localEconomyConfig.currencySymbol || "🪙");
    setInput("eco-starting-balance", localEconomyConfig.startingBalance ?? 100);
    setInput("eco-daily-min", localEconomyConfig.dailyMin ?? 250);
    setInput("eco-daily-max", localEconomyConfig.dailyMax ?? 750);
    setInput("eco-work-cooldown", localEconomyConfig.workCooldownMinutes ?? 15);
    setInput("eco-work-min", localEconomyConfig.workMin ?? 100);
    setInput("eco-work-max", localEconomyConfig.workMax ?? 350);
    setInput("eco-rob-rate", localEconomyConfig.robSuccessRate ?? 45);
    setInput("eco-rob-cooldown", localEconomyConfig.robCooldownMinutes ?? 30);
    setInput("eco-rob-min", localEconomyConfig.robMinWallet ?? 200);
    setInput("eco-tax-percent", localEconomyConfig.transferTaxPercent ?? 5);

    renderEconomyChannelsBadges();

    const autoFluc = document.getElementById("eco-market-autofluc");
    if (autoFluc) autoFluc.checked = localEconomyMarket.autoFluctuation !== false;

    setInput("eco-market-gold-price", localEconomyMarket.goldPrice ?? 2500);
    setInput("eco-market-gold-min", localEconomyMarket.minGoldPrice ?? 1000);
    setInput("eco-market-gold-max", localEconomyMarket.maxGoldPrice ?? 10000);

    setInput("eco-market-btc-price", localEconomyMarket.btcPrice ?? 65000);
    setInput("eco-market-btc-min", localEconomyMarket.minBtcPrice ?? 20000);
    setInput("eco-market-btc-max", localEconomyMarket.maxBtcPrice ?? 250000);

    setInput("eco-market-silver-price", localEconomyMarket.silverPrice ?? 85);
    setInput("eco-market-discount", localEconomyMarket.discountPercent ?? 0);

    const lastUp = document.getElementById("eco-market-last-update");
    if (lastUp) {
      lastUp.value = localEconomyMarket.lastUpdate ? new Date(localEconomyMarket.lastUpdate).toLocaleTimeString("tr-TR") : "Az önce";
    }

    populateShopRoleSelect(data.roles || currentDiscordMeta?.roles || []);
    renderShopItemsTable();
    renderTopRichestTable();
  } catch (err) {
    window.showToast("Ekonomi verileri yüklenirken bağlantı hatası: " + err.message, "error");
  }
}

function renderEconomyStats(stats, cfg) {
  const sym = cfg?.currencySymbol || "🪙";
  const circVal = document.getElementById("eco-stat-circulating");
  const circSub = document.getElementById("eco-stat-circulating-sub");
  const circulating = stats?.totalCirculating ?? stats?.circulatingMoney ?? 0;
  if (circVal) {
    circVal.textContent = `${Number(circulating).toLocaleString("tr-TR")} ${sym}`;
  }
  if (circSub) {
    circSub.textContent = `Cüzdan: ${Number(stats?.totalWallet || 0).toLocaleString("tr-TR")} | Banka: ${Number(stats?.totalBank || 0).toLocaleString("tr-TR")}`;
  }

  const marketVal = document.getElementById("eco-stat-market-volume");
  const marketVol = stats?.marketPortfolioValue ?? stats?.totalCommodityValue ?? 0;
  if (marketVal) {
    marketVal.textContent = `${Number(marketVol).toLocaleString("tr-TR")} ${sym}`;
  }

  const shopCount = document.getElementById("eco-stat-shop-count");
  const shopBadge = document.getElementById("eco-stat-shop-badge");
  const sCount = stats?.shopItemsCount ?? stats?.activeShopItemsCount ?? 0;
  if (shopCount) shopCount.textContent = String(sCount);
  if (shopBadge) shopBadge.textContent = `${sCount} ÜRÜN`;

  const usersCount = document.getElementById("eco-stat-users-count");
  const uCount = stats?.totalUsersCount ?? stats?.activeUsersCount ?? 0;
  if (usersCount) usersCount.textContent = String(uCount);
}

function renderEconomyChannelsBadges() {
  const pool = document.getElementById("eco-channels-pool");
  if (!pool) return;

  if (!localEconomyChannels || localEconomyChannels.length === 0) {
    pool.innerHTML = `<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Tüm kanallarda komutlar serbest (Kanal kısıtlaması yok).</span>`;
    return;
  }

  const allChannels = currentDiscordMeta?.channels || [];
  pool.innerHTML = localEconomyChannels.map((chId) => {
    const ch = allChannels.find((c) => String(c.id) === String(chId));
    const name = ch ? ch.name : chId;
    return `
      <span class="eco-channel-tag">
        <span>#${escapeHtml(name)}</span>
        <span class="eco-channel-remove" onclick="removeEconomyChannel('${chId}')" title="Kanalı Kaldır">&times;</span>
      </span>
    `;
  }).join("");
}

function removeEconomyChannel(id) {
  localEconomyChannels = localEconomyChannels.filter((c) => String(c) !== String(id));
  renderEconomyChannelsBadges();
  markDirty();
}

function openEconomyChannelsModal() {
  const modal = document.getElementById("eco-channels-modal-backdrop");
  const list = document.getElementById("eco-channels-modal-list");
  if (!modal || !list) return;

  const allChannels = currentDiscordMeta?.channels || [];
  const textChannels = allChannels.filter((c) => c.type === 0 || c.type === undefined);

  if (textChannels.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Sunucuda metin kanalı bulunamadı.</div>`;
  } else {
    list.innerHTML = textChannels.map((c) => {
      const isChecked = localEconomyChannels.map(String).includes(String(c.id));
      return `
        <label class="cmd-role-checkbox-item">
          <input type="checkbox" value="${c.id}" ${isChecked ? "checked" : ""} />
          <span class="cmd-role-checkbox-label" style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--text-muted); font-weight: 700;">#</span>
            ${escapeHtml(c.name)}
          </span>
          <span class="cmd-role-checkbox-id">${c.id}</span>
        </label>
      `;
    }).join("");
  }

  modal.style.display = "flex";
}

function closeEconomyChannelsModal() {
  const modal = document.getElementById("eco-channels-modal-backdrop");
  if (modal) modal.style.display = "none";
}

function saveEconomyChannelsSelection() {
  const list = document.getElementById("eco-channels-modal-list");
  if (!list) return;

  const checked = list.querySelectorAll('input[type="checkbox"]:checked');
  localEconomyChannels = Array.from(checked).map((el) => el.value);

  closeEconomyChannelsModal();
  renderEconomyChannelsBadges();
  markDirty();
  window.showToast("Ekonomi komut kanalları güncellendi.", "info");
}

function clearEconomyChannelsSelection() {
  localEconomyChannels = [];
  closeEconomyChannelsModal();
  renderEconomyChannelsBadges();
  markDirty();
  window.showToast("Kanal kısıtlamaları kaldırıldı.", "info");
}

async function saveEconomyConfigOnly() {
  const gId = getSelectedGuildId();
  const getNum = (id, def) => {
    const val = Number(document.getElementById(id)?.value);
    return isNaN(val) ? def : val;
  };
  const getStr = (id, def) => {
    return document.getElementById(id)?.value?.trim() || def;
  };

  const payload = {
    economyConfig: {
      currencyName: getStr("eco-currency-name", "Coin"),
      currencySymbol: getStr("eco-currency-symbol", "🪙"),
      startingBalance: getNum("eco-starting-balance", 100),
      dailyMin: getNum("eco-daily-min", 250),
      dailyMax: getNum("eco-daily-max", 750),
      workCooldownMinutes: getNum("eco-work-cooldown", 15),
      workMin: getNum("eco-work-min", 100),
      workMax: getNum("eco-work-max", 350),
      robSuccessRate: getNum("eco-rob-rate", 45),
      robCooldownMinutes: getNum("eco-rob-cooldown", 30),
      robMinWallet: getNum("eco-rob-min", 200),
      transferTaxPercent: getNum("eco-tax-percent", 5),
      channels: localEconomyChannels
    }
  };

  try {
    const endpoint = gId ? `/api/economy/config/${gId}` : "/api/economy/config";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Ekonomi parametreleri başarıyla kaydedildi.", "success");
      clearDirty();
      loadEconomyPage();
    } else {
      window.showToast(data.error || "Kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveMarketPrices() {
  const gId = getSelectedGuildId();
  const getNum = (id, def) => {
    const val = Number(document.getElementById(id)?.value);
    return isNaN(val) ? def : val;
  };

  const payload = {
    goldPrice: getNum("eco-market-gold-price", 2500),
    minGoldPrice: getNum("eco-market-gold-min", 1000),
    maxGoldPrice: getNum("eco-market-gold-max", 10000),
    btcPrice: getNum("eco-market-btc-price", 65000),
    minBtcPrice: getNum("eco-market-btc-min", 20000),
    maxBtcPrice: getNum("eco-market-btc-max", 250000),
    silverPrice: getNum("eco-market-silver-price", 85),
    discountPercent: getNum("eco-market-discount", 0),
    autoFluctuation: Boolean(document.getElementById("eco-market-autofluc")?.checked)
  };

  try {
    const endpoint = gId ? `/api/economy/market-price/${gId}` : "/api/economy/market-price";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Borsa ve emtia fiyatları güncellendi.", "success");
      clearDirty();
      loadEconomyPage();
    } else {
      window.showToast(data.error || "Piyasa fiyatları güncellenemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function triggerMarketRally(multiplier) {
  const goldEl = document.getElementById("eco-market-gold-price");
  const btcEl = document.getElementById("eco-market-btc-price");
  const silverEl = document.getElementById("eco-market-silver-price");

  if (goldEl) goldEl.value = Math.round(Number(goldEl.value || 2500) * multiplier);
  if (btcEl) btcEl.value = Math.round(Number(btcEl.value || 65000) * multiplier);
  if (silverEl) silverEl.value = Math.round(Number(silverEl.value || 85) * multiplier);

  await saveMarketPrices();
  window.showToast(`Piyasa hareketi uygulandı (Çarpan: x${multiplier})`, "info");
}

function populateShopRoleSelect(roles) {
  const sel = document.getElementById("shop-modal-role");
  if (!sel) return;

  const currentVal = sel.value;
  sel.innerHTML = `<option value="">(Rol Atanmasın)</option>`;
  if (Array.isArray(roles)) {
    roles.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = `${r.name} (${r.id})`;
      sel.appendChild(opt);
    });
  }
  if (currentVal) sel.value = currentVal;
}

function filterShopTable() {
  const input = document.getElementById("eco-shop-search");
  shopSearchQuery = input ? input.value.trim().toLowerCase() : "";
  renderShopItemsTable();
}

function renderShopItemsTable() {
  const tbody = document.getElementById("eco-shop-table-body");
  if (!tbody) return;

  let items = [...localShopItems];
  if (shopSearchQuery) {
    items = items.filter((i) => {
      const name = (i.name || "").toLowerCase();
      const key = (i.itemKey || "").toLowerCase();
      const desc = (i.description || "").toLowerCase();
      const roleName = (i.roleName || "").toLowerCase();
      return name.includes(shopSearchQuery) || key.includes(shopSearchQuery) || desc.includes(shopSearchQuery) || roleName.includes(shopSearchQuery);
    });
  }

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
          ${shopSearchQuery ? "Aramaya uygun mağaza ürünü bulunamadı." : "Henüz mağazaya ürün eklenmemiş. Yeni Ürün Ekle butonunu kullanabilirsiniz."}
        </td>
      </tr>
    `;
    return;
  }

  const allRoles = currentDiscordMeta?.roles || [];
  const sym = localEconomyConfig.currencySymbol || "🪙";

  tbody.innerHTML = items.map((item) => {
    const roleObj = allRoles.find((r) => String(r.id) === String(item.roleId));
    const roleName = roleObj ? roleObj.name : (item.roleId ? item.roleId : "Rol Yok");
    const roleBadge = item.roleId
      ? `<span class="badge-role" style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);">@${escapeHtml(roleName)}</span>`
      : `<span style="color: var(--text-muted); font-size: 11px;">Atanmadı</span>`;

    const typeBadgeClass = `badge-${(item.type || "ROLE").toLowerCase()}`;
    const isActive = item.active !== false;

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 12px 14px;">
          <div style="font-weight: 600; color: #f8fafc; font-size: 13.5px;">${escapeHtml(item.name)}</div>
          <div style="font-size: 11px; color: var(--text-muted); font-family: monospace; margin-top: 2px;">${escapeHtml(item.itemKey || item.id)}</div>
        </td>
        <td style="padding: 12px 14px;">
          <span class="stat-badge ${typeBadgeClass}">${escapeHtml(item.type || "ROLE")}</span>
        </td>
        <td style="padding: 12px 14px; font-weight: 700; color: #facc15; font-size: 13.5px;">
          ${Number(item.price || 0).toLocaleString("tr-TR")} ${sym}
        </td>
        <td style="padding: 12px 14px;">
          ${roleBadge}
        </td>
        <td style="padding: 12px 14px; text-align: center;">
          <input type="checkbox" ${isActive ? "checked" : ""} onchange="toggleShopItemActive('${item._id || item.id}')" style="width: 17px; height: 17px; accent-color: #10b981; cursor: pointer;" title="Satış Durumu" />
        </td>
        <td style="padding: 12px 14px; text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button type="button" class="btn-panel-action" onclick="openShopItemModalById('${item._id || item.id}')" title="Düzenle">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-panel-action" style="color: #f87171;" onclick="deleteShopItem('${item._id || item.id}')" title="Sil">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function handleShopTypeChange() {
  const typeVal = document.getElementById("shop-modal-type")?.value;
  const roleGroup = document.getElementById("shop-modal-role-group");
  if (roleGroup) {
    roleGroup.style.display = typeVal === "ROLE" ? "block" : "none";
  }
}

function openShopItemModal(item = null) {
  const modal = document.getElementById("shop-item-modal-backdrop");
  if (!modal) return;

  const idInput = document.getElementById("shop-modal-id");
  const nameInput = document.getElementById("shop-modal-name");
  const keyInput = document.getElementById("shop-modal-key");
  const typeInput = document.getElementById("shop-modal-type");
  const priceInput = document.getElementById("shop-modal-price");
  const roleInput = document.getElementById("shop-modal-role");
  const descInput = document.getElementById("shop-modal-desc");
  const activeInput = document.getElementById("shop-modal-active");
  const titleEl = document.getElementById("shop-modal-title");

  if (item) {
    if (titleEl) titleEl.textContent = "Mağaza Ürününü Düzenle";
    if (idInput) idInput.value = item._id || item.id || "";
    if (nameInput) nameInput.value = item.name || "";
    if (keyInput) keyInput.value = item.itemKey || "";
    if (typeInput) typeInput.value = item.type || "ROLE";
    if (priceInput) priceInput.value = item.price ?? 1000;
    if (roleInput) roleInput.value = item.roleId || "";
    if (descInput) descInput.value = item.description || "";
    if (activeInput) activeInput.checked = item.active !== false;
  } else {
    if (titleEl) titleEl.textContent = "Yeni Mağaza Ürünü Ekle";
    if (idInput) idInput.value = "";
    if (nameInput) nameInput.value = "";
    if (keyInput) keyInput.value = "";
    if (typeInput) typeInput.value = "ROLE";
    if (priceInput) priceInput.value = 1000;
    if (roleInput) roleInput.value = "";
    if (descInput) descInput.value = "";
    if (activeInput) activeInput.checked = true;
  }

  handleShopTypeChange();
  modal.style.display = "flex";
}

function openShopItemModalById(id) {
  const item = localShopItems.find((i) => String(i._id || i.id) === String(id));
  if (item) openShopItemModal(item);
}

function closeShopItemModal() {
  const modal = document.getElementById("shop-item-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitShopItemModal() {
  const gId = getSelectedGuildId();
  const id = document.getElementById("shop-modal-id")?.value;
  const name = document.getElementById("shop-modal-name")?.value.trim();
  const itemKey = document.getElementById("shop-modal-key")?.value.trim();
  const type = document.getElementById("shop-modal-type")?.value || "ROLE";
  const price = Number(document.getElementById("shop-modal-price")?.value);
  const roleId = document.getElementById("shop-modal-role")?.value || null;
  const description = document.getElementById("shop-modal-desc")?.value.trim() || "";
  const active = Boolean(document.getElementById("shop-modal-active")?.checked);

  if (!name) {
    window.showToast("Lütfen geçerli bir ürün adı girin.", "warning");
    return;
  }
  if (isNaN(price) || price <= 0) {
    window.showToast("Lütfen geçerli bir fiyat girin.", "warning");
    return;
  }

  const payload = {
    _id: id || undefined,
    id: id || undefined,
    name,
    itemKey: itemKey || name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    type,
    price,
    roleId,
    description,
    active
  };

  try {
    const endpoint = gId ? `/api/economy/shop-item/${gId}` : "/api/economy/shop-item";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Mağaza ürünü kaydedildi.", "success");
      closeShopItemModal();
      loadEconomyPage();
    } else {
      window.showToast(data.error || "Kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function toggleShopItemActive(id) {
  const gId = getSelectedGuildId();
  const item = localShopItems.find((i) => String(i._id || i.id) === String(id));
  if (!item) return;

  const nextActive = !item.active;
  try {
    const endpoint = gId ? `/api/economy/shop-item/${gId}` : "/api/economy/shop-item";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _id: item._id || item.id,
        id: item._id || item.id,
        name: item.name,
        type: item.type,
        price: item.price,
        active: nextActive
      })
    });
    const data = await res.json();
    if (data.success) {
      item.active = nextActive;
      window.showToast(`Ürün satışı ${nextActive ? "açıldı" : "kapatıldı"}.`, "info");
      renderShopItemsTable();
    } else {
      window.showToast(data.error || "Güncellenemedi.", "error");
      renderShopItemsTable();
    }
  } catch (err) {
    window.showToast("Hata: " + err.message, "error");
    renderShopItemsTable();
  }
}

async function deleteShopItem(id) {
  if (!confirm("Bu mağaza ürününü silmek istediğinize emin misiniz?")) return;
  const gId = getSelectedGuildId();

  try {
    const endpoint = gId ? `/api/economy/shop-item/${gId}/${id}` : `/api/economy/shop-item/${id}`;
    const res = await fetch(endpoint, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      window.showToast("Ürün mağazadan silindi.", "info");
      loadEconomyPage();
    } else {
      window.showToast(data.error || "Silinemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function filterRichTable() {
  const input = document.getElementById("eco-rich-search");
  richSearchQuery = input ? input.value.trim().toLowerCase() : "";
  renderTopRichestTable();
}

function renderTopRichestTable() {
  const tbody = document.getElementById("eco-rich-table-body");
  if (!tbody) return;

  let list = [...localTopRichest];
  if (richSearchQuery) {
    list = list.filter((u) => {
      const id = String(u.userId || "");
      const name = (u.username || "").toLowerCase();
      const tag = (u.tag || "").toLowerCase();
      return id.includes(richSearchQuery) || name.includes(richSearchQuery) || tag.includes(richSearchQuery);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
          ${richSearchQuery ? "Aramaya uygun üye bulunamadı." : "Henüz cüzdanı olan üye bulunmuyor."}
        </td>
      </tr>
    `;
    return;
  }

  const sym = localEconomyConfig.currencySymbol || "🪙";

  tbody.innerHTML = list.map((user, idx) => {
    let rankBadge = `<span style="font-weight: 700; color: var(--text-muted);">#${idx + 1}</span>`;
    if (idx === 0) rankBadge = `<span style="font-size: 16px;">🥇 #1</span>`;
    else if (idx === 1) rankBadge = `<span style="font-size: 16px;">🥈 #2</span>`;
    else if (idx === 2) rankBadge = `<span style="font-size: 16px;">🥉 #3</span>`;

    const avatarUrl = user.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png";
    const displayName = user.username || user.userId;

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 12px 14px;">${rankBadge}</td>
        <td style="padding: 12px 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${avatarUrl}" alt="Avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-subtle);" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'" />
            <div>
              <div style="font-weight: 600; color: #f8fafc; font-size: 13px;">${escapeHtml(displayName)}</div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${escapeHtml(user.userId)}</div>
            </div>
          </div>
        </td>
        <td style="padding: 12px 14px; font-weight: 600; color: #10b981; font-size: 13px;">
          ${Number(user.wallet || 0).toLocaleString("tr-TR")} ${sym}
        </td>
        <td style="padding: 12px 14px; font-weight: 600; color: #818cf8; font-size: 13px;">
          ${Number(user.bank || 0).toLocaleString("tr-TR")} ${sym}
        </td>
        <td style="padding: 12px 14px; font-weight: 600; color: #fb923c; font-size: 13px;">
          ${Number(user.marketPortfolio ?? user.portfolioVal ?? 0).toLocaleString("tr-TR")} ${sym}
          <div style="font-size: 10.5px; color: var(--text-muted); font-weight: normal;">Altın: ${user.goldCount || 0} | BTC: ${user.btcCount || 0}</div>
        </td>
        <td style="padding: 12px 14px; text-align: right;">
          <div style="font-weight: 700; color: #facc15; font-size: 14px;">
            ${Number(user.totalWealth || 0).toLocaleString("tr-TR")} ${sym}
          </div>
          <button type="button" class="btn-panel-action" style="padding: 2px 8px; font-size: 11px; margin-top: 4px;" onclick="openEconomyBalanceModal('${user.userId}')">
            Bakiye Düzenle
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function openEconomyBalanceModal(userId = "") {
  const modal = document.getElementById("eco-balance-modal-backdrop");
  if (!modal) return;

  const userInput = document.getElementById("eco-bal-userid");
  const actionSel = document.getElementById("eco-bal-action");
  const targetSel = document.getElementById("eco-bal-target");
  const amountInput = document.getElementById("eco-bal-amount");

  if (userInput) userInput.value = userId || "";
  if (actionSel) actionSel.value = "add";
  if (targetSel) targetSel.value = "wallet";
  if (amountInput) amountInput.value = 1000;

  modal.style.display = "flex";
}

function closeEconomyBalanceModal() {
  const modal = document.getElementById("eco-balance-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitEconomyBalanceModal() {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("eco-bal-userid")?.value.trim();
  const action = document.getElementById("eco-bal-action")?.value || "add";
  const target = document.getElementById("eco-bal-target")?.value || "wallet";
  const amount = Number(document.getElementById("eco-bal-amount")?.value);

  if (!userId) {
    window.showToast("Lütfen bir kullanıcı ID veya adı girin.", "warning");
    return;
  }
  if (isNaN(amount) || amount < 0) {
    window.showToast("Geçerli bir miktar girin.", "warning");
    return;
  }

  const payload = { userId, action, target, amount };

  try {
    const endpoint = gId ? `/api/economy/user-balance/${gId}` : "/api/economy/user-balance";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Bakiye başarıyla güncellendi.", "success");
      closeEconomyBalanceModal();
      loadEconomyPage();
    } else {
      window.showToast(data.error || "Bakiye güncellenemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

window.loadEconomyPage = loadEconomyPage;
window.saveEconomyConfigOnly = saveEconomyConfigOnly;
window.saveMarketPrices = saveMarketPrices;
window.triggerMarketRally = triggerMarketRally;
window.openEconomyChannelsModal = openEconomyChannelsModal;
window.closeEconomyChannelsModal = closeEconomyChannelsModal;
window.saveEconomyChannelsSelection = saveEconomyChannelsSelection;
window.clearEconomyChannelsSelection = clearEconomyChannelsSelection;
window.removeEconomyChannel = removeEconomyChannel;
window.openShopItemModal = openShopItemModal;
window.openShopItemModalById = openShopItemModalById;
window.closeShopItemModal = closeShopItemModal;
window.submitShopItemModal = submitShopItemModal;
window.handleShopTypeChange = handleShopTypeChange;
window.toggleShopItemActive = toggleShopItemActive;
window.deleteShopItem = deleteShopItem;
window.filterShopTable = filterShopTable;
window.filterRichTable = filterRichTable;
window.openEconomyBalanceModal = openEconomyBalanceModal;
window.closeEconomyBalanceModal = closeEconomyBalanceModal;
window.submitEconomyBalanceModal = submitEconomyBalanceModal;

let localCasinoChannels = [];
let localDuelChannels = [];
let localCasinoSettings = {};

async function loadCasinoPage() {
  const gId = getSelectedGuildId();
  try {
    await ensureDiscordMeta(gId);
    const endpoint = gId ? `/api/casino/${gId}` : "/api/casino";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Kumarhane verileri alınamadı.", "error");
      return;
    }

    if (data.channels && Array.isArray(data.channels) && data.channels.length > 0) {
      if (!currentDiscordMeta) currentDiscordMeta = {};
      currentDiscordMeta.channels = data.channels;
      if (data.roles) currentDiscordMeta.roles = data.roles;
      if (data.guildId) currentDiscordMeta.id = data.guildId;
      window.currentDiscordMeta = currentDiscordMeta;
    }

    localCasinoSettings = data.casinoSettings || {};
    localCasinoChannels = Array.isArray(localCasinoSettings.channels) ? [...localCasinoSettings.channels] : [];
    localDuelChannels = Array.isArray(localCasinoSettings.duel?.channels) ? [...localCasinoSettings.duel.channels] : [];

    renderCasinoStats(data.stats);

    const masterToggle = document.getElementById("casino-master-toggle");
    if (masterToggle) masterToggle.checked = localCasinoSettings.enabled !== false;

    const setInput = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : "";
    };

    setInput("casino-min-bet", localCasinoSettings.minBet ?? 10);
    setInput("casino-max-bet", localCasinoSettings.maxBet ?? 50000);
    setInput("casino-kazikazan-cost", localCasinoSettings.kazikazanCost ?? 50);
    setInput("casino-lottery-cost", localCasinoSettings.lotteryTicketCost ?? 100);
    setInput("casino-tax-percent", localCasinoSettings.casinoTaxPercent ?? 3);

    renderCasinoChannelsBadges();

    const games = localCasinoSettings.games || {};
    const setGame = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = val !== false;
    };
    setGame("casino-game-bj", games.blackjack);
    setGame("casino-game-rulet", games.rulet);
    setGame("casino-game-slot", games.slot);
    setGame("casino-game-yazitura", games.yazitura);
    setGame("casino-game-kazikazan", games.kazikazan);
    setGame("casino-game-piyango", games.piyango);

    const mul = localCasinoSettings.multipliers || {};
    setInput("casino-mul-bj-natural", mul.blackjackNatural ?? 2.5);
    setInput("casino-mul-rulet-green", mul.rouletteGreen ?? 14);
    setInput("casino-mul-slot-jackpot", mul.slotJackpot ?? 10);
    setInput("casino-mul-slot-diamond", mul.slotDiamond ?? 5);
    setInput("casino-mul-slot-fruit", mul.slotFruit ?? 3);
    setInput("casino-mul-kazikazan-jackpot", mul.kazikazanJackpot ?? 50);

    const duel = localCasinoSettings.duel || {};
    const duelToggle = document.getElementById("duel-master-toggle");
    if (duelToggle) duelToggle.checked = duel.enabled !== false;

    setInput("duel-min-bet", duel.minBet ?? 50);
    setInput("duel-max-bet", duel.maxBet ?? 100000);
    setInput("duel-timeout", duel.timeoutSeconds ?? 60);
    setInput("duel-tax-percent", duel.taxPercent ?? 2);

    renderDuelChannelsBadges();
  } catch (err) {
    window.showToast("Kumarhane verileri yüklenirken bağlantı hatası: " + err.message, "error");
  }
}

function renderCasinoStats(stats) {
  const isCasinoEnabled = stats?.enabled !== false;
  const statStatus = document.getElementById("casino-stat-status");
  const statStatusBadge = document.getElementById("casino-stat-status-badge");
  const statStatusDesc = document.getElementById("casino-stat-status-desc");

  if (statStatus) statStatus.textContent = isCasinoEnabled ? "Açık" : "Kapalı";
  if (statStatusBadge) {
    statStatusBadge.textContent = isCasinoEnabled ? "AKTİF" : "KAPALI";
    statStatusBadge.className = `stat-badge ${isCasinoEnabled ? "badge-green" : "badge-orange"}`;
  }
  if (statStatusDesc) {
    statStatusDesc.textContent = isCasinoEnabled ? "Tüm şans oyunları devrede" : "Tüm kumar komutları kilitli";
  }

  const statActiveGames = document.getElementById("casino-stat-active-games");
  const statGamesBadge = document.getElementById("casino-stat-games-badge");
  const gCount = stats?.activeGamesCount ?? 6;
  if (statActiveGames) statActiveGames.textContent = `${gCount} / 6`;
  if (statGamesBadge) statGamesBadge.textContent = `${gCount} MOD`;

  const statBetRange = document.getElementById("casino-stat-bet-range");
  if (statBetRange) {
    const minB = Number(stats?.minBet || 10).toLocaleString("tr-TR");
    const maxB = Number(stats?.maxBet || 50000).toLocaleString("tr-TR");
    statBetRange.textContent = `${minB} - ${maxB} 🪙`;
  }

  const isDuelEnabled = stats?.duelEnabled !== false;
  const statDuelStatus = document.getElementById("casino-stat-duel-status");
  const statDuelBadge = document.getElementById("casino-stat-duel-badge");
  const statDuelDesc = document.getElementById("casino-stat-duel-desc");

  if (statDuelStatus) statDuelStatus.textContent = isDuelEnabled ? "Açık" : "Kapalı";
  if (statDuelBadge) {
    statDuelBadge.textContent = isDuelEnabled ? "AKTİF" : "KAPALI";
    statDuelBadge.className = `stat-badge ${isDuelEnabled ? "badge-orange" : "badge-blue"}`;
  }
  if (statDuelDesc) {
    statDuelDesc.textContent = isDuelEnabled ? "PvP düellolar aktif" : "Kullanıcı düelloları kapalı";
  }
}

function renderCasinoChannelsBadges() {
  const pool = document.getElementById("casino-channels-pool");
  if (!pool) return;

  if (!localCasinoChannels || localCasinoChannels.length === 0) {
    pool.innerHTML = `<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Tüm kanallarda kumar oyunları serbest (Kısıtlama yok).</span>`;
    return;
  }

  const allChannels = currentDiscordMeta?.channels || [];
  pool.innerHTML = localCasinoChannels.map((chId) => {
    const ch = allChannels.find((c) => String(c.id) === String(chId));
    const name = ch ? ch.name : chId;
    return `
      <span class="eco-channel-tag">
        <span>#${escapeHtml(name)}</span>
        <span class="eco-channel-remove" onclick="removeCasinoChannel('${chId}')" title="Kanalı Kaldır">&times;</span>
      </span>
    `;
  }).join("");
}

function removeCasinoChannel(id) {
  localCasinoChannels = localCasinoChannels.filter((c) => String(c) !== String(id));
  renderCasinoChannelsBadges();
  markDirty();
}

async function openCasinoChannelsModal() {
  const modal = document.getElementById("casino-channels-modal-backdrop");
  const list = document.getElementById("casino-channels-modal-list");
  if (!modal || !list) return;

  list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Discord kanalları yükleniyor...</div>`;
  modal.style.display = "flex";

  if (!currentDiscordMeta || !Array.isArray(currentDiscordMeta.channels) || currentDiscordMeta.channels.length === 0) {
    await ensureDiscordMeta();
  }

  const allChannels = currentDiscordMeta?.channels || [];
  const textChannels = allChannels.filter((c) => c.type === 0 || c.type === 5 || c.type === undefined);

  if (textChannels.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Sunucuda metin kanalı bulunamadı.</div>`;
  } else {
    list.innerHTML = textChannels.map((c) => {
      const isChecked = localCasinoChannels.map(String).includes(String(c.id));
      return `
        <label class="cmd-role-checkbox-item">
          <input type="checkbox" value="${c.id}" ${isChecked ? "checked" : ""} />
          <span class="cmd-role-checkbox-label" style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--text-muted); font-weight: 700;">#</span>
            ${escapeHtml(c.name)}
          </span>
          <span class="cmd-role-checkbox-id">${c.id}</span>
        </label>
      `;
    }).join("");
  }
}

function closeCasinoChannelsModal() {
  const modal = document.getElementById("casino-channels-modal-backdrop");
  if (modal) modal.style.display = "none";
}

function saveCasinoChannelsSelection() {
  const list = document.getElementById("casino-channels-modal-list");
  if (!list) return;

  const checked = list.querySelectorAll('input[type="checkbox"]:checked');
  localCasinoChannels = Array.from(checked).map((el) => el.value);

  closeCasinoChannelsModal();
  renderCasinoChannelsBadges();
  markDirty();
  window.showToast("Kumarhane komut kanalları güncellendi.", "info");
}

function clearCasinoChannelsSelection() {
  localCasinoChannels = [];
  closeCasinoChannelsModal();
  renderCasinoChannelsBadges();
  markDirty();
  window.showToast("Kumarhane kanal kısıtlamaları kaldırıldı.", "info");
}

function renderDuelChannelsBadges() {
  const pool = document.getElementById("duel-channels-pool");
  if (!pool) return;

  if (!localDuelChannels || localDuelChannels.length === 0) {
    pool.innerHTML = `<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Tüm kanallarda düello serbest (Kısıtlama yok).</span>`;
    return;
  }

  const allChannels = currentDiscordMeta?.channels || [];
  pool.innerHTML = localDuelChannels.map((chId) => {
    const ch = allChannels.find((c) => String(c.id) === String(chId));
    const name = ch ? ch.name : chId;
    return `
      <span class="eco-channel-tag">
        <span>#${escapeHtml(name)}</span>
        <span class="eco-channel-remove" onclick="removeDuelChannel('${chId}')" title="Kanalı Kaldır">&times;</span>
      </span>
    `;
  }).join("");
}

function removeDuelChannel(id) {
  localDuelChannels = localDuelChannels.filter((c) => String(c) !== String(id));
  renderDuelChannelsBadges();
  markDirty();
}

async function openDuelChannelsModal() {
  const modal = document.getElementById("duel-channels-modal-backdrop");
  const list = document.getElementById("duel-channels-modal-list");
  if (!modal || !list) return;

  list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Discord kanalları yükleniyor...</div>`;
  modal.style.display = "flex";

  if (!currentDiscordMeta || !Array.isArray(currentDiscordMeta.channels) || currentDiscordMeta.channels.length === 0) {
    await ensureDiscordMeta();
  }

  const allChannels = currentDiscordMeta?.channels || [];
  const textChannels = allChannels.filter((c) => c.type === 0 || c.type === 5 || c.type === undefined);

  if (textChannels.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Sunucuda metin kanalı bulunamadı.</div>`;
  } else {
    list.innerHTML = textChannels.map((c) => {
      const isChecked = localDuelChannels.map(String).includes(String(c.id));
      return `
        <label class="cmd-role-checkbox-item">
          <input type="checkbox" value="${c.id}" ${isChecked ? "checked" : ""} />
          <span class="cmd-role-checkbox-label" style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--text-muted); font-weight: 700;">#</span>
            ${escapeHtml(c.name)}
          </span>
          <span class="cmd-role-checkbox-id">${c.id}</span>
        </label>
      `;
    }).join("");
  }
}

function closeDuelChannelsModal() {
  const modal = document.getElementById("duel-channels-modal-backdrop");
  if (modal) modal.style.display = "none";
}

function saveDuelChannelsSelection() {
  const list = document.getElementById("duel-channels-modal-list");
  if (!list) return;

  const checked = list.querySelectorAll('input[type="checkbox"]:checked');
  localDuelChannels = Array.from(checked).map((el) => el.value);

  closeDuelChannelsModal();
  renderDuelChannelsBadges();
  markDirty();
  window.showToast("Düello komut kanalları güncellendi.", "info");
}

function clearDuelChannelsSelection() {
  localDuelChannels = [];
  closeDuelChannelsModal();
  renderDuelChannelsBadges();
  markDirty();
  window.showToast("Düello kanal kısıtlamaları kaldırıldı.", "info");
}

async function saveCasinoSettings() {
  const gId = getSelectedGuildId();
  const getNum = (id, def) => {
    const val = Number(document.getElementById(id)?.value);
    return isNaN(val) ? def : val;
  };

  const payload = {
    enabled: Boolean(document.getElementById("casino-master-toggle")?.checked),
    minBet: getNum("casino-min-bet", 10),
    maxBet: getNum("casino-max-bet", 50000),
    kazikazanCost: getNum("casino-kazikazan-cost", 50),
    lotteryTicketCost: getNum("casino-lottery-cost", 100),
    casinoTaxPercent: getNum("casino-tax-percent", 3),
    channels: localCasinoChannels
  };

  try {
    const endpoint = gId ? `/api/casino/settings/${gId}` : "/api/casino/settings";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Kumarhane ayarları kaydedildi.", "success");
      clearDirty();
      loadCasinoPage();
    } else {
      window.showToast(data.error || "Kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveCasinoGames() {
  const gId = getSelectedGuildId();
  const getNum = (id, def) => {
    const val = Number(document.getElementById(id)?.value);
    return isNaN(val) ? def : val;
  };
  const getChecked = (id) => Boolean(document.getElementById(id)?.checked);

  const payload = {
    games: {
      blackjack: getChecked("casino-game-bj"),
      rulet: getChecked("casino-game-rulet"),
      slot: getChecked("casino-game-slot"),
      yazitura: getChecked("casino-game-yazitura"),
      kazikazan: getChecked("casino-game-kazikazan"),
      piyango: getChecked("casino-game-piyango")
    },
    multipliers: {
      blackjackNatural: getNum("casino-mul-bj-natural", 2.5),
      rouletteGreen: getNum("casino-mul-rulet-green", 14),
      slotJackpot: getNum("casino-mul-slot-jackpot", 10),
      slotDiamond: getNum("casino-mul-slot-diamond", 5),
      slotFruit: getNum("casino-mul-slot-fruit", 3),
      kazikazanJackpot: getNum("casino-mul-kazikazan-jackpot", 50)
    }
  };

  try {
    const endpoint = gId ? `/api/casino/games/${gId}` : "/api/casino/games";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Oyun modları ve çarpanlar kaydedildi.", "success");
      clearDirty();
      loadCasinoPage();
    } else {
      window.showToast(data.error || "Kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveCasinoDuel() {
  const gId = getSelectedGuildId();
  const getNum = (id, def) => {
    const val = Number(document.getElementById(id)?.value);
    return isNaN(val) ? def : val;
  };

  const payload = {
    enabled: Boolean(document.getElementById("duel-master-toggle")?.checked),
    minBet: getNum("duel-min-bet", 50),
    maxBet: getNum("duel-max-bet", 100000),
    timeoutSeconds: getNum("duel-timeout", 60),
    taxPercent: getNum("duel-tax-percent", 2),
    channels: localDuelChannels
  };

  try {
    const endpoint = gId ? `/api/casino/duel/${gId}` : "/api/casino/duel";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Düello ayarları kaydedildi.", "success");
      clearDirty();
      loadCasinoPage();
    } else {
      window.showToast(data.error || "Kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveAllCasinoSettings() {
  await saveCasinoSettings();
  await saveCasinoGames();
  await saveCasinoDuel();
  window.showToast("Tüm kumarhane ve düello yapılandırması başarıyla kaydedildi.", "success");
}

window.loadCasinoPage = loadCasinoPage;
window.saveCasinoSettings = saveCasinoSettings;
window.saveCasinoGames = saveCasinoGames;
window.saveCasinoDuel = saveCasinoDuel;
window.saveAllCasinoSettings = saveAllCasinoSettings;
window.openCasinoChannelsModal = openCasinoChannelsModal;
window.closeCasinoChannelsModal = closeCasinoChannelsModal;
window.saveCasinoChannelsSelection = saveCasinoChannelsSelection;
window.clearCasinoChannelsSelection = clearCasinoChannelsSelection;
window.removeCasinoChannel = removeCasinoChannel;
window.openDuelChannelsModal = openDuelChannelsModal;
window.closeDuelChannelsModal = closeDuelChannelsModal;
window.saveDuelChannelsSelection = saveDuelChannelsSelection;
window.clearDuelChannelsSelection = clearDuelChannelsSelection;
window.removeDuelChannel = removeDuelChannel;

let localClanConfig = {};
let localClanList = [];
let localClanChannels = [];

async function loadClansPage() {
  const gId = getSelectedGuildId();
  try {
    await ensureDiscordMeta(gId);
    const endpoint = gId ? `/api/clans/${gId}` : "/api/clans";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Klan verileri alınamadı.", "error");
      return;
    }

    if (data.channels && Array.isArray(data.channels) && data.channels.length > 0) {
      if (!currentDiscordMeta) currentDiscordMeta = {};
      currentDiscordMeta.channels = data.channels;
      if (data.roles) currentDiscordMeta.roles = data.roles;
      if (data.guildId) currentDiscordMeta.id = data.guildId;
      window.currentDiscordMeta = currentDiscordMeta;
    }

    localClanConfig = data.config || {};
    localClanList = data.clans || [];
    localClanChannels = Array.isArray(localClanConfig.channels) ? [...localClanConfig.channels] : [];

    renderClanStats(data.stats);

    const setChecked = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : "";
    };

    setChecked("clan-setting-enabled", localClanConfig.enabled !== false);
    setChecked("clan-setting-approval", localClanConfig.requireApproval);
    setVal("clan-setting-create-cost", localClanConfig.createCost ?? 10000);
    setVal("clan-setting-max-members", localClanConfig.maxMembersBase ?? 15);
    setVal("clan-setting-min-name", localClanConfig.minNameLength ?? 3);
    setVal("clan-setting-max-name", localClanConfig.maxNameLength ?? 24);
    setVal("clan-setting-min-tag", localClanConfig.minTagLength ?? 2);
    setVal("clan-setting-max-tag", localClanConfig.maxTagLength ?? 6);

    renderClanChannelsBadges();
    renderClansTable();
  } catch (err) {
    window.showToast("Klan verileri yüklenirken bağlantı hatası: " + err.message, "error");
  }
}

function renderClanStats(stats) {
  const totalClans = document.getElementById("clan-stat-total-clans");
  const activeBadge = document.getElementById("clan-stat-active-badge");
  const totalVault = document.getElementById("clan-stat-total-vault");
  const topClan = document.getElementById("clan-stat-top-clan");
  const topSubtext = document.getElementById("clan-stat-top-subtext");
  const totalMembers = document.getElementById("clan-stat-total-members");

  const count = stats?.totalClans ?? localClanList.length;
  if (totalClans) totalClans.textContent = `${count} Klan`;
  if (activeBadge) {
    activeBadge.textContent = count > 0 ? "AKTİF" : "YOK";
    activeBadge.className = `stat-badge ${count > 0 ? "badge-green" : "badge-orange"}`;
  }

  const vaultVal = Number(stats?.totalVault ?? 0);
  if (totalVault) totalVault.innerHTML = `${vaultVal.toLocaleString("tr-TR")} <span style="font-size: 13px; color: var(--text-muted); font-weight: normal;">Coin</span>`;

  if (topClan) {
    if (stats?.topClan) {
      topClan.textContent = `${stats.topClan.badge || "⚔️"} ${stats.topClan.name} [${stats.topClan.tag}]`;
      if (topSubtext) {
        topSubtext.textContent = `Seviye: ${stats.topClan.level} | Kasa: ${(Number(stats.topClan.vault) || 0).toLocaleString("tr-TR")} Coin`;
      }
    } else {
      topClan.textContent = "-";
      if (topSubtext) topSubtext.textContent = "Henüz klan bulunmuyor";
    }
  }

  const memVal = stats?.totalMembers ?? 0;
  if (totalMembers) totalMembers.textContent = `${memVal} Oyuncu`;
}

function renderClansTable() {
  const tbody = document.getElementById("clan-table-body");
  if (!tbody) return;

  const search = document.getElementById("clan-table-search")?.value.toLowerCase().trim() || "";
  const filter = document.getElementById("clan-table-filter")?.value || "all";

  const filtered = localClanList.filter((c) => {
    if (filter === "active" && (c.isFrozen || c.approved === false)) return false;
    if (filter === "frozen" && !c.isFrozen) return false;
    if (filter === "pending" && c.approved !== false) return false;
    if (search) {
      const inName = (c.name || "").toLowerCase().includes(search);
      const inTag = (c.tag || "").toLowerCase().includes(search);
      const inLeader = (c.leaderId || "").toLowerCase().includes(search);
      if (!inName && !inTag && !inLeader) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 32px; text-align: center; color: var(--text-muted);">
          Kayıtlı veya arama kriterine uyan klan bulunamadı. "Yeni Klan Kur" butonunu kullanarak ekleyebilirsiniz.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((c) => {
    let statusPill = `<span class="stat-badge badge-green">AKTİF</span>`;
    if (c.isFrozen) {
      statusPill = `<span class="stat-badge badge-orange">DONDURULDU</span>`;
    } else if (c.approved === false) {
      statusPill = `<span class="stat-badge badge-purple">ONAY BEKLİYOR</span>`;
    }

    const memberCount = Array.isArray(c.members) ? c.members.length : 0;
    const maxMem = c.maxMembers || 15;
    const freezeActionLabel = c.isFrozen ? "Çöz" : "Dondur";
    const freezeBtnClass = c.isFrozen ? "btn-action-primary" : "btn-panel-action";

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s ease;">
        <td style="padding: 12px 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.25); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
              ${escapeHtml(c.badge || "⚔️")}
            </div>
            <div>
              <div style="font-weight: 600; color: #f8fafc; font-size: 13.5px;">${escapeHtml(c.name)}</div>
              <div style="font-size: 11px; color: var(--text-muted); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(c.description || "Açıklama yok")}
              </div>
            </div>
          </div>
        </td>
        <td style="padding: 12px 16px;">
          <span style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); padding: 3px 8px; border-radius: 6px; font-weight: 700; color: #a5b4fc; font-size: 11.5px; letter-spacing: 0.04em;">
            [${escapeHtml(c.tag)}]
          </span>
        </td>
        <td style="padding: 12px 16px;">
          <span style="font-family: monospace; font-size: 11.5px; color: #94a3b8; background: rgba(15, 23, 42, 0.6); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.05);">
            ${escapeHtml(c.leaderId)}
          </span>
        </td>
        <td style="padding: 12px 16px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="stat-badge badge-blue" style="font-size: 11px;">
              Lv. ${c.level || 1}
            </span>
            <span style="font-size: 11px; color: var(--text-muted);">(${c.xp || 0} XP)</span>
          </div>
        </td>
        <td style="padding: 12px 16px;">
          <span style="font-weight: 600; color: #38bdf8;">${memberCount}</span>
          <span style="color: var(--text-muted); font-size: 11.5px;"> / ${maxMem}</span>
        </td>
        <td style="padding: 12px 16px; font-weight: 700; color: #fbbf24;">
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg>
            ${(Number(c.vault) || 0).toLocaleString("tr-TR")}
          </span>
        </td>
        <td style="padding: 12px 16px;">${statusPill}</td>
        <td style="padding: 12px 16px; text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
            <button type="button" class="btn-panel-action" style="padding: 4px 10px; font-size: 11.5px;" onclick="openClanModal('${c._id || c.id}')">
              Düzenle
            </button>
            ${c.approved === false ? `
              <button type="button" class="btn-action-primary" style="padding: 4px 10px; font-size: 11.5px;" onclick="approveClan('${c._id || c.id}')">
                Onayla
              </button>
            ` : ""}
            <button type="button" class="${freezeBtnClass}" style="padding: 4px 10px; font-size: 11.5px;" onclick="toggleFreezeClan('${c._id || c.id}')">
              ${freezeActionLabel}
            </button>
            <button type="button" class="btn-panel-action" style="padding: 4px 10px; font-size: 11.5px; color: #f87171;" onclick="deleteClan('${c._id || c.id}', '${escapeHtml(c.name)}')">
              Sil
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderClanChannelsBadges() {
  const pool = document.getElementById("clan-selected-channels-preview");
  const badge = document.getElementById("clan-channel-count-badge");
  if (badge) badge.textContent = localClanChannels.length;
  if (!pool) return;

  if (!localClanChannels || localClanChannels.length === 0) {
    pool.innerHTML = `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1;">Tüm Kanallarda Serbest</span>`;
    return;
  }

  const allChannels = currentDiscordMeta?.channels || [];
  pool.innerHTML = localClanChannels.map((chId) => {
    const ch = allChannels.find((c) => String(c.id) === String(chId));
    const name = ch ? ch.name : chId;
    return `
      <span class="eco-channel-tag">
        <span>#${escapeHtml(name)}</span>
        <span class="eco-channel-remove" onclick="removeClanChannel('${chId}')" title="Kanalı Kaldır">&times;</span>
      </span>
    `;
  }).join("");
}

function removeClanChannel(id) {
  localClanChannels = localClanChannels.filter((c) => String(c) !== String(id));
  renderClanChannelsBadges();
  markDirty();
}

async function openClanChannelsModal() {
  const modal = document.getElementById("clan-channels-modal-backdrop");
  const list = document.getElementById("clan-channels-modal-list");
  if (!modal || !list) return;

  list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Discord kanalları yükleniyor...</div>`;
  modal.style.display = "flex";

  if (!currentDiscordMeta || !Array.isArray(currentDiscordMeta.channels) || currentDiscordMeta.channels.length === 0) {
    await ensureDiscordMeta();
  }

  const allChannels = currentDiscordMeta?.channels || [];
  const textChannels = allChannels.filter((c) => c.type === 0 || c.type === 5 || c.type === undefined);

  if (textChannels.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Sunucuda metin kanalı bulunamadı.</div>`;
  } else {
    list.innerHTML = textChannels.map((c) => {
      const isChecked = localClanChannels.map(String).includes(String(c.id));
      return `
        <label class="cmd-role-checkbox-item">
          <input type="checkbox" value="${c.id}" ${isChecked ? "checked" : ""} />
          <span class="cmd-role-checkbox-label" style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--text-muted); font-weight: 700;">#</span>
            ${escapeHtml(c.name)}
          </span>
          <span class="cmd-role-checkbox-id">${c.id}</span>
        </label>
      `;
    }).join("");
  }
}

function closeClanChannelsModal() {
  const modal = document.getElementById("clan-channels-modal-backdrop");
  if (modal) modal.style.display = "none";
}

function saveClanChannelsSelection() {
  const list = document.getElementById("clan-channels-modal-list");
  if (!list) return;

  const checked = list.querySelectorAll('input[type="checkbox"]:checked');
  localClanChannels = Array.from(checked).map((el) => el.value);

  closeClanChannelsModal();
  renderClanChannelsBadges();
  markDirty();
  window.showToast("Klan komut kanalları güncellendi.", "info");
}

function clearClanChannelsSelection() {
  localClanChannels = [];
  closeClanChannelsModal();
  renderClanChannelsBadges();
  markDirty();
  window.showToast("Klan kanal kısıtlamaları kaldırıldı (Tüm kanallarda serbest).", "info");
}

function openClanModal(clanId = null) {
  const modal = document.getElementById("clan-edit-modal-backdrop");
  if (!modal) return;

  const title = document.getElementById("clan-modal-title");
  const hiddenId = document.getElementById("modal-clan-id");
  const badgeInp = document.getElementById("modal-clan-badge");
  const nameInp = document.getElementById("modal-clan-name");
  const tagInp = document.getElementById("modal-clan-tag");
  const leaderInp = document.getElementById("modal-clan-leader");
  const levelInp = document.getElementById("modal-clan-level");
  const vaultInp = document.getElementById("modal-clan-vault");
  const maxMemInp = document.getElementById("modal-clan-maxmembers");
  const descInp = document.getElementById("modal-clan-description");

  if (clanId) {
    const clan = localClanList.find((c) => String(c._id || c.id) === String(clanId));
    if (title) title.textContent = "Klan Bilgilerini Düzenle";
    if (hiddenId) hiddenId.value = clanId;
    if (badgeInp) badgeInp.value = clan?.badge || "⚔️";
    if (nameInp) nameInp.value = clan?.name || "";
    if (tagInp) tagInp.value = clan?.tag || "";
    if (leaderInp) leaderInp.value = clan?.leaderId || "";
    if (levelInp) levelInp.value = clan?.level ?? 1;
    if (vaultInp) vaultInp.value = clan?.vault ?? 0;
    if (maxMemInp) maxMemInp.value = clan?.maxMembers ?? 15;
    if (descInp) descInp.value = clan?.description || "";
  } else {
    if (title) title.textContent = "Yeni Klan Kur";
    if (hiddenId) hiddenId.value = "";
    if (badgeInp) badgeInp.value = "⚔️";
    if (nameInp) nameInp.value = "";
    if (tagInp) tagInp.value = "";
    if (leaderInp) leaderInp.value = "";
    if (levelInp) levelInp.value = 1;
    if (vaultInp) vaultInp.value = 0;
    if (maxMemInp) maxMemInp.value = localClanConfig.maxMembersBase ?? 15;
    if (descInp) descInp.value = "Sunucu loncası.";
  }

  modal.style.display = "flex";
}

function closeClanModal() {
  const modal = document.getElementById("clan-edit-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitClanForm() {
  const gId = getSelectedGuildId();
  const clanId = document.getElementById("modal-clan-id")?.value;
  const name = document.getElementById("modal-clan-name")?.value.trim();
  const tag = document.getElementById("modal-clan-tag")?.value.trim().toUpperCase();
  const badge = document.getElementById("modal-clan-badge")?.value.trim() || "⚔️";
  const leaderId = document.getElementById("modal-clan-leader")?.value.trim();
  const level = Number(document.getElementById("modal-clan-level")?.value) || 1;
  const vault = Number(document.getElementById("modal-clan-vault")?.value) || 0;
  const maxMembers = Number(document.getElementById("modal-clan-maxmembers")?.value) || 15;
  const description = document.getElementById("modal-clan-description")?.value.trim();

  if (!name || !tag) {
    window.showToast("Klan adı ve etiketi zorunludur.", "warning");
    return;
  }

  const payload = {
    action: clanId ? "update" : "create",
    clanId,
    name,
    tag,
    badge,
    leaderId: leaderId || "1",
    level,
    vault,
    maxMembers,
    description
  };

  try {
    const endpoint = gId ? `/api/clans/${gId}/action` : "/api/clans/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "İşlem başarılı.", "success");
      closeClanModal();
      loadClansPage();
    } else {
      window.showToast(data.error || "İşlem başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function toggleFreezeClan(clanId) {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/clans/${gId}/action` : "/api/clans/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_freeze", clanId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Klan durumu güncellendi.", "info");
      loadClansPage();
    } else {
      window.showToast(data.error || "İşlem başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function approveClan(clanId) {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/clans/${gId}/action` : "/api/clans/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", clanId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Klan onaylandı.", "success");
      loadClansPage();
    } else {
      window.showToast(data.error || "İşlem başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteClan(clanId, clanName) {
  const confirmed = confirm(`"${clanName}" klanı tamamen silinecektir.\n\nTüm üyeler klandan çıkarılacak ve hazine silinecektir.\n\nOnaylıyor musunuz?`);
  if (!confirmed) return;

  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/clans/${gId}/action` : "/api/clans/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", clanId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Klan silindi.", "success");
      loadClansPage();
    } else {
      window.showToast(data.error || "İşlem başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveClanSettings() {
  const gId = getSelectedGuildId();
  const getNum = (id, def) => {
    const val = Number(document.getElementById(id)?.value);
    return isNaN(val) ? def : val;
  };

  const payload = {
    enabled: Boolean(document.getElementById("clan-setting-enabled")?.checked),
    requireApproval: Boolean(document.getElementById("clan-setting-approval")?.checked),
    createCost: getNum("clan-setting-create-cost", 10000),
    maxMembersBase: getNum("clan-setting-max-members", 15),
    minNameLength: getNum("clan-setting-min-name", 3),
    maxNameLength: getNum("clan-setting-max-name", 24),
    minTagLength: getNum("clan-setting-min-tag", 2),
    maxTagLength: getNum("clan-setting-max-tag", 6),
    channels: localClanChannels
  };

  try {
    const endpoint = gId ? `/api/clans/settings/${gId}` : "/api/clans/settings";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Klan kuralları kaydedildi.", "success");
      clearDirty();
      loadClansPage();
    } else {
      window.showToast(data.error || "Kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

window.loadClansPage = loadClansPage;
window.renderClanStats = renderClanStats;
window.renderClansTable = renderClansTable;
window.renderClanChannelsBadges = renderClanChannelsBadges;
window.removeClanChannel = removeClanChannel;
window.openClanChannelsModal = openClanChannelsModal;
window.closeClanChannelsModal = closeClanChannelsModal;
window.saveClanChannelsSelection = saveClanChannelsSelection;
window.clearClanChannelsSelection = clearClanChannelsSelection;
window.openClanModal = openClanModal;
window.closeClanModal = closeClanModal;
window.submitClanForm = submitClanForm;
window.toggleFreezeClan = toggleFreezeClan;
window.approveClan = approveClan;
window.deleteClan = deleteClan;
window.saveClanSettings = saveClanSettings;

let localBadgesData = {
  enabled: true,
  customBadges: [],
  allBadges: [],
  titles: [],
  recentUsers: []
};

async function loadBadgesPage() {
  const gId = getSelectedGuildId();
  try {
    await ensureDiscordMeta(gId);
    const endpoint = gId ? `/api/badges/${gId}` : "/api/badges";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success && data.enabled === undefined) {
      window.showToast(data.error || "Rozet verileri alınamadı.", "error");
      return;
    }

    localBadgesData = {
      enabled: data.enabled !== false,
      customBadges: Array.isArray(data.customBadges) ? data.customBadges : [],
      allBadges: Array.isArray(data.allBadges) ? data.allBadges : [],
      titles: Array.isArray(data.titles) ? data.titles : [],
      recentUsers: Array.isArray(data.recentUsers) ? data.recentUsers : []
    };

    const toggle = document.getElementById("badge-setting-enabled");
    if (toggle) toggle.checked = localBadgesData.enabled;

    renderBadgesStats();
    populateBadgeAndTitleSelects();
    renderBadgesCatalog();
    renderRecentBadgeUsersTable();
  } catch (err) {
    window.showToast("Rozet verileri yüklenirken bağlantı hatası: " + err.message, "error");
  }
}

function renderBadgesStats() {
  const totalBadgesEl = document.getElementById("badge-stat-total-badges");
  const totalTitlesEl = document.getElementById("badge-stat-total-titles");
  const totalUsersEl = document.getElementById("badge-stat-total-users");
  const activeBadgeEl = document.getElementById("badge-stat-active-badge");
  const statusValEl = document.getElementById("badge-stat-system-status");

  const badgeCount = localBadgesData.allBadges.length;
  const titleCount = localBadgesData.titles.length;
  const usersWithBadges = localBadgesData.recentUsers.filter((u) => Array.isArray(u.badges) && u.badges.length > 0).length;

  if (totalBadgesEl) totalBadgesEl.textContent = `${badgeCount} Rozet`;
  if (totalTitlesEl) totalTitlesEl.textContent = `${titleCount} Unvan`;
  if (totalUsersEl) totalUsersEl.textContent = `${usersWithBadges} Üye`;

  if (activeBadgeEl && statusValEl) {
    if (localBadgesData.enabled) {
      activeBadgeEl.textContent = "AKTİF";
      activeBadgeEl.className = "stat-badge badge-green";
      statusValEl.textContent = "Açık";
      statusValEl.style.color = "#4ade80";
    } else {
      activeBadgeEl.textContent = "DEVRE DIŞI";
      activeBadgeEl.className = "stat-badge badge-orange";
      statusValEl.textContent = "Kapalı";
      statusValEl.style.color = "#f87171";
    }
  }
}

function populateBadgeAndTitleSelects() {
  const badgeSelect = document.getElementById("badge-assign-badge-select");
  const titleSelect = document.getElementById("badge-assign-title-select");

  if (badgeSelect) {
    badgeSelect.innerHTML = `<option value="">Rozet Seçiniz...</option>` + localBadgesData.allBadges.map((b) => {
      const typeLabel = b.isCustom ? "(Özel)" : "(Dahili)";
      return `<option value="${escapeHtml(b.id)}">${escapeHtml(b.emoji || "🎖️")} ${escapeHtml(b.name)} ${typeLabel}</option>`;
    }).join("");
  }

  if (titleSelect) {
    titleSelect.innerHTML = `<option value="">Unvan Seçiniz...</option>` + localBadgesData.titles.map((t) => {
      return `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)} (${t.cost || 0} Coin)</option>`;
    }).join("");
  }
}

function renderBadgesCatalog() {
  const grid = document.getElementById("badge-catalog-grid");
  if (!grid) return;

  const search = document.getElementById("badge-catalog-search")?.value.toLowerCase().trim() || "";

  const filtered = localBadgesData.allBadges.filter((b) => {
    if (!search) return true;
    const inName = (b.name || "").toLowerCase().includes(search);
    const inDesc = (b.desc || "").toLowerCase().includes(search);
    const inId = (b.id || "").toLowerCase().includes(search);
    return inName || inDesc || inId;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 28px; color: var(--text-muted);">Aramanıza uyan rozet bulunamadı.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((b) => {
    const isCustom = Boolean(b.isCustom);
    const badgeTypePill = isCustom
      ? `<span class="stat-badge badge-purple" style="font-size: 10px;">ÖZEL</span>`
      : `<span class="stat-badge badge-blue" style="font-size: 10px;">DAHİLİ</span>`;

    const customActions = isCustom
      ? `<div style="display: inline-flex; gap: 6px;">
           <button type="button" class="btn-panel-action" style="padding: 3px 8px; font-size: 11px;" onclick="openCustomBadgeModal('${escapeHtml(b.id)}')">Düzenle</button>
           <button type="button" class="btn-panel-action" style="padding: 3px 8px; font-size: 11px; color: #f87171;" onclick="deleteCustomBadge('${escapeHtml(b.id)}', '${escapeHtml(b.name)}')">Sil</button>
         </div>`
      : "";

    return `
      <div style="background: rgba(10, 15, 29, 0.7); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; transition: border-color 0.15s ease;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.25); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
              ${escapeHtml(b.emoji || "🎖️")}
            </div>
            <div>
              <div style="font-weight: 600; color: #f8fafc; font-size: 13.5px;">${escapeHtml(b.name)}</div>
              <div style="font-family: monospace; font-size: 10.5px; color: #94a3b8;">${escapeHtml(b.id)}</div>
            </div>
          </div>
          <div>${badgeTypePill}</div>
        </div>

        <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.45; min-height: 32px;">
          ${escapeHtml(b.desc || "Kazanım kuralı belirtilmemiş.")}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 8px;">
          <span style="font-size: 10.5px; color: #64748b;">${isCustom ? "Yönetici Tanımlı" : "Otomatik Başarım"}</span>
          ${customActions}
        </div>
      </div>
    `;
  }).join("");
}

function renderRecentBadgeUsersTable() {
  const tbody = document.getElementById("badge-users-table-body");
  if (!tbody) return;

  const users = localBadgesData.recentUsers || [];

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 32px; text-align: center; color: var(--text-muted);">
          Sunucuda henüz rozet veya unvan kazanmış üye kaydı bulunmuyor.
        </td>
      </tr>
    `;
    return;
  }

  const badgeMap = new Map();
  localBadgesData.allBadges.forEach((b) => badgeMap.set(b.id, b));

  tbody.innerHTML = users.map((u) => {
    const userBadges = Array.isArray(u.badges) ? u.badges : [];
    const activeBadges = Array.isArray(u.activeBadges) && u.activeBadges.length > 0 ? u.activeBadges : userBadges;

    const badgesHtml = activeBadges.length > 0
      ? activeBadges.map((bId) => {
          const badgeObj = badgeMap.get(bId);
          const emoji = badgeObj?.emoji || "🎖️";
          const name = badgeObj?.name || bId;
          return `<span style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); padding: 2px 7px; border-radius: 6px; font-size: 11.5px; color: #e2e8f0; display: inline-flex; align-items: center; gap: 4px;" title="${escapeHtml(name)}">${escapeHtml(emoji)} ${escapeHtml(name)}</span>`;
        }).join(" ")
      : `<span style="color: var(--text-muted); font-style: italic; font-size: 11.5px;">Rozet Kuşanılmamış</span>`;

    const titleHtml = u.title
      ? `<span style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); padding: 3px 8px; border-radius: 6px; font-weight: 600; color: #d8b4fe; font-size: 11.5px;">${escapeHtml(u.title)}</span>`
      : `<span style="color: var(--text-muted); font-style: italic; font-size: 11.5px;">Unvan Yok</span>`;

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s ease;">
        <td style="padding: 12px 16px;">
          <span style="font-family: monospace; font-size: 12px; color: #94a3b8; background: rgba(15, 23, 42, 0.6); padding: 3px 7px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.05);">
            ${escapeHtml(u.userId)}
          </span>
        </td>
        <td style="padding: 12px 16px;">${titleHtml}</td>
        <td style="padding: 12px 16px;">
          <div style="display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
            ${badgesHtml}
          </div>
        </td>
        <td style="padding: 12px 16px;">
          <span style="font-weight: 700; color: #38bdf8;">${userBadges.length}</span>
          <span style="color: var(--text-muted); font-size: 11px;"> Adet</span>
        </td>
        <td style="padding: 12px 16px; text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-panel-action" style="padding: 4px 10px; font-size: 11.5px;" onclick="selectBadgeUserForAction('${escapeHtml(u.userId)}')">
              ID'yi Seç
            </button>
            <button type="button" class="btn-panel-action" style="padding: 4px 10px; font-size: 11.5px; color: #f87171;" onclick="clearUserBadges('${escapeHtml(u.userId)}')">
              Temizle
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function selectBadgeUserForAction(userId) {
  const inp = document.getElementById("badge-assign-user-id");
  if (inp) {
    inp.value = userId;
    inp.scrollIntoView({ behavior: "smooth", block: "center" });
    inp.focus();
    window.showToast("Kullanıcı ID'si seçim kutusuna aktarıldı.", "info");
  }
}

async function clearUserBadges(userId) {
  const confirmed = confirm(`Kullanıcı (${userId}) için atanmış tüm rozet ve unvanlar kaldırılacaktır.\n\nOnaylıyor musunuz?`);
  if (!confirmed) return;

  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/badges/clear-user/${gId}` : "/api/badges/clear-user";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Rozet ve unvanlar temizlendi.", "success");
      loadBadgesPage();
    } else {
      window.showToast(data.error || "İşlem uygulanamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}
window.clearUserBadges = clearUserBadges;

async function assignBadgeAction(action) {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("badge-assign-user-id")?.value.trim();
  const badgeId = document.getElementById("badge-assign-badge-select")?.value;

  if (!userId) {
    window.showToast("Lütfen bir Kullanıcı Discord ID giriniz.", "warning");
    return;
  }
  if (!badgeId) {
    window.showToast("Lütfen işlem yapılacak rozeti seçiniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/badges/assign/${gId}` : "/api/badges/assign";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, badgeId, action })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Rozet işlemi uygulandı.", "success");
      loadBadgesPage();
    } else {
      window.showToast(data.error || "İşlem başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function assignTitleAction(action) {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("badge-assign-user-id")?.value.trim();
  const title = document.getElementById("badge-assign-title-select")?.value;

  if (!userId) {
    window.showToast("Lütfen bir Kullanıcı Discord ID giriniz.", "warning");
    return;
  }
  if (!title && action === "add") {
    window.showToast("Lütfen kuşanılacak unvanı seçiniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/badges/assign/${gId}` : "/api/badges/assign";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, action })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Unvan işlemi uygulandı.", "success");
      loadBadgesPage();
    } else {
      window.showToast(data.error || "İşlem başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveBadgeSettings() {
  const gId = getSelectedGuildId();
  const enabled = Boolean(document.getElementById("badge-setting-enabled")?.checked);

  try {
    const endpoint = gId ? `/api/badges/${gId}` : "/api/badges";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Rozet sistemi ayarları kaydedildi.", "success");
      clearDirty();
      loadBadgesPage();
    } else {
      window.showToast(data.error || "Ayarlar kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openCustomBadgeModal(badgeId = null) {
  const modal = document.getElementById("custom-badge-modal-backdrop");
  if (!modal) return;

  const emojiInp = document.getElementById("modal-badge-emoji");
  const nameInp = document.getElementById("modal-badge-name");
  const idInp = document.getElementById("modal-badge-id");
  const origIdInp = document.getElementById("modal-badge-original-id");
  const descInp = document.getElementById("modal-badge-desc");
  const titleEl = document.getElementById("custom-badge-modal-title");

  if (badgeId) {
    const b = localBadgesData.allBadges.find((x) => String(x.id) === String(badgeId));
    if (titleEl) titleEl.textContent = "Özel Rozeti Düzenle";
    if (emojiInp) emojiInp.value = b?.emoji || "🎖️";
    if (nameInp) nameInp.value = b?.name || "";
    if (idInp) idInp.value = b?.id || "";
    if (origIdInp) origIdInp.value = b?.id || "";
    if (descInp) descInp.value = b?.desc || "";
  } else {
    if (titleEl) titleEl.textContent = "Yeni Özel Rozet Tanımla";
    if (emojiInp) emojiInp.value = "🎖️";
    if (nameInp) nameInp.value = "";
    if (idInp) idInp.value = "";
    if (origIdInp) origIdInp.value = "";
    if (descInp) descInp.value = "";
  }

  modal.style.display = "flex";
}

function closeCustomBadgeModal() {
  const modal = document.getElementById("custom-badge-modal-backdrop");
  if (!modal) return;
  modal.style.display = "none";
  const origIdInp = document.getElementById("modal-badge-original-id");
  if (origIdInp) origIdInp.value = "";
}

async function submitCustomBadgeForm() {
  const gId = getSelectedGuildId();
  const emoji = document.getElementById("modal-badge-emoji")?.value.trim() || "🎖️";
  const name = document.getElementById("modal-badge-name")?.value.trim();
  const id = document.getElementById("modal-badge-id")?.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const originalId = document.getElementById("modal-badge-original-id")?.value.trim();
  const desc = document.getElementById("modal-badge-desc")?.value.trim();

  if (!id || !name) {
    window.showToast("Rozet adı ve benzersiz ID kodu zorunludur.", "warning");
    return;
  }

  const isEdit = Boolean(originalId);

  try {
    const endpoint = gId ? `/api/badges/custom/${gId}` : "/api/badges/custom";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: isEdit ? "update" : "create",
        badge: { id, originalId: originalId || id, name, emoji, desc }
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || (isEdit ? "Özel rozet güncellendi." : "Özel rozet eklendi."), "success");
      closeCustomBadgeModal();
      loadBadgesPage();
    } else {
      window.showToast(data.error || "Özel rozet kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteCustomBadge(badgeId, badgeName) {
  const confirmed = confirm(`"${badgeName}" adlı özel rozet silinecektir.\n\nOnaylıyor musunuz?`);
  if (!confirmed) return;

  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/badges/custom/${gId}` : "/api/badges/custom";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        badge: { id: badgeId }
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Özel rozet silindi.", "info");
      loadBadgesPage();
    } else {
      window.showToast(data.error || "Özel rozet silinemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

window.loadBadgesPage = loadBadgesPage;
window.renderBadgesStats = renderBadgesStats;
window.populateBadgeAndTitleSelects = populateBadgeAndTitleSelects;
window.renderBadgesCatalog = renderBadgesCatalog;
window.renderRecentBadgeUsersTable = renderRecentBadgeUsersTable;
window.selectBadgeUserForAction = selectBadgeUserForAction;
window.assignBadgeAction = assignBadgeAction;
window.assignTitleAction = assignTitleAction;
window.saveBadgeSettings = saveBadgeSettings;
window.openCustomBadgeModal = openCustomBadgeModal;
window.closeCustomBadgeModal = closeCustomBadgeModal;
window.submitCustomBadgeForm = submitCustomBadgeForm;
window.deleteCustomBadge = deleteCustomBadge;

let localPetsData = {
  enabled: true,
  basePrice: 5000,
  feedCost: 200,
  catalog: [],
  pets: [],
  stats: {}
};

async function loadPetsPage() {
  const gId = getSelectedGuildId();
  try {
    await ensureDiscordMeta(gId);
    const endpoint = gId ? `/api/pets/${gId}` : "/api/pets";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success && data.enabled === undefined) {
      window.showToast(data.error || "Pet verileri alınamadı.", "error");
      return;
    }

    localPetsData = {
      enabled: data.enabled !== false,
      basePrice: Number(data.basePrice) || 5000,
      feedCost: Number(data.feedCost) || 200,
      catalog: Array.isArray(data.catalog) ? data.catalog : [],
      pets: Array.isArray(data.pets) ? data.pets : (Array.isArray(data.activePets) ? data.activePets : []),
      stats: data.stats || {}
    };

    const toggle = document.getElementById("pet-setting-enabled");
    if (toggle) toggle.checked = localPetsData.enabled;

    const basePriceInp = document.getElementById("pet-setting-base-price");
    if (basePriceInp) basePriceInp.value = localPetsData.basePrice;

    const feedCostInp = document.getElementById("pet-setting-feed-cost");
    if (feedCostInp) feedCostInp.value = localPetsData.feedCost;

    renderPetStats();
    renderPetCatalog();
    renderPetsTable();
  } catch (err) {
    window.showToast("Pet verileri yüklenirken bağlantı hatası: " + err.message, "error");
  }
}

function renderPetStats() {
  const totalPetsEl = document.getElementById("pet-stat-total-pets");
  const activePetsEl = document.getElementById("pet-stat-active-pets");
  const topPetEl = document.getElementById("pet-stat-top-pet");
  const topSubtextEl = document.getElementById("pet-stat-top-subtext");
  const avgEnergyEl = document.getElementById("pet-stat-avg-energy");

  const petCount = localPetsData.pets.length;
  const activeCount = localPetsData.pets.filter((p) => p.isActive).length;

  if (totalPetsEl) totalPetsEl.textContent = `${petCount} Pet`;
  if (activePetsEl) activePetsEl.textContent = `${activeCount} Aktif`;

  if (topPetEl) {
    if (localPetsData.stats?.topPet) {
      const p = localPetsData.stats.topPet;
      const emojiMap = { kitsune: "🦊", dragon: "🐉", cat: "🐈", owl: "🦉", wolf: "🐺" };
      const icon = emojiMap[p.petType] || "🐾";
      topPetEl.textContent = `${icon} ${p.name}`;
      if (topSubtextEl) topSubtextEl.textContent = `Seviye: ${p.level || 1}`;
    } else if (petCount > 0) {
      const p = localPetsData.pets[0];
      const emojiMap = { kitsune: "🦊", dragon: "🐉", cat: "🐈", owl: "🦉", wolf: "🐺" };
      const icon = emojiMap[p.petType] || "🐾";
      topPetEl.textContent = `${icon} ${p.name}`;
      if (topSubtextEl) topSubtextEl.textContent = `Seviye: ${p.level || 1}`;
    } else {
      topPetEl.textContent = "-";
      if (topSubtextEl) topSubtextEl.textContent = "Henüz sahiplenilen pet yok";
    }
  }

  if (avgEnergyEl) {
    const avg = localPetsData.stats?.avgEnergy ?? 100;
    avgEnergyEl.textContent = `%${avg}`;
  }
}

function renderPetCatalog() {
  const grid = document.getElementById("pet-catalog-grid");
  if (!grid) return;

  const catalog = localPetsData.catalog || [];
  if (catalog.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 24px; color: var(--text-muted);">Katalog verisi bulunamadı.</div>`;
    return;
  }

  grid.innerHTML = catalog.map((p) => {
    return `
      <div style="background: rgba(10, 15, 29, 0.7); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: border-color 0.15s ease;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.25); display: flex; align-items: center; justify-content: center; font-size: 22px;">
              ${escapeHtml(p.emoji || "🐾")}
            </div>
            <div>
              <div style="font-weight: 600; color: #f8fafc; font-size: 14px;">${escapeHtml(p.name)}</div>
              <span class="stat-badge badge-blue" style="font-size: 10px; text-transform: uppercase;">${escapeHtml(p.type)}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-weight: 700; color: #fbbf24; font-size: 13px;">${(p.price || 0).toLocaleString("tr-TR")} Coin</span>
          </div>
        </div>

        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.45; min-height: 34px;">
          ${escapeHtml(p.desc || "")}
        </div>

        <div style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #64748b;">Bonus Türü: <strong style="color: #cbd5e1;">${escapeHtml(p.bonusType || "Genel")}</strong></span>
          <button type="button" class="btn-panel-action" style="padding: 3px 8px; font-size: 11px;" onclick="prefillDirectAdopt('${escapeHtml(p.type)}')">
            Seç
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function prefillDirectAdopt(type) {
  const sel = document.getElementById("pet-direct-type-select");
  if (sel) {
    sel.value = type;
    sel.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function renderPetsTable() {
  const tbody = document.getElementById("pet-table-body");
  if (!tbody) return;

  const search = document.getElementById("pet-table-search")?.value.toLowerCase().trim() || "";
  const filter = document.getElementById("pet-table-filter")?.value || "all";

  const emojiMap = { kitsune: "🦊", dragon: "🐉", cat: "🐈", owl: "🦉", wolf: "🐺" };

  const filtered = (localPetsData.pets || []).filter((p) => {
    if (filter === "active" && !p.isActive) return false;
    if (filter === "low_energy" && (Number(p.energy) || 0) > 30) return false;
    if (search) {
      const inUser = (p.userId || "").toLowerCase().includes(search);
      const inName = (p.name || "").toLowerCase().includes(search);
      const inType = (p.petType || "").toLowerCase().includes(search);
      if (!inUser && !inName && !inType) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 32px; text-align: center; color: var(--text-muted);">
          Kayıtlı veya arama kriterine uyan evcil hayvan bulunamadı. "Pet Tanımla" butonu ile ekleyebilirsiniz.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((p) => {
    const icon = emojiMap[p.petType] || "🐾";
    const energy = Math.max(0, Math.min(100, Number(p.energy) ?? 100));
    let energyColor = "#4ade80";
    if (energy < 30) energyColor = "#f87171";
    else if (energy < 65) energyColor = "#fbbf24";

    const statusPill = p.isActive
      ? `<span class="stat-badge badge-green">AKTİF YOLDAŞ</span>`
      : `<span class="stat-badge badge-orange">BEKLEMEDE</span>`;

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s ease;">
        <td style="padding: 12px 16px;">
          <span style="font-family: monospace; font-size: 12px; color: #94a3b8; background: rgba(15, 23, 42, 0.6); padding: 3px 7px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.05);">
            ${escapeHtml(p.userId)}
          </span>
        </td>
        <td style="padding: 12px 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">${icon}</span>
            <span style="font-weight: 600; color: #f8fafc; font-size: 13.5px;">${escapeHtml(p.name)}</span>
          </div>
        </td>
        <td style="padding: 12px 16px;">
          <span class="stat-badge badge-blue" style="font-size: 11px; text-transform: uppercase;">
            ${escapeHtml(p.petType)}
          </span>
        </td>
        <td style="padding: 12px 16px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="stat-badge badge-purple" style="font-size: 11px;">Lv. ${p.level || 1}</span>
            <span style="font-size: 11px; color: var(--text-muted);">(${p.xp || 0} XP)</span>
          </div>
        </td>
        <td style="padding: 12px 16px; min-width: 140px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden;">
              <div style="width: ${energy}%; height: 100%; background: ${energyColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
            <span style="font-size: 11.5px; font-weight: 600; color: ${energyColor}; min-width: 32px;">%${energy}</span>
          </div>
        </td>
        <td style="padding: 12px 16px;">${statusPill}</td>
        <td style="padding: 12px 16px; text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="petAction('feed', '${p._id || p.id}')" title="Enerjiyi %100 yap">
              🍖 Besle
            </button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="petAction('level_up', '${p._id || p.id}')" title="Seviye artır">
              ⚡ Seviye
            </button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="petAction('toggle_active', '${p._id || p.id}')" title="Aktifliği değiştir">
              🔄
            </button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="openEditPetModal('${p._id || p.id}')" title="Peti düzenle">
              ✏️ Düzenle
            </button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #f87171;" onclick="petAction('delete', '${p._id || p.id}', '${escapeHtml(p.name)}')" title="Peti serbest bırak">
              Sil
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function petAction(action, petId, petName = "") {
  if (action === "delete") {
    const confirmed = confirm(`"${petName || "Bu pet"}" serbest bırakılacak ve kalıcı olarak silinecektir.\n\nOnaylıyor musunuz?`);
    if (!confirmed) return;
  }

  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/pets/action/${gId}` : "/api/pets/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, petId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "İşlem başarılı.", "success");
      loadPetsPage();
    } else {
      window.showToast(data.error || "İşlem uygulanamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function savePetSettings() {
  const gId = getSelectedGuildId();
  const enabled = Boolean(document.getElementById("pet-setting-enabled")?.checked);
  const basePrice = Number(document.getElementById("pet-setting-base-price")?.value) || 5000;
  const feedCost = Number(document.getElementById("pet-setting-feed-cost")?.value) || 200;

  try {
    const endpoint = gId ? `/api/pets/settings/${gId}` : "/api/pets/settings";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, basePrice, feedCost })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Pet ayarları kaydedildi.", "success");
      clearDirty();
      loadPetsPage();
    } else {
      window.showToast(data.error || "Ayarlar kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function submitDirectAdoptPet() {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("pet-direct-user-id")?.value.trim();
  const petType = document.getElementById("pet-direct-type-select")?.value;
  const name = document.getElementById("pet-direct-name-input")?.value.trim();
  const level = Number(document.getElementById("pet-direct-level-input")?.value) || 1;

  if (!userId) {
    window.showToast("Lütfen bir Kullanıcı Discord ID giriniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/pets/action/${gId}` : "/api/pets/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adopt", userId, petType, name, level })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Pet tanımlandı.", "success");
      const idInp = document.getElementById("pet-direct-user-id");
      if (idInp) idInp.value = "";
      const nameInp = document.getElementById("pet-direct-name-input");
      if (nameInp) nameInp.value = "";
      loadPetsPage();
    } else {
      window.showToast(data.error || "Pet tanımlanamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openAdoptPetModal() {
  const modal = document.getElementById("adopt-pet-modal-backdrop");
  if (!modal) return;
  const userInp = document.getElementById("modal-pet-user-id");
  const nameInp = document.getElementById("modal-pet-name");
  const levelInp = document.getElementById("modal-pet-level");
  if (userInp) userInp.value = "";
  if (nameInp) nameInp.value = "";
  if (levelInp) levelInp.value = 1;
  modal.style.display = "flex";
}

function closeAdoptPetModal() {
  const modal = document.getElementById("adopt-pet-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitModalAdoptPet() {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("modal-pet-user-id")?.value.trim();
  const petType = document.getElementById("modal-pet-type")?.value;
  const name = document.getElementById("modal-pet-name")?.value.trim();
  const level = Number(document.getElementById("modal-pet-level")?.value) || 1;

  if (!userId) {
    window.showToast("Kullanıcı ID zorunludur.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/pets/action/${gId}` : "/api/pets/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adopt", userId, petType, name, level })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Pet tanımlandı.", "success");
      closeAdoptPetModal();
      loadPetsPage();
    } else {
      window.showToast(data.error || "Pet tanımlanamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openEditPetModal(petId) {
  const modal = document.getElementById("edit-pet-modal-backdrop");
  if (!modal) return;
  const p = (localPetsData.pets || []).find((x) => String(x._id || x.id) === String(petId));
  if (!p) return;

  const idInp = document.getElementById("edit-modal-pet-id");
  const userInp = document.getElementById("edit-modal-pet-userid");
  const typeInp = document.getElementById("edit-modal-pet-type");
  const nameInp = document.getElementById("edit-modal-pet-name");
  const levelInp = document.getElementById("edit-modal-pet-level");
  const energyInp = document.getElementById("edit-modal-pet-energy");
  const activeInp = document.getElementById("edit-modal-pet-active");

  if (idInp) idInp.value = p._id || p.id;
  if (userInp) userInp.value = p.userId || "";
  if (typeInp) typeInp.value = p.petType || "kitsune";
  if (nameInp) nameInp.value = p.name || "";
  if (levelInp) levelInp.value = p.level || 1;
  if (energyInp) energyInp.value = p.energy !== undefined ? p.energy : 100;
  if (activeInp) activeInp.checked = Boolean(p.isActive);

  modal.style.display = "flex";
}

function closeEditPetModal() {
  const modal = document.getElementById("edit-pet-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitEditPet() {
  const gId = getSelectedGuildId();
  const petId = document.getElementById("edit-modal-pet-id")?.value;
  const userId = document.getElementById("edit-modal-pet-userid")?.value.trim();
  const petType = document.getElementById("edit-modal-pet-type")?.value;
  const name = document.getElementById("edit-modal-pet-name")?.value.trim();
  const level = Number(document.getElementById("edit-modal-pet-level")?.value) || 1;
  const energy = Number(document.getElementById("edit-modal-pet-energy")?.value) || 0;
  const isActive = Boolean(document.getElementById("edit-modal-pet-active")?.checked);

  if (!petId) {
    window.showToast("Pet ID bulunamadı.", "error");
    return;
  }

  try {
    const endpoint = gId ? `/api/pets/action/${gId}` : "/api/pets/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", petId, userId, petType, name, level, energy, isActive })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Pet güncellendi.", "success");
      closeEditPetModal();
      loadPetsPage();
    } else {
      window.showToast(data.error || "Pet güncellenemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

window.loadPetsPage = loadPetsPage;
window.renderPetStats = renderPetStats;
window.renderPetCatalog = renderPetCatalog;
window.prefillDirectAdopt = prefillDirectAdopt;
window.renderPetsTable = renderPetsTable;
window.petAction = petAction;
window.savePetSettings = savePetSettings;
window.submitDirectAdoptPet = submitDirectAdoptPet;
window.openAdoptPetModal = openAdoptPetModal;
window.closeAdoptPetModal = closeAdoptPetModal;
window.submitModalAdoptPet = submitModalAdoptPet;
window.openEditPetModal = openEditPetModal;
window.closeEditPetModal = closeEditPetModal;
window.submitEditPet = submitEditPet;

let localSeasonData = null;
let localBpParticipants = [];

async function loadBattlePassPage() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/battlepass/${gId}` : "/api/battlepass";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Battle Pass verileri alınamadı.", "error");
      return;
    }

    localSeasonData = data.season || {};
    localBpParticipants = data.participants || [];

    renderBpStats(data.stats);

    const activeCheck = document.getElementById("bp-setting-active");
    if (activeCheck) activeCheck.checked = localSeasonData.active !== false;

    const nameInp = document.getElementById("bp-setting-name");
    if (nameInp) nameInp.value = localSeasonData.seasonName || "";

    const startInp = document.getElementById("bp-setting-start");
    if (startInp && localSeasonData.startDate) {
      startInp.value = new Date(localSeasonData.startDate).toISOString().slice(0, 10);
    }

    const endInp = document.getElementById("bp-setting-end");
    if (endInp && localSeasonData.endDate) {
      endInp.value = new Date(localSeasonData.endDate).toISOString().slice(0, 10);
    }

    renderBpTiers();
    renderBpQuests();
    renderBpUsersTable();
  } catch (err) {
    window.showToast("Battle Pass yüklenirken bağlantı hatası: " + err.message, "error");
  }
}

function renderBpStats(stats) {
  const badgeEl = document.getElementById("bp-stat-season-badge");
  const nameEl = document.getElementById("bp-stat-season-name");
  const datesEl = document.getElementById("bp-stat-season-dates");
  const statusBadge = document.getElementById("bp-stat-status-badge");
  const daysLeftEl = document.getElementById("bp-stat-days-left");
  const partEl = document.getElementById("bp-stat-participants");
  const vipSubEl = document.getElementById("bp-stat-vip-sub");
  const topPlayerEl = document.getElementById("bp-stat-top-player");
  const topSubEl = document.getElementById("bp-stat-top-sub");

  if (badgeEl) badgeEl.textContent = `SEZON ${stats?.seasonNumber || 1}`;
  if (nameEl) nameEl.textContent = stats?.seasonName || "1. Sezon: Kiraz Çiçeği Festivali";

  if (datesEl && localSeasonData) {
    const sStr = localSeasonData.startDate ? new Date(localSeasonData.startDate).toLocaleDateString("tr-TR") : "";
    const eStr = localSeasonData.endDate ? new Date(localSeasonData.endDate).toLocaleDateString("tr-TR") : "";
    datesEl.textContent = `${sStr} - ${eStr}`;
  }

  if (statusBadge) {
    const isActive = stats?.active !== false;
    statusBadge.textContent = isActive ? "AKTİF" : "DONDURULDU";
    statusBadge.className = `stat-badge ${isActive ? "badge-green" : "badge-orange"}`;
  }

  if (daysLeftEl) {
    const d = stats?.daysLeft ?? 30;
    daysLeftEl.textContent = `${d} Gün Kaldı`;
  }

  if (partEl) {
    partEl.textContent = `${stats?.totalParticipants || 0} Oyuncu`;
  }

  if (vipSubEl) {
    vipSubEl.textContent = `${stats?.vipCount || 0} VIP Bilet Sahibi`;
  }

  if (topPlayerEl) {
    if (stats?.topPlayer) {
      topPlayerEl.textContent = `Lv. ${stats.topPlayer.passLevel} (${(stats.topPlayer.passXp || 0).toLocaleString("tr-TR")} XP)`;
      if (topSubEl) topSubEl.textContent = `Oyuncu: ${stats.topPlayer.userId} ${stats.topPlayer.hasVipPass ? "(VIP)" : ""}`;
    } else {
      topPlayerEl.textContent = "Henüz Oyuncu Yok";
      if (topSubEl) topSubEl.textContent = "Görev tamamlayan üyeler burada listelenir";
    }
  }
}

function renderBpTiers() {
  const container = document.getElementById("bp-tiers-container");
  if (!container) return;

  const tiers = Array.isArray(localSeasonData?.tiers) ? [...localSeasonData.tiers] : [];
  tiers.sort((a, b) => a.level - b.level);

  if (tiers.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 24px; color: var(--text-muted);">
        Henüz kademe eklenmemiş. "+ Yeni Kademe Ekle" butonuna tıklayarak ilk kademeyi oluşturun.
      </div>
    `;
    return;
  }

  container.innerHTML = tiers.map((t) => {
    const freeReward = t.freeReward || {};
    const vipReward = t.vipReward || {};

    return `
      <div style="background: rgba(10, 15, 29, 0.6); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: border-color 0.2s ease;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="stat-badge badge-blue" style="font-size: 11.5px; font-weight: 700; padding: 3px 8px;">
              KADEME ${t.level}
            </span>
            <span style="font-size: 11.5px; color: #a5b4fc; font-weight: 600;">
              ${(Number(t.requiredXp) || 0).toLocaleString("tr-TR")} XP
            </span>
          </div>

          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
            <div style="font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Ücretsiz Ödül</div>
            <div style="font-size: 12.5px; font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
              <span>🎁</span>
              <span>${escapeHtml(freeReward.name || `${(Number(freeReward.amount) || 0).toLocaleString("tr-TR")} Coin`)}</span>
            </div>
            ${freeReward.itemId ? `<div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 2px;">Eşya: ${escapeHtml(freeReward.itemId)}</div>` : ""}
          </div>

          <div style="background: rgba(234, 179, 8, 0.06); border: 1px solid rgba(234, 179, 8, 0.25); border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 10.5px; text-transform: uppercase; color: #fbbf24; font-weight: 700; margin-bottom: 2px;">VIP Bilet Ödülü</div>
            <div style="font-size: 12.5px; font-weight: 600; color: #fef08a; display: flex; align-items: center; gap: 6px;">
              <span>👑</span>
              <span>${escapeHtml(vipReward.name || `${(Number(vipReward.amount) || 0).toLocaleString("tr-TR")} Coin`)}</span>
            </div>
            ${vipReward.itemId ? `<div style="font-size: 10px; color: #fde047; font-family: monospace; margin-top: 2px;">Eşya: ${escapeHtml(vipReward.itemId)}</div>` : ""}
          </div>
        </div>

        <div style="display: flex; gap: 6px; justify-content: flex-end; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
          <button type="button" class="btn-panel-action" style="padding: 3px 8px; font-size: 11px;" onclick="openTierModal(${t.level})">Düzenle</button>
          <button type="button" class="btn-panel-action" style="padding: 3px 8px; font-size: 11px; color: #f87171;" onclick="deleteTier(${t.level})">Sil</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderBpQuests() {
  const dailyContainer = document.getElementById("bp-daily-quests-container");
  const weeklyContainer = document.getElementById("bp-weekly-quests-container");

  const dailyQuests = Array.isArray(localSeasonData?.dailyQuestsConfig) ? localSeasonData.dailyQuestsConfig : [];
  const weeklyQuests = Array.isArray(localSeasonData?.weeklyQuestsConfig) ? localSeasonData.weeklyQuestsConfig : [];

  if (dailyContainer) {
    if (dailyQuests.length === 0) {
      dailyContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">Tanımlı günlük görev bulunmuyor.</div>`;
    } else {
      dailyContainer.innerHTML = dailyQuests.map((q) => {
        return `
          <div style="background: rgba(10, 15, 29, 0.6); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.25); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                🎯
              </div>
              <div style="min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(q.title)}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(q.description || `${q.targetType}: ${q.targetCount}`)}
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
              <span class="stat-badge badge-blue" style="font-size: 10.5px;">+${q.xpReward} XP</span>
              <span class="stat-badge badge-orange" style="font-size: 10.5px;">+${(Number(q.coinReward) || 0).toLocaleString("tr-TR")} C</span>
              <button type="button" class="btn-panel-action" style="padding: 3px 6px; font-size: 11px;" onclick="openQuestModal('daily', '${q.id}')">Düzenle</button>
              <button type="button" class="btn-panel-action" style="padding: 3px 6px; font-size: 11px; color: #f87171;" onclick="deleteQuest('daily', '${q.id}')">Sil</button>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  if (weeklyContainer) {
    if (weeklyQuests.length === 0) {
      weeklyContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">Tanımlı haftalık görev bulunmuyor.</div>`;
    } else {
      weeklyContainer.innerHTML = weeklyQuests.map((q) => {
        return `
          <div style="background: rgba(10, 15, 29, 0.6); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.25); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                ⭐
              </div>
              <div style="min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(q.title)}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(q.description || `${q.targetType}: ${q.targetCount}`)}
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
              <span class="stat-badge badge-purple" style="font-size: 10.5px;">+${q.xpReward} XP</span>
              <span class="stat-badge badge-orange" style="font-size: 10.5px;">+${(Number(q.coinReward) || 0).toLocaleString("tr-TR")} C</span>
              <button type="button" class="btn-panel-action" style="padding: 3px 6px; font-size: 11px;" onclick="openQuestModal('weekly', '${q.id}')">Düzenle</button>
              <button type="button" class="btn-panel-action" style="padding: 3px 6px; font-size: 11px; color: #f87171;" onclick="deleteQuest('weekly', '${q.id}')">Sil</button>
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

function renderBpUsersTable() {
  const tbody = document.getElementById("bp-users-table-body");
  if (!tbody) return;

  const search = document.getElementById("bp-user-search")?.value.toLowerCase().trim() || "";
  const filter = document.getElementById("bp-user-filter")?.value || "all";

  const filtered = localBpParticipants.filter((u) => {
    if (filter === "vip" && !u.hasVipPass) return false;
    if (filter === "standard" && u.hasVipPass) return false;
    if (search && !(u.userId || "").toLowerCase().includes(search)) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 32px; text-align: center; color: var(--text-muted);">
          Kayıtlı veya filtre kriterine uyan oyuncu bulunamadı.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((u) => {
    const vipPill = u.hasVipPass
      ? `<span class="stat-badge badge-orange" style="display: inline-flex; align-items: center; gap: 4px;"><span>👑</span><span>VIP BİLET</span></span>`
      : `<span class="stat-badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1;">STANDART</span>`;

    const freeTiersCount = Array.isArray(u.claimedFreeTiers) ? u.claimedFreeTiers.length : 0;
    const vipTiersCount = Array.isArray(u.claimedVipTiers) ? u.claimedVipTiers.length : 0;
    const totalClaimed = freeTiersCount + vipTiersCount;

    const completedDaily = (u.dailyQuests || []).filter((q) => q.completed).length;
    const totalDaily = (u.dailyQuests || []).length;

    const completedWeekly = (u.weeklyQuests || []).filter((q) => q.completed).length;
    const totalWeekly = (u.weeklyQuests || []).length;

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s ease;">
        <td style="padding: 12px 16px;">
          <span style="font-family: monospace; font-size: 12px; color: #f8fafc; background: rgba(15, 23, 42, 0.6); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.05);">
            ${escapeHtml(u.userId)}
          </span>
        </td>
        <td style="padding: 12px 16px;">${vipPill}</td>
        <td style="padding: 12px 16px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="stat-badge badge-blue" style="font-size: 11px;">Lv. ${u.passLevel || 1}</span>
            <span style="font-size: 11.5px; color: #a5b4fc; font-weight: 600;">${(Number(u.passXp) || 0).toLocaleString("tr-TR")} XP</span>
          </div>
        </td>
        <td style="padding: 12px 16px;">
          <span style="font-size: 12px; color: #38bdf8; font-weight: 600;">${totalClaimed} Ödül</span>
          <span style="font-size: 11px; color: var(--text-muted);">(${freeTiersCount} Ücretsiz, ${vipTiersCount} VIP)</span>
        </td>
        <td style="padding: 12px 16px;">
          <div style="font-size: 11.5px; color: #94a3b8;">
            Günlük: <span style="color: #4ade80; font-weight: 600;">${completedDaily}/${totalDaily}</span> | 
            Haftalık: <span style="color: #c084fc; font-weight: 600;">${completedWeekly}/${totalWeekly}</span>
          </div>
        </td>
        <td style="padding: 12px 16px; text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="userBpAction('${u.userId}', 'toggle_vip')">
              ${u.hasVipPass ? "VIP Kaldır" : "VIP Tanımla"}
            </button>
            <button type="button" class="btn-action-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="userBpAction('${u.userId}', 'add_xp', { amount: 250 })">
              +250 XP
            </button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #f87171;" onclick="userBpAction('${u.userId}', 'reset_user')">
              Sıfırla
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function saveSeasonSettings() {
  const gId = getSelectedGuildId();
  const active = Boolean(document.getElementById("bp-setting-active")?.checked);
  const seasonName = document.getElementById("bp-setting-name")?.value.trim();
  const startDate = document.getElementById("bp-setting-start")?.value;
  const endDate = document.getElementById("bp-setting-end")?.value;

  try {
    const endpoint = gId ? `/api/battlepass/season/${gId}` : "/api/battlepass/season";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active, seasonName, startDate, endDate })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Sezon ayarları kaydedildi.", "success");
      clearDirty();
      loadBattlePassPage();
    } else {
      window.showToast(data.error || "Hata oluştu.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openTierModal(level = null) {
  const modal = document.getElementById("tier-modal-backdrop");
  if (!modal) return;

  const titleEl = document.getElementById("tier-modal-title");
  const lvlInp = document.getElementById("modal-tier-level");
  const reqXpInp = document.getElementById("modal-tier-reqxp");
  const freeName = document.getElementById("modal-tier-free-name");
  const freeAmt = document.getElementById("modal-tier-free-amount");
  const freeItemId = document.getElementById("modal-tier-free-itemid");
  const vipName = document.getElementById("modal-tier-vip-name");
  const vipAmt = document.getElementById("modal-tier-vip-amount");
  const vipItemId = document.getElementById("modal-tier-vip-itemid");

  if (level !== null && localSeasonData) {
    const t = (localSeasonData.tiers || []).find((x) => x.level === level);
    if (titleEl) titleEl.textContent = `Kademe ${level} Düzenle`;
    if (lvlInp) {
      lvlInp.value = level;
      lvlInp.disabled = true;
    }
    if (reqXpInp) reqXpInp.value = t?.requiredXp ?? (level * 250);
    if (freeName) freeName.value = t?.freeReward?.name || "";
    if (freeAmt) freeAmt.value = t?.freeReward?.amount ?? 1000;
    if (freeItemId) freeItemId.value = t?.freeReward?.itemId || "";
    if (vipName) vipName.value = t?.vipReward?.name || "";
    if (vipAmt) vipAmt.value = t?.vipReward?.amount ?? 3000;
    if (vipItemId) vipItemId.value = t?.vipReward?.itemId || "";
  } else {
    const nextLvl = (localSeasonData?.tiers || []).length + 1;
    if (titleEl) titleEl.textContent = "Yeni Kademe Ekle";
    if (lvlInp) {
      lvlInp.value = nextLvl;
      lvlInp.disabled = false;
    }
    if (reqXpInp) reqXpInp.value = nextLvl * 250;
    if (freeName) freeName.value = `${nextLvl * 500} Coin`;
    if (freeAmt) freeAmt.value = nextLvl * 500;
    if (freeItemId) freeItemId.value = "";
    if (vipName) vipName.value = `${nextLvl * 1500} Coin`;
    if (vipAmt) vipAmt.value = nextLvl * 1500;
    if (vipItemId) vipItemId.value = "";
  }

  modal.style.display = "flex";
}

function closeTierModal() {
  const modal = document.getElementById("tier-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitTierForm() {
  const gId = getSelectedGuildId();
  const lvlInp = document.getElementById("modal-tier-level");
  const level = Number(lvlInp?.value);
  const requiredXp = Number(document.getElementById("modal-tier-reqxp")?.value);
  const freeName = document.getElementById("modal-tier-free-name")?.value.trim();
  const freeAmt = Number(document.getElementById("modal-tier-free-amount")?.value) || 0;
  const freeItemId = document.getElementById("modal-tier-free-itemid")?.value.trim();
  const vipName = document.getElementById("modal-tier-vip-name")?.value.trim();
  const vipAmt = Number(document.getElementById("modal-tier-vip-amount")?.value) || 0;
  const vipItemId = document.getElementById("modal-tier-vip-itemid")?.value.trim();

  if (!level || !requiredXp) {
    window.showToast("Kademe seviyesi ve gereken XP zorunludur.", "warning");
    return;
  }

  const tier = {
    level,
    requiredXp,
    freeReward: {
      type: "COIN",
      name: freeName || `${freeAmt} Coin`,
      amount: freeAmt,
      itemId: freeItemId || ""
    },
    vipReward: {
      type: "COIN",
      name: vipName || `${vipAmt} Coin`,
      amount: vipAmt,
      itemId: vipItemId || ""
    }
  };

  try {
    const endpoint = gId ? `/api/battlepass/tier/${gId}` : "/api/battlepass/tier";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", tier })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Kademe kaydedildi.", "success");
      closeTierModal();
      loadBattlePassPage();
    } else {
      window.showToast(data.error || "Hata oluştu.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteTier(level) {
  const confirmed = confirm(`Kademe ${level} silinecektir. Onaylıyor musunuz?`);
  if (!confirmed) return;

  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/battlepass/tier/${gId}` : "/api/battlepass/tier";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", tier: { level } })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Kademe silindi.", "success");
      loadBattlePassPage();
    } else {
      window.showToast(data.error || "Hata oluştu.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openQuestModal(type = "daily", id = null) {
  const modal = document.getElementById("quest-modal-backdrop");
  if (!modal) return;

  const titleEl = document.getElementById("quest-modal-title");
  const typeSelect = document.getElementById("modal-quest-type-select");
  const idInp = document.getElementById("modal-quest-id");
  const qTitleInp = document.getElementById("modal-quest-title");
  const descInp = document.getElementById("modal-quest-desc");
  const targetSelect = document.getElementById("modal-quest-targettype");
  const countInp = document.getElementById("modal-quest-targetcount");
  const xpInp = document.getElementById("modal-quest-xp");
  const coinInp = document.getElementById("modal-quest-coin");

  if (typeSelect) typeSelect.value = type;

  if (id && localSeasonData) {
    const list = type === "weekly" ? localSeasonData.weeklyQuestsConfig : localSeasonData.dailyQuestsConfig;
    const q = (list || []).find((x) => x.id === id);
    if (titleEl) titleEl.textContent = `${type === "weekly" ? "Haftalık" : "Günlük"} Görevi Düzenle`;
    if (idInp) {
      idInp.value = id;
      idInp.disabled = true;
    }
    if (qTitleInp) qTitleInp.value = q?.title || "";
    if (descInp) descInp.value = q?.description || "";
    if (targetSelect) targetSelect.value = q?.targetType || "message";
    if (countInp) countInp.value = q?.targetCount ?? 25;
    if (xpInp) xpInp.value = q?.xpReward ?? 100;
    if (coinInp) coinInp.value = q?.coinReward ?? 500;
  } else {
    if (titleEl) titleEl.textContent = `Yeni ${type === "weekly" ? "Haftalık" : "Günlük"} Görev`;
    if (idInp) {
      idInp.value = `${type}_${Date.now()}`;
      idInp.disabled = false;
    }
    if (qTitleInp) qTitleInp.value = "";
    if (descInp) descInp.value = "";
    if (targetSelect) targetSelect.value = "message";
    if (countInp) countInp.value = type === "weekly" ? 150 : 25;
    if (xpInp) xpInp.value = type === "weekly" ? 400 : 100;
    if (coinInp) coinInp.value = type === "weekly" ? 2500 : 500;
  }

  modal.style.display = "flex";
}

function closeQuestModal() {
  const modal = document.getElementById("quest-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitQuestForm() {
  const gId = getSelectedGuildId();
  const questType = document.getElementById("modal-quest-type-select")?.value || "daily";
  const id = document.getElementById("modal-quest-id")?.value.trim();
  const title = document.getElementById("modal-quest-title")?.value.trim();
  const description = document.getElementById("modal-quest-desc")?.value.trim();
  const targetType = document.getElementById("modal-quest-targettype")?.value || "message";
  const targetCount = Number(document.getElementById("modal-quest-targetcount")?.value) || 1;
  const xpReward = Number(document.getElementById("modal-quest-xp")?.value) || 100;
  const coinReward = Number(document.getElementById("modal-quest-coin")?.value) || 0;

  if (!id || !title) {
    window.showToast("Görev ID ve başlığı zorunludur.", "warning");
    return;
  }

  const quest = { id, title, description, targetType, targetCount, xpReward, coinReward };

  try {
    const endpoint = gId ? `/api/battlepass/quest/${gId}` : "/api/battlepass/quest";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", questType, quest })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Görev kaydedildi.", "success");
      closeQuestModal();
      loadBattlePassPage();
    } else {
      window.showToast(data.error || "Hata oluştu.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteQuest(questType, id) {
  const confirmed = confirm(`"${id}" görevi kaldırılacaktır. Onaylıyor musunuz?`);
  if (!confirmed) return;

  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/battlepass/quest/${gId}` : "/api/battlepass/quest";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", questType, quest: { id } })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Görev silindi.", "success");
      loadBattlePassPage();
    } else {
      window.showToast(data.error || "Hata oluştu.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openNewSeasonModal() {
  const modal = document.getElementById("new-season-modal-backdrop");
  if (!modal) return;
  const nextNum = (localSeasonData?.season || 1) + 1;
  const nameInp = document.getElementById("modal-newseason-name");
  if (nameInp) nameInp.value = `${nextNum}. Sezon: Yeni Çağ`;
  modal.style.display = "flex";
}

function closeNewSeasonModal() {
  const modal = document.getElementById("new-season-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitNewSeason() {
  const gId = getSelectedGuildId();
  const seasonName = document.getElementById("modal-newseason-name")?.value.trim();
  const durationDays = Number(document.getElementById("modal-newseason-days")?.value) || 30;

  try {
    const endpoint = gId ? `/api/battlepass/season/${gId}` : "/api/battlepass/season";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newSeason: true, seasonName, durationDays })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Yeni sezon başlatıldı.", "success");
      closeNewSeasonModal();
      loadBattlePassPage();
    } else {
      window.showToast(data.error || "Hata oluştu.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function userBpAction(userId, action, extra = {}) {
  if (action === "reset_user") {
    const confirmed = confirm(`"${userId}" ID'li kullanıcının Battle Pass ilerlemesi ve bilet durumu tamamen sıfırlanacaktır.\n\nOnaylıyor musunuz?`);
    if (!confirmed) return;
  }

  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/battlepass/user/${gId}` : "/api/battlepass/user";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, ...extra })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Kullanıcı güncellendi.", "success");
      loadBattlePassPage();
    } else {
      window.showToast(data.error || "Hata oluştu.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function submitDirectUserBp() {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("bp-direct-user-id")?.value.trim();
  const level = Number(document.getElementById("bp-direct-level-input")?.value) || 1;
  const hasVipPass = Boolean(document.getElementById("bp-direct-vip-input")?.checked);

  if (!userId) {
    window.showToast("Kullanıcı ID giriniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/battlepass/user/${gId}` : "/api/battlepass/user";
    const res1 = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "set_level", level })
    });
    const data1 = await res1.json();
    if (hasVipPass) {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "set_vip", hasVipPass: true })
      });
    }

    if (data1.success) {
      window.showToast("Kullanıcıya Battle Pass seviyesi ve bileti tanımlandı.", "success");
      const idInp = document.getElementById("bp-direct-user-id");
      if (idInp) idInp.value = "";
      loadBattlePassPage();
    } else {
      window.showToast(data1.error || "Hata oluştu.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

window.loadBattlePassPage = loadBattlePassPage;
window.renderBpStats = renderBpStats;
window.renderBpTiers = renderBpTiers;
window.renderBpQuests = renderBpQuests;
window.renderBpUsersTable = renderBpUsersTable;
window.saveSeasonSettings = saveSeasonSettings;
window.openTierModal = openTierModal;
window.closeTierModal = closeTierModal;
window.submitTierForm = submitTierForm;
window.deleteTier = deleteTier;
window.openQuestModal = openQuestModal;
window.closeQuestModal = closeQuestModal;
window.submitQuestForm = submitQuestForm;
window.deleteQuest = deleteQuest;
window.openNewSeasonModal = openNewSeasonModal;
window.closeNewSeasonModal = closeNewSeasonModal;
window.submitNewSeason = submitNewSeason;
window.userBpAction = userBpAction;
window.submitDirectUserBp = submitDirectUserBp;

let guardCurrentConfig = null;
let guardCurrentWhitelist = { users: [], roles: [], bots: [] };
let guardCurrentWords = [];

async function loadGuardPage() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/guard/${gId}` : "/api/guard";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Güvenlik kalkanı verileri alınamadı.", "error");
      return;
    }

    guardCurrentConfig = data.guard || {};
    const safeUsers = data.guard?.safeUsers || data.whitelist?.users || [];
    const safeRoles = data.guard?.safeRoles || data.whitelist?.roles || [];
    const safeBots = data.guard?.safeBots || data.whitelist?.bots || [];
    guardCurrentWhitelist = { users: safeUsers, roles: safeRoles, bots: safeBots };
    guardCurrentWords = data.filters?.customWords || data.guard?.filteredWords || [];

    const isGuardActive = Boolean(data.guard?.active ?? data.guard?.isActive);
    const statStatus = document.getElementById("guard-stat-status");
    const badgeStatus = document.getElementById("guard-badge-status");
    if (statStatus && badgeStatus) {
      if (isGuardActive) {
        statStatus.textContent = "AKTİF";
        statStatus.style.color = "#4ade80";
        badgeStatus.textContent = "AKTİF";
        badgeStatus.className = "stat-badge badge-green";
      } else {
        statStatus.textContent = "DEVRE DIŞI";
        statStatus.style.color = "#f87171";
        badgeStatus.textContent = "KAPALI";
        badgeStatus.className = "stat-badge badge-red";
      }
    }

    const totalWhitelist = guardCurrentWhitelist.users.length + guardCurrentWhitelist.roles.length + guardCurrentWhitelist.bots.length;
    const statWhitelist = document.getElementById("guard-stat-whitelist");
    const statWhitelistDesc = document.getElementById("guard-stat-whitelist-desc");
    if (statWhitelist) statWhitelist.textContent = `${totalWhitelist} Varlık`;
    if (statWhitelistDesc) statWhitelistDesc.textContent = `${guardCurrentWhitelist.users.length} üye, ${guardCurrentWhitelist.roles.length} rol, ${guardCurrentWhitelist.bots.length} bot`;

    const isBotProt = Boolean(data.guard?.blockBots ?? data.guard?.botProtection);
    const isWebhookProt = Boolean(data.guard?.blockWebhooks ?? data.guard?.webhookProtection);
    const isPanicAuto = Boolean(data.guardPanic?.enabled ?? data.guard?.autoPanicDetection);
    const isLinkFilt = Boolean(data.filters?.linkFilter ?? data.guard?.linkFilter);
    const isCapsFilt = Boolean(data.filters?.capsFilter ?? data.guard?.capsFilter);
    const isSpamFilt = Boolean(data.filters?.spamFilter ?? data.guard?.spamFilter);

    let activeRulesCount = 0;
    if (isGuardActive) activeRulesCount++;
    if (isBotProt) activeRulesCount++;
    if (isWebhookProt) activeRulesCount++;
    if (isPanicAuto) activeRulesCount++;
    if (isLinkFilt) activeRulesCount++;
    if (isCapsFilt) activeRulesCount++;
    if (isSpamFilt) activeRulesCount++;

    const statRules = document.getElementById("guard-stat-rules");
    if (statRules) statRules.textContent = `${activeRulesCount} Kural`;

    const isPanicActive = Boolean(data.guardPanic?.isPanic ?? data.panicActive);
    const statPanic = document.getElementById("guard-stat-panic");
    const badgePanic = document.getElementById("guard-badge-panic");
    const panicBtnText = document.getElementById("guard-panic-btn-text");
    if (isPanicActive) {
      if (statPanic) {
        statPanic.textContent = "AÇIK";
        statPanic.style.color = "#ef4444";
      }
      if (badgePanic) {
        badgePanic.textContent = "PANİK";
        badgePanic.className = "stat-badge badge-red";
      }
      if (panicBtnText) panicBtnText.textContent = "Panik Kilidini Kapat";
    } else {
      if (statPanic) {
        statPanic.textContent = "KAPALI";
        statPanic.style.color = "#fbbf24";
      }
      if (badgePanic) {
        badgePanic.textContent = "NORMAL";
        badgePanic.className = "stat-badge badge-orange";
      }
      if (panicBtnText) panicBtnText.textContent = "Panik Kilidi";
    }

    const switchActive = document.getElementById("guard-switch-active");
    if (switchActive) switchActive.checked = isGuardActive;
    const switchBots = document.getElementById("guard-switch-bots");
    if (switchBots) switchBots.checked = isBotProt;
    const switchWebhooks = document.getElementById("guard-switch-webhooks");
    if (switchWebhooks) switchWebhooks.checked = isWebhookProt;
    const switchPanic = document.getElementById("guard-switch-panic-enabled");
    if (switchPanic) switchPanic.checked = isPanicAuto;
    const switchLink = document.getElementById("guard-switch-link");
    if (switchLink) switchLink.checked = isLinkFilt;
    const switchCaps = document.getElementById("guard-switch-caps");
    if (switchCaps) switchCaps.checked = isCapsFilt;
    const switchSpam = document.getElementById("guard-switch-spam");
    if (switchSpam) switchSpam.checked = isSpamFilt;

    const limits = data.limits || data.guard?.limits || {};
    const limitRoleDel = document.getElementById("guard-limit-role-delete");
    if (limitRoleDel) limitRoleDel.value = limits.roleDeleteLimit ?? limits.roleDelete ?? 1;
    const limitRoleCre = document.getElementById("guard-limit-role-create");
    if (limitRoleCre) limitRoleCre.value = limits.roleCreateLimit ?? limits.roleCreate ?? 2;
    const limitChanDel = document.getElementById("guard-limit-channel-delete");
    if (limitChanDel) limitChanDel.value = limits.channelDeleteLimit ?? limits.channelDelete ?? 1;
    const limitChanCre = document.getElementById("guard-limit-channel-create");
    if (limitChanCre) limitChanCre.value = limits.channelCreateLimit ?? limits.channelCreate ?? 2;
    const limitBan = document.getElementById("guard-limit-ban");
    if (limitBan) limitBan.value = limits.banLimit ?? limits.ban ?? 3;
    const limitKick = document.getElementById("guard-limit-kick");
    if (limitKick) limitKick.value = limits.kickLimit ?? limits.kick ?? 3;

    const roleSelect = document.getElementById("guard-whitelist-role-select");
    const roleList = data.roles || data.guildRoles || [];
    if (roleSelect && Array.isArray(roleList)) {
      let optionsHtml = '<option value="">Rol Seçiniz...</option>';
      roleList.forEach((r) => {
        optionsHtml += `<option value="${r.id}">${escapeHtml(r.name)}</option>`;
      });
      roleSelect.innerHTML = optionsHtml;
    }

    renderGuardWhitelist(guardCurrentWhitelist);
    renderGuardWords(guardCurrentWords);
  } catch (err) {
    window.showToast("Kalkan verileri alınırken hata: " + err.message, "error");
  }
}

function renderGuardWhitelist(whitelist) {
  const usersContainer = document.getElementById("guard-whitelist-users-container");
  const usersCount = document.getElementById("guard-whitelist-users-count");
  if (usersCount) usersCount.textContent = (whitelist.users?.length || 0).toString();
  if (usersContainer) {
    if (!whitelist.users || whitelist.users.length === 0) {
      usersContainer.innerHTML = '<span style="font-size: 11px; color: var(--text-muted);">Henüz kullanıcı eklenmedi.</span>';
    } else {
      usersContainer.innerHTML = whitelist.users.map((u) => `
        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); border-radius:4px; padding:3px 8px; font-size:11.5px; font-family:monospace; color:#93c5fd;">
          <span>${escapeHtml(u)}</span>
          <button type="button" style="background:none; border:none; color:#f87171; cursor:pointer; font-weight:700; font-size:13px; line-height:1;" onclick="removeWhitelistItem('user', '${escapeHtml(u)}')" title="Kaldır">&times;</button>
        </div>
      `).join("");
    }
  }

  const rolesContainer = document.getElementById("guard-whitelist-roles-container");
  const rolesCount = document.getElementById("guard-whitelist-roles-count");
  if (rolesCount) rolesCount.textContent = (whitelist.roles?.length || 0).toString();
  if (rolesContainer) {
    if (!whitelist.roles || whitelist.roles.length === 0) {
      rolesContainer.innerHTML = '<span style="font-size: 11px; color: var(--text-muted);">Henüz rol eklenmedi.</span>';
    } else {
      rolesContainer.innerHTML = whitelist.roles.map((r) => `
        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.3); border-radius:4px; padding:3px 8px; font-size:11.5px; font-family:monospace; color:#d8b4fe;">
          <span>${escapeHtml(r)}</span>
          <button type="button" style="background:none; border:none; color:#f87171; cursor:pointer; font-weight:700; font-size:13px; line-height:1;" onclick="removeWhitelistItem('role', '${escapeHtml(r)}')" title="Kaldır">&times;</button>
        </div>
      `).join("");
    }
  }

  const botsContainer = document.getElementById("guard-whitelist-bots-container");
  const botsCount = document.getElementById("guard-whitelist-bots-count");
  if (botsCount) botsCount.textContent = (whitelist.bots?.length || 0).toString();
  if (botsContainer) {
    if (!whitelist.bots || whitelist.bots.length === 0) {
      botsContainer.innerHTML = '<span style="font-size: 11px; color: var(--text-muted);">Henüz bot eklenmedi.</span>';
    } else {
      botsContainer.innerHTML = whitelist.bots.map((b) => `
        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); border-radius:4px; padding:3px 8px; font-size:11.5px; font-family:monospace; color:#86efac;">
          <span>${escapeHtml(b)}</span>
          <button type="button" style="background:none; border:none; color:#f87171; cursor:pointer; font-weight:700; font-size:13px; line-height:1;" onclick="removeWhitelistItem('bot', '${escapeHtml(b)}')" title="Kaldır">&times;</button>
        </div>
      `).join("");
    }
  }
}

async function addWhitelistItem(type) {
  const gId = getSelectedGuildId();
  let val = "";
  if (type === "user") {
    val = document.getElementById("guard-whitelist-user-input")?.value.trim() || "";
  } else if (type === "role") {
    val = document.getElementById("guard-whitelist-role-select")?.value.trim() || "";
  } else if (type === "bot") {
    val = document.getElementById("guard-whitelist-bot-input")?.value.trim() || "";
  }

  if (!val) {
    window.showToast("Lütfen eklenecek varlık ID'si veya rol seçiniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/guard/whitelist/${gId}` : "/api/guard/whitelist";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id: val, action: "add" })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Varlık güvenli listeye eklendi.", "success");
      if (type === "user") {
        const uInp = document.getElementById("guard-whitelist-user-input");
        if (uInp) uInp.value = "";
      } else if (type === "bot") {
        const bInp = document.getElementById("guard-whitelist-bot-input");
        if (bInp) bInp.value = "";
      }
      loadGuardPage();
    } else {
      window.showToast(data.error || "Ekleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function removeWhitelistItem(type, id) {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/guard/whitelist/${gId}` : "/api/guard/whitelist";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, action: "remove" })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Varlık güvenli listeden kaldırıldı.", "success");
      loadGuardPage();
    } else {
      window.showToast(data.error || "Silme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveGuardSettings() {
  const gId = getSelectedGuildId();
  const guard = {
    active: Boolean(document.getElementById("guard-switch-active")?.checked),
    blockBots: Boolean(document.getElementById("guard-switch-bots")?.checked),
    blockWebhooks: Boolean(document.getElementById("guard-switch-webhooks")?.checked)
  };

  const guardPanic = {
    enabled: Boolean(document.getElementById("guard-switch-panic-enabled")?.checked)
  };

  const filters = {
    linkFilter: Boolean(document.getElementById("guard-switch-link")?.checked),
    capsFilter: Boolean(document.getElementById("guard-switch-caps")?.checked),
    spamFilter: Boolean(document.getElementById("guard-switch-spam")?.checked)
  };

  const limits = {
    roleDeleteLimit: Number(document.getElementById("guard-limit-role-delete")?.value) || 1,
    roleCreateLimit: Number(document.getElementById("guard-limit-role-create")?.value) || 2,
    channelDeleteLimit: Number(document.getElementById("guard-limit-channel-delete")?.value) || 1,
    channelCreateLimit: Number(document.getElementById("guard-limit-channel-create")?.value) || 2,
    banLimit: Number(document.getElementById("guard-limit-ban")?.value) || 3,
    kickLimit: Number(document.getElementById("guard-limit-kick")?.value) || 3
  };

  try {
    const endpoint = gId ? `/api/guard/config/${gId}` : "/api/guard/config";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guard, guardPanic, limits, filters })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Güvenlik kalkanı ayarları kaydedildi.", "success");
      loadGuardPage();
    } else {
      window.showToast(data.error || "Kaydetme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function togglePanicMode() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/guard/panic-toggle/${gId}` : "/api/guard/panic-toggle";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Panik modu güncellendi.", "success");
      loadGuardPage();
    } else {
      window.showToast(data.error || "Panik durumu değiştirilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function renderGuardWords(words) {
  const container = document.getElementById("guard-words-container");
  if (!container) return;
  if (!Array.isArray(words) || words.length === 0) {
    container.innerHTML = '<span style="font-size: 11.5px; color: var(--text-muted);">Henüz özel kelime eklenmedi.</span>';
    return;
  }
  container.innerHTML = words.map((w) => `
    <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); border-radius:4px; padding:3px 8px; font-size:11.5px; color:#fca5a5;">
      <span>${escapeHtml(w)}</span>
      <button type="button" style="background:none; border:none; color:#f87171; cursor:pointer; font-weight:700; font-size:13px; line-height:1;" onclick="removeFilteredWord('${escapeHtml(w)}')" title="Kaldır">&times;</button>
    </div>
  `).join("");
}

async function addFilteredWord() {
  const gId = getSelectedGuildId();
  const input = document.getElementById("guard-word-input");
  const word = input?.value.trim();
  if (!word) {
    window.showToast("Lütfen yasaklanacak bir kelime giriniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/guard/word-filter/${gId}` : "/api/guard/word-filter";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, action: "add" })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Kelime yasaklı listesine eklendi.", "success");
      if (input) input.value = "";
      loadGuardPage();
    } else {
      window.showToast(data.error || "Kelime eklenemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function removeFilteredWord(word) {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/guard/word-filter/${gId}` : "/api/guard/word-filter";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, action: "remove" })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Kelime listeden kaldırıldı.", "success");
      loadGuardPage();
    } else {
      window.showToast(data.error || "Kelime kaldırılamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

let allPenaltiesCache = [];

async function loadPenaltiesPage() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/penalties/${gId}` : "/api/penalties";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Sicil kayıtları alınamadı.", "error");
      return;
    }

    const stats = data.stats || {};
    const statTotal = document.getElementById("pen-stat-total");
    if (statTotal) statTotal.textContent = `${stats.totalPenalties ?? stats.total ?? 0} Ceza`;
    const statActive = document.getElementById("pen-stat-active");
    if (statActive) statActive.textContent = `${stats.activePenalties ?? stats.active ?? 0} Aktif`;
    const statJails = document.getElementById("pen-stat-jails");
    if (statJails) statJails.textContent = `${stats.totalJails ?? stats.jails ?? 0} Kayıt`;
    const statAvg = document.getElementById("pen-stat-avg-points");
    if (statAvg) statAvg.textContent = `${stats.avgPoints ?? 0} Puan`;

    const thresholds = data.penaltyThresholds || data.thresholds || {};
    const thrMute = document.getElementById("pen-threshold-mute");
    if (thrMute) thrMute.value = thresholds.mute ?? 40;
    const thrJail = document.getElementById("pen-threshold-jail");
    if (thrJail) thrJail.value = thresholds.jail ?? 80;
    const thrBan = document.getElementById("pen-threshold-ban");
    if (thrBan) thrBan.value = thresholds.ban ?? 150;
    const thrMax = document.getElementById("pen-threshold-max");
    if (thrMax) thrMax.value = thresholds.pointLimit ?? thresholds.maxPoints ?? 100;

    allPenaltiesCache = data.penalties || [];
    renderPenaltiesTable();
  } catch (err) {
    window.showToast("Sicil kayıtları yüklenirken hata: " + err.message, "error");
  }
}

function renderPenaltiesTable() {
  const tbody = document.getElementById("penalties-table-body");
  if (!tbody) return;

  const searchTerm = (document.getElementById("pen-table-search")?.value || "").toLowerCase().trim();
  const filterType = document.getElementById("pen-table-filter")?.value || "all";

  let list = allPenaltiesCache.slice();

  if (filterType === "active") {
    list = list.filter((p) => p.active);
  } else if (filterType !== "all") {
    list = list.filter((p) => p.type === filterType);
  }

  if (searchTerm) {
    list = list.filter((p) => {
      const caseStr = String(p.caseId || "");
      const userStr = String(p.userId || "").toLowerCase();
      const reasonStr = String(p.reason || "").toLowerCase();
      const staffStr = String(p.staffId || "").toLowerCase();
      const typeStr = String(p.type || "").toLowerCase();
      return caseStr.includes(searchTerm) || userStr.includes(searchTerm) || reasonStr.includes(searchTerm) || staffStr.includes(searchTerm) || typeStr.includes(searchTerm);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 28px; text-align: center; color: var(--text-muted);">
          Arama kriterine uygun ceza kaydı bulunamadı.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((p) => {
    let typeStyle = "background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);";
    if (p.type === "BAN") {
      typeStyle = "background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);";
    } else if (p.type === "JAIL" || p.type === "QUARANTINE") {
      typeStyle = "background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);";
    } else if (p.type === "MUTE" || p.type === "VMUTE") {
      typeStyle = "background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3);";
    } else if (p.type === "WARN") {
      typeStyle = "background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3);";
    } else if (p.type === "KICK") {
      typeStyle = "background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3);";
    }

    const statusHtml = p.active
      ? '<span class="stat-badge badge-green">Aktif</span>'
      : '<span class="stat-badge" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.3);">Affedildi</span>';

    const liftBtnHtml = p.active
      ? `<button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #34d399; border-color: rgba(52, 211, 153, 0.3);" onclick="liftPenalty('${p.id}')">Affet</button>`
      : "";

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-weight: 700; color: #facc15;">#${p.caseId || String(p.id).slice(0, 6)}</span>
        </td>
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-size: 12px; color: #94a3b8;">${escapeHtml(p.userId)}</span>
        </td>
        <td style="padding: 12px 14px;">
          <span class="stat-badge" style="${typeStyle}">${escapeHtml(p.type)}</span>
        </td>
        <td style="padding: 12px 14px; max-width: 220px;">
          <span style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;" title="${escapeHtml(p.reason || '')}">${escapeHtml(p.reason || "Sebep belirtilmemiş")}</span>
        </td>
        <td style="padding: 12px 14px;">
          <span class="stat-badge badge-red">${p.points || 0} Puan</span>
        </td>
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-size: 11.5px; color: var(--text-muted);">${escapeHtml(p.staffId || "Sistem / Bot")}</span>
        </td>
        <td style="padding: 12px 14px;">
          ${statusHtml}
        </td>
        <td style="padding: 12px 14px; text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="openEditPenaltyModal('${p.id}')">Düzenle</button>
            ${liftBtnHtml}
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #f87171; border-color: rgba(248, 113, 113, 0.3);" onclick="deletePenalty('${p.id}')">Sil</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function savePenaltyThresholds() {
  const gId = getSelectedGuildId();
  const mute = Number(document.getElementById("pen-threshold-mute")?.value) || 40;
  const jail = Number(document.getElementById("pen-threshold-jail")?.value) || 80;
  const ban = Number(document.getElementById("pen-threshold-ban")?.value) || 150;
  const pointLimit = Number(document.getElementById("pen-threshold-max")?.value) || 100;

  try {
    const endpoint = gId ? `/api/penalties/thresholds/${gId}` : "/api/penalties/thresholds";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mute, jail, ban, pointLimit })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Ceza puanı eşikleri kaydedildi.", "success");
      loadPenaltiesPage();
    } else {
      window.showToast(data.error || "Eşikler kaydedilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openApplyPenaltyModal() {
  const modal = document.getElementById("apply-penalty-modal-backdrop");
  if (modal) {
    modal.style.display = "flex";
    const uInp = document.getElementById("modal-pen-userid");
    if (uInp) uInp.value = "";
    const rInp = document.getElementById("modal-pen-reason");
    if (rInp) rInp.value = "";
  }
}

function closeApplyPenaltyModal() {
  const modal = document.getElementById("apply-penalty-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitApplyPenalty() {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("modal-pen-userid")?.value.trim();
  const type = document.getElementById("modal-pen-type")?.value || "MUTE";
  const points = Number(document.getElementById("modal-pen-points")?.value) || 0;
  const duration = Number(document.getElementById("modal-pen-duration")?.value) || 0;
  const reason = document.getElementById("modal-pen-reason")?.value.trim() || "Yönetici paneli üzerinden ceza uygulandı.";

  if (!userId) {
    window.showToast("Lütfen ceza uygulanacak kullanıcı ID'sini giriniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/penalties/action/${gId}` : "/api/penalties/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        userId,
        type,
        points,
        durationMs: duration,
        reason
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Ceza başarıyla uygulandı ve sicile işlendi.", "success");
      closeApplyPenaltyModal();
      loadPenaltiesPage();
    } else {
      window.showToast(data.error || "Ceza uygulanamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openEditPenaltyModal(penaltyId) {
  const item = allPenaltiesCache.find((p) => String(p.id) === String(penaltyId));
  if (!item) {
    window.showToast("Ceza kaydı bulunamadı.", "error");
    return;
  }

  const idInp = document.getElementById("edit-pen-id");
  if (idInp) idInp.value = item.id;
  const caseNo = document.getElementById("edit-pen-caseno");
  if (caseNo) caseNo.textContent = `#${item.caseId || String(item.id).slice(0, 6)}`;
  const userInp = document.getElementById("edit-pen-userid");
  if (userInp) userInp.value = item.userId;
  const typeSel = document.getElementById("edit-pen-type");
  if (typeSel) typeSel.value = item.type;
  const pointsInp = document.getElementById("edit-pen-points");
  if (pointsInp) pointsInp.value = item.points ?? 0;
  const reasonInp = document.getElementById("edit-pen-reason");
  if (reasonInp) reasonInp.value = item.reason || "";
  const activeChk = document.getElementById("edit-pen-active");
  if (activeChk) activeChk.checked = Boolean(item.active);

  const modal = document.getElementById("edit-penalty-modal-backdrop");
  if (modal) modal.style.display = "flex";
}

function closeEditPenaltyModal() {
  const modal = document.getElementById("edit-penalty-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitEditPenalty() {
  const gId = getSelectedGuildId();
  const penaltyId = document.getElementById("edit-pen-id")?.value;
  const type = document.getElementById("edit-pen-type")?.value;
  const points = Number(document.getElementById("edit-pen-points")?.value) || 0;
  const reason = document.getElementById("edit-pen-reason")?.value.trim();
  const active = Boolean(document.getElementById("edit-pen-active")?.checked);

  if (!penaltyId) return;

  try {
    const endpoint = gId ? `/api/penalties/action/${gId}` : "/api/penalties/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        penaltyId,
        type,
        points,
        reason,
        active
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Ceza kaydı güncellendi.", "success");
      closeEditPenaltyModal();
      loadPenaltiesPage();
    } else {
      window.showToast(data.error || "Güncelleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function liftPenalty(penaltyId) {
  if (!confirm("Bu cezayı affetmek ve yaptırımı sonlandırmak istediğinizden emin misiniz?")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/penalties/action/${gId}` : "/api/penalties/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "lift",
        penaltyId
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Ceza başarıyla affedildi.", "success");
      loadPenaltiesPage();
    } else {
      window.showToast(data.error || "Affetme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deletePenalty(penaltyId) {
  if (!confirm("Bu ceza kaydını veritabanından kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/penalties/action/${gId}` : "/api/penalties/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        penaltyId
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Ceza kaydı kalıcı olarak silindi.", "success");
      loadPenaltiesPage();
    } else {
      window.showToast(data.error || "Silme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

window.loadGuardPage = loadGuardPage;
window.renderGuardWhitelist = renderGuardWhitelist;
window.addWhitelistItem = addWhitelistItem;
window.removeWhitelistItem = removeWhitelistItem;
window.saveGuardSettings = saveGuardSettings;
window.togglePanicMode = togglePanicMode;
window.renderGuardWords = renderGuardWords;
window.addFilteredWord = addFilteredWord;
window.removeFilteredWord = removeFilteredWord;

window.loadPenaltiesPage = loadPenaltiesPage;
window.renderPenaltiesTable = renderPenaltiesTable;
window.savePenaltyThresholds = savePenaltyThresholds;
window.openApplyPenaltyModal = openApplyPenaltyModal;
window.closeApplyPenaltyModal = closeApplyPenaltyModal;
window.submitApplyPenalty = submitApplyPenalty;
window.openEditPenaltyModal = openEditPenaltyModal;
window.closeEditPenaltyModal = closeEditPenaltyModal;
window.submitEditPenalty = submitEditPenalty;
window.liftPenalty = liftPenalty;
window.deletePenalty = deletePenalty;

let allStaffTasksCache = [];
let allTicketsCache = [];

async function loadStaffTasksPage() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/staff-tasks/${gId}` : "/api/staff-tasks";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Yetkili görevleri alınamadı.", "error");
      return;
    }

    const stats = data.stats || {};
    const statTotal = document.getElementById("staff-stat-total-tasks");
    if (statTotal) statTotal.textContent = `${stats.totalTasks || 0} Görev`;
    const statInProgress = document.getElementById("staff-stat-in-progress");
    if (statInProgress) statInProgress.textContent = `${stats.inProgress || 0} Aktif`;
    const statSuccessRate = document.getElementById("staff-stat-success-rate");
    if (statSuccessRate) statSuccessRate.textContent = `%${stats.successRate || 0}`;
    const statTopStaff = document.getElementById("staff-stat-top-staff");
    if (statTopStaff) {
      if (stats.topStaff) {
        statTopStaff.textContent = `${stats.topStaff.staffId} (${stats.topStaff.score} Puan)`;
      } else {
        statTopStaff.textContent = "Belirlenmedi";
      }
    }

    const defaults = data.defaults || {};
    const defVoice = document.getElementById("staff-default-voice-hours");
    if (defVoice) defVoice.value = defaults.targetVoiceHours ?? 10;
    const defMsg = document.getElementById("staff-default-messages");
    if (defMsg) defMsg.value = defaults.targetMessages ?? 500;
    const defReg = document.getElementById("staff-default-registers");
    if (defReg) defReg.value = defaults.targetRegisters ?? 5;
    const defPts = document.getElementById("staff-default-reward-points");
    if (defPts) defPts.value = defaults.rewardPoints ?? 100;

    allStaffTasksCache = data.tasks || [];
    renderStaffTasksTable();
  } catch (err) {
    window.showToast("Görevler yüklenirken hata: " + err.message, "error");
  }
}

function renderStaffTasksTable() {
  const tbody = document.getElementById("staff-tasks-table-body");
  if (!tbody) return;

  const searchTerm = (document.getElementById("staff-task-search")?.value || "").toLowerCase().trim();
  const filterStatus = document.getElementById("staff-task-filter")?.value || "all";

  let list = allStaffTasksCache.slice();

  if (filterStatus !== "all") {
    list = list.filter((t) => t.status === filterStatus);
  }

  if (searchTerm) {
    list = list.filter((t) => {
      const userStr = String(t.userId || "").toLowerCase();
      const weekStr = String(t.weekNumber || "");
      const yearStr = String(t.year || "");
      return userStr.includes(searchTerm) || weekStr.includes(searchTerm) || yearStr.includes(searchTerm);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 28px; text-align: center; color: var(--text-muted);">
          Arama kriterine uygun yetkili görevi bulunamadı.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((t) => {
    const taskId = t._id || t.id;
    const curVoiceHours = ((t.currentVoiceMs || 0) / 3600000).toFixed(1);
    const tarVoiceHours = ((t.targetVoiceMs || 36000000) / 3600000).toFixed(0);
    const voicePct = Math.min(100, Math.round(((t.currentVoiceMs || 0) / (t.targetVoiceMs || 1)) * 100));

    const curMsg = t.currentMessages || 0;
    const tarMsg = t.targetMessages || 500;
    const msgPct = Math.min(100, Math.round((curMsg / (tarMsg || 1)) * 100));

    const curReg = t.currentRegisters || 0;
    const tarReg = t.targetRegisters || 5;

    let statusBadge = '<span class="stat-badge badge-orange">Devam Ediyor</span>';
    if (t.status === "COMPLETED") {
      statusBadge = '<span class="stat-badge badge-green">Tamamlandı</span>';
    } else if (t.status === "FAILED") {
      statusBadge = '<span class="stat-badge badge-red">Başarısız</span>';
    }

    const completeBtn = t.status === "IN_PROGRESS"
      ? `<button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #34d399; border-color: rgba(52, 211, 153, 0.3);" onclick="markTaskStatus('${taskId}', 'COMPLETED')">Tamamla</button>`
      : "";

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-size: 12px; color: #94a3b8;">${escapeHtml(t.userId)}</span>
        </td>
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-weight: 600; color: #38bdf8;">Hafta ${t.weekNumber} / ${t.year}</span>
        </td>
        <td style="padding: 12px 14px; min-width: 140px;">
          <div style="font-size: 11.5px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span>${curVoiceHours} / ${tarVoiceHours} Sa</span>
            <span style="color: #38bdf8;">%${voicePct}</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
            <div style="width: ${voicePct}%; height: 100%; background: #38bdf8; border-radius: 3px;"></div>
          </div>
        </td>
        <td style="padding: 12px 14px; min-width: 140px;">
          <div style="font-size: 11.5px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span>${curMsg} / ${tarMsg}</span>
            <span style="color: #a855f7;">%${msgPct}</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
            <div style="width: ${msgPct}%; height: 100%; background: #a855f7; border-radius: 3px;"></div>
          </div>
        </td>
        <td style="padding: 12px 14px;">
          <span style="font-size: 12px; font-weight: 600; color: #f8fafc;">${curReg} / ${tarReg}</span>
        </td>
        <td style="padding: 12px 14px;">
          <span class="stat-badge badge-purple">${t.points || 0} Puan</span>
        </td>
        <td style="padding: 12px 14px;">
          ${statusBadge}
        </td>
        <td style="padding: 12px 14px; text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="openEditTaskModal('${taskId}')">Düzenle</button>
            ${completeBtn}
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #f87171; border-color: rgba(248, 113, 113, 0.3);" onclick="deleteStaffTask('${taskId}')">Sil</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAssignTaskModal() {
  const modal = document.getElementById("assign-staff-task-modal-backdrop");
  if (modal) {
    modal.style.display = "flex";
    const uInp = document.getElementById("modal-task-userid");
    if (uInp) uInp.value = "";
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
    const curWeek = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    const wInp = document.getElementById("modal-task-week");
    if (wInp) wInp.value = curWeek;
    const yInp = document.getElementById("modal-task-year");
    if (yInp) yInp.value = now.getFullYear();
  }
}

function closeAssignTaskModal() {
  const modal = document.getElementById("assign-staff-task-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitAssignTask() {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("modal-task-userid")?.value.trim();
  const weekNumber = Number(document.getElementById("modal-task-week")?.value) || 1;
  const year = Number(document.getElementById("modal-task-year")?.value) || 2026;
  const targetVoiceHours = Number(document.getElementById("modal-task-voice")?.value) || 10;
  const targetMessages = Number(document.getElementById("modal-task-messages")?.value) || 500;
  const targetRegisters = Number(document.getElementById("modal-task-registers")?.value) || 5;
  const points = Number(document.getElementById("modal-task-points")?.value) || 100;

  if (!userId) {
    window.showToast("Lütfen yetkili Discord ID giriniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/staff-tasks/action/${gId}` : "/api/staff-tasks/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        userId,
        weekNumber,
        year,
        targetVoiceHours,
        targetMessages,
        targetRegisters,
        points
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Yetkili görevi başarıyla atandı.", "success");
      closeAssignTaskModal();
      loadStaffTasksPage();
    } else {
      window.showToast(data.error || "Görev atanamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openEditTaskModal(taskId) {
  const item = allStaffTasksCache.find((t) => String(t._id || t.id) === String(taskId));
  if (!item) {
    window.showToast("Görev kaydı bulunamadı.", "error");
    return;
  }

  const idInp = document.getElementById("edit-task-id");
  if (idInp) idInp.value = item._id || item.id;
  const weekLbl = document.getElementById("edit-task-week-label");
  if (weekLbl) weekLbl.textContent = `Hafta ${item.weekNumber} / ${item.year}`;
  const uInp = document.getElementById("edit-task-userid");
  if (uInp) uInp.value = item.userId;

  const curVoiceInp = document.getElementById("edit-task-current-voice");
  if (curVoiceInp) curVoiceInp.value = ((item.currentVoiceMs || 0) / 3600000).toFixed(1);
  const tarVoiceInp = document.getElementById("edit-task-target-voice");
  if (tarVoiceInp) tarVoiceInp.value = Math.round((item.targetVoiceMs || 36000000) / 3600000);

  const curMsgInp = document.getElementById("edit-task-current-messages");
  if (curMsgInp) curMsgInp.value = item.currentMessages || 0;
  const tarMsgInp = document.getElementById("edit-task-target-messages");
  if (tarMsgInp) tarMsgInp.value = item.targetMessages || 500;

  const curRegInp = document.getElementById("edit-task-current-registers");
  if (curRegInp) curRegInp.value = item.currentRegisters || 0;
  const tarRegInp = document.getElementById("edit-task-target-registers");
  if (tarRegInp) tarRegInp.value = item.targetRegisters || 5;

  const ptsInp = document.getElementById("edit-task-points");
  if (ptsInp) ptsInp.value = item.points || 0;

  const statusSel = document.getElementById("edit-task-status");
  if (statusSel) statusSel.value = item.status || "IN_PROGRESS";

  const modal = document.getElementById("edit-staff-task-modal-backdrop");
  if (modal) modal.style.display = "flex";
}

function closeEditTaskModal() {
  const modal = document.getElementById("edit-staff-task-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitEditTask() {
  const gId = getSelectedGuildId();
  const taskId = document.getElementById("edit-task-id")?.value;
  const currentVoiceHours = Number(document.getElementById("edit-task-current-voice")?.value) || 0;
  const targetVoiceHours = Number(document.getElementById("edit-task-target-voice")?.value) || 10;
  const currentMessages = Number(document.getElementById("edit-task-current-messages")?.value) || 0;
  const targetMessages = Number(document.getElementById("edit-task-target-messages")?.value) || 500;
  const currentRegisters = Number(document.getElementById("edit-task-current-registers")?.value) || 0;
  const targetRegisters = Number(document.getElementById("edit-task-target-registers")?.value) || 5;
  const points = Number(document.getElementById("edit-task-points")?.value) || 0;
  const status = document.getElementById("edit-task-status")?.value || "IN_PROGRESS";

  if (!taskId) return;

  try {
    const endpoint = gId ? `/api/staff-tasks/action/${gId}` : "/api/staff-tasks/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        taskId,
        currentVoiceHours,
        targetVoiceHours,
        currentMessages,
        targetMessages,
        currentRegisters,
        targetRegisters,
        points,
        status
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Görev detayları güncellendi.", "success");
      closeEditTaskModal();
      loadStaffTasksPage();
    } else {
      window.showToast(data.error || "Güncelleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function markTaskStatus(taskId, status) {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/staff-tasks/action/${gId}` : "/api/staff-tasks/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", taskId, status })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Görev durumu güncellendi.", "success");
      loadStaffTasksPage();
    } else {
      window.showToast(data.error || "Durum güncellenemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteStaffTask(taskId) {
  if (!confirm("Bu yetkili görevini kalıcı olarak silmek istediğinizden emin misiniz?")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/staff-tasks/action/${gId}` : "/api/staff-tasks/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", taskId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Yetkili görevi başarıyla silindi.", "success");
      loadStaffTasksPage();
    } else {
      window.showToast(data.error || "Silme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveStaffTaskDefaults() {
  const gId = getSelectedGuildId();
  const targetVoiceHours = Number(document.getElementById("staff-default-voice-hours")?.value) || 10;
  const targetMessages = Number(document.getElementById("staff-default-messages")?.value) || 500;
  const targetRegisters = Number(document.getElementById("staff-default-registers")?.value) || 5;
  const rewardPoints = Number(document.getElementById("staff-default-reward-points")?.value) || 100;

  try {
    const endpoint = gId ? `/api/staff-tasks/defaults/${gId}` : "/api/staff-tasks/defaults";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetVoiceHours,
        targetMessages,
        targetRegisters,
        rewardPoints
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Varsayılan görev şablonu kaydedildi.", "success");
      loadStaffTasksPage();
    } else {
      window.showToast(data.error || "Kaydetme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function loadTicketsPage() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/tickets/${gId}` : "/api/tickets";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Destek biletleri alınamadı.", "error");
      return;
    }

    const stats = data.stats || {};
    const statOpen = document.getElementById("ticket-stat-open");
    if (statOpen) statOpen.textContent = `${stats.openTickets || 0} Talep`;
    const statClosed = document.getElementById("ticket-stat-closed");
    if (statClosed) statClosed.textContent = `${stats.closedTickets || 0} Çözüldü`;
    const statRating = document.getElementById("ticket-stat-rating");
    if (statRating) statRating.textContent = `${stats.avgRating || "5.0"} ★`;
    const statTotal = document.getElementById("ticket-stat-total");
    if (statTotal) statTotal.textContent = `${stats.totalTickets || 0} Bilet`;

    const catSelect = document.getElementById("ticket-category-select");
    if (catSelect && Array.isArray(data.channels)) {
      let optionsHtml = '<option value="">Kategori Seçiniz...</option>';
      data.channels.forEach((c) => {
        const isCat = c.type === 4 || c.isCategory || !c.type;
        if (isCat) {
          const sel = (c.id === data.ticketCategory) ? "selected" : "";
          optionsHtml += `<option value="${c.id}" ${sel}>${escapeHtml(c.name)}</option>`;
        }
      });
      catSelect.innerHTML = optionsHtml;
    }

    const staffRoleSelect = document.getElementById("ticket-staff-role-select");
    if (staffRoleSelect && Array.isArray(data.roles)) {
      let optionsHtml = '<option value="">Rol Seçiniz...</option>';
      data.roles.forEach((r) => {
        const isSel = Array.isArray(data.staffRoles) && data.staffRoles.includes(r.id) ? "selected" : "";
        optionsHtml += `<option value="${r.id}" ${isSel}>${escapeHtml(r.name)}</option>`;
      });
      staffRoleSelect.innerHTML = optionsHtml;
    }

    allTicketsCache = data.tickets || [];
    renderTicketsTable();
  } catch (err) {
    window.showToast("Biletler yüklenirken hata: " + err.message, "error");
  }
}

function renderTicketsTable() {
  const tbody = document.getElementById("tickets-table-body");
  if (!tbody) return;

  const searchTerm = (document.getElementById("ticket-search-input")?.value || "").toLowerCase().trim();
  const filterStatus = document.getElementById("ticket-filter-status")?.value || "all";
  const filterCat = document.getElementById("ticket-filter-category")?.value || "all";

  let list = allTicketsCache.slice();

  if (filterStatus !== "all") {
    list = list.filter((t) => t.status === filterStatus);
  }

  if (filterCat !== "all") {
    list = list.filter((t) => (t.category || "GENEL").toUpperCase() === filterCat.toUpperCase());
  }

  if (searchTerm) {
    list = list.filter((t) => {
      const ticketIdStr = String(t.ticketId || "");
      const openerStr = String(t.openerId || "").toLowerCase();
      const claimedStr = String(t.claimedBy || "").toLowerCase();
      const catStr = String(t.category || "").toLowerCase();
      return ticketIdStr.includes(searchTerm) || openerStr.includes(searchTerm) || claimedStr.includes(searchTerm) || catStr.includes(searchTerm);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 28px; text-align: center; color: var(--text-muted);">
          Arama kriterine uygun destek bileti bulunamadı.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((t) => {
    let catBadgeStyle = "background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);";
    if (t.category === "DESTEK") {
      catBadgeStyle = "background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);";
    } else if (t.category === "YETKILI_BASVURU") {
      catBadgeStyle = "background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3);";
    } else if (t.category === "SIKAYET") {
      catBadgeStyle = "background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);";
    } else if (t.category === "SATIS") {
      catBadgeStyle = "background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3);";
    }

    const isOpen = t.status === "OPEN";
    const statusBadge = isOpen
      ? '<span class="stat-badge badge-green">Açık</span>'
      : '<span class="stat-badge" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.3);">Kapatıldı</span>';

    const toggleBtnText = isOpen ? "Kapat" : "Yeniden Aç";
    const toggleBtnStyle = isOpen
      ? "color: #fbbf24; border-color: rgba(251, 191, 36, 0.3);"
      : "color: #34d399; border-color: rgba(52, 211, 153, 0.3);";

    const claimedHtml = t.claimedBy
      ? `<span style="font-family: monospace; font-size: 11.5px; color: #cbd5e1;">${escapeHtml(t.claimedBy)}</span>`
      : '<span style="font-size: 11px; color: var(--text-muted);">Sahiplenilmedi</span>';

    const ratingHtml = Number(t.rating) > 0
      ? `<span style="color: #facc15; font-weight: 600;">${t.rating} ★</span>`
      : '<span style="color: var(--text-muted);">-</span>';

    const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-weight: 700; color: #38bdf8;">#${t.ticketId}</span>
        </td>
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-size: 12px; color: #94a3b8;">${escapeHtml(t.openerId)}</span>
        </td>
        <td style="padding: 12px 14px;">
          <span class="stat-badge" style="${catBadgeStyle}">${escapeHtml(t.category || "GENEL")}</span>
        </td>
        <td style="padding: 12px 14px;">
          ${claimedHtml}
        </td>
        <td style="padding: 12px 14px;">
          ${ratingHtml}
        </td>
        <td style="padding: 12px 14px;">
          ${statusBadge}
        </td>
        <td style="padding: 12px 14px; font-size: 11.5px; color: var(--text-muted);">
          ${dateStr}
        </td>
        <td style="padding: 12px 14px; text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);" onclick="viewTicketTranscript('${t.ticketId}')">Döküm</button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="openEditTicketModal('${t.ticketId}')">Düzenle</button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; ${toggleBtnStyle}" onclick="toggleTicketStatus('${t.ticketId}')">${toggleBtnText}</button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #f87171; border-color: rgba(248, 113, 113, 0.3);" onclick="deleteTicket('${t.ticketId}')">Sil</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openCreateTicketModal() {
  const modal = document.getElementById("create-ticket-modal-backdrop");
  if (modal) {
    modal.style.display = "flex";
    const opInp = document.getElementById("modal-ticket-opener");
    if (opInp) opInp.value = "";
    const clInp = document.getElementById("modal-ticket-claimed");
    if (clInp) clInp.value = "";
    const msgInp = document.getElementById("modal-ticket-initial-msg");
    if (msgInp) msgInp.value = "";
  }
}

function closeCreateTicketModal() {
  const modal = document.getElementById("create-ticket-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitCreateTicket() {
  const gId = getSelectedGuildId();
  const openerId = document.getElementById("modal-ticket-opener")?.value.trim();
  const category = document.getElementById("modal-ticket-category")?.value || "GENEL";
  const claimedBy = document.getElementById("modal-ticket-claimed")?.value.trim() || null;
  const initialMessage = document.getElementById("modal-ticket-initial-msg")?.value.trim() || "";

  if (!openerId) {
    window.showToast("Lütfen talep açan kullanıcı Discord ID giriniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/tickets/action/${gId}` : "/api/tickets/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        openerId,
        category,
        claimedBy,
        initialMessage
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Destek talebi açıldı.", "success");
      closeCreateTicketModal();
      loadTicketsPage();
    } else {
      window.showToast(data.error || "Talep açılamadı.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openEditTicketModal(ticketId) {
  const item = allTicketsCache.find((t) => String(t.ticketId) === String(ticketId));
  if (!item) {
    window.showToast("Bilet bulunamadı.", "error");
    return;
  }

  const idInp = document.getElementById("edit-ticket-id");
  if (idInp) idInp.value = item.ticketId;
  const noLbl = document.getElementById("edit-ticket-no-label");
  if (noLbl) noLbl.textContent = `#${item.ticketId}`;
  const opInp = document.getElementById("edit-ticket-opener");
  if (opInp) opInp.value = item.openerId;
  const catSel = document.getElementById("edit-ticket-category");
  if (catSel) catSel.value = item.category || "GENEL";
  const statSel = document.getElementById("edit-ticket-status");
  if (statSel) statSel.value = item.status || "OPEN";
  const clInp = document.getElementById("edit-ticket-claimed");
  if (clInp) clInp.value = item.claimedBy || "";
  const ratInp = document.getElementById("edit-ticket-rating");
  if (ratInp) ratInp.value = item.rating || 0;

  const modal = document.getElementById("edit-ticket-modal-backdrop");
  if (modal) modal.style.display = "flex";
}

function closeEditTicketModal() {
  const modal = document.getElementById("edit-ticket-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitEditTicket() {
  const gId = getSelectedGuildId();
  const ticketId = document.getElementById("edit-ticket-id")?.value;
  const category = document.getElementById("edit-ticket-category")?.value;
  const status = document.getElementById("edit-ticket-status")?.value;
  const claimedBy = document.getElementById("edit-ticket-claimed")?.value.trim();
  const rating = Number(document.getElementById("edit-ticket-rating")?.value) || 0;

  if (!ticketId) return;

  try {
    const endpoint = gId ? `/api/tickets/action/${gId}` : "/api/tickets/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        ticketId,
        category,
        status,
        claimedBy,
        rating
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Bilet detayları güncellendi.", "success");
      closeEditTicketModal();
      loadTicketsPage();
    } else {
      window.showToast(data.error || "Güncelleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function toggleTicketStatus(ticketId) {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/tickets/action/${gId}` : "/api/tickets/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_status", ticketId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Bilet durumu güncellendi.", "success");
      loadTicketsPage();
    } else {
      window.showToast(data.error || "Bilet durumu değiştirilemedi.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteTicket(ticketId) {
  if (!confirm("Bu destek biletini kalıcı olarak silmek istediğinizden emin misiniz?")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/tickets/action/${gId}` : "/api/tickets/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ticketId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Destek bileti kalıcı olarak silindi.", "success");
      loadTicketsPage();
    } else {
      window.showToast(data.error || "Silme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function viewTicketTranscript(ticketId) {
  const gId = getSelectedGuildId();
  const modal = document.getElementById("view-ticket-transcript-modal-backdrop");
  const container = document.getElementById("ticket-transcript-container");
  const title = document.getElementById("transcript-modal-title");

  if (modal) modal.style.display = "flex";
  if (title) title.textContent = `Bilet #${ticketId} Mesajlaşma Dökümü`;
  if (container) container.innerHTML = '<span style="font-size: 12px; color: var(--text-muted); text-align: center;">Döküm yükleniyor...</span>';

  try {
    const endpoint = gId ? `/api/tickets/${gId}/transcript/${ticketId}` : `/api/tickets/default/transcript/${ticketId}`;
    const res = await fetch(endpoint);
    const data = await res.json();

    if (!data.success || !Array.isArray(data.transcript) || data.transcript.length === 0) {
      if (container) container.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 12.5px;">Bu bilette henüz kayıtlı sohbet mesajı bulunmuyor.</div>';
      return;
    }

    if (container) {
      container.innerHTML = data.transcript.map((m) => {
        const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";
        return `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 600; font-size: 12px; color: #38bdf8;">${escapeHtml(m.authorTag || m.authorId)}</span>
              <span style="font-size: 10.5px; color: var(--text-muted);">${timeStr}</span>
            </div>
            <div style="font-size: 13px; color: #e2e8f0; white-space: pre-wrap;">${escapeHtml(m.content)}</div>
          </div>
        `;
      }).join("");
    }
  } catch (err) {
    if (container) container.innerHTML = `<span style="color: #f87171; font-size: 12px;">Hata: ${err.message}</span>`;
  }
}

function closeTicketTranscriptModal() {
  const modal = document.getElementById("view-ticket-transcript-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function saveTicketConfig() {
  const gId = getSelectedGuildId();
  const ticketCategory = document.getElementById("ticket-category-select")?.value || "";
  const staffRole = document.getElementById("ticket-staff-role-select")?.value || "";

  try {
    const endpoint = gId ? `/api/tickets/config/${gId}` : "/api/tickets/config";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketCategory,
        staffRoles: staffRole ? [staffRole] : []
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Bilet sistemi yapılandırması kaydedildi.", "success");
      loadTicketsPage();
    } else {
      window.showToast(data.error || "Kaydetme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

window.loadStaffTasksPage = loadStaffTasksPage;
window.renderStaffTasksTable = renderStaffTasksTable;
window.openAssignTaskModal = openAssignTaskModal;
window.closeAssignTaskModal = closeAssignTaskModal;
window.submitAssignTask = submitAssignTask;
window.openEditTaskModal = openEditTaskModal;
window.closeEditTaskModal = closeEditTaskModal;
window.submitEditTask = submitEditTask;
window.markTaskStatus = markTaskStatus;
window.deleteStaffTask = deleteStaffTask;
window.saveStaffTaskDefaults = saveStaffTaskDefaults;

window.loadTicketsPage = loadTicketsPage;
window.renderTicketsTable = renderTicketsTable;
window.openCreateTicketModal = openCreateTicketModal;
window.closeCreateTicketModal = closeCreateTicketModal;
window.submitCreateTicket = submitCreateTicket;
window.openEditTicketModal = openEditTicketModal;
window.closeEditTicketModal = closeEditTicketModal;
window.submitEditTicket = submitEditTicket;
window.toggleTicketStatus = toggleTicketStatus;
window.deleteTicket = deleteTicket;
window.viewTicketTranscript = viewTicketTranscript;
window.closeTicketTranscriptModal = closeTicketTranscriptModal;
window.saveTicketConfig = saveTicketConfig;

let allLeaderboardCache = [];
let leaderboardRolesCache = [];

async function loadLeaderboardPage() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/leaderboard/${gId}` : "/api/leaderboard";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Liderlik verileri alınamadı.", "error");
      return;
    }

    allLeaderboardCache = data.leaderboard || [];
    leaderboardRolesCache = data.roles || [];

    const stats = data.stats || {};
    const statVoice = document.getElementById("lead-stat-voice");
    if (statVoice) {
      if (stats.topVoice) {
        const hours = (stats.topVoice.voiceMs / 3600000).toFixed(1);
        statVoice.textContent = `${hours} Sa (${stats.topVoice.userId})`;
      } else {
        statVoice.textContent = "-";
      }
    }

    const statMessages = document.getElementById("lead-stat-messages");
    if (statMessages) {
      if (stats.topMessages) {
        statMessages.textContent = `${stats.topMessages.messages} Mesaj (${stats.topMessages.userId})`;
      } else {
        statMessages.textContent = "-";
      }
    }

    const statLevel = document.getElementById("lead-stat-level");
    if (statLevel) {
      if (stats.topLevel) {
        statLevel.textContent = `Sv. ${stats.topLevel.level} (${stats.topLevel.xp} XP)`;
      } else {
        statLevel.textContent = "-";
      }
    }

    const statTotal = document.getElementById("lead-stat-total");
    if (statTotal) statTotal.textContent = `${stats.totalUsers || 0} Kullanıcı`;

    const rewards = data.rewards || {};
    const inputFirst = document.getElementById("lead-reward-first");
    if (inputFirst) inputFirst.value = rewards.firstPlaceCoin || 1000;
    const inputSecond = document.getElementById("lead-reward-second");
    if (inputSecond) inputSecond.value = rewards.secondPlaceCoin || 500;
    const inputThird = document.getElementById("lead-reward-third");
    if (inputThird) inputThird.value = rewards.thirdPlaceCoin || 250;

    const roleSelect = document.getElementById("lead-reward-role");
    if (roleSelect) {
      let optionsHtml = '<option value="">Rol Seçilmedi (Devre Dışı)</option>';
      (data.roles || []).forEach((r) => {
        const isSel = r.id === rewards.rewardRole ? "selected" : "";
        optionsHtml += `<option value="${r.id}" ${isSel}>${r.name}</option>`;
      });
      roleSelect.innerHTML = optionsHtml;
    }

    renderLeaderboardTable();
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function renderLeaderboardTable() {
  const tbody = document.getElementById("leaderboard-table-body");
  if (!tbody) return;

  const searchTerm = (document.getElementById("lead-search-input")?.value || "").toLowerCase().trim();
  const filterType = document.getElementById("lead-type-filter")?.value || "all";

  let list = allLeaderboardCache.slice();

  if (filterType === "voice") {
    list.sort((a, b) => (b.totalVoiceMs || 0) - (a.totalVoiceMs || 0));
  } else if (filterType === "messages") {
    list.sort((a, b) => (b.totalMessages || 0) - (a.totalMessages || 0));
  } else if (filterType === "level") {
    list.sort((a, b) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0));
  }

  if (searchTerm) {
    list = list.filter((item) => {
      const uId = String(item.userId || "").toLowerCase();
      const title = String(item.title || "").toLowerCase();
      return uId.includes(searchTerm) || title.includes(searchTerm);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 28px; text-align: center; color: var(--text-muted);">
          Arama kriterine uygun liderlik kaydı bulunamadı.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((item, index) => {
    const statId = item._id || item.id;
    const voiceHours = ((item.totalVoiceMs || 0) / 3600000).toFixed(1);
    const badges = (item.badges || []).map(b => `<span class="stat-badge badge-purple" style="font-size: 10px; padding: 2px 6px;">${b}</span>`).join(" ");

    let rankBadge = `<span style="font-weight: 700; color: #94a3b8;">#${index + 1}</span>`;
    if (index === 0) rankBadge = `<span class="stat-badge badge-orange" style="font-weight: 800;">🥇 #1</span>`;
    else if (index === 1) rankBadge = `<span class="stat-badge badge-blue" style="font-weight: 800;">🥈 #2</span>`;
    else if (index === 2) rankBadge = `<span class="stat-badge badge-purple" style="font-weight: 800;">🥉 #3</span>`;

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 12px 14px;">${rankBadge}</td>
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-size: 12px; color: #94a3b8;">${item.userId}</span>
        </td>
        <td style="padding: 12px 14px;">
          <div style="display: flex; flex-direction: column; gap: 3px;">
            <span style="font-size: 12px; font-weight: 600; color: #f8fafc;">${item.title || "Unvansız"}</span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">${badges}</div>
          </div>
        </td>
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-weight: 600; color: #38bdf8;">${voiceHours} Saat</span>
        </td>
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-weight: 600; color: #a855f7;">${(item.totalMessages || 0).toLocaleString()}</span>
        </td>
        <td style="padding: 12px 14px;">
          <div style="display: align-items; gap: 6px;">
            <span class="stat-badge badge-green">Sv. ${item.level || 1}</span>
            <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">${(item.xp || 0).toLocaleString()} XP</span>
          </div>
        </td>
        <td style="padding: 12px 14px; text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="openEditStatModal('${statId}')">Düzenle</button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #fbbf24; border-color: rgba(251, 191, 36, 0.3);" onclick="resetStatRecord('${statId}')">Sıfırla</button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #f87171; border-color: rgba(248, 113, 113, 0.3);" onclick="deleteStatRecord('${statId}')">Sil</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openCreateStatModal() {
  const modal = document.getElementById("create-stat-modal-backdrop");
  if (!modal) return;
  const inputUser = document.getElementById("modal-stat-userid");
  if (inputUser) inputUser.value = "";
  const inputVoice = document.getElementById("modal-stat-voice");
  if (inputVoice) inputVoice.value = "0";
  const inputMessages = document.getElementById("modal-stat-messages");
  if (inputMessages) inputMessages.value = "0";
  const inputLevel = document.getElementById("modal-stat-level");
  if (inputLevel) inputLevel.value = "1";
  const inputXp = document.getElementById("modal-stat-xp");
  if (inputXp) inputXp.value = "0";
  const inputTitle = document.getElementById("modal-stat-title");
  if (inputTitle) inputTitle.value = "";
  modal.style.display = "flex";
}

function closeCreateStatModal() {
  const modal = document.getElementById("create-stat-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitCreateStat() {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("modal-stat-userid")?.value.trim();
  const totalVoiceHours = Number(document.getElementById("modal-stat-voice")?.value) || 0;
  const totalMessages = Number(document.getElementById("modal-stat-messages")?.value) || 0;
  const level = Number(document.getElementById("modal-stat-level")?.value) || 1;
  const xp = Number(document.getElementById("modal-stat-xp")?.value) || 0;
  const title = document.getElementById("modal-stat-title")?.value.trim();

  if (!userId) {
    window.showToast("Lütfen kullanıcı Discord ID giriniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/leaderboard/action/${gId}` : "/api/leaderboard/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        userId,
        totalVoiceHours,
        totalMessages,
        level,
        xp,
        title
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Kullanıcı istatistiği başarıyla kaydedildi.", "success");
      closeCreateStatModal();
      loadLeaderboardPage();
    } else {
      window.showToast(data.error || "Kayıt başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openEditStatModal(statId) {
  const record = allLeaderboardCache.find((s) => (s._id || s.id) === statId);
  if (!record) {
    window.showToast("İstatistik kaydı bulunamadı.", "warning");
    return;
  }

  const modal = document.getElementById("edit-stat-modal-backdrop");
  if (!modal) return;

  document.getElementById("edit-stat-id").value = statId;
  document.getElementById("edit-stat-userid").value = record.userId || "";
  document.getElementById("edit-stat-voice").value = ((record.totalVoiceMs || 0) / 3600000).toFixed(1);
  document.getElementById("edit-stat-messages").value = record.totalMessages || 0;
  document.getElementById("edit-stat-level").value = record.level || 1;
  document.getElementById("edit-stat-xp").value = record.xp || 0;
  document.getElementById("edit-stat-title").value = record.title || "";

  modal.style.display = "flex";
}

function closeEditStatModal() {
  const modal = document.getElementById("edit-stat-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitEditStat() {
  const gId = getSelectedGuildId();
  const statId = document.getElementById("edit-stat-id")?.value;
  const totalVoiceHours = Number(document.getElementById("edit-stat-voice")?.value) || 0;
  const totalMessages = Number(document.getElementById("edit-stat-messages")?.value) || 0;
  const level = Number(document.getElementById("edit-stat-level")?.value) || 1;
  const xp = Number(document.getElementById("edit-stat-xp")?.value) || 0;
  const title = document.getElementById("edit-stat-title")?.value.trim();

  if (!statId) return;

  try {
    const endpoint = gId ? `/api/leaderboard/action/${gId}` : "/api/leaderboard/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        statId,
        totalVoiceHours,
        totalMessages,
        level,
        xp,
        title
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("İstatistik başarıyla güncellendi.", "success");
      closeEditStatModal();
      loadLeaderboardPage();
    } else {
      window.showToast(data.error || "Güncelleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function resetStatRecord(statId) {
  if (!confirm("Bu kullanıcının tüm istatistiklerini sıfırlamak istediğinizden emin misiniz?")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/leaderboard/action/${gId}` : "/api/leaderboard/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", statId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("İstatistikler sıfırlandı.", "success");
      loadLeaderboardPage();
    } else {
      window.showToast(data.error || "Sıfırlama başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteStatRecord(statId) {
  if (!confirm("Bu istatistik kaydını kalıcı olarak silmek istediğinizden emin misiniz?")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/leaderboard/action/${gId}` : "/api/leaderboard/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", statId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("İstatistik kaydı kalıcı olarak silindi.", "success");
      loadLeaderboardPage();
    } else {
      window.showToast(data.error || "Silme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveLeaderboardRewards() {
  const gId = getSelectedGuildId();
  const firstPlaceCoin = Number(document.getElementById("lead-reward-first")?.value) || 0;
  const secondPlaceCoin = Number(document.getElementById("lead-reward-second")?.value) || 0;
  const thirdPlaceCoin = Number(document.getElementById("lead-reward-third")?.value) || 0;
  const rewardRole = document.getElementById("lead-reward-role")?.value || "";

  try {
    const endpoint = gId ? `/api/leaderboard/rewards/${gId}` : "/api/leaderboard/rewards";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstPlaceCoin,
        secondPlaceCoin,
        thirdPlaceCoin,
        rewardRole
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Haftalık sıralama ödülleri kaydedildi.", "success");
      loadLeaderboardPage();
    } else {
      window.showToast(data.error || "Kaydetme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

let allInvitesCache = [];

async function loadInvitesPage() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/invites/${gId}` : "/api/invites";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Davet verileri alınamadı.", "error");
      return;
    }

    allInvitesCache = data.invites || [];

    const stats = data.stats || {};
    const statTotal = document.getElementById("invite-stat-total");
    if (statTotal) statTotal.textContent = `${stats.totalInvites || 0}`;
    const statRegular = document.getElementById("invite-stat-regular");
    if (statRegular) statRegular.textContent = `${stats.totalRegular || 0}`;
    const statFake = document.getElementById("invite-stat-fake");
    if (statFake) statFake.textContent = `${stats.totalFake || 0}`;
    const statLeaves = document.getElementById("invite-stat-leaves");
    if (statLeaves) statLeaves.textContent = `${stats.totalLeaves || 0}`;

    const config = data.config || {};
    const daysInput = document.getElementById("invite-cfg-fake-days");
    if (daysInput) daysInput.value = config.fakeDays || 7;

    const channelSelect = document.getElementById("invite-cfg-channel");
    if (channelSelect) {
      let optHtml = '<option value="">Kanal Seçilmedi (Kapalı)</option>';
      (data.channels || []).forEach((c) => {
        const isSel = c.id === config.inviteChannel ? "selected" : "";
        optHtml += `<option value="${c.id}" ${isSel}>#${c.name}</option>`;
      });
      channelSelect.innerHTML = optHtml;
    }

    renderInvitesTable();
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function renderInvitesTable() {
  const tbody = document.getElementById("invites-table-body");
  if (!tbody) return;

  const searchTerm = (document.getElementById("invite-search-input")?.value || "").toLowerCase().trim();
  const filterType = document.getElementById("invite-filter")?.value || "all";

  let list = allInvitesCache.slice();

  list.sort((a, b) => {
    const scoreA = (a.regular || 0) + (a.bonus || 0) - (a.fake || 0) - (a.leaves || 0);
    const scoreB = (b.regular || 0) + (b.bonus || 0) - (b.fake || 0) - (b.leaves || 0);
    return scoreB - scoreA;
  });

  if (filterType === "positive") {
    list = list.filter((i) => ((i.regular || 0) + (i.bonus || 0) - (i.fake || 0) - (i.leaves || 0)) > 0);
  } else if (filterType === "bonus") {
    list = list.filter((i) => (i.bonus || 0) > 0);
  }

  if (searchTerm) {
    list = list.filter((i) => String(i.userId || "").toLowerCase().includes(searchTerm));
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 28px; text-align: center; color: var(--text-muted);">
          Arama kriterine uygun davet kaydı bulunamadı.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((item, index) => {
    const inviteId = item._id || item.id;
    const regular = item.regular || 0;
    const bonus = item.bonus || 0;
    const fake = item.fake || 0;
    const leaves = item.leaves || 0;
    const netScore = regular + bonus - fake - leaves;

    let scoreBadge = `<span class="stat-badge badge-green" style="font-weight: 700;">+${netScore}</span>`;
    if (netScore < 0) {
      scoreBadge = `<span class="stat-badge badge-red" style="font-weight: 700;">${netScore}</span>`;
    } else if (netScore === 0) {
      scoreBadge = `<span class="stat-badge badge-gray" style="font-weight: 700;">0</span>`;
    }

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 12px 14px; font-weight: 600; color: #94a3b8;">#${index + 1}</td>
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-size: 12px; color: #cbd5e1;">${item.userId}</span>
        </td>
        <td style="padding: 12px 14px; color: #34d399; font-weight: 600;">${regular}</td>
        <td style="padding: 12px 14px; color: #38bdf8; font-weight: 600;">+${bonus}</td>
        <td style="padding: 12px 14px; color: #f87171;">${fake}</td>
        <td style="padding: 12px 14px; color: #fbbf24;">${leaves}</td>
        <td style="padding: 12px 14px;">${scoreBadge}</td>
        <td style="padding: 12px 14px; text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="openEditInviteModal('${inviteId}')">Düzenle</button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #f87171; border-color: rgba(248, 113, 113, 0.3);" onclick="deleteInviteRecord('${inviteId}')">Sil</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAddBonusModal() {
  const modal = document.getElementById("add-invite-bonus-modal-backdrop");
  if (!modal) return;
  const inputUser = document.getElementById("modal-bonus-userid");
  if (inputUser) inputUser.value = "";
  const inputAmount = document.getElementById("modal-bonus-amount");
  if (inputAmount) inputAmount.value = "5";
  const inputReg = document.getElementById("modal-bonus-regular");
  if (inputReg) inputReg.value = "0";
  modal.style.display = "flex";
}

function closeAddBonusModal() {
  const modal = document.getElementById("add-invite-bonus-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitAddBonus() {
  const gId = getSelectedGuildId();
  const userId = document.getElementById("modal-bonus-userid")?.value.trim();
  const bonus = Number(document.getElementById("modal-bonus-amount")?.value) || 0;
  const regular = Number(document.getElementById("modal-bonus-regular")?.value) || 0;

  if (!userId) {
    window.showToast("Lütfen kullanıcı Discord ID giriniz.", "warning");
    return;
  }

  try {
    const endpoint = gId ? `/api/invites/action/${gId}` : "/api/invites/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_bonus",
        userId,
        bonus,
        regular
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Bonus davet başarıyla tanımlandı.", "success");
      closeAddBonusModal();
      loadInvitesPage();
    } else {
      window.showToast(data.error || "İşlem başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openEditInviteModal(inviteId) {
  const record = allInvitesCache.find((i) => (i._id || i.id) === inviteId);
  if (!record) {
    window.showToast("Davet kaydı bulunamadı.", "warning");
    return;
  }

  const modal = document.getElementById("edit-invite-modal-backdrop");
  if (!modal) return;

  document.getElementById("edit-invite-id").value = inviteId;
  document.getElementById("edit-invite-userid").value = record.userId || "";
  document.getElementById("edit-invite-regular").value = record.regular || 0;
  document.getElementById("edit-invite-bonus").value = record.bonus || 0;
  document.getElementById("edit-invite-fake").value = record.fake || 0;
  document.getElementById("edit-invite-leaves").value = record.leaves || 0;

  modal.style.display = "flex";
}

function closeEditInviteModal() {
  const modal = document.getElementById("edit-invite-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitEditInvite() {
  const gId = getSelectedGuildId();
  const inviteId = document.getElementById("edit-invite-id")?.value;
  const regular = Number(document.getElementById("edit-invite-regular")?.value) || 0;
  const bonus = Number(document.getElementById("edit-invite-bonus")?.value) || 0;
  const fake = Number(document.getElementById("edit-invite-fake")?.value) || 0;
  const leaves = Number(document.getElementById("edit-invite-leaves")?.value) || 0;

  if (!inviteId) return;

  try {
    const endpoint = gId ? `/api/invites/action/${gId}` : "/api/invites/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        inviteId,
        regular,
        bonus,
        fake,
        leaves
      })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Davet bilgileri güncellendi.", "success");
      closeEditInviteModal();
      loadInvitesPage();
    } else {
      window.showToast(data.error || "Güncelleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteInviteRecord(inviteId) {
  if (!confirm("Bu kullanıcının davet kaydını silmek istediğinizden emin misiniz?")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/invites/action/${gId}` : "/api/invites/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", inviteId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Davet kaydı silindi.", "success");
      loadInvitesPage();
    } else {
      window.showToast(data.error || "Silme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveInviteConfig() {
  const gId = getSelectedGuildId();
  const inviteChannel = document.getElementById("invite-cfg-channel")?.value || "";
  const fakeDays = Number(document.getElementById("invite-cfg-fake-days")?.value) || 7;

  try {
    const endpoint = gId ? `/api/invites/config/${gId}` : "/api/invites/config";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteChannel, fakeDays })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Davet sistemi yapılandırması kaydedildi.", "success");
      loadInvitesPage();
    } else {
      window.showToast(data.error || "Kaydetme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

let allBackupsCache = [];

async function loadBackupsPage() {
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/backups/${gId}` : "/api/backups";
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) {
      window.showToast(data.error || "Snapshot yedekleri alınamadı.", "error");
      return;
    }

    allBackupsCache = data.backups || [];

    const stats = data.stats || {};
    const statTotal = document.getElementById("backup-stat-total");
    if (statTotal) statTotal.textContent = `${stats.totalBackups || 0}`;
    const statManual = document.getElementById("backup-stat-manual");
    if (statManual) statManual.textContent = `${stats.manualBackups || 0}`;
    const statAuto = document.getElementById("backup-stat-auto");
    if (statAuto) statAuto.textContent = `${stats.autoBackups || 0}`;
    const statEmergency = document.getElementById("backup-stat-emergency");
    if (statEmergency) statEmergency.textContent = `${stats.emergencyBackups || 0}`;

    const config = data.config || {};
    const intervalSelect = document.getElementById("backup-cfg-interval");
    if (intervalSelect) intervalSelect.value = config.backupInterval || "DAILY";
    const maxInput = document.getElementById("backup-cfg-max");
    if (maxInput) maxInput.value = config.maxBackups || 10;

    renderBackupsTable();
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function renderBackupsTable() {
  const tbody = document.getElementById("backups-table-body");
  if (!tbody) return;

  const searchTerm = (document.getElementById("backup-search-input")?.value || "").toLowerCase().trim();
  const filterType = document.getElementById("backup-type-filter")?.value || "all";

  let list = allBackupsCache.slice();

  if (filterType !== "all") {
    list = list.filter((b) => b.type === filterType);
  }

  if (searchTerm) {
    list = list.filter((b) => {
      const bId = String(b._id || b.id || "").toLowerCase();
      const type = String(b.type || "").toLowerCase();
      return bId.includes(searchTerm) || type.includes(searchTerm);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 28px; text-align: center; color: var(--text-muted);">
          Arama kriterine uygun snapshot yedeği bulunamadı.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((b) => {
    const backupId = b._id || b.id;
    const roleCount = b.roles ? b.roles.length : 0;
    const channelCount = b.channels ? b.channels.length : 0;
    const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "-";

    let typeBadge = `<span class="stat-badge badge-blue">MANUEL</span>`;
    if (b.type === "AUTO") typeBadge = `<span class="stat-badge badge-purple">OTOMATİK</span>`;
    else if (b.type === "EMERGENCY") typeBadge = `<span class="stat-badge badge-red">ACİL DURUM</span>`;

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 12px 14px;">
          <span style="font-family: monospace; font-size: 11.5px; color: #38bdf8;">${backupId}</span>
        </td>
        <td style="padding: 12px 14px;">${typeBadge}</td>
        <td style="padding: 12px 14px;">
          <span style="font-weight: 600; color: #f8fafc;">${roleCount} Rol</span>
        </td>
        <td style="padding: 12px 14px;">
          <span style="font-weight: 600; color: #f8fafc;">${channelCount} Kanal</span>
        </td>
        <td style="padding: 12px 14px; font-size: 12px; color: #94a3b8;">${dateStr}</td>
        <td style="padding: 12px 14px; text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px;" onclick="openEditBackupModal('${backupId}')">İncele</button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #34d399; border-color: rgba(52, 211, 153, 0.3);" onclick="restoreBackupRecord('${backupId}')">Geri Yükle</button>
            <button type="button" class="btn-panel-action" style="padding: 4px 8px; font-size: 11px; color: #f87171; border-color: rgba(248, 113, 113, 0.3);" onclick="deleteBackupRecord('${backupId}')">Sil</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openCreateBackupModal() {
  const modal = document.getElementById("create-backup-modal-backdrop");
  if (modal) modal.style.display = "flex";
}

function closeCreateBackupModal() {
  const modal = document.getElementById("create-backup-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitCreateBackup() {
  const gId = getSelectedGuildId();
  const type = document.getElementById("modal-backup-type")?.value || "MANUAL";

  try {
    const endpoint = gId ? `/api/backups/action/${gId}` : "/api/backups/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", type })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Sunucu snapshot yedeği başarıyla alındı.", "success");
      closeCreateBackupModal();
      loadBackupsPage();
    } else {
      window.showToast(data.error || "Yedek alma başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

function openEditBackupModal(backupId) {
  const record = allBackupsCache.find((b) => (b._id || b.id) === backupId);
  if (!record) {
    window.showToast("Snapshot kaydı bulunamadı.", "warning");
    return;
  }

  const modal = document.getElementById("edit-backup-modal-backdrop");
  if (!modal) return;

  document.getElementById("edit-backup-id").value = backupId;
  document.getElementById("edit-backup-id-label").textContent = backupId;
  document.getElementById("edit-backup-type").value = record.type || "MANUAL";

  const channelsContainer = document.getElementById("edit-backup-channels-preview");
  if (channelsContainer) {
    if (record.channels && record.channels.length > 0) {
      channelsContainer.innerHTML = record.channels.map(c => `<div>#${c.name} (Tür: ${c.type}, ID: ${c.id})</div>`).join("");
    } else {
      channelsContainer.innerHTML = "<div>Kayıtlı kanal bulunmuyor.</div>";
    }
  }

  const rolesContainer = document.getElementById("edit-backup-roles-preview");
  if (rolesContainer) {
    if (record.roles && record.roles.length > 0) {
      rolesContainer.innerHTML = record.roles.map(r => `<div>@${r.name} (ID: ${r.id}, Sıra: ${r.position})</div>`).join("");
    } else {
      rolesContainer.innerHTML = "<div>Kayıtlı rol bulunmuyor.</div>";
    }
  }

  modal.style.display = "flex";
}

function closeEditBackupModal() {
  const modal = document.getElementById("edit-backup-modal-backdrop");
  if (modal) modal.style.display = "none";
}

async function submitEditBackup() {
  const gId = getSelectedGuildId();
  const backupId = document.getElementById("edit-backup-id")?.value;
  const type = document.getElementById("edit-backup-type")?.value || "MANUAL";

  if (!backupId) return;

  try {
    const endpoint = gId ? `/api/backups/action/${gId}` : "/api/backups/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", backupId, type })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Snapshot yedeği türü güncellendi.", "success");
      closeEditBackupModal();
      loadBackupsPage();
    } else {
      window.showToast(data.error || "Güncelleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function restoreBackupRecord(backupId) {
  if (!confirm("Bu snapshot yedeğini sunucuya geri yüklemek istiyor musunuz?")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/backups/action/${gId}` : "/api/backups/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", backupId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast(data.message || "Geri yükleme simülasyonu başarıyla tetiklendi.", "success");
    } else {
      window.showToast(data.error || "Geri yükleme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function deleteBackupRecord(backupId) {
  if (!confirm("Bu snapshot yedeğini PostgreSQL veritabanından kalıcı olarak silmek istediğinizden emin misiniz?")) return;
  const gId = getSelectedGuildId();
  try {
    const endpoint = gId ? `/api/backups/action/${gId}` : "/api/backups/action";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", backupId })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Snapshot yedeği kalıcı olarak silindi.", "success");
      loadBackupsPage();
    } else {
      window.showToast(data.error || "Silme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

async function saveBackupConfig() {
  const gId = getSelectedGuildId();
  const backupInterval = document.getElementById("backup-cfg-interval")?.value || "DAILY";
  const maxBackups = Number(document.getElementById("backup-cfg-max")?.value) || 10;

  try {
    const endpoint = gId ? `/api/backups/config/${gId}` : "/api/backups/config";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupInterval, maxBackups })
    });
    const data = await res.json();
    if (data.success) {
      window.showToast("Otomatik yedekleme yapılandırması kaydedildi.", "success");
      loadBackupsPage();
    } else {
      window.showToast(data.error || "Kaydetme başarısız.", "error");
    }
  } catch (err) {
    window.showToast("Bağlantı hatası: " + err.message, "error");
  }
}

window.loadLeaderboardPage = loadLeaderboardPage;
window.renderLeaderboardTable = renderLeaderboardTable;
window.openCreateStatModal = openCreateStatModal;
window.closeCreateStatModal = closeCreateStatModal;
window.submitCreateStat = submitCreateStat;
window.openEditStatModal = openEditStatModal;
window.closeEditStatModal = closeEditStatModal;
window.submitEditStat = submitEditStat;
window.resetStatRecord = resetStatRecord;
window.deleteStatRecord = deleteStatRecord;
window.saveLeaderboardRewards = saveLeaderboardRewards;

window.loadInvitesPage = loadInvitesPage;
window.renderInvitesTable = renderInvitesTable;
window.openAddBonusModal = openAddBonusModal;
window.closeAddBonusModal = closeAddBonusModal;
window.submitAddBonus = submitAddBonus;
window.openEditInviteModal = openEditInviteModal;
window.closeEditInviteModal = closeEditInviteModal;
window.submitEditInvite = submitEditInvite;
window.deleteInviteRecord = deleteInviteRecord;
window.saveInviteConfig = saveInviteConfig;

window.loadBackupsPage = loadBackupsPage;
window.renderBackupsTable = renderBackupsTable;
window.openCreateBackupModal = openCreateBackupModal;
window.closeCreateBackupModal = closeCreateBackupModal;
window.submitCreateBackup = submitCreateBackup;
window.openEditBackupModal = openEditBackupModal;
window.closeEditBackupModal = closeEditBackupModal;
window.submitEditBackup = submitEditBackup;
window.restoreBackupRecord = restoreBackupRecord;
window.deleteBackupRecord = deleteBackupRecord;
window.saveBackupConfig = saveBackupConfig;

let securityAuditLogsCache = [];
let generated2faSecretCache = "";

window.loadSecurityTab = async function() {
  await Promise.all([
    check2faStatus(),
    checkGuardLockdownStatus(),
    loadSecurityAuditLogs()
  ]);
};

async function check2faStatus() {
  try {
    const res = await fetch("/api/auth/2fa/status");
    const data = await res.json();
    const isEnabled = Boolean(data && data.enabled);

    const badge = document.getElementById("security-2fa-badge");
    const text = document.getElementById("security-2fa-status-text");
    const unconfiguredBox = document.getElementById("security-2fa-unconfigured-box");
    const setupBox = document.getElementById("security-2fa-setup-box");
    const activeBox = document.getElementById("security-2fa-active-box");

    if (badge) {
      badge.textContent = isEnabled ? "AKTİF" : "DEVRE DIŞI";
      badge.className = isEnabled ? "metric-pill pill-success" : "metric-pill pill-danger";
    }
    if (text) {
      text.textContent = isEnabled ? "2FA Korumalı" : "Korumasız";
    }
    if (isEnabled) {
      if (unconfiguredBox) unconfiguredBox.style.display = "none";
      if (setupBox) setupBox.style.display = "none";
      if (activeBox) activeBox.style.display = "block";
    } else {
      if (unconfiguredBox) unconfiguredBox.style.display = "block";
      if (setupBox) setupBox.style.display = "none";
      if (activeBox) activeBox.style.display = "none";
    }
  } catch {}
}

window.initiate2faSetup = async function() {
  try {
    const res = await fetch("/api/auth/2fa/generate", { method: "POST" });
    const data = await res.json();
    if (data.success && data.secret) {
      generated2faSecretCache = data.secret;
      const secretDisplay = document.getElementById("security-2fa-secret-display");
      if (secretDisplay) secretDisplay.value = data.secret;

      const unconfiguredBox = document.getElementById("security-2fa-unconfigured-box");
      const setupBox = document.getElementById("security-2fa-setup-box");
      const errorBox = document.getElementById("security-2fa-setup-error");

      if (unconfiguredBox) unconfiguredBox.style.display = "none";
      if (setupBox) setupBox.style.display = "block";
      if (errorBox) errorBox.style.display = "none";

      const confirmInput = document.getElementById("security-2fa-confirm-input");
      if (confirmInput) {
        confirmInput.value = "";
        confirmInput.focus();
      }
    }
  } catch (err) {
    alert("2FA anahtarı üretilemedi: " + err.message);
  }
};

window.copy2faSecretToClipboard = function() {
  const secretDisplay = document.getElementById("security-2fa-secret-display");
  if (secretDisplay && secretDisplay.value) {
    navigator.clipboard.writeText(secretDisplay.value).then(() => {
      alert("2FA Kurulum Anahtarı panoya kopyalandı!");
    }).catch(() => {});
  }
};

window.cancel2faSetup = function() {
  generated2faSecretCache = "";
  const unconfiguredBox = document.getElementById("security-2fa-unconfigured-box");
  const setupBox = document.getElementById("security-2fa-setup-box");
  if (unconfiguredBox) unconfiguredBox.style.display = "block";
  if (setupBox) setupBox.style.display = "none";
};

window.confirmEnable2fa = async function() {
  const confirmInput = document.getElementById("security-2fa-confirm-input");
  const errorBox = document.getElementById("security-2fa-setup-error");
  const code = confirmInput ? confirmInput.value.trim() : "";

  if (!code || !generated2faSecretCache) {
    if (errorBox) {
      errorBox.textContent = "Lütfen Authenticator uygulamasındaki 6 haneli kodu giriniz.";
      errorBox.style.display = "block";
    }
    return;
  }

  try {
    const res = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: generated2faSecretCache, code })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      generated2faSecretCache = "";
      alert("İki aşamalı doğrulama başarıyla etkinleştirildi!");
      await check2faStatus();
      await loadSecurityAuditLogs();
    } else {
      if (errorBox) {
        errorBox.textContent = data.error || "Kod doğrulanamadı.";
        errorBox.style.display = "block";
      }
    }
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = "Bağlantı hatası: " + err.message;
      errorBox.style.display = "block";
    }
  }
};

window.initiate2faDisable = async function() {
  const code = prompt("2FA korumasını devre dışı bırakmak için Authenticator kodunuzu veya yönetici parolanızı giriniz:");
  if (!code) return;

  try {
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert("İki aşamalı doğrulama devre dışı bırakıldı.");
      await check2faStatus();
      await loadSecurityAuditLogs();
    } else {
      alert(data.error || "2FA devre dışı bırakılamadı.");
    }
  } catch (err) {
    alert("İşlem hatası: " + err.message);
  }
};

async function checkGuardLockdownStatus() {
  try {
    const res = await fetch("/api/guard/lockdown-status");
    const data = await res.json();
    const details = data && data.data ? data.data : { active: false };

    const badge = document.getElementById("security-lockdown-badge");
    const val = document.getElementById("security-lockdown-val");
    const desc = document.getElementById("security-lockdown-desc");
    const toggleBtn = document.getElementById("btn-security-lockdown-toggle");

    if (details.active) {
      if (badge) {
        badge.textContent = "KİLİTLİ (PANIC)";
        badge.className = "metric-pill pill-danger";
      }
      if (val) val.textContent = "Acil Kilit Modunda";
      if (desc) desc.textContent = details.reason ? `Sebep: ${details.reason}` : "Sistem acil durum modunda kilitlendi.";
      if (toggleBtn) {
        toggleBtn.textContent = "Kilit Modunu Kaldır (Normale Dön)";
        toggleBtn.style.background = "#23a55a";
      }
    } else {
      if (badge) {
        badge.textContent = "NORMAL";
        badge.className = "metric-pill pill-success";
      }
      if (val) val.textContent = "Sistem Aktif";
      if (desc) desc.textContent = "Yetkili suistimalinde acil dondurma kalkanı.";
      if (toggleBtn) {
        toggleBtn.textContent = "Acil Kilit Modunu Başlat (Panic Shield)";
        toggleBtn.style.background = "#ef4444";
      }
    }
  } catch {}
}

window.toggleGuardLockdown = async function() {
  const reasonInput = document.getElementById("security-lockdown-reason-input");
  const feedback = document.getElementById("security-lockdown-feedback");
  const toggleBtn = document.getElementById("btn-security-lockdown-toggle");

  const isCurrentlyActive = toggleBtn && toggleBtn.textContent.includes("Kaldır");
  const newActiveState = !isCurrentlyActive;

  if (newActiveState) {
    const confirmed = confirm("DİKKAT: Acil durum kilit modu sunucudaki bot işlemlerini donduracaktır. Devam etmek istiyor musunuz?");
    if (!confirmed) return;
  }

  try {
    const res = await fetch("/api/guard/lockdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: newActiveState,
        reason: reasonInput ? reasonInput.value.trim() : ""
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (feedback) {
        feedback.textContent = data.message;
        feedback.style.color = newActiveState ? "#ef4444" : "#10b981";
        feedback.style.display = "block";
      }
      await checkGuardLockdownStatus();
      await loadSecurityAuditLogs();
    } else {
      if (feedback) {
        feedback.textContent = data.error || "İşlem gerçekleştirilemedi.";
        feedback.style.color = "#ed4245";
        feedback.style.display = "block";
      }
    }
  } catch (err) {
    if (feedback) {
      feedback.textContent = "Bağlantı hatası: " + err.message;
      feedback.style.color = "#ed4245";
      feedback.style.display = "block";
    }
  }
};

window.loadSecurityAuditLogs = async function() {
  try {
    const tbody = document.getElementById("security-audit-tbody");
    const countBadge = document.getElementById("security-logs-count-badge");
    const countVal = document.getElementById("security-logs-count-val");

    const res = await fetch("/api/security/audit-logs?limit=100");
    const data = await res.json();
    const logs = (data && data.success && Array.isArray(data.data)) ? data.data : [];
    securityAuditLogsCache = logs;

    if (countBadge) countBadge.textContent = `${logs.length} OLAY`;
    if (countVal) countVal.textContent = `${logs.length} Kayıt`;

    renderSecurityAuditLogs(logs);
  } catch {
    const tbody = document.getElementById("security-audit-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ed4245; padding: 24px;">Günlük kayıtları alınamadı.</td></tr>`;
    }
  }
};

function renderSecurityAuditLogs(logs) {
  const tbody = document.getElementById("security-audit-tbody");
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Henüz kaydedilmiş bir güvenlik olayı bulunmuyor.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map((log) => {
    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString("tr-TR") : "-";
    const statusPill = log.status === "SUCCESS"
      ? `<span class="metric-pill pill-success">BAŞARILI</span>`
      : `<span class="metric-pill pill-danger">BAŞARISIZ</span>`;

    let detailsStr = "-";
    if (log.details && typeof log.details === "object" && Object.keys(log.details).length > 0) {
      detailsStr = escapeHtml(JSON.stringify(log.details));
    }

    return `
      <tr>
        <td style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${escapeHtml(timeStr)}</td>
        <td><strong style="color: #f2f3f5; font-size: 12px;">${escapeHtml(log.action || "-")}</strong></td>
        <td><span style="color: #38bdf8; font-weight: 500; font-size: 12px;">${escapeHtml(log.username || "Bilinmiyor")}</span></td>
        <td style="font-family: monospace; font-size: 11px;">${escapeHtml(log.ip || "-")}</td>
        <td style="text-align: center;">${statusPill}</td>
        <td style="font-size: 11px; color: var(--text-muted); font-family: monospace; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${detailsStr}</td>
      </tr>
    `;
  }).join("");
}

window.filterSecurityAuditLogs = function() {
  const select = document.getElementById("security-audit-filter");
  const filterVal = select ? select.value : "ALL";

  if (filterVal === "ALL") {
    renderSecurityAuditLogs(securityAuditLogsCache);
    return;
  }

  const filtered = securityAuditLogsCache.filter((item) => {
    const action = String(item.action || "").toUpperCase();
    if (filterVal === "LOGIN") return action.includes("LOGIN");
    if (filterVal === "2FA") return action.includes("2FA");
    if (filterVal === "GUARD") return action.includes("GUARD") || action.includes("LOCKDOWN");
    if (filterVal === "BACKUP") return action.includes("BACKUP");
    return true;
  });

  renderSecurityAuditLogs(filtered);
};
