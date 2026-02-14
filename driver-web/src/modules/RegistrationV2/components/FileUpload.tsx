import { useState } from 'react';
import { Upload, CheckCircle2, Loader2, FileText, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface FileUploadProps {
    label: string;
    value: string;
    expiry?: string;
    onUpload: (url: string) => void;
    onExpiryChange?: (date: string) => void;
    folder?: string;
}

export default function FileUpload({ label, value, expiry, onUpload, onExpiryChange, folder = 'driver_documents' }: FileUploadProps) {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('driver_documents')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // const { data } = supabase.storage.from('driver_documents').getPublicUrl(fileName);
            // onUpload(data.publicUrl);

            // STORE PATH ONLY (For Signed URLs)
            onUpload(fileName);
        } catch (err) {
            console.error('Upload failed', err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:border-slate-300">
            <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                {value && <button onClick={() => onUpload('')} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}
            </div>

            <div className="flex gap-4">
                {/* Upload Box */}
                <div className="flex-1">
                    <label className={`block w-full border-2 border-dashed rounded-lg h-20 flex flex-col items-center justify-center cursor-pointer transition-colors ${value ? 'border-green-500/50 bg-green-500/10' : 'border-slate-200 hover:border-amber-500/50 hover:bg-white'}`}>
                        {uploading ? (
                            <Loader2 className="animate-spin text-amber-500" />
                        ) : value ? (
                            <div className="flex flex-col items-center">
                                <CheckCircle2 className="text-green-500 mb-1" size={20} />
                                <span className="text-[9px] text-green-400 font-bold uppercase">Uploaded</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400">
                                <Upload size={20} className="mb-1" />
                                <span className="text-[9px] font-bold uppercase">Select File</span>
                            </div>
                        )}
                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
                    </label>
                </div>

                {/* Optional Expiry */}
                {onExpiryChange && (
                    <div className="w-1/3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Expiry</label>
                        <input
                            type="date"
                            value={expiry || ''}
                            onChange={(e) => onExpiryChange(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs text-slate-900 outline-none focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 h-20 transition-colors"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
