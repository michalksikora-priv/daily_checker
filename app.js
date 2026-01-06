// ===== STAŁE I KONFIGURACJA =====
const STORAGE_KEY = 'dailyCheckerData';
const STREAK_KEY = 'dailyCheckerStreak';

// ===== POMOCNICZE FUNKCJE STORAGE =====
function getAllData() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
        console.warn('Błąd odczytu danych:', e);
        return {};
    }
}

function saveAllData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getStreakData() {
    try {
        return JSON.parse(localStorage.getItem(STREAK_KEY)) || {
            currentStreak: 0,
            longestStreak: 0,
            lastCompletedDate: null
        };
    } catch (e) {
        console.warn('Błąd odczytu streak:', e);
        return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
    }
}

function saveStreakData(data) {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

// ===== FORMATOWANIE DAT =====
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDatePL(dateString) {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function isYesterday(dateStr, compareToStr) {
    const d1 = new Date(dateStr);
    const d2 = new Date(compareToStr);
    const diff = d2 - d1;
    return diff > 0 && diff <= 36 * 60 * 60 * 1000; // do 36h tolerancji
}

// ===== TOAST =====
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== STREAK =====
function updateStreakOnComplete(dateStr) {
    const streak = getStreakData();
    const last = streak.lastCompletedDate;

    if (!last) {
        streak.currentStreak = 1;
        streak.longestStreak = Math.max(streak.longestStreak, 1);
        streak.lastCompletedDate = dateStr;
        saveStreakData(streak);
        return;
    }

    if (last === dateStr) {
        // już dziś zapisane
        return;
    }

    if (isYesterday(last, dateStr)) {
        streak.currentStreak += 1;
    } else {
        streak.currentStreak = 1;
    }

    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    streak.lastCompletedDate = dateStr;
    saveStreakData(streak);
}

function updateStreakDisplay() {
    const streak = getStreakData();
    document.getElementById('currentStreak').textContent = streak.currentStreak;
    document.getElementById('longestStreak').textContent = streak.longestStreak;
}

// ===== FORM =====
function getFormDataFromUI() {
    return {
        completed: true,
        q1: document.getElementById('q1_answer').checked,
        q1_details: document.getElementById('q1_details').value || '',
        q2: document.getElementById('q2_answer').checked,
        q2_details: document.getElementById('q2_details').value || '',
        q3: document.getElementById('q3_answer').checked,
        q3_details: document.getElementById('q3_details').value || '',
        q4: document.getElementById('q4_answer').checked,
        q4_details: document.getElementById('q4_details').value || '',
        q5: document.getElementById('q5_answer').checked,
        q5_details: document.getElementById('q5_details').value || '',
        q6: parseFloat(document.getElementById('q6_answer').value) || 0,
        q7: document.getElementById('q7_answer').checked,
        q7_details: document.getElementById('q7_details').value || '',
        q8: document.getElementById('q8_answer').checked,
        q8_details: document.getElementById('q8_details').value || '',
        q9: parseInt(document.getElementById('q9_answer').value, 10) || 0,
        savedAt: new Date().toISOString()
    };
}

function loadFormData(dateStr) {
    const data = getAllData();
    const entry = data[dateStr];

    if (!entry) {
        clearFormUI(false);
        updateRatingDisplay();
        return;
    }

    document.getElementById('q1_answer').checked = !!entry.q1;
    document.getElementById('q1_details').value = entry.q1_details || '';

    document.getElementById('q2_answer').checked = !!entry.q2;
    document.getElementById('q2_details').value = entry.q2_details || '';

    document.getElementById('q3_answer').checked = !!entry.q3;
    document.getElementById('q3_details').value = entry.q3_details || '';

    document.getElementById('q4_answer').checked = !!entry.q4;
    document.getElementById('q4_details').value = entry.q4_details || '';

    document.getElementById('q5_answer').checked = !!entry.q5;
    document.getElementById('q5_details').value = entry.q5_details || '';

    document.getElementById('q6_answer').value = entry.q6 ?? 0;

    document.getElementById('q7_answer').checked = !!entry.q7;
    document.getElementById('q7_details').value = entry.q7_details || '';

    document.getElementById('q8_answer').checked = !!entry.q8;
    document.getElementById('q8_details').value = entry.q8_details || '';

    document.getElementById('q9_answer').value = entry.q9 ?? 0;
    updateRatingDisplay();
}

function clearFormUI(showMsg = true) {
    document.getElementById('q1_answer').checked = false;
    document.getElementById('q1_details').value = '';

    document.getElementById('q2_answer').checked = false;
    document.getElementById('q2_details').value = '';

    document.getElementById('q3_answer').checked = false;
    document.getElementById('q3_details').value = '';

    document.getElementById('q4_answer').checked = false;
    document.getElementById('q4_details').value = '';

    document.getElementById('q5_answer').checked = false;
    document.getElementById('q5_details').value = '';

    document.getElementById('q6_answer').value = '0';

    document.getElementById('q7_answer').checked = false;
    document.getElementById('q7_details').value = '';

    document.getElementById('q8_answer').checked = false;
    document.getElementById('q8_details').value = '';

    document.getElementById('q9_answer').value = '5';
    updateRatingDisplay();

    if (showMsg) showToast('Formularz wyczyszczony.');
}

// ===== SLIDER DISPLAY =====
function updateRatingDisplay() {
    const slider = document.getElementById('q9_answer');
    const display = document.getElementById('ratingValue');
    if (!slider || !display) return;
    display.textContent = slider.value;
}

// ===== STATYSTYKI =====

// Obliczanie statystyk
function calculateStats() {
    const allData = getAllData();
    const dates = Object.keys(allData).filter(date => allData[date].completed);
    const totalDays = dates.length;
    
    if (totalDays === 0) {
        return {
            totalDays: 0,
            avgWater: 0,
            waterDays: 0,
            avgSteps: 0,
            stepsDays: 0,
            avgSleep: 0,
            avgRating: 0,
            bestRating: 0,
            worstRating: 0,
            booksDays: 0,
            skillsDays: 0
        };
    }

    let totalWater = 0;
    let waterDays = 0;
    let stepsDays = 0;
    let totalSteps = 0;
    let totalSleep = 0;
    let totalRating = 0;
    let bestRating = -Infinity;
    let worstRating = Infinity;
    let booksDays = 0;
    let skillsDays = 0;

    dates.forEach(date => {
        const entry = allData[date];

        // woda
        if (entry.q1 && (entry.q1_details || '').trim() !== '') {
            const w = parseFloat(entry.q1_details);
            if (!isNaN(w)) {
                totalWater += w;
                waterDays += 1;
            }
        }

        // kroki
        if (entry.q2 && (entry.q2_details || '').trim() !== '') {
            const s = parseInt(entry.q2_details, 10);
            if (!isNaN(s)) {
                totalSteps += s;
                stepsDays += 1;
            }
        }

        // sen
        totalSleep += (entry.q6 || 0);

        // ocena dnia
        const r = entry.q9 ?? 0;
        totalRating += r;
        bestRating = Math.max(bestRating, r);
        worstRating = Math.min(worstRating, r);

        // książka
        if (entry.q7) booksDays += 1;

        // umiejętności
        if (entry.q8) skillsDays += 1;
    });

    return {
        totalDays,
        avgWater: waterDays ? (totalWater / waterDays) : 0,
        waterDays,
        avgSteps: stepsDays ? (totalSteps / stepsDays) : 0,
        stepsDays,
        avgSleep: totalDays ? (totalSleep / totalDays) : 0,
        avgRating: totalDays ? (totalRating / totalDays) : 0,
        bestRating: isFinite(bestRating) ? bestRating : 0,
        worstRating: isFinite(worstRating) ? worstRating : 0,
        booksDays,
        skillsDays
    };
}

function renderStats() {
    const stats = calculateStats();

    document.getElementById('stat_totalDays').textContent = stats.totalDays;
    document.getElementById('stat_avgWater').textContent = stats.avgWater.toFixed(1);
    document.getElementById('stat_waterDays').textContent = stats.waterDays;
    document.getElementById('stat_avgSteps').textContent = Math.round(stats.avgSteps);
    document.getElementById('stat_stepsDays').textContent = stats.stepsDays;
    document.getElementById('stat_avgSleep').textContent = stats.avgSleep.toFixed(1);
    document.getElementById('stat_avgRating').textContent = stats.avgRating.toFixed(1);
    document.getElementById('stat_bestRating').textContent = stats.bestRating;
    document.getElementById('stat_worstRating').textContent = stats.worstRating;
    document.getElementById('stat_booksDays').textContent = stats.booksDays;
    document.getElementById('stat_skillsDays').textContent = stats.skillsDays;
}

// ===== ZAKŁADKI =====
function setupTabs() {
    const tabDaily = document.getElementById('tabDaily');
    const tabStats = document.getElementById('tabStats');
    const dailySection = document.getElementById('dailySection');
    const statsSection = document.getElementById('statsSection');

    tabDaily.addEventListener('click', () => {
        tabDaily.classList.add('active');
        tabStats.classList.remove('active');
        dailySection.classList.remove('hidden');
        statsSection.classList.add('hidden');
    });

    tabStats.addEventListener('click', () => {
        tabStats.classList.add('active');
        tabDaily.classList.remove('active');
        statsSection.classList.remove('hidden');
        dailySection.classList.add('hidden');
        renderStats();
    });
}

// ===== BACKUP (EXPORT/IMPORT JSON) =====
function buildBackupPayload() {
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        data: getAllData(),
        streak: getStreakData()
    };
}

function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function handleExport() {
    const payload = buildBackupPayload();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    downloadJson(`daily-checker-backup_${ts}.json`, payload);
    showToast('Wyeksportowano dane do pliku JSON.');
}

function parseBackupJson(text) {
    const obj = JSON.parse(text);

    if (!obj || typeof obj !== 'object') throw new Error('Nieprawidłowy plik.');
    if (!('data' in obj) || !('streak' in obj)) throw new Error('Brak wymaganych pól w backupie.');

    if (typeof obj.data !== 'object' || obj.data === null) throw new Error('Pole "data" jest nieprawidłowe.');
    if (typeof obj.streak !== 'object' || obj.streak === null) throw new Error('Pole "streak" jest nieprawidłowe.');

    return obj;
}

function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const backup = parseBackupJson(reader.result);
            const ok = confirm('Import nadpisze dane w aplikacji. Kontynuować?');
            if (!ok) return;

            saveAllData(backup.data);
            saveStreakData(backup.streak);

            updateStreakDisplay();
            const dateStr = document.getElementById('dateInput').value || getTodayDateString();
            loadFormData(dateStr);

            showToast('Zaimportowano dane z pliku JSON.');
        } catch (e) {
            console.error(e);
            alert('Nie udało się zaimportować danych: ' + (e.message || e));
        }
    };
    reader.readAsText(file);
}

