const socket = io();

// --- STATE ---
let globalState = null;
let currentUserName = "";
let localAgenda = [];

// --- DOM ELEMENTS ---
const body = document.body;
const timerDisplay = document.getElementById('timer');
const currentTitle = document.getElementById('current-title');
const currentSpeaker = document.getElementById('current-speaker');
const labelModo = document.getElementById('label-modo');

const adminPanel = document.getElementById('admin-panel');
const btnToggleAdmin = document.getElementById('btn-toggle-admin');
const btnCloseAdmin = document.getElementById('btn-close-admin');
const agendaRows = document.getElementById('agenda-rows');
const btnAddRow = document.getElementById('btn-add-row');
const btnSaveAgenda = document.getElementById('btn-save-agenda');

const loginModal = document.getElementById('login-modal');
const userNameInput = document.getElementById('user-name');
const btnLogin = document.getElementById('btn-login');

const nextTopicArea = document.getElementById('next-topic-area');
const nextTopicName = document.getElementById('next-topic-name');
const nextSpeakerName = document.getElementById('next-speaker-name');

const agendaSidebar = document.getElementById('agenda-sidebar');
const sidebarList = document.getElementById('sidebar-list');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

const waitingScreen = document.getElementById('waiting-screen');
const preCountdown = document.getElementById('pre-countdown');
const preStartTime = document.getElementById('pre-start-time');
let preWaitInterval = null;

const btnDownloadTemplate = document.getElementById('btn-download-template');
const excelUploadInput = document.getElementById('excel-upload');
const toastContainer = document.getElementById('toast-container');

// --- INITIALIZATION ---
if (btnLogin) {
    btnLogin.onclick = () => {
        currentUserName = userNameInput.value.trim();
        if (currentUserName) {
            loginModal.classList.add('hidden');
            showToast(`Bienvenido(a), ${currentUserName}`);
            if (globalState) updateUI();
        } else {
            showToast("Por favor ingresa tu nombre");
        }
    };
}

if (userNameInput) {
    userNameInput.onkeyup = (e) => {
        if (e.key === 'Enter') btnLogin.click();
    };
}

// --- NOTIFICATIONS (TOAST) ---
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3400);
}

// --- REAL-TIME SYNC ---
socket.on('sync', (state) => {
    console.log("Sincronización recibida de servidor");
    globalState = state;
    localAgenda = JSON.parse(JSON.stringify(state.agenda));

    renderEditor();
    updateUI();
    renderNextTopic();
    renderSidebar();
    checkWaitingScreen();
});

socket.on('timer-tick', (data) => {
    if (!globalState) return;

    updateTimer(data.remainingSeconds);

    if (data.isPaused) body.classList.add('is-paused');
    else body.classList.remove('is-paused');

    if (data.currentTopicIndex !== globalState.currentTopicIndex) {
        globalState.currentTopicIndex = data.currentTopicIndex;
        updateUI();
        renderNextTopic();
        updateSidebarActive();
    }

    if (data.remainingSeconds === 10 && !data.isPaused) {
        const audio = document.getElementById('sound-finish');
        if (audio) audio.play().catch(() => { });
    }
});

// --- UI UPDATES ---
function updateUI() {
    if (!globalState || globalState.agenda.length === 0) return;

    const current = globalState.agenda[globalState.currentTopicIndex];
    if (!current) return;

    currentTitle.textContent = current.topic;
    currentSpeaker.textContent = current.type === 'talk' ? `Presenta: ${current.speaker}` : '---';

    const speakerAlert = document.getElementById('speaker-alert');
    const breakAlert = document.getElementById('break-alert');
    if (speakerAlert) speakerAlert.classList.add('hidden');
    if (breakAlert) breakAlert.classList.add('hidden');

    body.classList.remove('modo-orador', 'modo-break');

    if (current.type === 'break' || current.type === 'meal') {
        body.classList.add('modo-break');
        if (breakAlert) breakAlert.classList.remove('hidden');
        labelModo.textContent = "MODO RECESO";
    } else if (currentUserName.toLowerCase() === (current.speaker || '').toLowerCase()) {
        body.classList.add('modo-orador');
        if (speakerAlert) speakerAlert.classList.remove('hidden');
        labelModo.textContent = "MODO ORADOR (TÚ)";
    } else {
        labelModo.textContent = "ESPECTADOR";
    }
}

