import { Landmark, CreditCard, User } from 'lucide-react';
import brandSettings from '../../../config/brand_settings.json';

interface Step4Props {
    data: any;
    updateData: (data: any) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    onBack: () => void;
}

export default function Step4Bank({ data, updateData, onSubmit, isSubmitting, onBack }: Step4Props) {

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Banking</h2>
                <p className="text-slate-500 text-sm">Where should we send your payouts?</p>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Bank Name</label>
                <div className="relative">
                    <Landmark className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={data.bank_name || ''}
                        onChange={e => updateData({ bank_name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded pl-12 pr-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400"
                        placeholder="Revolut / BOV / HSBC"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Account Holder Name</label>
                <div className="relative">
                    <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={data.account_holder || ''}
                        onChange={e => updateData({ account_holder: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded pl-12 pr-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400"
                        placeholder="Name on Card"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">IBAN</label>
                <div className="relative">
                    <CreditCard className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={data.iban || ''}
                        onChange={e => updateData({ iban: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded pl-12 pr-4 py-3 text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors font-mono placeholder:text-slate-400"
                        placeholder="MT98 REVO 1234 5678 1234 56"
                    />
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mt-6">
                <p className="text-[10px] text-amber-500/80 leading-relaxed text-center">
                    By submitting this application, you agree to our Terms of Service and Driver Partner Agreement.
                    Your data will be processed in accordance with GDPR.
                </p>
            </div>

            <div className="flex gap-4 mt-8">
                <button
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                    Back
                </button>
                <button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-xl bg-[#F9A825] hover:bg-[#F9A825]/90 text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-70 flex items-center justify-center gap-2"

                >
                    {isSubmitting ? 'Processing...' : 'Submit Application'}
                </button>
            </div>
        </div>
    );
}
