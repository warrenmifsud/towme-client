import { Building2, MapPin, Hash } from 'lucide-react';
import brandSettings from '../../../config/brand_settings.json';

interface Step2Props {
    data: any;
    updateData: (data: any) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function Step2Business({ data, updateData, onNext, onBack }: Step2Props) {
    const validate = () => {
        // Basic validation - can be stricter
        if (!data.company_name || !data.address) {
            return false;
        }
        return true;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Business Details</h2>
                <p className="text-slate-500 text-sm">Legal requirements for payouts.</p>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Legal Company Name</label>
                <div className="relative">
                    <Building2 className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={data.company_name || ''}
                        onChange={e => updateData({ company_name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded pl-12 pr-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400"
                        placeholder="Tow Master Ltd."
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">VAT Number (Optional)</label>
                <div className="relative">
                    <Hash className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={data.vat_number || ''}
                        onChange={e => updateData({ vat_number: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded pl-12 pr-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400"
                        placeholder="MT 1234 5678"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Registered Address</label>
                <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <textarea
                        value={data.address || ''}
                        onChange={e => updateData({ address: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded pl-12 pr-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors min-h-[100px] placeholder:text-slate-400"
                        placeholder="123, Main Street, Valletta"
                    />
                </div>
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