function renderNextTopic() {
    if (!globalState) return;
    const next = globalState.agenda[globalState.currentTopicIndex + 1];
    if (next) {
        nextTopicArea.classList.remove('hidden');
        nextTopicName.textContent = next.topic;
        nextSpeakerName.textContent = next.type === 'break' ? 'EN RECESO' : `Presenta: ${next.speaker}`;
    } else {
        nextTopicArea.classList.add('hidden');
    }
}

function renderSidebar() {
    if (!globalState) return;
    sidebarList.innerHTML = '';
    globalState.agenda.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `sidebar-item ${index === globalState.currentTopicIndex ? 'active' : ''}`;
        div.innerHTML = `
            <span class="item-time">${item.plannedStart} - ${item.plannedEnd}</span>
            <span class="item-main">${item.speaker || '---'}</span>
            <span class="item-sub">${item.topic}</span>
        `;
        sidebarList.appendChild(div);
    });
}

function updateSidebarActive() {
    const items = document.querySelectorAll('.sidebar-item');
    items.forEach((el, idx) => {
        if (idx === globalState.currentTopicIndex) {
            el.classList.add('active');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            el.classList.remove('active');
        }
    });
}

btnToggleSidebar.onclick = () => {
    agendaSidebar.classList.toggle('expanded');
};

function updateTimer(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    timerDisplay.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    if (seconds <= 30) timerDisplay.classList.add('timer-urgent');
    else timerDisplay.classList.remove('timer-urgent');
}

