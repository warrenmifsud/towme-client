// LANA: Vehicle Intelligence Agent Utilities

export interface VehicleDNAPackage {
    make: string;
    model: string;
    year: string;
    vin?: string;
    drivetrain: 'AWD' | 'RWD' | 'FWD' | '4x4' | 'Unknown';
    curb_weight?: number; // kg
    transmission: 'Auto' | 'Manual' | 'Unknown';
    is_low_clearance: boolean;
    wheels_locked: boolean;
    notes?: string;
    // High-Fidelity Fields
    model_name?: string; // e.g., 'Model 3 Performance'
    body_type?: string; // e.g., 'Sedan', 'SUV'
    trigger_manual_selection?: boolean; // Kept for extreme edge cases, but rarely used now
    known_make?: string;
}

// HIGH-FIDELITY MOCK VIN DECODER
// Simulates DataOne / VINAudit level precision
export const decodeVIN = async (vin: string): Promise<Partial<VehicleDNAPackage> | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const cleanVin = vin.toUpperCase().trim();

    // --- HIGH-FIDELITY EXACT MATCHES ---

    if (cleanVin.includes('TESLA')) {
        return {
            make: 'Tesla',
            model: 'Model 3',
            model_name: 'Model 3 Long Range',
            body_type: 'Sedan',
            year: '2023',
            drivetrain: 'AWD',
            curb_weight: 1844,
            transmission: 'Auto',
            is_low_clearance: true
        };
    }

    if (cleanVin.includes('RANGER')) {
        return {
            make: 'Ford',
            model: 'Ranger',
            model_name: 'Ranger XLT 4WD',
            body_type: 'Pickup',
            year: '2020',
            drivetrain: '4x4',
            curb_weight: 2150,
            transmission: 'Auto',
            is_low_clearance: false
        };
    }

    if (cleanVin.includes('CIVIC')) {
        return {
            make: 'Honda',
            model: 'Civic',
            model_name: 'Civic Touring',
            body_type: 'Sedan',
            year: '2019',
            drivetrain: 'FWD',
            curb_weight: 1350,
            transmission: 'Auto',
            is_low_clearance: true
        };
    }

    // --- PROFESSIONAL MASKING (EU/MALTA) ---
    // Instead of asking "What model?", we infer based on Make + Global Data Pattern

    // BMW (WBA...) -> Auto-resolve to X5 Default pattern if specific VIN unknown
    if (cleanVin.startsWith('WBA')) {
        return {
            make: 'BMW',
            model: 'X5', // Inferred Default
            model_name: 'X5 xDrive30d (Inferred)',
            body_type: 'SUV',
            year: '2022',
            drivetrain: 'AWD', // BMW X-Drive standard assumption for X5
            transmission: 'Auto',
            is_low_clearance: false,
            trigger_manual_selection: false // SILENT SUCCESS
        };
    }

    // Mercedes-Benz (WDD...) -> Auto-resolve to E-Class
    if (cleanVin.startsWith('WDD')) {
        return {
            make: 'Mercedes-Benz',
            model: 'E-Class',
            model_name: 'E 220 d Saloon',
            body_type: 'Sedan',
            year: '2021',
            drivetrain: 'RWD',
            transmission: 'Auto',
            is_low_clearance: true, // Sedans trigger low clearance protocol
            trigger_manual_selection: false
        };
    }

    // Audi (WAU...) -> Auto-resolve to Q5
    if (cleanVin.startsWith('WAU')) {
        return {
            make: 'Audi',
            model: 'Q5',
            model_name: 'Q5 TDI quattro',
            body_type: 'SUV',
            year: '2023',
            drivetrain: 'AWD',
            transmission: 'Auto',
            is_low_clearance: false,
            trigger_manual_selection: false
        };
    }

    // Volkswagen (WVW...) -> Auto-resolve to Golf
    if (cleanVin.startsWith('WVW')) {
        return {
            make: 'Volkswagen',
            model: 'Golf',
            model_name: 'Golf 2.0 TDI',
            body_type: 'Hatchback',
            year: '2020',
            drivetrain: 'FWD',
            transmission: 'Auto',
            is_low_clearance: true,
            trigger_manual_selection: false
        };
    }

    // --- EXTREME FALLBACK ---
    // Only triggers Visual Guide if VIN is valid length but completely unknown
    if (cleanVin.length === 17) {
        return {
            make: 'Unknown',
            model: 'Unknown',
            year: '2020',
            drivetrain: 'Unknown',
            transmission: 'Unknown',
            trigger_manual_selection: true // Last resort only
        };
    }

    return null; // Invalid VIN length/format
};

export const MOCK_MODELS: Record<string, string[]> = {
    'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'i4'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'EQE'],
    'Audi': ['A3', 'A4', 'Q3', 'Q5', 'e-tron'],
    'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'ID.3', 'ID.4'],
    'Unknown': ['Sedan', 'SUV', 'Truck', 'Van', 'Motorcycle']
};

export const LANA_GREETINGS = [
    "Hi! I'm Lana. I'll help you set up your vehicle profile.",
    "Lana here. Let's get your car details sorted for the perfect tow.",
    "Hello! I'm Lana, your vehicle intelligence agent."
];
