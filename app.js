/* ===============================
   Daily Checker — app.js (FIXED)
   Zgodny z aktualnym index.html:
   - bestStreak / currentStreak
   - clearBtn
   - exportBtn / importBtn / importFile
   - tabs: .tab-button[data-tab] + #daily-tab/#stats-tab/#backup-tab
================================ */

const STORAGE_KEY = "dailyCheckerData";
const STREAK_KEY = "dailyCheckerStreak";

/* ---------- Helpers: Storage ---------- */
function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str) ?? fallback;
  } catch {
    return fallback;
  }
}

function getAllData() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
}

function saveAllData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getStreakData() {
  return safeJsonParse(localStorage.getItem(STREAK_KEY), {
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
  });
}

function saveStreakData(streak) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

/* ---------- Helpers: Date ---------- */
function getTodayDateString() {
  const today = new Date();
  // YYYY-MM-DD (lokalnie)
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isYesterday(prevDateStr, currentDateStr) {
  const prev = toDate(prevDateStr);
  const cur = toDate(currentDateStr);
  const diffDays = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

function formatDatePL(dateStr) {
  const dt = toDate(dateStr);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dt);
}

/* ---------- Toast ---------- */
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

/* ---------- Slider value display (iOS fix) ---------- */
function updateRatingDisplay() {
  const slider = document.getElementById("q9_answer");
  const display = document.getElementById("ratingValue");
  if (!slider || !display) return;
  display.textContent = slider.value;
}

/* ---------- Streak ---------- */
function updateStreakOnComplete(dateStr) {
  const streak = getStreakData();

  if (!streak.lastCompletedDate) {
    streak.currentStreak = 1;
    streak.bestStreak = Math.max(streak.bestStreak, 1);
    streak.lastCompletedDate = dateStr;
    saveStreakData(streak);
    return;
  }

  // Jeśli zapisujesz ponownie tę samą datę – nie zwiększaj streaka
  if (streak.lastCompletedDate === dateStr) {
    return;
  }

  if (isYesterday(streak.lastCompletedDate, dateStr)) {
    streak.currentStreak += 1;
  } else {
    streak.currentStreak = 1;
  }

  streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);
  streak.lastCompletedDate = dateStr;
  saveStreakData(streak);
}

function updateStreakDisplay() {
  const streak = getStreakData();
  const curEl = document.getElementById("currentStreak");
  const bestEl = document.getElementById("bestStreak");
  if (curEl) curEl.textContent = String(streak.currentStreak ?? 0);
  if (bestEl) bestEl.textContent = String(streak.bestStreak ?? 0);
}

/* ---------- Form: Read/Write ---------- */
function getFormDataFromUI() {
  return {
    completed: true,

    q1: !!document.getElementById("q1_answer")?.checked,
    q1_details: document.getElementById("q1_details")?.value?.trim() ?? "",

    q2: !!document.getElementById("q2_answer")?.checked,
    q2_details: document.getElementById("q2_details")?.value?.trim() ?? "",

    q3: !!document.getElementById("q3_answer")?.checked,
    q3_details: document.getElementById("q3_details")?.value?.trim() ?? "",

    q4: !!document.getElementById("q4_answer")?.checked,
    q4_details: document.getElementById("q4_details")?.value?.trim() ?? "",

    q5: !!document.getElementById("q5_answer")?.checked,

    q6: parseFloat(document.getElementById("q6_answer")?.value) || 0,

    q7: !!document.getElementById("q7_answer")?.checked,
    q7_details: document.getElementById("q7_details")?.value?.trim() ?? "",

    q8: !!document.getElementById("q8_answer")?.checked,
    q8_details: document.getElementById("q8_details")?.value?.trim() ?? "",

    q9: parseInt(document.getElementById("q9_answer")?.value, 10) || 0,

    savedAt: new Date().toISOString(),
  };
}

function clearFormUI(showMsg = true) {
  const setChecked = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.checked = v;
  };
  const setValue = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
  };

  setChecked("q1_answer", false); setValue("q1_details", "");
  setChecked("q2_answer", false); setValue("q2_details", "");
  setChecked("q3_answer", false); setValue("q3_details", "");
  setChecked("q4_answer", false); setValue("q4_details", "");
  setChecked("q5_answer", false);
  setValue("q6_answer", "");
  setChecked("q7_answer", false); setValue("q7_details", "");
  setChecked("q8_answer", false); setValue("q8_details", "");
  setValue("q9_answer", "5");
  updateRatingDisplay();

  if (showMsg) showToast("Formularz wyczyszczony.");
}

