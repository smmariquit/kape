// Vercel Serverless Function — creates a PayMongo Checkout Session
// POST /api/checkout
// Body: { amount: number (in pesos), message?: string }

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
        return res.status(500).json({ error: 'PayMongo secret key not configured' });
    }

    try {
        const { amount, message } = req.body;

        // Validate amount (minimum ₱10, maximum ₱50,000)
        const pesoAmount = parseInt(amount);
        if (!pesoAmount || pesoAmount < 10 || pesoAmount > 50000) {
            return res.status(400).json({
                error: 'Amount must be between ₱10 and ₱50,000'
            });
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
                'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
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
            return res.status(response.status).json({ error: errMsg });
        }

        const checkoutUrl = data.data.attributes.checkout_url;
        return res.status(200).json({ checkout_url: checkoutUrl });

    } catch (err) {
        console.error('Checkout error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
