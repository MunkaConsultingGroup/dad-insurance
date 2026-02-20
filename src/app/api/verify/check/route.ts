import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone number and code are required' }, { status: 400 });
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

    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: e164, code });

    if (check.status === 'approved') {
      return NextResponse.json({ success: true, status: 'approved' });
    }

    return NextResponse.json({ success: false, status: check.status }, { status: 400 });
  } catch (error) {
    console.error('Failed to check verification:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to verify code', detail: message }, { status: 500 });
  }
}
