import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // Configured in Vercel environment variables
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const META_PIXEL_ID = process.env.META_PIXEL_ID;
  const META_TEST_CODE = process.env.META_TEST_CODE; // optional

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Validate presence of Meta token/pixel
  if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
    console.error('Missing Meta CAPI credentials');
    return res.status(500).json({ error: 'Not configured' });
  }

  try {
    const { eventName, eventId, eventUrl, userAgent, fbp, fbc } = req.body || {};

    if (!eventName || !eventId) {
      return res.status(400).json({ error: 'Missing eventName or eventId' });
    }

    // IP Extraction (works on Vercel and Express)
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const ipAddress = Array.isArray(clientIp) ? clientIp[0] : clientIp?.split(',')[0] || '';

    // Meta Conversions API Payload
    const payload: any = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: eventId,
          event_source_url: eventUrl,
          user_data: {
            client_ip_address: ipAddress,
            client_user_agent: userAgent,
          }
        }
      ]
    };

    if (fbp) payload.data[0].user_data.fbp = fbp;
    if (fbc) payload.data[0].user_data.fbc = fbc;
    
    if (META_TEST_CODE) {
      payload.test_event_code = META_TEST_CODE;
    }

    // Send to Meta
    const metaUrl = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;

    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI Error:', result);
      return res.status(response.status).json({ error: 'Meta API error', details: result });
    }

    return res.status(200).json({ success: true, result });
  } catch (err: any) {
    console.error('Server error processing CAPI request:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
