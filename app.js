// ===== STAŁE I KONFIGURACJA =====
const STORAGE_KEY = 'dailyCheckerData';
const STREAK_KEY = 'dailyCheckerStreak';

// ===== FUNKCJE POMOCNICZE =====

// Funkcja do pokazywania toastów (powiadomień)
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Funkcja do formatowania daty na YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Funkcja do formatowania daty na czytelny format
function formatDateReadable(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pl-PL', options);
}

// ===== ZARZĄDZANIE DANYMI =====

// Pobieranie wszystkich danych z localStorage
function getAllData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

// Zapisywanie wszystkich danych do localStorage
function saveAllData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// ===== KOPIA DANYCH (EXPORT/IMPORT JSON) =====

// Buduje obiekt kopii zapasowej (kompatybilny na przyszłość)
function buildBackupObject() {
    return {
        schema: 'daily-checker-backup',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        data: getAllData(),
        streak: getStreakData()
    };
}

// Pobiera rozsądną nazwę pliku (np. daily-checker-backup-2026-01-06.json)
function getBackupFileName() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `daily-checker-backup-${yyyy}-${mm}-${dd}.json`;
}

function downloadTextFile(filename, text, mimeType = 'application/json') {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

function exportBackupToJson() {
    try {
        const backup = buildBackupObject();
        const jsonText = JSON.stringify(backup, null, 2);
        downloadTextFile(getBackupFileName(), jsonText);
        showToast('✅ Wyeksportowano dane do pliku .json');
    } catch (e) {
        console.error(e);
        showToast('❌ Nie udało się wyeksportować danych');
    }
}

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function importBackupObject(backupObj) {
    // Obsługa dwóch wariantów:
    // 1) nowy: { data: {...}, streak: {...} }
    // 2) awaryjnie: bez opakowania – bezpośrednio obiekt danych dziennych
    let data = null;
    let streak = null;

    if (isPlainObject(backupObj) && (backupObj.data || backupObj.streak || backupObj.schema)) {
        data = backupObj.data;
        streak = backupObj.streak;
    } else {
        data = backupObj;
    }

    if (!isPlainObject(data)) {
        throw new Error('Nieprawidłowy format: brak obiektu "data"');
    }

    // Walidacja streak (opcjonalna)
    if (streak !== null && !isPlainObject(streak)) {
        throw new Error('Nieprawidłowy format: "streak" nie jest obiektem');
    }

    // Nadpisanie localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (streak) {
        localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
    } else {
        // Jeśli w pliku brak streak, to licz od nowa (bez kasowania danych dziennych)
        localStorage.setItem(STREAK_KEY, JSON.stringify({ current: 0, best: 0, lastDate: null }));
    }
}

// Pobieranie danych dla konkretnego dnia
function getDayData(dateStr) {
    const allData = getAllData();
    return allData[dateStr] || null;
}

// Zapisywanie danych dla konkretnego dnia
function saveDayData(dateStr, data) {
    const allData = getAllData();
    allData[dateStr] = {
        ...data,
        timestamp: new Date().toISOString(),
        completed: true
    };
    saveAllData(allData);
}

// Usuwanie danych dla konkretnego dnia
function deleteDayData(dateStr) {
    const allData = getAllData();
    if (allData[dateStr]) {
        delete allData[dateStr];
        saveAllData(allData);
        return true;
    }
    return false;
}

// ===== ZARZĄDZANIE STREAK =====

// Pobieranie danych streak
function getStreakData() {
    const data = localStorage.getItem(STREAK_KEY);
    return data ? JSON.parse(data) : { current: 0, best: 0, lastDate: null };
}

// Zapisywanie danych streak
function saveStreakData(streakData) {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streakData));
}

