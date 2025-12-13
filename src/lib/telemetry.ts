export const sendTelemetry = (eventName: string, params: Record<string, any> = {}) => {
    // Prevent telemetry during development/local testing to avoid noise?
    // Or maybe we want to test it. Let's make it safe.
    if (typeof window === 'undefined') return;

    // Fire and forget beacon
    try {
        fetch('https://koin.theretrosaga.com/api/telemetry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_name: eventName,
                params: {
                    ...params,
                    url: window.location.href,
                    referrer: document.referrer,
                    timestamp: new Date().toISOString()
                }
            })
        }).catch(() => {
            // Ignore telemetry errors
        });
    } catch (e) {
        // Ignore
    }
};
