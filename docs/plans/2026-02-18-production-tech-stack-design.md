# Melissa Production Tech Stack Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Melissa from SQLite dev setup to a production-ready serverless stack on Vercel with reliable lead delivery, ad tracking, and monitoring.

**Approved:** 2026-02-18

---

## Architecture Overview

```
User (Mobile) → Vercel (Next.js 16) → Neon PostgreSQL
                                     → Inngest (lead workflow orchestration)
                                       → Webhook to buyer (with retries)
                                       → Resend email to team
                                       → Slack notification
                                     → Sentry (error tracking)

Ad Platforms → GTM → Meta Pixel + CAPI (via Stape) + Google Ads tag + GA4
```

All infrastructure runs serverless. No servers, containers, or workers to manage.

---

## Stack Decisions

### Hosting: Vercel
- Next.js 16 App Router, already deployed
- Hobby or Pro plan ($0-$20/mo)
- All integrations via Vercel Marketplace for auto env var injection

### Database: Neon PostgreSQL (via Vercel Marketplace)
- **Why not Supabase:** Free tier auto-pauses after 7 days inactivity — dealbreaker for always-on lead gen. Pro plan is $25/mo vs Neon's $5/mo first paid tier.
- **Why not PlanetScale:** No free tier (removed March 2024), MySQL-based, $39/mo minimum.
- **Why not Turso:** Smaller ecosystem, less battle-tested Prisma support, lose PostgreSQL features (jsonb, full-text search).
- Scale-to-zero with ~200-500ms cold start
- 0.5 GB free storage, 100 compute-hours/month
- First-party Vercel integration, auto-injected connection strings
- Database branching for safe preview deploys
- **Migration from SQLite:** Change Prisma datasource to `postgresql`, swap adapter to `@prisma/adapter-neon`, run `prisma migrate dev`

### ORM: Prisma (already in use)
- Swap `@prisma/adapter-better-sqlite3` → `@prisma/adapter-neon` + `@neondatabase/serverless`
- Schema changes minimal (DateTime handling, json fields)

### Background Jobs: Inngest (via Vercel Marketplace)
- **Why not Trigger.dev:** Runs code on their infra (separate deployment concern). Inngest runs on your Vercel functions.
- **Why not QStash:** No workflow orchestration. Can't chain steps (enrich → webhook → email → update status).
- **Why not Vercel Cron:** Hobby plan limited to once/day, max 2 jobs, no retries.
- 100K free executions/month (we use ~1,500/month at 300 leads)
- Per-step retries — webhook failure doesn't re-trigger email or DB write
- Event-driven model: `inngest.send("lead/captured")` triggers the full workflow
- Code lives in the Next.js repo, no separate deployment

### Email: Resend (via Vercel Marketplace)
- **Why not SendGrid:** Dated API, free tier expires after 60 days.
- **Why not Postmark:** Only 100 emails/month free. Resend gives 3,000.
- React Email templates (type-safe, component-based)
- 3,000 emails/month free — covers us past 1,000 leads/month
- Use cases: team notification on new lead, optional lead confirmation, daily digest

### Monitoring: Sentry (free tier)
- 5K errors/month, 10K performance transactions
- 8-minute Next.js setup wizard
- Automatic error capture (server + client), source maps, Slack alerts
- **Skip:** LogRocket ($99/mo), Datadog — overkill at this scale

### Notifications: Slack (via Inngest webhook step)
- Incoming webhook in Slack workspace
- Inngest workflow step posts to Slack on each new lead
- No separate service needed

---

## Ad Tracking Stack

### Day 1 (total: ~$20/month)

| Tool | Cost | Purpose |
|------|------|---------|
| Google Tag Manager (client-side) | Free | Tag orchestration layer |
| Google Ads conversion tag + Enhanced Conversions | Free | Smart Bidding optimization toward real leads |
| Meta Pixel (client-side) | Free | Baseline Meta tracking |
| Meta Conversions API via Stape.io | ~$20/mo | Server-side tracking, recovers 20-30% lost conversions |
| GA4 | Free | Web analytics, Google Ads attribution |
| PostHog (free tier) | Free | Session recordings (5K/mo), event analytics (1M events/mo) |
| UTM parameters on all ads | Free | Per-lead attribution stored in database |

### Later (Month 2-3)
- Offline conversion imports (free) — feed "lead became policy" data back to Google/Meta
- Google Looker Studio dashboard (free) — consolidated reporting

### Skip Until $15K+/mo Ad Spend
- Hyros ($230-379/mo), RedTrack ($149-399/mo), Voluum ($199+/mo)
- A/B testing tools — need ~1,000 visitors/variant, not viable at our volume
- Full server-side GTM ($120-300/mo on Google Cloud)

---

## Cost Projection

| Stage | Monthly Cost | Trigger |
|-------|-------------|---------|
| Day 1 | ~$20/mo | Stape only |
| ~5K leads stored | +$5/mo | Neon Launch tier |
| ~1K leads/month | +$20/mo | Resend Pro |
| $15K+/mo ad spend | +$150-400/mo | Attribution tools |

At 300 leads/month: **~$20/month total.**

---

## What We Explicitly Do NOT Add

- Redis/Upstash — no caching or rate limiting needed at 300 leads/month
- Kafka/RabbitMQ — Inngest is our event bus
- Retool/AdminJS — build simple Next.js admin pages with Prisma queries
- Supabase alongside Neon — one database, no overlap
- Self-hosted anything — managed services only at 2 people

---

## Lead Flow (Detailed)

1. User completes chatbot → POST `/api/leads`
2. API route saves lead to Neon via Prisma (with TCPA consent, IP, timestamp)
3. API route fires `inngest.send("lead/captured", { data: lead })`
4. Inngest function executes workflow:
   - **Step 1:** Enrich lead data (optional, future)
   - **Step 2:** POST webhook to buyer endpoint (auto-retries with backoff)
   - **Step 3:** Send email notification via Resend
   - **Step 4:** Post to Slack via incoming webhook
   - **Step 5:** Update lead status in Neon (`webhookSent`, `webhookSentAt`)
5. GTM fires conversion events to Meta CAPI (via Stape) + Google Ads + GA4

---

## UTM Storage Schema Addition

```sql
-- Add to Lead model
utmSource      String?
utmMedium      String?
utmCampaign    String?
utmContent     String?
utmTerm        String?
gclid          String?   -- Google Click ID for offline conversion imports
fbclid         String?   -- Facebook Click ID for CAPI matching
referrer       String?
landingPage    String?
```

These fields enable per-lead attribution and future offline conversion imports back to Google/Meta.
