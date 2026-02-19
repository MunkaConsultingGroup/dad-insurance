import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { inngest } from '@/lib/inngest';
import { LeadData } from '@/lib/types';

async function sendSlackNotification(body: LeadData) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) return;

  const coverageFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(body.coverageAmount);

  await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `New Lead: ${body.firstName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              `*New Lead: ${body.firstName}*`,
              `Age: ${body.age} | Gender: ${body.gender}`,
              `Coverage: ${coverageFormatted} / ${body.termLength}yr term`,
              `Health: ${body.healthClass} | Smoker: ${body.smokerStatus}`,
              `Phone: ${body.phone} | Email: ${body.email}`,
              `ZIP: ${body.zip}`,
            ].join('\n'),
          },
        },
      ],
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadData = await request.json();

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const lead = await prisma.lead.create({
      data: {
        age: body.age,
        gender: body.gender,
        smokerStatus: body.smokerStatus,
        healthClass: body.healthClass,
        coverageAmount: body.coverageAmount,
        termLength: body.termLength,
        ratesShown: JSON.stringify(body.ratesShown),
        firstName: body.firstName,
        email: body.email,
        phone: body.phone,
        zip: body.zip,
        consentGiven: body.consentGiven,
        consentText: body.consentText,
        consentAt: new Date(),
        ipAddress,
        utmSource: body.utmSource || null,
        utmMedium: body.utmMedium || null,
        utmCampaign: body.utmCampaign || null,
        utmContent: body.utmContent || null,
        utmTerm: body.utmTerm || null,
        gclid: body.gclid || null,
        fbclid: body.fbclid || null,
        referrer: body.referrer || null,
        landingPage: body.landingPage || null,
      },
    });

    // Send Slack notification directly (guaranteed)
    try {
      await sendSlackNotification(body);
    } catch (e) {
      console.error('Slack notification failed:', e);
    }

    // Fire Inngest event (non-fatal — for future webhook/email pipeline)
    try {
      await inngest.send({
        name: 'lead/captured',
        data: {
          leadId: lead.id,
          firstName: body.firstName,
          email: body.email,
          phone: body.phone,
          zip: body.zip,
          age: body.age,
          gender: body.gender,
          smokerStatus: body.smokerStatus,
          healthClass: body.healthClass,
          coverageAmount: body.coverageAmount,
          termLength: body.termLength,
          ratesShown: JSON.stringify(body.ratesShown),
        },
      });
    } catch (e) {
      console.error('Inngest event failed:', e);
    }

    return NextResponse.json({ id: lead.id, success: true });
  } catch (error) {
    console.error('Lead creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save lead', detail: message }, { status: 500 });
  }
}
