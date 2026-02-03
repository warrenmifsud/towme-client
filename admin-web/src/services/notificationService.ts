export const notificationService = {
    /**
     * Sends a simulated SMS to a customer.
     * In production, this would call a Supabase Edge Function wrapping Twilio.
     */
    sendSMS: async (phone: string, message: string) => {
        console.log(`%c[SIMULATED SMS] To: ${phone} | Body: ${message}`, 'color: #10b981; font-weight: bold; background: #064e3b; padding: 4px; border-radius: 4px;');
        // TODO: Replace with real API call
        // await supabase.functions.invoke('send-sms', { body: { phone, message } });
    },

    /**
     * Sends a simulated Email.
     * In production, this would call SendGrid/Resend.
     */
    sendEmail: async (email: string, subject: string, body: string) => {
        console.log(`%c[SIMULATED EMAIL] To: ${email} | Subject: ${subject}`, 'color: #3b82f6; font-weight: bold; background: #1e3a8a; padding: 4px; border-radius: 4px;');
        console.log(`Body: ${body}`);
    },

    /**
     * Standard templates for notifications
     */
    templates: {
        bookingConfirmed: (name: string, ref: string) =>
            `Hi ${name}, your Towing Request #${ref.slice(0, 5)} is confirmed. We will notify you when a driver is assigned. - Mifsud Towing`,

        driverAssigned: (name: string, driverName: string, eta: string) =>
            `Hi ${name}, driver ${driverName} is on the way! ETA: ${eta} mins. Track here: https://mifsud-towing.app/track/`,

        jobCompleted: (name: string, amount: number) =>
            `Hi ${name}, job completed. Total: €${amount.toFixed(2)}. Thank you for choosing Mifsud Towing!`
    }
};
