"use strict";
// ─── State ────────────────────────────────────────────────────────────────────
let patients = [];
let selectedPatientId = null;
let editingMeasurementId = null;
const charts = { height: null, weight: null, head: null };
const API = '/api';
// ─── Helpers ──────────────────────────────────────────────────────────────────
function selectedPatient() {
    return patients.find(p => p.id === selectedPatientId);
}
function formatDateDisplay(iso) {
    if (!iso)
        return '';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
}
function ageLabel(birthDateIso, measureDateIso) {
    if (!birthDateIso || !measureDateIso)
        return '';
    const birth = new Date(birthDateIso);
    const measure = new Date(measureDateIso);
    const diffMs = measure.getTime() - birth.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (totalDays < 0)
        return '';
    const months = Math.floor(totalDays / 30.44);
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years === 0)
        return `${months} mois`;
    if (remMonths === 0)
        return `${years} an${years > 1 ? 's' : ''}`;
    return `${years} an${years > 1 ? 's' : ''} ${remMonths} mois`;
}
function currentAge(birthDateIso) {
    if (!birthDateIso)
        return '';
    return ageLabel(birthDateIso, new Date().toISOString().split('T')[0]);
}
function genderLabel(gender) {
    if (gender === 'male')
        return '♂ Garçon';
    if (gender === 'female')
        return '♀ Fille';
    return '';
}
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => { toast.className = 'toast hidden'; }, 300);
    }, 2800);
}
function $(id) {
    return document.getElementById(id);
}
function $input(id) {
    return document.getElementById(id);
}
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// ─── API ──────────────────────────────────────────────────────────────────────
async function loadPatients() {
    const res = await fetch(`${API}/patients`);
    if (!res.ok)
        throw new Error('Erreur de chargement');
    patients = await res.json();
}
async function apiCreatePatient(data) {
    const res = await fetch(`${API}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok)
        throw new Error('Erreur création patient');
    return res.json();
}
async function apiUpdatePatient(id, data) {
    const res = await fetch(`${API}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok)
        throw new Error('Erreur mise à jour patient');
    return res.json();
}
async function apiDeletePatient(id) {
    const res = await fetch(`${API}/patients/${id}`, { method: 'DELETE' });
    if (!res.ok)
        throw new Error('Erreur suppression patient');
}
async function apiCreateMeasurement(patientId, data) {
    const res = await fetch(`${API}/patients/${patientId}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok)
        throw new Error('Erreur création mesure');
    return res.json();
}
async function apiUpdateMeasurement(patientId, id, data) {
    const res = await fetch(`${API}/patients/${patientId}/measurements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok)
        throw new Error('Erreur mise à jour mesure');
    return res.json();
}
async function apiDeleteMeasurement(patientId, id) {
    const res = await fetch(`${API}/patients/${patientId}/measurements/${id}`, { method: 'DELETE' });
    if (!res.ok)
        throw new Error('Erreur suppression mesure');
}
// ─── Patient UI ───────────────────────────────────────────────────────────────
function renderPatientsList() {
    const list = $('patients-list');
    if (patients.length === 0) {
        list.innerHTML = '<p class="no-patients-hint">Aucun patient. Cliquez sur "+ Nouveau patient" pour commencer.</p>';
        return;
    }
    list.innerHTML = patients.map(p => {
        const isActive = p.id === selectedPatientId;
        const age = p.birthDate ? currentAge(p.birthDate) : '';
        const gl = genderLabel(p.gender);
        const count = p.measurements.length;
        return `
            <div class="patient-card ${isActive ? 'patient-card--active' : ''}" onclick="selectPatient('${p.id}')">
                <div class="patient-card-body">
                    <div class="patient-card-name">${escapeHtml(p.name)}</div>
                    <div class="patient-card-meta">
                        ${gl ? `<span>${gl}</span>` : ''}
                        ${p.birthDate ? `<span>né(e) le ${formatDateDisplay(p.birthDate)}</span>` : ''}
                        ${age ? `<span>${age}</span>` : ''}
                    </div>
                    <div class="patient-card-count">${count} mesure${count !== 1 ? 's' : ''}</div>
                </div>
                <div class="patient-card-actions">
                    <button class="btn btn-edit btn-sm" onclick="event.stopPropagation(); openEditPatient('${p.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deletePatient('${p.id}', '${escapeHtml(p.name)}')">🗑️</button>
                </div>
            </div>`;
    }).join('');
}
function openAddPatient() {
    $input('edit-patient-id').value = '';
    $('patient-form').reset();
    $('patient-form-title').textContent = 'Nouveau patient';
    $('patient-form-wrap').classList.remove('hidden');
    $input('patient-name').focus();
}
function openEditPatient(id) {
    const p = patients.find(x => x.id === id);
    if (!p)
        return;
    $input('edit-patient-id').value = p.id;
    $input('patient-name').value = p.name;
    $input('patient-birth').value = p.birthDate ?? '';
    $('patient-gender').value = p.gender ?? '';
    $('patient-form-title').textContent = 'Modifier le patient';
    $('patient-form-wrap').classList.remove('hidden');
    $input('patient-name').focus();
}
function cancelPatientForm() {
    $('patient-form-wrap').classList.add('hidden');
    $('patient-form').reset();
}
async function deletePatient(id, name) {
    const p = patients.find(x => x.id === id);
    const count = p?.measurements.length ?? 0;
    const msg = count > 0
        ? `Supprimer le patient "${name}" et ses ${count} mesure(s) ?\nCette action est irréversible.`
        : `Supprimer le patient "${name}" ?`;
    if (!confirm(msg))
        return;
    try {
        await apiDeletePatient(id);
        patients = patients.filter(x => x.id !== id);
        if (selectedPatientId === id) {
            selectedPatientId = null;
            renderPatientContent();
        }
        renderPatientsList();
        renderHeaderInfo();
        showToast('Patient supprimé', 'success');
    }
    catch {
        showToast('Erreur lors de la suppression', 'error');
    }
}
function selectPatient(id) {
    if (selectedPatientId === id)
        return;
    selectedPatientId = id;
    Object.keys(charts).forEach(key => {
        if (charts[key]) {
            charts[key].destroy();
            charts[key] = null;
        }
    });
    renderHeaderInfo();
    renderPatientsList();
    renderPatientContent();
    resetMeasurementForm();
}
function renderHeaderInfo() {
    const p = selectedPatient();
    const el = $('header-patient-info');
    if (p) {
        const age = p.birthDate ? ` · ${currentAge(p.birthDate)}` : '';
        el.textContent = p.name + age;
    }
    else {
        const n = patients.length;
        el.textContent = n > 0 ? `${n} patient${n > 1 ? 's' : ''} enregistré${n > 1 ? 's' : ''}` : 'Aucun patient';
    }
}
function renderPatientContent() {
    const content = $('patient-content');
    const p = selectedPatient();
    if (!p) {
        content.classList.add('hidden');
        return;
    }
    content.classList.remove('hidden');
    renderCharts(p);
    renderTable(p);
}
// ─── Charts ───────────────────────────────────────────────────────────────────
function buildChartConfig(label, unit, color, dataPoints) {
    return {
        type: 'line',
        data: {
            datasets: [{
                    label: `${label} (${unit})`,
                    data: dataPoints,
                    borderColor: color,
                    backgroundColor: color + '18',
                    borderWidth: 2.5,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: color,
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.35
                }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            interaction: { mode: 'nearest', intersect: false },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: { day: 'dd/MM/yy', month: 'MMM yy', year: 'yyyy' },
                        tooltipFormat: 'dd/MM/yyyy'
                    },
                    title: { display: true, text: 'Date', font: { size: 11 } },
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    title: { display: true, text: `${label} (${unit})`, font: { size: 11 } },
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { size: 11 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.88)',
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    callbacks: { label: (ctx) => ` ${ctx.parsed.y} ${unit}` }
                },
                zoom: {
                    zoom: { wheel: { enabled: true, speed: 0.08 }, pinch: { enabled: true }, mode: 'xy' },
                    pan: { enabled: true, mode: 'xy' }
                }
            }
        }
    };
}
function resetZoom(key) {
    if (charts[key])
        charts[key].resetZoom();
}
window.resetZoom = resetZoom;
function updateOrCreateChart(key, label, unit, color, data) {
    const canvasId = `chart-${key}`;
    const container = document.getElementById(canvasId).parentElement;
    if (data.length === 0) {
        let empty = container.querySelector('.chart-empty');
        if (!empty) {
            empty = document.createElement('div');
            empty.className = 'chart-empty';
            container.appendChild(empty);
        }
        empty.textContent = `Aucune donnée de ${label.toLowerCase()} enregistrée`;
        document.getElementById(canvasId).style.display = 'none';
        if (charts[key]) {
            charts[key].destroy();
            charts[key] = null;
        }
        return;
    }
    const empty = container.querySelector('.chart-empty');
    if (empty)
        empty.remove();
    document.getElementById(canvasId).style.display = 'block';
    if (charts[key]) {
        charts[key].data.datasets[0].data = data;
        charts[key].update('active');
    }
    else {
        const canvas = document.getElementById(canvasId);
        charts[key] = new Chart(canvas, buildChartConfig(label, unit, color, data));
    }
}
function renderCharts(p) {
    const h = p.measurements.filter(m => m.height !== undefined).map(m => ({ x: m.date, y: m.height }));
    const w = p.measurements.filter(m => m.weight !== undefined).map(m => ({ x: m.date, y: m.weight }));
    const hc = p.measurements.filter(m => m.headCircumference !== undefined).map(m => ({ x: m.date, y: m.headCircumference }));
    updateOrCreateChart('height', 'Taille', 'cm', '#2563eb', h);
    updateOrCreateChart('weight', 'Poids', 'kg', '#16a34a', w);
    updateOrCreateChart('head', 'Tour de crâne', 'cm', '#9333ea', hc);
}
// ─── Table ────────────────────────────────────────────────────────────────────
function renderTable(p) {
    const tbody = $('table-body');
    const badge = $('count-badge');
    const measurements = [...p.measurements].reverse();
    badge.textContent = `${p.measurements.length} mesure(s)`;
    if (measurements.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Aucune mesure enregistrée</td></tr>';
        return;
    }
    tbody.innerHTML = measurements.map(m => {
        const age = ageLabel(p.birthDate, m.date);
        const hv = m.height !== undefined ? `<span class="value-cell">${m.height}</span>` : '<span class="value-na">—</span>';
        const wv = m.weight !== undefined ? `<span class="value-cell">${m.weight}</span>` : '<span class="value-na">—</span>';
        const hcv = m.headCircumference !== undefined ? `<span class="value-cell">${m.headCircumference}</span>` : '<span class="value-na">—</span>';
        const nv = m.notes ? `<span class="notes-cell" title="${escapeHtml(m.notes)}">${escapeHtml(m.notes)}</span>` : '<span class="value-na">—</span>';
        return `
            <tr>
                <td>
                    <strong>${formatDateDisplay(m.date)}</strong>
                    ${age ? `<br><small style="color:var(--text-muted)">${age}</small>` : ''}
                </td>
                <td>${hv}</td><td>${wv}</td><td>${hcv}</td><td>${nv}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn btn-edit btn-sm" onclick="editMeasurement('${m.id}')">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="confirmDelete('${m.id}', '${formatDateDisplay(m.date)}')">🗑️</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}
// ─── Measurement form ─────────────────────────────────────────────────────────
function resetMeasurementForm() {
    editingMeasurementId = null;
    $('measurement-form').reset();
    $('edit-id').textContent = '';
    $('form-title').textContent = 'Ajouter une Mesure';
    $('submit-btn').innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
        </svg> Ajouter`;
    $('cancel-btn').classList.add('hidden');
    $input('measure-date').value = new Date().toISOString().split('T')[0];
}
function editMeasurement(id) {
    const p = selectedPatient();
    if (!p)
        return;
    const m = p.measurements.find(x => x.id === id);
    if (!m)
        return;
    editingMeasurementId = id;
    $input('edit-id').value = id;
    $input('measure-date').value = m.date;
    $input('measure-height').value = m.height !== undefined ? String(m.height) : '';
    $input('measure-weight').value = m.weight !== undefined ? String(m.weight) : '';
    $input('measure-head').value = m.headCircumference !== undefined ? String(m.headCircumference) : '';
    $('measure-notes').value = m.notes ?? '';
    $('form-title').textContent = 'Modifier la Mesure';
    $('submit-btn').innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
        </svg> Enregistrer`;
    $('cancel-btn').classList.remove('hidden');
    $('measurement-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function confirmDelete(id, dateLabel) {
    const p = selectedPatient();
    if (!p)
        return;
    if (!confirm(`Supprimer la mesure du ${dateLabel} ?\nCette action est irréversible.`))
        return;
    try {
        await apiDeleteMeasurement(p.id, id);
        p.measurements = p.measurements.filter(m => m.id !== id);
        renderCharts(p);
        renderTable(p);
        renderPatientsList();
        showToast('Mesure supprimée', 'success');
    }
    catch {
        showToast('Erreur lors de la suppression', 'error');
    }
}
window.selectPatient = selectPatient;
window.openEditPatient = openEditPatient;
window.deletePatient = deletePatient;
window.editMeasurement = editMeasurement;
window.confirmDelete = confirmDelete;
// ─── Events ───────────────────────────────────────────────────────────────────
function setupEventListeners() {
    $('add-patient-btn').addEventListener('click', openAddPatient);
    $('cancel-patient-btn').addEventListener('click', cancelPatientForm);
    $('patient-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $input('patient-name').value.trim();
        const birthDate = $input('patient-birth').value;
        const gender = $('patient-gender').value;
        if (!name) {
            showToast('Le nom est obligatoire', 'error');
            return;
        }
        const editId = $input('edit-patient-id').value;
        try {
            if (editId) {
                const updated = await apiUpdatePatient(editId, { name, birthDate, gender: gender || undefined });
                const idx = patients.findIndex(p => p.id === editId);
                if (idx !== -1)
                    patients[idx] = { ...patients[idx], ...updated };
                if (selectedPatientId === editId)
                    renderHeaderInfo();
                showToast('Patient mis à jour ✓', 'success');
            }
            else {
                const created = await apiCreatePatient({ name, birthDate, gender: gender || undefined });
                patients.push(created);
                selectedPatientId = created.id;
                renderPatientContent();
                resetMeasurementForm();
                showToast('Patient créé ✓', 'success');
            }
            cancelPatientForm();
            renderPatientsList();
            renderHeaderInfo();
        }
        catch {
            showToast('Erreur lors de l\'enregistrement', 'error');
        }
    });
    $('measurement-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const p = selectedPatient();
        if (!p)
            return;
        const dateVal = $input('measure-date').value;
        const heightVal = $input('measure-height').value;
        const weightVal = $input('measure-weight').value;
        const headVal = $input('measure-head').value;
        const notesVal = $('measure-notes').value.trim();
        if (!dateVal) {
            showToast('La date est obligatoire', 'error');
            return;
        }
        if (!heightVal && !weightVal && !headVal) {
            showToast('Entrez au moins une valeur (taille, poids ou tour de crâne)', 'error');
            return;
        }
        const payload = {
            date: dateVal,
            ...(heightVal ? { height: parseFloat(heightVal) } : {}),
            ...(weightVal ? { weight: parseFloat(weightVal) } : {}),
            ...(headVal ? { headCircumference: parseFloat(headVal) } : {}),
            ...(notesVal ? { notes: notesVal } : {})
        };
        try {
            if (editingMeasurementId) {
                const updated = await apiUpdateMeasurement(p.id, editingMeasurementId, payload);
                const idx = p.measurements.findIndex(m => m.id === editingMeasurementId);
                if (idx !== -1)
                    p.measurements[idx] = updated;
                p.measurements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                showToast('Mesure mise à jour ✓', 'success');
            }
            else {
                const created = await apiCreateMeasurement(p.id, payload);
                p.measurements.push(created);
                p.measurements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                showToast('Mesure ajoutée ✓', 'success');
            }
            resetMeasurementForm();
            renderCharts(p);
            renderTable(p);
            renderPatientsList();
        }
        catch {
            showToast('Erreur lors de l\'enregistrement', 'error');
        }
    });
    $('cancel-btn').addEventListener('click', resetMeasurementForm);
}
// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
    try {
        await loadPatients();
    }
    catch {
        showToast('Impossible de contacter le serveur', 'error');
    }
    renderPatientsList();
    renderHeaderInfo();
    if (patients.length === 1) {
        selectedPatientId = patients[0].id;
        renderPatientsList();
        renderHeaderInfo();
        renderPatientContent();
    }
    setupEventListeners();
    $input('measure-date').value = new Date().toISOString().split('T')[0];
}
init();
