import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Truck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const BRAND = { primary: '#F9A825', white: '#FFFFFF', text: '#1A1C2E' };

interface AddAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssetAdded: () => void;
}

interface FormData {
    license_plate: string;
    vin: string;
    make: string;
    model: string;
    year: string;
    color: string;
    type: string;
}

interface FormErrors {
    license_plate?: string;
    vin?: string;
    make?: string;
    model?: string;
    duplicate_id?: string;
}

const VEHICLE_TYPES = ['Standard', 'Flatbed', 'Wheel-Lift', 'Heavy-Duty', 'Integrated'];

export const AddAssetModal = ({ isOpen, onClose, onAssetAdded }: AddAssetModalProps) => {
    const [form, setForm] = useState<FormData>({
        license_plate: '', vin: '', make: '', model: '',
        year: new Date().getFullYear().toString(), color: '', type: 'Standard'
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const validateVIN = (vin: string): boolean => {
        return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!form.license_plate.trim()) {
            newErrors.license_plate = 'License plate is required.';
        }

        if (!form.vin.trim()) {
            newErrors.vin = 'VIN is required.';
        } else if (!validateVIN(form.vin)) {
            newErrors.vin = `VIN must be exactly 17 alphanumeric characters (excluding I, O, Q). Received: "${form.vin}" (${form.vin.length} chars)`;
        }

        if (!form.make.trim()) {
            newErrors.make = 'Make is required.';
        }

        if (!form.model.trim()) {
            newErrors.model = 'Model is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        setErrors({});

        try {
            // Check for duplicate VIN
            const { data: existing } = await supabase
                .from('fleet_assets')
                .select('id, license_plate')
                .eq('vin', form.vin.toUpperCase())
                .maybeSingle();

            if (existing) {
                setErrors({
                    duplicate_id: `DUPLICATE VIN DETECTED. Existing Asset ID: ${existing.id} | Plate: ${existing.license_plate}`
                });
                setSubmitting(false);
                return;
            }

            // Insert the new asset
            const { error } = await supabase
                .from('fleet_assets')
                .insert({
                    license_plate: form.license_plate.toUpperCase(),
                    vin: form.vin.toUpperCase(),
                    make: form.make.trim(),
                    model: form.model.trim(),
                    year: form.year,
                    color: form.color.trim() || null,
                    type: form.type,
                    status: 'AVAILABLE',
                    is_verified: false
                });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setForm({
                    license_plate: '', vin: '', make: '', model: '',
                    year: new Date().getFullYear().toString(), color: '', type: 'Standard'
                });
                onAssetAdded();
                onClose();
            }, 1500);

        } catch (err: any) {
            setErrors({ duplicate_id: `DB Error: ${err.message || 'Unknown failure'}` });
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (field: keyof FormData, value: string) => {
        let processedValue = value;

        // Force uppercase for license plate and VIN
        if (field === 'license_plate' || field === 'vin') {
            processedValue = value.toUpperCase();
        }

        setForm(prev => ({ ...prev, [field]: processedValue }));

        // Clear field-specific error on change
        if (errors[field as keyof FormErrors]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field as keyof FormErrors];
                return next;
            });
        }
    };

    const inputStyle = (hasError: boolean) => ({
        width: '100%',
        padding: '10px 14px',
        border: `1.5px solid ${hasError ? '#E53935' : '#E0E0E0'}`,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600 as const,
        color: BRAND.text,
        outline: 'none',
        transition: 'border-color 0.2s',
        background: '#FAFAFA',
        letterSpacing: '0.02em'
    });

    const labelStyle = {
        display: 'block' as const,
        fontSize: 10,
        fontWeight: 800 as const,
        color: '#888',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.12em',
        marginBottom: 4
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#fff', borderRadius: 16,
                width: 520, maxHeight: '90vh', overflow: 'auto',
                boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
                border: `2px solid ${BRAND.primary}`
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px', borderBottom: '1px solid #F0F0F0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            background: BRAND.primary, borderRadius: 10, padding: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Truck size={18} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.text }}>
                                REGISTER FLEET ASSET
                            </div>
                            <div style={{ fontSize: 10, color: '#999', fontWeight: 600, letterSpacing: '0.08em' }}>
                                SOVEREIGN ASSET INTAKE
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 6, borderRadius: 8, color: '#999'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Forensic Red Card — Duplicate VIN */}
                {errors.duplicate_id && (
                    <div style={{
                        margin: '16px 24px 0', padding: '12px 16px',
                        background: '#FFF3E0', border: '1.5px solid #F9A825',
                        borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 10
                    }}>
                        <AlertTriangle size={16} color="#E65100" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#E65100', lineHeight: 1.5 }}>
                            {errors.duplicate_id}
                        </div>
                    </div>
                )}

                {/* Success Banner */}
                {success && (
                    <div style={{
                        margin: '16px 24px 0', padding: '12px 16px',
                        background: '#E8F5E9', border: '1.5px solid #4CAF50',
                        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10
                    }}>
                        <CheckCircle size={16} color="#2E7D32" />
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#2E7D32' }}>
                            ASSET REGISTERED SUCCESSFULLY
                        </div>
                    </div>
                )}

                {/* Form Body */}
                <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Row 1: Plate + VIN */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                        <div>
                            <label style={labelStyle}>License Plate *</label>
                            <input
                                value={form.license_plate}
                                onChange={e => handleChange('license_plate', e.target.value)}
                                placeholder="ABC 123"
                                style={inputStyle(!!errors.license_plate)}
                            />
                            {errors.license_plate && (
                                <div style={{ fontSize: 10, color: '#E53935', marginTop: 4, fontWeight: 600 }}>
                                    {errors.license_plate}
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={labelStyle}>VIN (17 Characters) *</label>
                            <input
                                value={form.vin}
                                onChange={e => handleChange('vin', e.target.value)}
                                placeholder="1HGCM82633A004352"
                                maxLength={17}
                                style={{
                                    ...inputStyle(!!errors.vin),
                                    fontFamily: 'monospace', letterSpacing: '0.15em'
                                }}
                            />
                            <div style={{
                                fontSize: 9, marginTop: 4, fontWeight: 700,
                                color: form.vin.length === 17 ? '#4CAF50' : '#999',
                                letterSpacing: '0.05em'
                            }}>
                                {form.vin.length}/17 CHARACTERS
                            </div>
                            {errors.vin && (
                                <div style={{ fontSize: 10, color: '#E53935', marginTop: 2, fontWeight: 600 }}>
                                    {errors.vin}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Make + Model */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={labelStyle}>Make *</label>
                            <input
                                value={form.make}
                                onChange={e => handleChange('make', e.target.value)}
                                placeholder="Ford"
                                style={inputStyle(!!errors.make)}
                            />
                            {errors.make && (
                                <div style={{ fontSize: 10, color: '#E53935', marginTop: 4, fontWeight: 600 }}>
                                    {errors.make}
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={labelStyle}>Model *</label>
                            <input
                                value={form.model}
                                onChange={e => handleChange('model', e.target.value)}
                                placeholder="F-650"
                                style={inputStyle(!!errors.model)}
                            />
                            {errors.model && (
                                <div style={{ fontSize: 10, color: '#E53935', marginTop: 4, fontWeight: 600 }}>
                                    {errors.model}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 3: Year + Color + Type */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 14 }}>
                        <div>
                            <label style={labelStyle}>Year</label>
                            <input
                                value={form.year}
                                onChange={e => handleChange('year', e.target.value)}
                                placeholder="2024"
                                maxLength={4}
                                style={inputStyle(false)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Color</label>
                            <input
                                value={form.color}
                                onChange={e => handleChange('color', e.target.value)}
                                placeholder="White"
                                style={inputStyle(false)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Vehicle Type</label>
                            <select
                                value={form.type}
                                onChange={e => handleChange('type', e.target.value)}
                                style={{
                                    ...inputStyle(false),
                                    cursor: 'pointer',
                                    appearance: 'none' as const
                                }}
                            >
                                {VEHICLE_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        style={{
                            marginTop: 8, width: '100%', padding: '14px',
                            background: submitting ? '#E0E0E0' : BRAND.primary,
                            color: submitting ? '#999' : '#fff',
                            border: 'none', borderRadius: 10,
                            fontSize: 13, fontWeight: 800,
                            letterSpacing: '0.1em',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s',
                            boxShadow: submitting ? 'none' : '0 4px 16px rgba(249,168,37,0.35)'
                        }}
                    >
                        {submitting ? 'REGISTERING...' : 'REGISTER ASSET'}
                    </button>
                </div>

                {/* Footer Signature */}
                <div style={{
                    textAlign: 'right', padding: '8px 24px 12px',
                    fontSize: 8, color: '#CCC', fontWeight: 600, letterSpacing: '0.08em'
                }}>
                    Powered by W.M Coding
                </div>
            </div>
        </div>
    );
};