// Obliczanie streak
function calculateStreak() {
    const allData = getAllData();
    const dates = Object.keys(allData)
        .filter(date => allData[date].completed)
        .sort()
        .reverse(); // Najnowsze daty pierwsze
    
    if (dates.length === 0) {
        return { current: 0, best: 0 };
    }
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const today = formatDate(new Date());
    let checkDate = new Date();
    
    // Sprawdzanie aktualnego streaka
    for (let i = 0; i < 365; i++) { // Maksymalnie rok wstecz
        const dateStr = formatDate(checkDate);
        
        if (dates.includes(dateStr)) {
            tempStreak++;
            if (dateStr === today || i > 0) {
                currentStreak = tempStreak;
            }
        } else {
            break;
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Sprawdzanie najlepszego streaka w całej historii
    tempStreak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
        const current = new Date(dates[i] + 'T00:00:00');
        const next = new Date(dates[i + 1] + 'T00:00:00');
        const diffDays = Math.round((current - next) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            tempStreak++;
        } else {
            if (tempStreak > bestStreak) {
                bestStreak = tempStreak;
            }
            tempStreak = 1;
        }
    }
    
    if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
    }
    
    // Jeśli nie wypełniono dzisiaj ani wczoraj, streak = 0
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    
    if (!dates.includes(today) && !dates.includes(yesterdayStr)) {
        currentStreak = 0;
    }
    
    return { current: currentStreak, best: Math.max(bestStreak, currentStreak) };
}

// Aktualizacja wyświetlania streak
function updateStreakDisplay() {
    const streak = calculateStreak();
    document.getElementById('currentStreak').textContent = streak.current;
    document.getElementById('bestStreak').textContent = streak.best;
    
    saveStreakData({
        current: streak.current,
        best: streak.best,
        lastDate: formatDate(new Date())
    });
}

// ===== ZARZĄDZANIE FORMULARZEM =====

// Ładowanie danych do formularza
function loadFormData(dateStr) {
    const data = getDayData(dateStr);
    
    if (data) {
        // Ładowanie odpowiedzi
        for (let i = 1; i <= 9; i++) {
            const answerId = `q${i}_answer`;
            const answerEl = document.getElementById(answerId);
            
            if (answerEl) {
                if (answerEl.type === 'checkbox') {
                    answerEl.checked = data[`q${i}_answer`] || false;
                } else if (answerEl.type === 'range' || answerEl.type === 'number') {
                    answerEl.value = data[`q${i}_answer`] || (answerEl.type === 'range' ? 5 : 0);
                }
            }
            
            // Ładowanie szczegółów
            const detailsId = `q${i}_details`;
            const detailsEl = document.getElementById(detailsId);
            if (detailsEl) {
                detailsEl.value = data[`q${i}_details`] || '';
            }
        }
        
        // Aktualizacja wyświetlania slidera
        updateRatingDisplay();
    } else {
        clearForm();
    }
}

// Czyszczenie formularza
function clearForm() {
    document.getElementById('dailyForm').reset();
    // Resetowanie slidera do 5
    document.getElementById('q9_answer').value = 5;
    updateRatingDisplay();
}

// Pobieranie danych z formularza
function getFormData() {
    const data = {};
    
    for (let i = 1; i <= 9; i++) {
        const answerId = `q${i}_answer`;
        const answerEl = document.getElementById(answerId);
        
        if (answerEl) {
            if (answerEl.type === 'checkbox') {
                data[`q${i}_answer`] = answerEl.checked;
            } else if (answerEl.type === 'range' || answerEl.type === 'number') {
                data[`q${i}_answer`] = parseFloat(answerEl.value) || 0;
            }
        }
        
        // Pobieranie szczegółów
        const detailsId = `q${i}_details`;
        const detailsEl = document.getElementById(detailsId);
        if (detailsEl) {
            data[`q${i}_details`] = detailsEl.value.trim();
        }
    }
    
    return data;
}