function loadFormData(dateStr) {
  const data = getAllData();
  const entry = data[dateStr];

  // brak wpisu -> czyścimy tylko UI
  if (!entry) {
    clearFormUI(false);
    return;
  }

  const setChecked = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!v;
  };
  const setValue = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v ?? "";
  };

  setChecked("q1_answer", entry.q1); setValue("q1_details", entry.q1_details);
  setChecked("q2_answer", entry.q2); setValue("q2_details", entry.q2_details);
  setChecked("q3_answer", entry.q3); setValue("q3_details", entry.q3_details);
  setChecked("q4_answer", entry.q4); setValue("q4_details", entry.q4_details);
  setChecked("q5_answer", entry.q5);
  setValue("q6_answer", entry.q6 ?? "");
  setChecked("q7_answer", entry.q7); setValue("q7_details", entry.q7_details);
  setChecked("q8_answer", entry.q8); setValue("q8_details", entry.q8_details);
  setValue("q9_answer", entry.q9 ?? 5);

  updateRatingDisplay();
}

/* ---------- Tabs ---------- */
function setupTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const contents = document.querySelectorAll(".tab-content");

  function activateTab(tabName) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
    contents.forEach((c) => c.classList.toggle("active", c.id === `${tabName}-tab`));

    if (tabName === "stats") {
      renderStats();
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // domyślnie daily
  activateTab("daily");
}

/* ---------- Backup (Export/Import) ---------- */
function buildBackupPayload() {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: getAllData(),
    streak: getStreakData(),
  };
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleExport() {
  const payload = buildBackupPayload();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  downloadJson(`daily-checker-backup_${ts}.json`, payload);
  showToast("Wyeksportowano dane do JSON.");
}

function parseBackupJson(text) {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== "object") throw new Error("Nieprawidłowy plik.");
  if (!obj.data || typeof obj.data !== "object") throw new Error('Brak pola "data".');
  if (!obj.streak || typeof obj.streak !== "object") throw new Error('Brak pola "streak".');
  return obj;
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = parseBackupJson(reader.result);
      const ok = confirm("Import nadpisze dane w aplikacji. Kontynuować?");
      if (!ok) return;

      saveAllData(backup.data);
      saveStreakData(backup.streak);

      updateStreakDisplay();

      const dateStr = document.getElementById("dateInput")?.value || getTodayDateString();
      loadFormData(dateStr);

      showToast("Zaimportowano dane z JSON.");
    } catch (e) {
      console.error(e);
      alert("Nie udało się zaimportować danych: " + (e.message || e));
    }
  };
  reader.readAsText(file);
}

function setupBackupUi() {
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");

  if (exportBtn) exportBtn.addEventListener("click", handleExport);

  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      handleImportFile(file);
      importFile.value = "";
    });
  }
}

/* ---------- Stats ---------- */
function getCompletedEntries() {
  const all = getAllData();
  const dates = Object.keys(all).filter((d) => all[d]?.completed);
  dates.sort((a, b) => (a < b ? 1 : -1)); // desc
  return { all, dates };
}

function calculateStats() {
  const { all, dates } = getCompletedEntries();
  const totalDays = dates.length;

  if (totalDays === 0) {
    return {
      totalDays: 0,
      avgSleep: 0,
      avgRating: 0,
      yesNo: [],
      recent: [],
    };
  }

  let sumSleep = 0;
  let sumRating = 0;

  // pytania TAK/NIE do statów
  const yesNoDefs = [
    { key: "q1", label: "Woda (min. 2L)" },
    { key: "q2", label: "Kroki (min. 5000)" },
    { key: "q3", label: "Trening" },
    { key: "q4", label: "Rozciąganie + core" },
    { key: "q5", label: "Suplementy/witaminy" },
    { key: "q7", label: "Czytanie książki" },
    { key: "q8", label: "Rozwój umiejętności" },
  ];

  const yesCounts = Object.fromEntries(yesNoDefs.map((d) => [d.key, 0]));

  dates.forEach((dateStr) => {
    const e = all[dateStr];
    sumSleep += Number(e.q6 || 0);
    sumRating += Number(e.q9 || 0);

    yesNoDefs.forEach((d) => {
      if (e[d.key]) yesCounts[d.key] += 1;
    });
  });

  const yesNo = yesNoDefs.map((d) => {
    const yes = yesCounts[d.key];
    const pct = Math.round((yes / totalDays) * 100);
    return { label: d.label, yes, total: totalDays, pct };
  });

  return {
    totalDays,
    avgSleep: sumSleep / totalDays,
    avgRating: sumRating / totalDays,
    yesNo,
  };
}

function renderYesNoStats(yesNo) {
  const host = document.getElementById("yesNoStats");
  if (!host) return;

  host.innerHTML = "";
  yesNo.forEach((s) => {
    const wrap = document.createElement("div");
    wrap.className = "stat-bar";

    wrap.innerHTML = `
      <div class="stat-bar-header">
        <span class="stat-bar-name">${s.label}</span>
        <span class="stat-bar-value">${s.pct}% (${s.yes}/${s.total})</span>
      </div>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width:${s.pct}%"></div>
      </div>
    `;

    host.appendChild(wrap);
  });
}

