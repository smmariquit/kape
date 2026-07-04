// functions/api/checkout.js
//
// Cloudflare Pages Function (Web-standard Request/Response) — creates a
// PayMongo Checkout Session. Ported 1:1 from the Vercel handler at
// api/checkout.js; behavior, status codes, and JSON shapes are unchanged.
//
// POST /api/checkout
// Body: { amount: number (in pesos), message?: string }

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function json(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

export async function onRequest({ request, env }) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    const secretKey = env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
        return json(500, { error: 'PayMongo secret key not configured' });
    }

    try {
        let body;
        try {
            body = await request.json();
        } catch {
            body = {};
        }
        const { amount, message } = body;

        // Validate amount (minimum ₱10, maximum ₱50,000)
        const pesoAmount = parseInt(amount);
        if (!pesoAmount || pesoAmount < 10 || pesoAmount > 50000) {
            return json(400, { error: 'Amount must be between ₱10 and ₱50,000' });
        }

        // PayMongo expects amount in centavos
        const centavoAmount = pesoAmount * 100;

        const description = message
            ? `Kape for Stimmie — "${message}"`
            : `Kape for Stimmie — ₱${pesoAmount.toLocaleString()}`;

        // Create Checkout Session via PayMongo API
        const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(secretKey + ':')}`
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        send_email_receipt: true,
                        show_description: true,
                        show_line_items: true,
                        description: description,
                        line_items: [
                            {
                                currency: 'PHP',
                                amount: centavoAmount,
                                name: '☕ Kape for Stimmie',
                                quantity: 1,
                                description: description
                            }
                        ],
                        payment_method_types: [
                            'qrph'
                        ],
                        success_url: 'https://kape.stimmie.dev/?success=true',
                        cancel_url: 'https://kape.stimmie.dev/?cancelled=true'
                    }
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('PayMongo error:', JSON.stringify(data));
            const errMsg = data.errors?.[0]?.detail || 'Failed to create checkout session';
            return json(response.status, { error: errMsg });
        }

        const checkoutUrl = data.data.attributes.checkout_url;
        return json(200, { checkout_url: checkoutUrl });

    } catch (err) {
        console.error('Checkout error:', err);
        return json(500, { error: 'Internal server error' });
    }
}
