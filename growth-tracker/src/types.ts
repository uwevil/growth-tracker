export interface Measurement {
    id: string;
    date: string;
    height?: number;
    weight?: number;
    headCircumference?: number;
    notes?: string;
}

export interface Patient {
    id: string;
    name: string;
    birthDate: string;
    gender?: 'male' | 'female';
    measurements: Measurement[];
}

export interface AppData {
    patients: Patient[];
}
