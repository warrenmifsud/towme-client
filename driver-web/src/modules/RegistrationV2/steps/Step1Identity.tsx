import { useState } from 'react';
import { User, Mail, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import brandSettings from '../../../config/brand_settings.json';

interface Step1Props {
    data: any;
    updateData: (data: any) => void;
    onNext: () => void;
}

export default function Step1Identity({ data, updateData, onNext }: Step1Props) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `profile_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `profile_pictures/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('driver_documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage.from('driver_documents').getPublicUrl(filePath);
            updateData({ profile_picture: publicData.publicUrl });
        } catch (err: any) {
            console.error('Upload failed:', err);
            setError('Failed to upload profile picture');
        } finally {
            setUploading(false);
        }
    };

    const validate = () => {
        if (!data.first_name || !data.last_name || !data.email || !data.phone) {
            setError('Please fill in all mandatory fields');
            return false;
        }
        setError(null);
        return true;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Identify Yourself</h2>
                <p className="text-slate-500 text-sm">Let's start with the basics.</p>
            </div>

            {/* Profile Picture Upload */}
            <div className="flex justify-center mb-8">
                <div className="relative group">
                    <label className={`w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-all ${data.profile_picture ? 'border-[#F9A825]' : 'border-slate-300 hover:border-[#F9A825]/50'}`}>
                        {data.profile_picture ? (
                            <img src={data.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-slate-400">
                                {uploading ? <Loader2 className="animate-spin mb-2" /> : <Upload className="mb-2" />}
                                <span className="text-[10px] font-bold uppercase">Upload Photo</span>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                    {data.profile_picture && (
                        <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 border-4 border-slate-900">
                            <CheckCircle2 size={16} className="text-white" />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">First Name</label>
                    <input
                        type="text"
                        value={data.first_name || ''}
                        onChange={e => updateData({ first_name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded px-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400"
                        placeholder="John"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Last Name</label>
                    <input
                        type="text"
                        value={data.last_name || ''}
                        onChange={e => updateData({ last_name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded px-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400"
                        placeholder="Doe"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="email"
                        value={data.email || ''}
                        onChange={e => updateData({ email: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded pl-12 pr-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400"
                        placeholder="driver@towme.com"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Mobile Number</label>
                <input
                    type="tel"
                    value={data.phone || ''}
                    onChange={e => updateData({ phone: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded px-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400"
                    placeholder="+356 9912 3456"
                />
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-bold">
                    {error}
                </div>
            )}

            <button
                onClick={() => {
                    if (validate()) onNext();
                }}
                className="w-full py-4 rounded-xl bg-[#F9A825] hover:bg-[#F9A825]/90 text-white font-black text-sm uppercase tracking-wider transition-colors mt-4"
            >
                Next Step
            </button>
        </div>
    );
}
