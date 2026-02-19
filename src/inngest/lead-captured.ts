import { inngest } from '@/lib/inngest';
import { Resend } from 'resend';
import { NewLeadEmail } from '@/emails/new-lead';

// Event type for lead capture
export interface LeadCapturedEvent {
  name: 'lead/captured';
  data: {
    leadId: string;
    firstName: string;
    email: string;
    phone: string;
    zip: string;
    age: number;
    gender: string;
    smokerStatus: string;
    healthClass: string;
    coverageAmount: number;
    termLength: number;
    ratesShown: string; // JSON string
  };
}

export const leadCaptured = inngest.createFunction(
  { id: 'lead-captured', retries: 3 },
  { event: 'lead/captured' },
  async ({ event, step }) => {
    // Step 1: Deliver webhook to buyer
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      await step.run('deliver-webhook', async () => {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event.data),
        });
        if (!res.ok) {
          throw new Error(`Webhook failed: ${res.status} ${res.statusText}`);
        }
        return { status: res.status };
      });
    }

    // Step 2: Send email notification
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      await step.run('send-email-notification', async () => {
        const resend = new Resend(resendApiKey);
        const { error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Melissa <leads@updates.munka.dev>',
          to: process.env.EMAIL_TO?.split(',') || [],
          subject: `New Lead: ${event.data.firstName}, ${event.data.age}, ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(event.data.coverageAmount)}`,
          react: NewLeadEmail(event.data),
        });
        if (error) throw new Error(`Email failed: ${error.message}`);
      });
    }

    // Step 3: Send Slack notification
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      await step.run('send-slack-notification', async () => {
        const coverageFormatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(event.data.coverageAmount);

        const res = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🆕 New Lead: *${event.data.firstName}*`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: [
                    `*New Lead: ${event.data.firstName}*`,
                    `Age: ${event.data.age} | Gender: ${event.data.gender}`,
                    `Coverage: ${coverageFormatted} / ${event.data.termLength}yr term`,
                    `Health: ${event.data.healthClass} | Smoker: ${event.data.smokerStatus}`,
                    `Phone: ${event.data.phone} | Email: ${event.data.email}`,
                    `ZIP: ${event.data.zip}`,
                  ].join('\n'),
                },
              },
            ],
          }),
        });
        if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`);
      });
    }

    // Step 4: Update lead status
    await step.run('update-lead-status', async () => {
      const { prisma } = await import('@/lib/db');
      await prisma.lead.update({
        where: { id: event.data.leadId },
        data: { webhookSent: true, webhookSentAt: new Date() },
      });
    });

    return { success: true, leadId: event.data.leadId };
  }
);