function setupBackupUi() {
    const exportBtn = document.getElementById('exportJsonBtn');
    const importBtn = document.getElementById('importJsonBtn');
    const importInput = document.getElementById('importJsonInput');

    if (exportBtn) exportBtn.addEventListener('click', handleExport);

    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            handleImportFile(file);
            importInput.value = '';
        });
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('dateInput');
    const today = getTodayDateString();

    // ustaw domyślną datę
    dateInput.value = today;
    document.getElementById('selectedDateLabel').textContent = formatDatePL(today);

    // wczytaj dane formularza
    loadFormData(today);

    // streak
    updateStreakDisplay();

    // zakładki + backup
    setupTabs();
    setupBackupUi();

    // ===== EVENT LISTENERS =====

    // zmiana daty
    dateInput.addEventListener('change', (e) => {
        const dateStr = e.target.value;
        document.getElementById('selectedDateLabel').textContent = formatDatePL(dateStr);
        loadFormData(dateStr);
    });

    // Aktualizacja wyświetlania slidera (iOS/PWA fix)
    const ratingSlider = document.getElementById('q9_answer');
    if (ratingSlider) {
        // iOS (Safari/PWA): input może nie odświeżać wartości w trakcie przeciągania,
        // więc nasłuchujemy też change + zdarzeń dotykowych.
        ['input', 'change', 'touchmove', 'touchend'].forEach((evt) => {
            ratingSlider.addEventListener(evt, updateRatingDisplay, { passive: true });
        });
        updateRatingDisplay();
    }

    // zapisywanie formularza
    document.getElementById('dailyForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const dateStr = dateInput.value;
        const allData = getAllData();
        allData[dateStr] = getFormDataFromUI();
        saveAllData(allData);

        updateStreakOnComplete(dateStr);
        updateStreakDisplay();

        showToast('Zapisano dzień!');
    });

    // czyszczenie formularza
    document.getElementById('clearFormBtn').addEventListener('click', () => {
        clearFormUI(true);
    });
});
