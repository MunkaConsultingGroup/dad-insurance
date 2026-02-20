import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean to E.164 format
    const cleaned = phone.replace(/\D/g, '');
    const e164 = cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      console.error('Missing Twilio environment variables');
      return NextResponse.json({ error: 'Verification service not configured' }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);

    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: e164, channel: 'sms' });

    return NextResponse.json({ success: true, status: verification.status });
  } catch (error) {
    console.error('Failed to send verification:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to send verification code', detail: message }, { status: 500 });
  }
}
