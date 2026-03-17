"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'measurements.json');
// ─── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path.join(__dirname, '..', 'public')));
// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
function sortMeasurements(m) {
    return m.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
// ─── Data helpers ─────────────────────────────────────────────────────────────
function initDataFile() {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ patients: [] }, null, 2), 'utf-8');
        return;
    }
    // Migrate old single-patient format
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.patient !== undefined && !parsed.patients) {
        const oldPatient = parsed.patient;
        const newData = { patients: [] };
        if (oldPatient && oldPatient.name) {
            newData.patients.push({
                id: generateId(),
                name: oldPatient.name,
                birthDate: oldPatient.birthDate || '',
                gender: oldPatient.gender,
                measurements: sortMeasurements(parsed.measurements || [])
            });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2), 'utf-8');
    }
}
function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
// ─── Patient routes ───────────────────────────────────────────────────────────
// GET all patients
app.get('/api/patients', (_req, res) => {
    try {
        res.json(readData().patients);
    }
    catch {
        res.status(500).json({ error: 'Erreur lors de la lecture' });
    }
});
// POST create patient
app.post('/api/patients', (req, res) => {
    try {
        const data = readData();
        const body = req.body;
        if (!body.name || typeof body.name !== 'string') {
            res.status(400).json({ error: 'Le nom est obligatoire' });
            return;
        }
        const patient = {
            id: generateId(),
            name: body.name.trim(),
            birthDate: body.birthDate ?? '',
            gender: body.gender || undefined,
            measurements: []
        };
        data.patients.push(patient);
        writeData(data);
        res.status(201).json(patient);
    }
    catch {
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});
// PUT update patient
app.put('/api/patients/:patientId', (req, res) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.id === req.params['patientId']);
        if (!patient) {
            res.status(404).json({ error: 'Patient non trouvé' });
            return;
        }
        const body = req.body;
        if (body.name)
            patient.name = body.name.trim();
        if (body.birthDate !== undefined)
            patient.birthDate = body.birthDate;
        patient.gender = body.gender || undefined;
        writeData(data);
        res.json(patient);
    }
    catch {
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});
// DELETE patient
app.delete('/api/patients/:patientId', (req, res) => {
    try {
        const data = readData();
        const idx = data.patients.findIndex(p => p.id === req.params['patientId']);
        if (idx === -1) {
            res.status(404).json({ error: 'Patient non trouvé' });
            return;
        }
        data.patients.splice(idx, 1);
        writeData(data);
        res.status(204).send();
    }
    catch {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});
// ─── Measurement routes ───────────────────────────────────────────────────────
// POST add measurement
app.post('/api/patients/:patientId/measurements', (req, res) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.id === req.params['patientId']);
        if (!patient) {
            res.status(404).json({ error: 'Patient non trouvé' });
            return;
        }
        const body = req.body;
        if (!body.date) {
            res.status(400).json({ error: 'La date est obligatoire' });
            return;
        }
        const m = {
            id: generateId(),
            date: body.date,
            ...(body.height !== undefined ? { height: Number(body.height) } : {}),
            ...(body.weight !== undefined ? { weight: Number(body.weight) } : {}),
            ...(body.headCircumference !== undefined ? { headCircumference: Number(body.headCircumference) } : {}),
            ...(body.notes ? { notes: body.notes } : {})
        };
        patient.measurements.push(m);
        patient.measurements = sortMeasurements(patient.measurements);
        writeData(data);
        res.status(201).json(m);
    }
    catch {
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});
// PUT update measurement
app.put('/api/patients/:patientId/measurements/:measurementId', (req, res) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.id === req.params['patientId']);
        if (!patient) {
            res.status(404).json({ error: 'Patient non trouvé' });
            return;
        }
        const idx = patient.measurements.findIndex(m => m.id === req.params['measurementId']);
        if (idx === -1) {
            res.status(404).json({ error: 'Mesure non trouvée' });
            return;
        }
        const body = req.body;
        const old = patient.measurements[idx];
        const updated = {
            id: old.id,
            date: body.date ?? old.date,
            ...(body.height !== undefined ? { height: Number(body.height) } : old.height !== undefined ? { height: old.height } : {}),
            ...(body.weight !== undefined ? { weight: Number(body.weight) } : old.weight !== undefined ? { weight: old.weight } : {}),
            ...(body.headCircumference !== undefined ? { headCircumference: Number(body.headCircumference) } : old.headCircumference !== undefined ? { headCircumference: old.headCircumference } : {}),
            ...(body.notes !== undefined ? (body.notes ? { notes: body.notes } : {}) : old.notes ? { notes: old.notes } : {})
        };
        patient.measurements[idx] = updated;
        patient.measurements = sortMeasurements(patient.measurements);
        writeData(data);
        res.json(updated);
    }
    catch {
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});
// DELETE measurement
app.delete('/api/patients/:patientId/measurements/:measurementId', (req, res) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.id === req.params['patientId']);
        if (!patient) {
            res.status(404).json({ error: 'Patient non trouvé' });
            return;
        }
        const idx = patient.measurements.findIndex(m => m.id === req.params['measurementId']);
        if (idx === -1) {
            res.status(404).json({ error: 'Mesure non trouvée' });
            return;
        }
        patient.measurements.splice(idx, 1);
        writeData(data);
        res.status(204).send();
    }
    catch {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});
// ─── Start ────────────────────────────────────────────────────────────────────
initDataFile();
app.listen(PORT, () => {
    console.log(`\n  ✅ Serveur démarré : http://localhost:${PORT}\n`);
});
exports.default = app;