// Aktualizacja wyświetlania oceny slidera
function updateRatingDisplay() {
    const slider = document.getElementById('q9_answer');
    const display = document.getElementById('ratingValue');
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
            avgSleep: 0,
            avgRating: 0,
            yesNoStats: []
        };
    }
    
    let totalSleep = 0;
    let totalRating = 0;
    let sleepCount = 0;
    
    // Statystyki pytań TAK/NIE
    const yesNoQuestions = [
        { id: 1, name: 'Wypito min. 2L wody' },
        { id: 2, name: 'Zrobiono min. 5000 kroków' },
        { id: 3, name: 'Zrobiono trening' },
        { id: 4, name: 'Zrobiono rozciąganie + core' },
        { id: 5, name: 'Wzięto suplementy/witaminy' },
        { id: 7, name: 'Czytano książkę' },
        { id: 8, name: 'Podniesiono umiejętności' }
    ];
    
    const yesNoStats = yesNoQuestions.map(q => {
        let yesCount = 0;
        dates.forEach(date => {
            if (allData[date][`q${q.id}_answer`] === true) {
                yesCount++;
            }
        });
        return {
            name: q.name,
            percentage: Math.round((yesCount / totalDays) * 100)
        };
    });
    
    // Obliczanie średnich
    dates.forEach(date => {
        const data = allData[date];
        
        if (data.q6_answer) {
            totalSleep += data.q6_answer;
            sleepCount++;
        }
        
        if (data.q9_answer !== undefined) {
            totalRating += data.q9_answer;
        }
    });
    
    return {
        totalDays,
        avgSleep: sleepCount > 0 ? (totalSleep / sleepCount).toFixed(1) : 0,
        avgRating: (totalRating / totalDays).toFixed(1),
        yesNoStats
    };
}

// Wyświetlanie statystyk
function displayStats() {
    const stats = calculateStats();
    
    // Podsumowanie
    document.getElementById('statTotalDays').textContent = stats.totalDays;
    document.getElementById('statAvgSleep').textContent = `${stats.avgSleep}h`;
    document.getElementById('statAvgRating').textContent = stats.avgRating;
    
    // Statystyki TAK/NIE
    const yesNoContainer = document.getElementById('yesNoStats');
    yesNoContainer.innerHTML = '';
    
    stats.yesNoStats.forEach(stat => {
        const statBar = document.createElement('div');
        statBar.className = 'stat-bar';
        statBar.innerHTML = `
            <div class="stat-bar-header">
                <span class="stat-bar-name">${stat.name}</span>
                <span class="stat-bar-value">${stat.percentage}%</span>
            </div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill" style="width: ${stat.percentage}%"></div>
            </div>
        `;
        yesNoContainer.appendChild(statBar);
    });
    
    // Ostatnie 7 dni
    displayRecentDays();
}

// Wyświetlanie ostatnich 7 dni
function displayRecentDays() {
    const allData = getAllData();
    const dates = Object.keys(allData)
        .filter(date => allData[date].completed)
        .sort()
        .reverse()
        .slice(0, 7);
    
    const container = document.getElementById('recentDays');
    container.innerHTML = '';
    
    if (dates.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Brak zapisanych dni.</p>';
        return;
    }
    
    dates.forEach(date => {
        const data = allData[date];
        const dayItem = document.createElement('div');
        dayItem.className = 'day-item';
        
        // Liczenie wypełnionych pytań TAK
        let yesCount = 0;
        [1, 2, 3, 4, 5, 7, 8].forEach(q => {
            if (data[`q${q}_answer`] === true) yesCount++;
        });
        
        dayItem.innerHTML = `
            <div class="day-header">
                <span class="day-date">${formatDateReadable(date)}</span>
                <span class="day-rating">⭐ ${data.q9_answer || 0}/10</span>
            </div>
            <div class="day-summary">
                ✅ ${yesCount}/7 zadań • 💤 ${data.q6_answer || 0}h snu
            </div>
            <div class="day-details">
                ${data.q1_details ? `<div class="day-detail-item">💧 Woda: ${data.q1_details}L</div>` : ''}
                ${data.q2_details ? `<div class="day-detail-item">🚶 Kroki: ${data.q2_details}</div>` : ''}
                ${data.q3_details ? `<div class="day-detail-item">🏋️ Trening: ${data.q3_details}</div>` : ''}
                ${data.q4_details ? `<div class="day-detail-item">🧘 Rozciąganie: ${data.q4_details}</div>` : ''}
                ${data.q7_details ? `<div class="day-detail-item">📚 Książka: ${data.q7_details}</div>` : ''}
                ${data.q8_details ? `<div class="day-detail-item">📈 Umiejętności: ${data.q8_details}</div>` : ''}
            </div>
        `;
        
        // Toggle szczegółów
        dayItem.addEventListener('click', () => {
            const details = dayItem.querySelector('.day-details');
            details.classList.toggle('show');
        });
        
        container.appendChild(dayItem);
    });
}