function checkWaitingScreen() {
    if (!globalState) return;
    const hasStarted = globalState.startTime !== null;
    if (hasStarted) {
        waitingScreen.classList.add('hidden');
        if (preWaitInterval) clearInterval(preWaitInterval);
        return;
    }
    if (globalState.agenda.length > 0) {
        waitingScreen.classList.remove('hidden');
        const first = globalState.agenda[0];
        preStartTime.textContent = `Hora de inicio: ${first.plannedStart}`;
        if (preWaitInterval) clearInterval(preWaitInterval);
        preWaitInterval = setInterval(() => {
            const now = new Date();
            const [h, m] = first.plannedStart.split(':').map(Number);
            const target = new Date();
            target.setHours(h, m, 0, 0);
            let diff = target - now;
            if (diff < 0) { preCountdown.textContent = "00:00:00"; return; }
            const hh = Math.floor(diff / 3600000);
            const mm = Math.floor((diff % 3600000) / 60000);
            const ss = Math.floor((diff % 60000) / 1000);
            preCountdown.textContent = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

// --- ADMIN PANEL ---
let isModerator = false;
const adminLoginModal = document.getElementById('admin-login-modal');
const adminPasswordInput = document.getElementById('admin-password');
const btnSubmitAdminLogin = document.getElementById('btn-submit-admin-login');

btnToggleAdmin.onclick = () => {
    if (isModerator) adminPanel.classList.remove('hidden');
    else { adminLoginModal.classList.remove('hidden'); adminPasswordInput.focus(); }
};

btnCloseAdmin.onclick = () => adminPanel.classList.add('hidden');

btnSubmitAdminLogin.onclick = () => {
    socket.emit('admin-login', adminPasswordInput.value);
};

adminPasswordInput.onkeyup = (e) => { if (e.key === 'Enter') btnSubmitAdminLogin.click(); };

socket.on('admin-auth-success', () => {
    isModerator = true;
    adminLoginModal.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    showToast("Acceso moderador exitoso");
});

socket.on('admin-auth-fail', (msg) => {
    showToast(`Error: ${msg}`);
});

function renderEditor() {
    agendaRows.innerHTML = '';
    localAgenda.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="time" value="${item.plannedStart}" onchange="updateLocal(${index}, 'plannedStart', this.value)"></td>
            <td><input type="time" value="${item.plannedEnd}" readonly style="background: #f8f9fa; opacity: 0.7;"></td>
            <td><input type="time" value="${item.durationString}" onchange="updateLocal(${index}, 'durationString', this.value)"></td>
            <td><input type="text" value="${item.topic}" placeholder="Tema..." onchange="updateLocal(${index}, 'topic', this.value)"></td>
            <td><input type="text" value="${item.speaker}" placeholder="Responsable..." onchange="updateLocal(${index}, 'speaker', this.value)"></td>
            <td>
                <select onchange="updateLocal(${index}, 'type', this.value)">
                    <option value="talk" ${item.type === 'talk' ? 'selected' : ''}>Charla</option>
                    <option value="break" ${item.type === 'break' ? 'selected' : ''}>Receso</option>
                    <option value="meal" ${item.type === 'meal' ? 'selected' : ''}>Comida</option>
                </select>
            </td>
            <td><button onclick="removeLocal(${index})" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; filter: grayscale(1);">🗑️</button></td>
        `;
        agendaRows.appendChild(tr);
    });
}

function updateLocal(index, field, value) {
    localAgenda[index][field] = value;
    if (field === 'plannedStart' || field === 'durationString') {
        const start = localAgenda[index].plannedStart;
        const dur = localAgenda[index].durationString;
        if (start && dur) {
            localAgenda[index].plannedEnd = addMinutes(start, getMinutesFromDuration(dur));
            renderEditor();
        }
    }
}

function removeLocal(index) {
    localAgenda.splice(index, 1);
    renderEditor();
}

btnAddRow.onclick = () => {
    const last = localAgenda[localAgenda.length - 1];
    const nextStart = last ? last.plannedEnd : "08:00";
    localAgenda.push({
        id: Date.now().toString(),
        plannedStart: nextStart,
        plannedEnd: addMinutes(nextStart, 10),
        durationString: '00:10',
        topic: '',
        speaker: '',
        type: 'talk'
    });
    renderEditor();
};

btnSaveAgenda.onclick = () => {
    socket.emit('update-agenda', localAgenda);
    showToast("Agenda actualizada en servidor");
    adminPanel.classList.add('hidden');
};

// --- EXCEL ---
if (btnDownloadTemplate) {
    btnDownloadTemplate.onclick = () => {
        const data = [
            ["INICIO", "DURACION (HH:MM)", "TEMA", "PRESENTA", "TIPO (talk/break/meal)"],
            ["08:00", "00:10", "Bienvenida", "Coordinador", "talk"],
            ["08:10", "00:30", "Sesión Técnica", "Ingeniería", "talk"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Agenda");
        XLSX.writeFile(wb, "OxxoTime_Plantilla.xlsx");
        showToast("Plantilla descargada");
    };
}

if (excelUploadInput) {
    excelUploadInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const newAgenda = [];
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (!r[0] || !r[2]) continue;
                const start = String(r[0]);
                const dur = String(r[1] || "00:10");
                newAgenda.push({
                    id: Date.now().toString() + i,
                    plannedStart: start,
                    durationString: dur,
                    plannedEnd: addMinutes(start, getMinutesFromDuration(dur)),
                    topic: r[2],
                    speaker: r[3] || "",
                    type: r[4] || "talk"
                });
            }
            if (newAgenda.length > 0) {
                localAgenda = newAgenda;
                renderEditor();
                showToast(`Cargados ${newAgenda.length} elementos`);
            }
            excelUploadInput.value = "";
        };
        reader.readAsArrayBuffer(file);
    };
}

// --- CONTROLS ---
document.getElementById('admin-play').onclick = () => { socket.emit('admin-action', 'start'); showToast("Iniciado"); };
document.getElementById('admin-pause').onclick = () => { socket.emit('admin-action', 'pause'); showToast("Pausado"); };
document.getElementById('admin-next').onclick = () => socket.emit('admin-action', 'next');
document.getElementById('admin-prev').onclick = () => socket.emit('admin-action', 'prev');
document.getElementById('admin-reset').onclick = () => { socket.emit('admin-action', 'reset'); showToast("Reinicio completo"); };

// Helpers
function addMinutes(time, mins) {
    if (!time.includes(':')) return "08:00";
    const [h, m] = time.split(':').map(Number);
    const d = new Date(); d.setHours(h, m + mins, 0);
    return d.toTimeString().slice(0, 5);
}
function getMinutesFromDuration(dur) {
    if (!dur.includes(':')) return 10;
    const [h, m] = dur.split(':').map(Number);
    return (h * 60) + m;
}
