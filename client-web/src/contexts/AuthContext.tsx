import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isSuspended: boolean;
    suspensionDetails: { reason: string; until: string } | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isSuspended, setIsSuspended] = useState(false);
    const [suspensionDetails, setSuspensionDetails] = useState<{ reason: string; until: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const isMounted = React.useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const checkStatus = async (userId: string) => {
        if (!isMounted.current) return;
        try {
            // Check Client Status (Suspension)
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('status, suspension_reason, suspended_until')
                .eq('id', userId)
                .single();

            if (!isMounted.current) return;

            if (clientError && clientError.code !== 'PGRST116') {
                const isAbortError = clientError.message?.includes('AbortError') || clientError.message?.includes('aborted');
                if (!isAbortError) {
                    console.error('Client Status Check Error:', clientError);
                }
            }

            // Handle Suspension
            if (clientData?.status === 'suspended') {
                setIsSuspended(true);
                setSuspensionDetails({
                    reason: clientData.suspension_reason,
                    until: clientData.suspended_until
                });
            } else {
                setIsSuspended(false);
                setSuspensionDetails(null);
            }

        } catch (err: any) {
            // Ignore AbortErrors which are common during rapid navigation/reloads
            if (err.name === 'AbortError' || err.message?.includes('Aborted')) return;

            console.error('Error checking user status:', err);
            if (isMounted.current) setIsSuspended(false); // Fail safe
        }
    };

    useEffect(() => {
        isMounted.current = true;

        async function initAuth() {
            // Safety timeout to prevent stuck loading screen
            const timeoutId = setTimeout(() => {
                if (isMounted.current) {
                    console.warn('Auth initialization timed out, proceeding anyway.');
                    setLoading(false);
                }
            }, 5000);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted.current) return;

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await checkStatus(session.user.id);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Auth initialization error:', err);
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted.current) setLoading(false);
            }
        }

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted.current) return;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // PHASE 62: Lazy Sync "Provider" (Google vs Email)
                // We do this client-side to avoid touching backend triggers blindly.
                // It's idempotent (safe to run multiple times).
                const provider = session?.user?.app_metadata?.provider || 'email';
                if (provider === 'google') {
                    // Phase 63 Audit: Sync Google Data (Name & Avatar)
                    const { full_name, name } = session.user.user_metadata || {};
                    const finalName = full_name || name;
                    // const finalAvatar = avatar_url || picture; // Column not confirmed yet

                    const updateData: any = { provider: 'google' };
                    if (finalName) updateData.full_name = finalName;
                    // if (finalAvatar) updateData.avatar_url = finalAvatar; // Uncomment if column exists

                    // Fire and forget - don't block UI
                    supabase.from('clients')
                        .update(updateData)
                        .eq('id', session.user.id)
                        .then(({ error }) => {
                            if (error) console.error("Provider/Data Sync Error:", error);
                        });
                }

                await checkStatus(session.user.id);
            } else {
                setIsSuspended(false);
                setSuspensionDetails(null);
            }
            if (isMounted.current) setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            isSuspended,
            suspensionDetails,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
