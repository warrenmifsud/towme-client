import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { X, Loader2, Lock } from 'lucide-react';

// Initialize Stripe (replace with your publishable key env var)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
    clientSecret: string;
    amount: number;
    onSuccess: () => void;
    onClose: () => void;
}

function PaymentForm({ amount, onSuccess }: { amount: number; onSuccess: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setProcessing(true);
        setError(null);

        const { error: submitError } = await elements.submit();
        if (submitError) {
            setError(submitError.message || 'An unexpected error occurred.');
            setProcessing(false);
            return;
        }

        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required',
            confirmParams: {
                return_url: window.location.origin + '/payment-success', // Fallback
            },
        });

        if (confirmError) {
            setError(confirmError.message || 'Payment failed.');
            setProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess();
        } else {
            setError('Payment validation failed.');
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10">
                <PaymentElement />
            </div>

            {error && (
                <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || processing}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {processing ? <Loader2 className="animate-spin" /> : (
                    <>
                        <Lock size={16} />
                        Pay €{amount}
                    </>
                )}
            </button>

            <p className="text-center text-[10px] text-slate-500">
                Secured by Stripe. Your payment details are encrypted.
            </p>
        </form>
    );
}

export function PaymentModal({ clientSecret, amount, onSuccess, onClose }: PaymentModalProps) {
    const options = {
        clientSecret,
        appearance: {
            theme: 'night' as const,
            variables: {
                colorPrimary: '#f59e0b',
                colorBackground: '#1e293b',
                colorText: '#ffffff',
                colorDanger: '#ef4444',
                fontFamily: 'system-ui, sans-serif',
                borderRadius: '12px',
            },
        },
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white">Complete Payment</h2>
                        <p className="text-xs text-slate-400 mt-1">Pay securely to confirm your request</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Amount Summary */}
                <div className="px-6 py-4 bg-amber-500/10 flex justify-between items-center">
                    <span className="text-sm font-bold text-amber-500 uppercase tracking-wider">Total Due</span>
                    <span className="text-2xl font-black text-white">€{amount.toFixed(2)}</span>
                </div>

                {/* Stripe Elements or Mock */}
                <div className="p-6">
                    {clientSecret === 'mock_secret' ? (
                        // MOCK UI
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10 space-y-3">
                                <div className="h-10 bg-white/5 rounded-md w-full animate-pulse border border-white/5" />
                                <div className="flex gap-3">
                                    <div className="h-10 bg-white/5 rounded-md w-1/2 animate-pulse border border-white/5" />
                                    <div className="h-10 bg-white/5 rounded-md w-1/2 animate-pulse border border-white/5" />
                                </div>
                            </div>

                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200">
                                <p className="font-bold mb-1">TEST MODE</p>
                                <p>This is a simulated payment. No real money will be charged.</p>
                            </div>

                            <button
                                onClick={() => {
                                    const btn = document.getElementById('mock-pay-btn');
                                    if (btn) {
                                        btn.innerText = 'Processing...';
                                        btn.classList.add('opacity-75');
                                    }
                                    setTimeout(onSuccess, 1500);
                                }}
                                id="mock-pay-btn"
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <Lock size={16} />
                                Simulate Pay €{amount}
                            </button>
                        </div>
                    ) : clientSecret && stripePromise ? (
                        <Elements stripe={stripePromise} options={options}>
                            <PaymentForm amount={amount} onSuccess={onSuccess} />
                        </Elements>
                    ) : (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin text-amber-500" size={32} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
