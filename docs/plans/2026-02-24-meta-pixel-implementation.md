# Meta Pixel + Conditional Firing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Meta Pixel with PageView/Lead/QualifiedLead events and a household income question to the Dad Insurance chatbot.

**Architecture:** Base pixel loads in layout.tsx via Next.js Script component. Lead and QualifiedLead events fire client-side from ChatWindow.tsx at form submission. QualifiedLead only fires when the lead meets premium/standard tier criteria (age 35-55, non-smoker, coverage $250K+, income $50K+). A new income question step is added to the conversation flow.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 7, TypeScript, Meta Pixel (fbq)

---

### Task 1: Add household income step to conversation flow

**Files:**
- Modify: `src/lib/conversation.ts:86-99` (insert after `coverage`, before `timing`)

**Step 1: Add the income step**

Insert this new step object in the `conversationSteps` array between the `coverage` step (which has `next: 'timing'`) and the `timing` step:

First, change the `coverage` step's `next` from `'timing'` to `'income'`:

```typescript
// In the coverage step, change:
next: 'timing',
// To:
next: 'income',
```

Then add the new step after `coverage`:

```typescript
{
  id: 'income',
  message: "What's your household income?",
  inputType: 'options',
  options: [
    { label: 'Under $30K', value: 'under_30k' },
    { label: '$30K - $50K', value: '30k_50k' },
    { label: '$50K - $75K', value: '50k_75k' },
    { label: '$75K - $100K', value: '75k_100k' },
    { label: 'Over $100K', value: 'over_100k' },
  ],
  next: 'timing',
},
```

**Step 2: Run tests**

Run: `npx jest src/lib/__tests__/conversation.test.ts -v`
Expected: Same 3 pre-existing failures (stale tests for `confirmation`, `term`, `welcome->age`). No NEW failures.

**Step 3: Commit**

```bash
git add src/lib/conversation.ts
git commit -m "feat: add household income question to chatbot flow"
```

---

### Task 2: Fix stale conversation tests + add income test

**Files:**
- Modify: `src/lib/__tests__/conversation.test.ts`

**Step 1: Rewrite the test file**

Replace the entire file with tests that match the current conversation structure:

```typescript
import { conversationSteps, getNextStep, getStepById } from '../conversation';

describe('conversation engine', () => {
  it('starts with the welcome step', () => {
    const first = conversationSteps[0];
    expect(first.id).toBe('welcome');
  });

  it('ends with the lock_in step', () => {
    const last = conversationSteps[conversationSteps.length - 1];
    expect(last.id).toBe('lock_in');
  });

  it('getStepById returns the correct step', () => {
    const step = getStepById('age');
    expect(step).toBeDefined();
    expect(step!.id).toBe('age');
    expect(step!.inputType).toBe('number');
  });

  it('getNextStep progresses from welcome to for_whom', () => {
    const next = getNextStep('welcome', {}, 'yes');
    expect(next).toBe('for_whom');
  });

  it('income step exists with 5 options after coverage', () => {
    const coverageStep = getStepById('coverage');
    expect(coverageStep).toBeDefined();
    expect(coverageStep!.next).toBe('income');

    const incomeStep = getStepById('income');
    expect(incomeStep).toBeDefined();
    expect(incomeStep!.inputType).toBe('options');
    const options = incomeStep!.options as { label: string; value: string }[];
    expect(options).toHaveLength(5);
    expect(options.map(o => o.value)).toEqual([
      'under_30k', '30k_50k', '50k_75k', '75k_100k', 'over_100k',
    ]);
  });

  it('income step flows to timing', () => {
    const next = getNextStep('income', {}, 'over_100k');
    expect(next).toBe('timing');
  });

  it('all steps have valid next references', () => {
    const stepIds = new Set(conversationSteps.map((s) => s.id));
    stepIds.add('done');

    for (const step of conversationSteps) {
      if (typeof step.next === 'string') {
        expect(stepIds.has(step.next)).toBe(true);
      }
    }
  });
});
```

**Step 2: Run tests**

Run: `npx jest src/lib/__tests__/conversation.test.ts -v`
Expected: ALL PASS (7 tests)

**Step 3: Commit**

```bash
git add src/lib/__tests__/conversation.test.ts
git commit -m "test: fix stale conversation tests, add income step tests"
```

---

### Task 3: Add householdIncome to types, schema, and API

**Files:**
- Modify: `src/lib/types.ts:82` (add field to LeadData)
- Modify: `prisma/schema.prisma:20` (add field to Lead model)
- Modify: `src/app/api/leads/route.ts:51-76` (store the field)

**Step 1: Add householdIncome to LeadData in types.ts**

In the `LeadData` interface, add after `termLength`:

```typescript
  householdIncome?: string;
```

