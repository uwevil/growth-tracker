import express, { Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { AppData, Patient, Measurement } from './types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'measurements.json');

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function sortMeasurements(m: Measurement[]): Measurement[] {
    return m.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
function initDataFile(): void {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ patients: [] }, null, 2), 'utf-8');
        return;
    }

    // Migrate old single-patient format
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.patient !== undefined && !parsed.patients) {
        const oldPatient = parsed.patient;
        const newData: AppData = { patients: [] };
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

function readData(): AppData {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as AppData;
}

function writeData(data: AppData): void {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Patient routes ───────────────────────────────────────────────────────────

// GET all patients
app.get('/api/patients', (_req: Request, res: Response) => {
    try {
        res.json(readData().patients);
    } catch {
        res.status(500).json({ error: 'Erreur lors de la lecture' });
    }
});

// POST create patient
app.post('/api/patients', (req: Request, res: Response) => {
    try {
        const data = readData();
        const body = req.body as { name?: string; birthDate?: string; gender?: string };
        if (!body.name || typeof body.name !== 'string') {
            res.status(400).json({ error: 'Le nom est obligatoire' });
            return;
        }
        const patient: Patient = {
            id: generateId(),
            name: body.name.trim(),
            birthDate: body.birthDate ?? '',
            gender: (body.gender as 'male' | 'female') || undefined,
            measurements: []
        };
        data.patients.push(patient);
        writeData(data);
        res.status(201).json(patient);
    } catch {
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// PUT update patient
app.put('/api/patients/:patientId', (req: Request, res: Response) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.id === req.params['patientId']);
        if (!patient) { res.status(404).json({ error: 'Patient non trouvé' }); return; }
        const body = req.body as { name?: string; birthDate?: string; gender?: string };
        if (body.name) patient.name = body.name.trim();
        if (body.birthDate !== undefined) patient.birthDate = body.birthDate;
        patient.gender = (body.gender as 'male' | 'female') || undefined;
        writeData(data);
        res.json(patient);
    } catch {
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// DELETE patient
app.delete('/api/patients/:patientId', (req: Request, res: Response) => {
    try {
        const data = readData();
        const idx = data.patients.findIndex(p => p.id === req.params['patientId']);
        if (idx === -1) { res.status(404).json({ error: 'Patient non trouvé' }); return; }
        data.patients.splice(idx, 1);
        writeData(data);
        res.status(204).send();
    } catch {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ─── Measurement routes ───────────────────────────────────────────────────────

// POST add measurement
app.post('/api/patients/:patientId/measurements', (req: Request, res: Response) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.id === req.params['patientId']);
        if (!patient) { res.status(404).json({ error: 'Patient non trouvé' }); return; }
        const body = req.body as Partial<Measurement>;
        if (!body.date) { res.status(400).json({ error: 'La date est obligatoire' }); return; }
        const m: Measurement = {
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
    } catch {
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// PUT update measurement
app.put('/api/patients/:patientId/measurements/:measurementId', (req: Request, res: Response) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.id === req.params['patientId']);
        if (!patient) { res.status(404).json({ error: 'Patient non trouvé' }); return; }
        const idx = patient.measurements.findIndex(m => m.id === req.params['measurementId']);
        if (idx === -1) { res.status(404).json({ error: 'Mesure non trouvée' }); return; }
        const body = req.body as Partial<Measurement>;
        const old = patient.measurements[idx];
        const updated: Measurement = {
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
    } catch {
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// DELETE measurement
app.delete('/api/patients/:patientId/measurements/:measurementId', (req: Request, res: Response) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.id === req.params['patientId']);
        if (!patient) { res.status(404).json({ error: 'Patient non trouvé' }); return; }
        const idx = patient.measurements.findIndex(m => m.id === req.params['measurementId']);
        if (idx === -1) { res.status(404).json({ error: 'Mesure non trouvée' }); return; }
        patient.measurements.splice(idx, 1);
        writeData(data);
        res.status(204).send();
    } catch {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDataFile();

app.listen(PORT, () => {
    console.log(`\n  ✅ Serveur démarré : http://localhost:${PORT}\n`);
});

export default app;

