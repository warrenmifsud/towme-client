import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { User, Mail, ShieldAlert, History } from 'lucide-react';

export const SecurityProfile = () => {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'sending' | 'pending_verification' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            setRole(profile?.role || 'user');
        }
        setLoading(false);
    };

    const handleEmailUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateStatus('sending');
        setErrorMessage('');

        if (newEmail !== confirmEmail) {
            setErrorMessage('Emails do not match.');
            setUpdateStatus('error');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            setUpdateStatus('pending_verification');
        } catch (err: any) {
            setErrorMessage(err.message);
            setUpdateStatus('error');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading profile security...</div>;

    return (
        <div className="space-y-6">
            {/* Identity Card */}
            <div className="glass-panel p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShieldAlert size={120} className="text-[#F9A825]" />
                </div>

                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <User className="text-[#F9A825]" /> Admin Identity
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Identity</label>
                        <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {user?.email}
                            {role === 'super_admin' && (
                                <span className="bg-[#F9A825]/10 text-[#F9A825] text-[10px] px-2 py-0.5 rounded border border-[#F9A825]/20 uppercase">
                                    Super Admin
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Update Module */}
            <div className="glass-panel p-6 border-l-4 border-l-[#F9A825]">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <History className="text-[#F9A825]" /> Self-Service Update
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-2xl">
                    Updating your admin email requires a <strong>Dual-Verification Protocol</strong>.
                    Confirmation links will be sent to both your <em>current</em> email and your <em>new</em> email.
                    Access will remain on the current email until both are verified.
                </p>

                {updateStatus === 'pending_verification' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail size={32} />
                        </div>
                        <h4 className="text-lg font-bold text-blue-900">Verification Pending</h4>
                        <p className="text-sm text-blue-700 mt-2">
                            Please check both <strong>{user?.email}</strong> and <strong>{newEmail}</strong>.
                            <br />Click the confirmation links in BOTH emails to finalize the change.
                        </p>
                        <button
                            onClick={() => setUpdateStatus('idle')}
                            className="mt-6 text-sm font-bold text-blue-600 hover:underline"
                        >
                            Reset Form
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleEmailUpdate} className="max-w-md space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">New Email Address</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="glass-input w-full"
                                placeholder="new.admin@towme.io"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Confirm New Email</label>
                            <input
                                type="email"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                className="glass-input w-full"
                                placeholder="new.admin@towme.io"
                                required
                            />
                        </div>

                        {updateStatus === 'error' && (
                            <div className="text-xs font-bold text-red-500 flex items-center gap-1">
                                <ShieldAlert size={12} /> {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={updateStatus === 'sending'}
                            className="bg-[#F9A825] text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-[#F9A825]/20 hover:bg-[#e0961f] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {updateStatus === 'sending' ? 'Initiating Protocol...' : 'Initiate Dual-Verification'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