**Step 2: Add householdIncome to Prisma schema**

In `prisma/schema.prisma`, add after the `termLength` line:

```prisma
  householdIncome String?
```

**Step 3: Add householdIncome to API route**

In `src/app/api/leads/route.ts`, in the `prisma.lead.create` data object, add after `termLength`:

```typescript
        householdIncome: body.householdIncome || null,
```

**Step 4: Generate Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client"

**Step 5: Run the full test suite**

Run: `npx jest -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/lib/types.ts prisma/schema.prisma src/app/api/leads/route.ts src/generated/
git commit -m "feat: add householdIncome field to schema, types, and API"
```

---

### Task 4: Pass income from ChatWindow to lead submission

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:213-247` (submitLead function)

**Step 1: Add householdIncome to the submitLead POST body**

In the `submitLead` function, add to the JSON body after `termLength: DEFAULT_TERM,`:

```typescript
          householdIncome: currentAnswers.income || '',
```

**Step 2: Verify the build compiles**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds (or at least no TypeScript errors related to our changes)

**Step 3: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat: pass householdIncome from chatbot to lead API"
```

---

### Task 5: Add Meta Pixel base code to layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Add the Meta Pixel**

Add dns-prefetch for Facebook in the `<head>` (next to the existing Impact one):

```tsx
<link rel="dns-prefetch" href="https://connect.facebook.net" />
```

Add the noscript fallback image at the end of `<head>`:

```tsx
<noscript>
  <img
    height="1"
    width="1"
    style={{ display: 'none' }}
    src="https://www.facebook.com/tr?id=897943992763325&ev=PageView&noscript=1"
    alt=""
  />
</noscript>
```

Add the Meta Pixel Script component after the existing Impact script, before `</body>`:

```tsx
<Script
  id="meta-pixel"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','897943992763325');fbq('track','PageView');`,
  }}
/>
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add Meta Pixel base code with PageView tracking"
```

---

### Task 6: Add conditional Lead + QualifiedLead event firing

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:213-247` (submitLead function)

**Step 1: Add fbq type declaration**

At the top of `ChatWindow.tsx`, after the imports, add:

```typescript
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
```

**Step 2: Add pixel firing to submitLead**

In the `submitLead` function, after the successful fetch call (after the closing `});` of `await fetch('/api/leads', ...)`), add:

```typescript
      // Fire Meta Pixel events
      if (typeof window.fbq === 'function') {
        // Always fire Lead event for every submission
        window.fbq('track', 'Lead');

        // Fire QualifiedLead only for premium/standard tier leads
        const age = parseInt(currentAnswers.age, 10);
        const isQualifiedAge = age >= 35 && age <= 55;
        const isNonSmoker = currentAnswers.smoker === 'never' || currentAnswers.smoker === 'former';
        const hasHighCoverage = parseInt(currentAnswers.coverage, 10) >= 250000;
        const hasHighIncome = ['50k_75k', '75k_100k', 'over_100k'].includes(currentAnswers.income);

        if (isQualifiedAge && isNonSmoker && hasHighCoverage && hasHighIncome) {
          window.fbq('trackCustom', 'QualifiedLead');
        }
      }
```

**Step 3: Run full test suite**

Run: `npx jest -v`
Expected: ALL PASS

**Step 4: Verify build compiles**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat: fire Lead + conditional QualifiedLead Meta Pixel events"
```

---

### Task 7: Run Prisma migration

**Step 1: Create and apply migration**

Run: `npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema."

Note: Using `db push` instead of `migrate` since this is a simple additive change (nullable column). For production, Vercel will run `prisma generate` at build time and the schema change will apply.

**Step 2: Commit any generated changes**

```bash
git add prisma/ src/generated/
git commit -m "chore: sync prisma schema with database"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

Run: `npx jest -v`
Expected: ALL PASS

**Step 2: Run build**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds

**Step 3: Verify locally (manual check)**

Run: `npx next dev`

Open browser to localhost:3000, open DevTools console, verify:
- `fbq` is defined in window
- PageView event fired on load
- Walk through chatbot flow — income question appears after coverage
- On form submission, check Network tab for `facebook.com/tr` requests showing Lead event
- If answers qualify (age 35-55, non-smoker, coverage $250K+, income $50K+), QualifiedLead event also fires

**Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "feat: Meta Pixel with conditional QualifiedLead firing + income question

Adds Meta Pixel (897943992763325) to Dad Insurance with three events:
- PageView: fires on every page load
- Lead: fires on every form submission
- QualifiedLead: fires only for premium/standard tier leads
  (age 35-55, non-smoker, coverage $250K+, income $50K+)

Also adds household income question to chatbot flow after coverage,
matching the PPC course's recommended 7-step quiz funnel."
```
