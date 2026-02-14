import FileUpload from '../components/FileUpload';
import brandSettings from '../../../config/brand_settings.json';

interface DocFeedback {
    status: 'pending' | 'verified' | 'rejected';
    feedback?: string;
}

interface Step3Props {
    data: any;
    updateData: (data: any) => void;
    onNext: () => void;
    onBack: () => void;
    documentFeedback?: Record<string, DocFeedback>;
}

const DOC_KEYS: { key: string; label: string; dataKey: string; expiryKey?: string; expiryDataKey?: string }[] = [
    { key: 'id_card_front', label: 'ID Card (Front)', dataKey: 'id_card_front' },
    { key: 'id_card_back', label: 'ID Card (Back)', dataKey: 'id_card_back' },
    { key: 'driving_license_front', label: 'Driving License (Front)', dataKey: 'driving_license_front', expiryKey: 'driving_license_front_expiry', expiryDataKey: 'driving_license_front_expiry' },
    { key: 'driving_license_back', label: 'Driving License (Back)', dataKey: 'driving_license_back', expiryKey: 'driving_license_back_expiry', expiryDataKey: 'driving_license_back_expiry' },
];

export default function Step3Documents({ data, updateData, onNext, onBack, documentFeedback }: Step3Props) {
    const validate = () => {
        // Check core documents
        if (!data.driving_license_front || !data.id_card_front) {
            alert("Identification documents are mandatory.");
            return false;
        }
        return true;
    };

    const getDocStatus = (key: string): DocFeedback | null => {
        return documentFeedback?.[key] || null;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Documents</h2>
                <p className="text-slate-500 text-sm">Identity Verification.</p>
            </div>

            <div className="space-y-4">
                {DOC_KEYS.map((doc, idx) => {
                    const feedback = getDocStatus(doc.key);
                    const isVerified = feedback?.status === 'verified';
                    const isRejected = feedback?.status === 'rejected';

                    return (
                        <div key={doc.key}>
                            {idx === 2 && <div className="h-px bg-slate-200 my-4" />}

                            {/* FORENSIC STATUS BADGE */}
                            {feedback && (
                                <div
                                    className="flex items-center gap-2 mb-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                    style={{
                                        background: isVerified ? 'rgba(16,185,129,0.08)' : isRejected ? 'rgba(220,38,38,0.08)' : 'transparent',
                                        color: isVerified ? '#10B981' : isRejected ? '#DC2626' : '#94a3b8'
                                    }}
                                >
                                    {isVerified ? '✓ VERIFIED — LOCKED' : isRejected ? '✕ REJECTED — RE-UPLOAD REQUIRED' : '⏳ PENDING REVIEW'}
                                </div>
                            )}

                            {isVerified ? (
                                <div
                                    className="p-4 rounded-xl border-2 opacity-70 cursor-not-allowed"
                                    style={{ borderColor: '#10B981', background: 'rgba(16,185,129,0.04)' }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-green-700">{doc.label}</span>
                                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">LOCKED</span>
                                    </div>
                                    <div className="text-[10px] text-green-600 mt-1 font-mono truncate">{data[doc.dataKey] || 'Document on file'}</div>
                                </div>
                            ) : (
                                <div style={isRejected ? { border: '2px solid #DC2626', borderRadius: '12px', padding: '2px' } : {}}>
                                    <FileUpload
                                        label={doc.label}
                                        value={data[doc.dataKey]}
                                        expiry={doc.expiryDataKey ? data[doc.expiryDataKey] : undefined}
                                        onUpload={(url: string) => updateData({ [doc.dataKey]: url })}
                                        onExpiryChange={doc.expiryDataKey ? (date: string) => updateData({ [doc.expiryDataKey!]: date }) : undefined}
                                    />
                                    {isRejected && feedback?.feedback && (
                                        <p className="text-[10px] text-red-500 font-medium mt-1 px-2">{feedback.feedback}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-4 mt-8">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm uppercase tracking-wider transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={() => {
                        if (validate()) onNext();
                    }}
                    className="flex-1 py-4 rounded-xl bg-[#F9A825] hover:bg-[#F9A825]/90 text-white font-black text-sm uppercase tracking-wider transition-colors"
                >
                    Next Step
                </button>
            </div>
        </div>
    );
}