// ===== NAWIGACJA ZAKŁADEK =====

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // Usuwanie aktywnych klas
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Dodawanie aktywnej klasy
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Jeśli otwarto statystyki, przelicz je na nowo
            if (tabName === 'stats') {
                displayStats();
            }
        });
    });
}

// ===== INICJALIZACJA =====

document.addEventListener('DOMContentLoaded', () => {
    // Ustawienie dzisiejszej daty
    const today = formatDate(new Date());
    const dateInput = document.getElementById('dateInput');
    dateInput.value = today;
    dateInput.max = today; // Nie można wybierać przyszłych dat
    
    // Ładowanie danych dla dzisiejszego dnia
    loadFormData(today);
    
    // Aktualizacja streak
    updateStreakDisplay();
    
    // Nawigacja zakładek
    setupTabs();
    
    // ===== EVENT LISTENERS =====
    
    // Zmiana daty
    dateInput.addEventListener('change', (e) => {
        loadFormData(e.target.value);
    });
    
    // Aktualizacja wyświetlania slidera
    document.getElementById('q9_answer').addEventListener('input', updateRatingDisplay);
    
    // Zapisywanie formularza
    document.getElementById('dailyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const selectedDate = dateInput.value;
        const formData = getFormData();
        
        saveDayData(selectedDate, formData);
        updateStreakDisplay();
        showToast('✅ Dzień zapisany pomyślnie!');
    });
    
    // Czyszczenie formularza
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Czy na pewno chcesz wyczyścić formularz? (Nie usunie to zapisanych danych)')) {
            clearForm();
            showToast('🗑️ Formularz wyczyszczony');
        }
    });

    // Eksport / Import danych (JSON)
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportBackupToJson());
    }

    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());

        importFile.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const text = String(reader.result || '');
                    const obj = JSON.parse(text);

                    if (!confirm('Import nadpisze dane w aplikacji. Kontynuować?')) {
                        importFile.value = '';
                        return;
                    }

                    importBackupObject(obj);

                    // Odśwież UI
                    updateStreakDisplay();
                    const selectedDate = dateInput.value;
                    loadFormData(selectedDate);

                    showToast('✅ Zaimportowano dane z pliku .json');
                } catch (err) {
                    console.error(err);
                    showToast('❌ Import nieudany: zły format pliku');
                } finally {
                    // pozwala ponownie wczytać ten sam plik
                    importFile.value = '';
                }
            };
            reader.readAsText(file);
        });
    }

    // Usuwanie zapisu dnia
    document.getElementById('deleteBtn').addEventListener('click', () => {
        const selectedDate = dateInput.value;
        
        if (confirm(`Czy na pewno chcesz usunąć zapis z dnia ${formatDateReadable(selectedDate)}?`)) {
            if (deleteDayData(selectedDate)) {
                clearForm();
                updateStreakDisplay();
                showToast('❌ Zapis usunięty');
            } else {
                showToast('⚠️ Brak zapisu do usunięcia');
            }
        }
    });
    
    // Rejestracja Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker zarejestrowany:', registration);
            })
            .catch(error => {
                console.log('Błąd rejestracji Service Worker:', error);
            });
    }
});