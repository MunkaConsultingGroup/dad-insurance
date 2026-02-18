import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { LeadData } from '@/lib/types';

const prisma = new PrismaClient();

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
      },
    });

    // Fire webhook if configured
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id, ...body }),
        });
        await prisma.lead.update({
          where: { id: lead.id },
          data: { webhookSent: true, webhookSentAt: new Date() },
        });
      } catch {
        console.error('Webhook delivery failed');
      }
    }

    return NextResponse.json({ id: lead.id, success: true });
  } catch (error) {
    console.error('Lead creation failed:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}
