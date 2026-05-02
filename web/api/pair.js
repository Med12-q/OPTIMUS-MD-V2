module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const RAILWAY_URL = process.env.RAILWAY_URL;
  const API_SECRET = process.env.API_SECRET || '';

  if (!RAILWAY_URL) {
    return res.status(503).json({
      error: 'Bot server not configured. Please contact the admin.'
    });
  }

  const { number } = req.body || {};

  if (!number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const cleaned = String(number).replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const response = await fetch(`${RAILWAY_URL}/api/pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_SECRET ? { 'x-api-key': API_SECRET } : {})
      },
      body: JSON.stringify({ number: cleaned }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out. Please try again.' });
    }
    console.error('Proxy error:', err.message);
    return res.status(500).json({ error: 'Failed to connect to bot server. Please try again.' });
  }
};