function renderRecentDays() {
  const recentDaysEl = document.getElementById("recentDays");
  const recentPeriodEl = document.getElementById("recentPeriod");
  const recentTitleEl = document.getElementById("recentTitle");

  if (!recentDaysEl || !recentPeriodEl || !recentTitleEl) return;

  const { all, dates } = getCompletedEntries();
  const period = recentPeriodEl.value;

  let limit = 7;
  if (period === "30") limit = 30;
  if (period === "lifetime") limit = dates.length;

  recentTitleEl.textContent =
    period === "30" ? "📅 Ostatnie 30 dni" : period === "lifetime" ? "📅 Lifetime" : "📅 Ostatnie 7 dni";

  const slice = dates.slice(0, limit);

  recentDaysEl.innerHTML = "";
  slice.forEach((dateStr) => {
    const e = all[dateStr];
    const item = document.createElement("div");
    item.className = "day-item";

    const rating = Number(e.q9 ?? 0);
    const sleep = Number(e.q6 ?? 0);

    item.innerHTML = `
      <div class="day-header">
        <span class="day-date">${formatDatePL(dateStr)}</span>
        <span class="day-rating">${rating}</span>
      </div>
      <div class="day-summary">
        Sen: ${sleep}h • Woda: ${e.q1 ? "TAK" : "NIE"} • Kroki: ${e.q2 ? "TAK" : "NIE"}
      </div>
      <div class="day-details">
        <div class="day-detail-item"><strong>Woda:</strong> ${e.q1 ? (e.q1_details || "TAK") : "NIE"}</div>
        <div class="day-detail-item"><strong>Kroki:</strong> ${e.q2 ? (e.q2_details || "TAK") : "NIE"}</div>
        <div class="day-detail-item"><strong>Trening:</strong> ${e.q3 ? (e.q3_details || "TAK") : "NIE"}</div>
        <div class="day-detail-item"><strong>Rozciąganie+core:</strong> ${e.q4 ? (e.q4_details || "TAK") : "NIE"}</div>
        <div class="day-detail-item"><strong>Suplementy:</strong> ${e.q5 ? "TAK" : "NIE"}</div>
        <div class="day-detail-item"><strong>Książka:</strong> ${e.q7 ? (e.q7_details || "TAK") : "NIE"}</div>
        <div class="day-detail-item"><strong>Umiejętności:</strong> ${e.q8 ? (e.q8_details || "TAK") : "NIE"}</div>
      </div>
    `;

    item.addEventListener("click", () => {
      const details = item.querySelector(".day-details");
      if (details) details.classList.toggle("show");
    });

    recentDaysEl.appendChild(item);
  });
}

function renderStats() {
  const stats = calculateStats();

  const totalEl = document.getElementById("statTotalDays");
  const avgSleepEl = document.getElementById("statAvgSleep");
  const avgRatingEl = document.getElementById("statAvgRating");

  if (totalEl) totalEl.textContent = String(stats.totalDays);
  if (avgSleepEl) avgSleepEl.textContent = `${stats.avgSleep.toFixed(1)}h`;
  if (avgRatingEl) avgRatingEl.textContent = stats.avgRating.toFixed(1);

  renderYesNoStats(stats.yesNo);
  renderRecentDays();
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Tabs + Backup
  setupTabs();
  setupBackupUi();

  // Date
  const dateInput = document.getElementById("dateInput");
  const today = getTodayDateString();
  if (dateInput) {
    dateInput.value = today;
    loadFormData(today);

    dateInput.addEventListener("change", (e) => {
      loadFormData(e.target.value);
    });
  }

  // Streak
  updateStreakDisplay();

  // Slider events (iOS/PWA fix)
  const ratingSlider = document.getElementById("q9_answer");
  if (ratingSlider) {
    ["input", "change", "touchmove", "touchend"].forEach((evt) => {
      ratingSlider.addEventListener(evt, updateRatingDisplay, { passive: true });
    });
    updateRatingDisplay();
  }

  // Save day
  const form = document.getElementById("dailyForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const dateStr = dateInput?.value || getTodayDateString();
      const allData = getAllData();
      allData[dateStr] = getFormDataFromUI();
      saveAllData(allData);

      updateStreakOnComplete(dateStr);
      updateStreakDisplay();

      showToast("Zapisano dzień!");
    });
  }

  // Clear form
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => clearFormUI(true));
  }

  // Stats: zmiana okresu
  const recentPeriod = document.getElementById("recentPeriod");
  if (recentPeriod) {
    recentPeriod.addEventListener("change", () => renderRecentDays());
  }
});
