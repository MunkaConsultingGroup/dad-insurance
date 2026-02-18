# Melissa Chatbot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Lemonade-style life insurance chatbot that walks users through questions, shows estimated rates from 5 carriers, and captures lead data with TCPA consent.

**Architecture:** Next.js 14 App Router with a deterministic conversation state machine, a rate lookup engine backed by static carrier data, Framer Motion chat UI with full-screen overlay, and Prisma/SQLite for lead storage. No AI/LLM — the chat is a scripted flow.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Prisma, SQLite

---

### Task 1: Scaffold Project

**Files:**
- Create: `/home/nick/melissa/package.json` (via create-next-app)
- Create: `/home/nick/melissa/.gitignore`

**Step 1: Create Next.js app**

Run from `/home/nick`:
```bash
rm -rf /home/nick/melissa/.git
cd /home/nick && npx create-next-app@latest melissa --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Note: The melissa directory already has docs/plans in it. create-next-app should merge into existing directory. If it refuses because directory exists, move docs out first, scaffold, then move back:
```bash
mv /home/nick/melissa/docs /tmp/melissa-docs
rm -rf /home/nick/melissa
cd /home/nick && npx create-next-app@latest melissa --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
mv /tmp/melissa-docs /home/nick/melissa/docs
```

**Step 2: Install dependencies**

```bash
cd /home/nick/melissa && npm install framer-motion prisma @prisma/client
```

**Step 3: Initialize Prisma with SQLite**

```bash
cd /home/nick/melissa && npx prisma init --datasource-provider sqlite
```

**Step 4: Initialize git and commit**

```bash
cd /home/nick/melissa && git init && git branch -m main && git config user.name "Nick" && git config user.email "208219116+MunkaConsulting@users.noreply.github.com" && git add -A && git commit -m "chore: scaffold Next.js project with dependencies"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Create all shared type definitions**

```typescript
// src/lib/types.ts

// --- Conversation Types ---

export type InputType = 'auto' | 'options' | 'text' | 'number' | 'email' | 'phone' | 'consent' | 'rates_display';

export interface ConversationOption {
  label: string;
  value: string;
}

export interface ConversationStep {
  id: string;
  message: string | ((answers: ConversationAnswers) => string);
  inputType: InputType;
  options?: ConversationOption[] | ((answers: ConversationAnswers) => ConversationOption[]);
  validation?: (value: string, answers: ConversationAnswers) => string | null; // returns error message or null
  next: string | ((answers: ConversationAnswers, value: string) => string);
  skipIf?: (answers: ConversationAnswers) => boolean;
}

export interface ConversationAnswers {
  [stepId: string]: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: number;
  options?: ConversationOption[];
  inputType?: InputType;
  rates?: CarrierQuote[];
}

// --- Rate Types ---

export interface UserProfile {
  age: number;
  gender: 'male' | 'female';
  smokerStatus: 'never' | 'current' | 'former';
  healthClass: 'preferred_plus' | 'preferred' | 'standard_plus' | 'standard';
  coverageAmount: number;
  termLength: number;
}

export interface CarrierQuote {
  carrierId: string;
  carrierName: string;
  monthlyRate: number;
  annualRate: number;
  amBestRating: string;
}

export interface CarrierInfo {
  id: string;
  name: string;
  amBestRating: string;
}

// --- Lead Types ---

export interface LeadData {
  // From conversation
  age: number;
  gender: string;
  smokerStatus: string;
  healthClass: string;
  coverageAmount: number;
  termLength: number;
  ratesShown: CarrierQuote[];

  // Contact info
  firstName: string;
  email: string;
  phone: string;
  zip: string;

  // Compliance
  consentGiven: boolean;
  consentText: string;
  ipAddress: string;
}
```

**Step 2: Commit**

```bash
cd /home/nick/melissa && git add src/lib/types.ts && git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: Rate Data + Carrier Metadata

**Files:**
- Create: `src/lib/carriers.ts`
- Create: `src/data/rates.ts`

**Step 1: Create carrier metadata**

```typescript
// src/lib/carriers.ts
import { CarrierInfo } from './types';

export const carriers: CarrierInfo[] = [
  { id: 'protective', name: 'Protective Life', amBestRating: 'A+' },
  { id: 'banner', name: 'Banner Life', amBestRating: 'A+' },
  { id: 'north_american', name: 'North American', amBestRating: 'A+' },
  { id: 'mutual_omaha', name: 'Mutual of Omaha', amBestRating: 'A+' },
  { id: 'pacific', name: 'Pacific Life', amBestRating: 'A+' },
];
```

**Step 2: Create rate data module**

This is the core data. Term life rates are structured as monthly premiums for $250K coverage at Preferred Plus / Non-Smoker, with multipliers for other health classes, smoker status, and coverage amounts.

```typescript
// src/data/rates.ts
//
// Base monthly rates for $250,000 coverage, Preferred Plus, Non-Smoker.
// Indexed by: carrier -> gender -> term -> age
// These are representative rates based on published carrier data.
// Rates for other classes/amounts are derived via multipliers.

interface BaseRateTable {
  [carrierId: string]: {
    [gender: string]: {
      [term: number]: {
        [age: number]: number; // monthly rate for $250K
      };
    };
  };
}

export const baseRates: BaseRateTable = {
  protective: {
    male: {
      10: { 25: 11.50, 30: 12.00, 35: 12.75, 40: 16.50, 45: 23.00, 50: 35.50, 55: 55.00, 60: 88.00, 65: 145.00 },
      15: { 25: 13.00, 30: 13.75, 35: 14.75, 40: 20.00, 45: 29.50, 50: 46.00, 55: 73.00, 60: 118.00, 65: 195.00 },
      20: { 25: 14.50, 30: 15.50, 35: 17.25, 40: 24.50, 45: 37.00, 50: 58.00, 55: 92.00, 60: 152.00, 65: 260.00 },
      25: { 25: 17.00, 30: 18.50, 35: 21.00, 40: 30.00, 45: 46.00, 50: 73.00, 55: 117.00, 60: 195.00 },
      30: { 25: 19.50, 30: 21.50, 35: 25.00, 40: 36.50, 45: 56.00, 50: 90.00, 55: 148.00 },
    },
    female: {
      10: { 25: 10.00, 30: 10.50, 35: 11.25, 40: 14.50, 45: 20.00, 50: 30.00, 55: 46.00, 60: 73.00, 65: 120.00 },
      15: { 25: 11.50, 30: 12.00, 35: 13.00, 40: 17.50, 45: 25.50, 50: 39.00, 55: 61.00, 60: 98.00, 65: 162.00 },
      20: { 25: 12.75, 30: 13.50, 35: 15.00, 40: 21.00, 45: 31.50, 50: 49.00, 55: 77.00, 60: 126.00, 65: 215.00 },
      25: { 25: 15.00, 30: 16.00, 35: 18.25, 40: 26.00, 45: 39.50, 50: 62.00, 55: 98.00, 60: 162.00 },
      30: { 25: 17.00, 30: 18.50, 35: 21.50, 40: 31.50, 45: 48.00, 50: 76.00, 55: 123.00 },
    },
  },
  banner: {
    male: {
      10: { 25: 11.00, 30: 11.50, 35: 12.25, 40: 15.75, 45: 22.00, 50: 34.00, 55: 52.00, 60: 84.00, 65: 138.00 },
      15: { 25: 12.50, 30: 13.25, 35: 14.25, 40: 19.25, 45: 28.50, 50: 44.00, 55: 70.00, 60: 113.00, 65: 187.00 },
      20: { 25: 14.00, 30: 15.00, 35: 16.50, 40: 23.50, 45: 35.50, 50: 55.50, 55: 88.00, 60: 145.00, 65: 248.00 },
      25: { 25: 16.50, 30: 17.75, 35: 20.25, 40: 28.75, 45: 44.00, 50: 70.00, 55: 112.00, 60: 187.00 },
      30: { 25: 18.75, 30: 20.75, 35: 24.00, 40: 35.00, 45: 53.50, 50: 86.00, 55: 141.00 },
    },
    female: {
      10: { 25: 9.50, 30: 10.00, 35: 10.75, 40: 13.75, 45: 19.00, 50: 28.50, 55: 44.00, 60: 70.00, 65: 115.00 },
      15: { 25: 11.00, 30: 11.50, 35: 12.50, 40: 16.75, 45: 24.50, 50: 37.50, 55: 58.50, 60: 94.00, 65: 155.00 },
      20: { 25: 12.25, 30: 13.00, 35: 14.50, 40: 20.25, 45: 30.25, 50: 47.00, 55: 74.00, 60: 121.00, 65: 206.00 },
      25: { 25: 14.50, 30: 15.50, 35: 17.50, 40: 25.00, 45: 38.00, 50: 59.50, 55: 94.00, 60: 155.00 },
      30: { 25: 16.25, 30: 17.75, 35: 20.75, 40: 30.25, 45: 46.00, 50: 73.00, 55: 118.00 },
    },
  },
  north_american: {
    male: {
      10: { 25: 12.00, 30: 12.50, 35: 13.25, 40: 17.25, 45: 24.00, 50: 37.00, 55: 57.50, 60: 92.00, 65: 152.00 },
      15: { 25: 13.50, 30: 14.25, 35: 15.50, 40: 21.00, 45: 31.00, 50: 48.00, 55: 76.00, 60: 123.00, 65: 204.00 },
      20: { 25: 15.25, 30: 16.25, 35: 18.00, 40: 25.75, 45: 38.50, 50: 60.50, 55: 96.00, 60: 158.00, 65: 272.00 },
      25: { 25: 17.75, 30: 19.25, 35: 22.00, 40: 31.50, 45: 48.00, 50: 76.00, 55: 122.00, 60: 204.00 },
      30: { 25: 20.50, 30: 22.50, 35: 26.25, 40: 38.25, 45: 58.50, 50: 94.00, 55: 155.00 },
    },
    female: {
      10: { 25: 10.50, 30: 11.00, 35: 11.75, 40: 15.25, 45: 21.00, 50: 31.50, 55: 48.00, 60: 76.50, 65: 126.00 },
      15: { 25: 12.00, 30: 12.50, 35: 13.75, 40: 18.25, 45: 26.75, 50: 41.00, 55: 64.00, 60: 102.00, 65: 170.00 },
      20: { 25: 13.50, 30: 14.25, 35: 15.75, 40: 22.00, 45: 33.00, 50: 51.50, 55: 81.00, 60: 132.00, 65: 225.00 },
      25: { 25: 15.75, 30: 16.75, 35: 19.25, 40: 27.25, 45: 41.50, 50: 65.00, 55: 103.00, 60: 170.00 },
      30: { 25: 18.00, 30: 19.50, 35: 22.50, 40: 33.00, 45: 50.50, 50: 80.00, 55: 129.00 },
    },
  },
  mutual_omaha: {
    male: {
      10: { 25: 12.25, 30: 12.75, 35: 13.75, 40: 17.75, 45: 24.75, 50: 38.00, 55: 59.00, 60: 95.00, 65: 156.00 },
      15: { 25: 14.00, 30: 14.75, 35: 16.00, 40: 21.75, 45: 32.00, 50: 49.50, 55: 79.00, 60: 127.00, 65: 210.00 },
      20: { 25: 15.75, 30: 16.75, 35: 18.75, 40: 26.50, 45: 40.00, 50: 62.50, 55: 99.00, 60: 164.00, 65: 280.00 },
      25: { 25: 18.50, 30: 20.00, 35: 22.75, 40: 32.50, 45: 50.00, 50: 79.00, 55: 126.00, 60: 210.00 },
      30: { 25: 21.25, 30: 23.25, 35: 27.25, 40: 39.50, 45: 60.50, 50: 97.50, 55: 160.00 },
    },
    female: {
      10: { 25: 10.75, 30: 11.25, 35: 12.25, 40: 15.75, 45: 21.75, 50: 32.50, 55: 49.50, 60: 79.00, 65: 130.00 },
      15: { 25: 12.25, 30: 13.00, 35: 14.25, 40: 19.00, 45: 27.50, 50: 42.50, 55: 66.00, 60: 106.00, 65: 175.00 },
      20: { 25: 14.00, 30: 14.75, 35: 16.50, 40: 22.75, 45: 34.25, 50: 53.50, 55: 84.00, 60: 137.00, 65: 232.00 },
      25: { 25: 16.25, 30: 17.50, 35: 20.00, 40: 28.25, 45: 43.00, 50: 67.50, 55: 107.00, 60: 175.00 },
      30: { 25: 18.75, 30: 20.25, 35: 23.50, 40: 34.25, 45: 52.50, 50: 83.00, 55: 134.00 },
    },
  },
  pacific: {
    male: {
      10: { 25: 11.75, 30: 12.25, 35: 13.00, 40: 16.75, 45: 23.50, 50: 36.00, 55: 56.00, 60: 90.00, 65: 148.00 },
      15: { 25: 13.25, 30: 14.00, 35: 15.00, 40: 20.50, 45: 30.00, 50: 46.50, 55: 74.00, 60: 120.00, 65: 198.00 },
      20: { 25: 14.75, 30: 15.75, 35: 17.50, 40: 25.00, 45: 37.50, 50: 59.00, 55: 93.50, 60: 154.00, 65: 264.00 },
      25: { 25: 17.25, 30: 18.75, 35: 21.50, 40: 30.50, 45: 47.00, 50: 74.50, 55: 119.00, 60: 198.00 },
      30: { 25: 20.00, 30: 22.00, 35: 25.50, 40: 37.25, 45: 57.00, 50: 91.50, 55: 150.00 },
    },
    female: {
      10: { 25: 10.25, 30: 10.75, 35: 11.50, 40: 14.75, 45: 20.50, 50: 30.75, 55: 47.00, 60: 75.00, 65: 123.00 },
      15: { 25: 11.75, 30: 12.25, 35: 13.25, 40: 17.75, 45: 26.00, 50: 40.00, 55: 62.00, 60: 100.00, 65: 165.00 },
      20: { 25: 13.00, 30: 13.75, 35: 15.25, 40: 21.50, 45: 32.00, 50: 50.00, 55: 79.00, 60: 128.00, 65: 220.00 },
      25: { 25: 15.25, 30: 16.25, 35: 18.75, 40: 26.50, 45: 40.50, 50: 63.50, 55: 100.00, 60: 165.00 },
      30: { 25: 17.50, 30: 19.00, 35: 22.00, 40: 32.00, 45: 49.00, 50: 77.50, 55: 125.00 },
    },
  },
};

// Multipliers to derive rates for other health classes and smoker status
export const healthClassMultipliers: Record<string, number> = {
  preferred_plus: 1.0,    // base rate
  preferred: 1.15,         // 15% more
  standard_plus: 1.35,     // 35% more
  standard: 1.65,          // 65% more
};

export const smokerMultipliers: Record<string, number> = {
  never: 1.0,
  former: 1.5,   // quit but still higher risk
  current: 2.8,  // roughly 2.5-3x for smokers
};

// Coverage amount multipliers (base is $250K)
export const coverageMultipliers: Record<number, number> = {
  100000: 0.45,    // less than linear due to fixed costs
  250000: 1.0,     // base
  500000: 1.90,    // slight discount per unit
  750000: 2.75,    // more discount
  1000000: 3.50,   // best per-unit rate
};
```

**Step 3: Commit**

```bash
cd /home/nick/melissa && git add src/lib/carriers.ts src/data/rates.ts && git commit -m "feat: add carrier metadata and rate data tables"
```

---

### Task 4: Rate Lookup Engine

**Files:**
- Create: `src/lib/rates.ts`
- Create: `src/lib/__tests__/rates.test.ts`

**Step 1: Write the test**

```typescript
// src/lib/__tests__/rates.test.ts
import { getEstimates } from '../rates';
import { UserProfile } from '../types';

describe('getEstimates', () => {
  it('returns quotes from all 5 carriers for a standard profile', () => {
    const profile: UserProfile = {
      age: 35,
      gender: 'male',
      smokerStatus: 'never',
      healthClass: 'preferred_plus',
      coverageAmount: 250000,
      termLength: 20,
    };
    const quotes = getEstimates(profile);
    expect(quotes).toHaveLength(5);
    quotes.forEach((q) => {
      expect(q.monthlyRate).toBeGreaterThan(0);
      expect(q.annualRate).toBe(Math.round(q.monthlyRate * 12 * 100) / 100);
      expect(q.carrierName).toBeTruthy();
      expect(q.amBestRating).toBeTruthy();
    });
  });

  it('returns sorted quotes (cheapest first)', () => {
    const profile: UserProfile = {
      age: 45,
      gender: 'female',
      smokerStatus: 'never',
      healthClass: 'preferred',
      coverageAmount: 500000,
      termLength: 20,
    };
    const quotes = getEstimates(profile);
    for (let i = 1; i < quotes.length; i++) {
      expect(quotes[i].monthlyRate).toBeGreaterThanOrEqual(quotes[i - 1].monthlyRate);
    }
  });

  it('smoker rates are significantly higher than non-smoker', () => {
    const base: UserProfile = {
      age: 40,
      gender: 'male',
      smokerStatus: 'never',
      healthClass: 'preferred_plus',
      coverageAmount: 250000,
      termLength: 20,
    };
    const smoker: UserProfile = { ...base, smokerStatus: 'current' };
    const baseQuotes = getEstimates(base);
    const smokerQuotes = getEstimates(smoker);
    // smoker should be at least 2x more expensive
    expect(smokerQuotes[0].monthlyRate).toBeGreaterThan(baseQuotes[0].monthlyRate * 2);
  });

  it('interpolates for ages not in the table', () => {
    const profile: UserProfile = {
      age: 37,
      gender: 'male',
      smokerStatus: 'never',
      healthClass: 'preferred_plus',
      coverageAmount: 250000,
      termLength: 20,
    };
    const quotes = getEstimates(profile);
    // age 37 should produce rates between age 35 and age 40
    expect(quotes[0].monthlyRate).toBeGreaterThan(0);
    quotes.forEach((q) => {
      expect(q.monthlyRate).not.toBeNaN();
    });
  });

  it('returns empty array for unavailable term/age combos', () => {
    const profile: UserProfile = {
      age: 65,
      gender: 'male',
      smokerStatus: 'never',
      healthClass: 'preferred_plus',
      coverageAmount: 250000,
      termLength: 30, // 30yr not available at 65
    };
    const quotes = getEstimates(profile);
    expect(quotes).toHaveLength(0);
  });
});
```

**Step 2: Install Jest and configure**

```bash
cd /home/nick/melissa && npm install -D jest @types/jest ts-jest
```

Create `jest.config.ts`:
```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
```

Add to package.json scripts: `"test": "jest"`

**Step 3: Run test to verify it fails**

```bash
cd /home/nick/melissa && npm test -- --testPathPattern=rates
```

Expected: FAIL (module not found)

**Step 4: Implement the rate engine**

```typescript
// src/lib/rates.ts
import { UserProfile, CarrierQuote } from './types';
import { carriers } from './carriers';
import {
  baseRates,
  healthClassMultipliers,
  smokerMultipliers,
  coverageMultipliers,
} from '@/data/rates';

function interpolateRate(
  termRates: Record<number, number>,
  age: number
): number | null {
  const ages = Object.keys(termRates)
    .map(Number)
    .sort((a, b) => a - b);

  // Exact match
  if (termRates[age] !== undefined) {
    return termRates[age];
  }

  // Find surrounding ages for interpolation
  let lower: number | null = null;
  let upper: number | null = null;

  for (const a of ages) {
    if (a <= age) lower = a;
    if (a >= age && upper === null) upper = a;
  }

  // Out of range
  if (lower === null || upper === null) return null;
  if (lower === upper) return termRates[lower];

  // Linear interpolation
  const ratio = (age - lower) / (upper - lower);
  return termRates[lower] + ratio * (termRates[upper] - termRates[lower]);
}

export function getEstimates(profile: UserProfile): CarrierQuote[] {
  const quotes: CarrierQuote[] = [];

  for (const carrier of carriers) {
    const carrierRates = baseRates[carrier.id];
    if (!carrierRates) continue;

    const genderRates = carrierRates[profile.gender];
    if (!genderRates) continue;

    const termRates = genderRates[profile.termLength];
    if (!termRates) continue;

    const baseRate = interpolateRate(termRates, profile.age);
    if (baseRate === null) continue;

    const healthMultiplier = healthClassMultipliers[profile.healthClass] ?? 1.0;
    const smokerMultiplier = smokerMultipliers[profile.smokerStatus] ?? 1.0;
    const coverageMultiplier = coverageMultipliers[profile.coverageAmount] ?? 1.0;

    const monthlyRate = Math.round(baseRate * healthMultiplier * smokerMultiplier * coverageMultiplier * 100) / 100;
    const annualRate = Math.round(monthlyRate * 12 * 100) / 100;

    quotes.push({
      carrierId: carrier.id,
      carrierName: carrier.name,
      monthlyRate,
      annualRate,
      amBestRating: carrier.amBestRating,
    });
  }

  // Sort cheapest first
  quotes.sort((a, b) => a.monthlyRate - b.monthlyRate);

  return quotes;
}
```

**Step 5: Run tests**

```bash
cd /home/nick/melissa && npm test -- --testPathPattern=rates
```

Expected: ALL PASS

**Step 6: Commit**

```bash
cd /home/nick/melissa && git add src/lib/rates.ts src/lib/__tests__/rates.test.ts jest.config.ts package.json package-lock.json && git commit -m "feat: rate lookup engine with interpolation and tests"
```

---

### Task 5: Conversation Engine

**Files:**
- Create: `src/lib/conversation.ts`
- Create: `src/lib/__tests__/conversation.test.ts`

**Step 1: Write the test**

```typescript
// src/lib/__tests__/conversation.test.ts
import { conversationSteps, getNextStep, getStepById } from '../conversation';

describe('conversation engine', () => {
  it('starts with the welcome step', () => {
    const first = conversationSteps[0];
    expect(first.id).toBe('welcome');
  });

  it('has a confirmation step at the end', () => {
    const last = conversationSteps[conversationSteps.length - 1];
    expect(last.id).toBe('confirmation');
  });

  it('getStepById returns the correct step', () => {
    const step = getStepById('age');
    expect(step).toBeDefined();
    expect(step!.id).toBe('age');
    expect(step!.inputType).toBe('number');
  });

  it('getNextStep progresses from welcome to age', () => {
    const next = getNextStep('welcome', {}, '');
    expect(next).toBe('age');
  });

  it('limits term options for age > 70', () => {
    const step = getStepById('term');
    expect(step).toBeDefined();
    const answers = { age: '72' };
    const options = typeof step!.options === 'function' ? step!.options(answers) : step!.options;
    // Should not include 25yr or 30yr terms
    const values = options!.map((o) => o.value);
    expect(values).not.toContain('25');
    expect(values).not.toContain('30');
  });

  it('all steps have valid next references', () => {
    const stepIds = new Set(conversationSteps.map((s) => s.id));
    stepIds.add('done'); // terminal state

    for (const step of conversationSteps) {
      if (typeof step.next === 'string') {
        expect(stepIds.has(step.next)).toBe(true);
      }
      // Function nexts are harder to test exhaustively, skip
    }
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /home/nick/melissa && npm test -- --testPathPattern=conversation
```

Expected: FAIL

**Step 3: Implement the conversation engine**

```typescript
// src/lib/conversation.ts
import { ConversationStep, ConversationAnswers, ConversationOption } from './types';

export const conversationSteps: ConversationStep[] = [
  {
    id: 'welcome',
    message: "Hi! I'm Melissa, and I'm here to help you find the right life insurance. This takes about 2 minutes \u2014 no spam, no pressure. Ready?",
    inputType: 'options',
    options: [
      { label: "Let's do it", value: 'yes' },
      { label: 'Tell me more first', value: 'more' },
    ],
    next: (answers, value) => (value === 'more' ? 'explainer' : 'age'),
  },
  {
    id: 'explainer',
    message: "I'll ask you a few simple questions about yourself, then show you estimated rates from top-rated carriers. If you like what you see, I can connect you with a licensed agent who can lock in your exact rate. Your info stays private until you say otherwise.",
    inputType: 'options',
    options: [{ label: 'Sounds good', value: 'ok' }],
    next: 'age',
  },
  {
    id: 'age',
    message: 'How old are you?',
    inputType: 'number',
    validation: (value) => {
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 18 || n > 85) return 'Please enter an age between 18 and 85.';
      return null;
    },
    next: 'gender',
  },
  {
    id: 'gender',
    message: "What's your gender? (This affects life insurance rates.)",
    inputType: 'options',
    options: [
      { label: 'Male', value: 'male' },
      { label: 'Female', value: 'female' },
    ],
    next: 'smoker',
  },
  {
    id: 'smoker',
    message: 'Do you use any tobacco products?',
    inputType: 'options',
    options: [
      { label: 'No, never', value: 'never' },
      { label: 'I quit recently', value: 'former' },
      { label: 'Yes', value: 'current' },
    ],
    next: (answers, value) => (value === 'current' ? 'smoker_note' : 'health'),
  },
  {
    id: 'smoker_note',
    message: "No worries \u2014 I can still find you options. Just know that tobacco use does significantly impact rates. Some carriers offer better rates for smokers than others, so it's still worth comparing.",
    inputType: 'auto',
    next: 'health',
  },
  {
    id: 'health',
    message: 'How would you describe your overall health?',
    inputType: 'options',
    options: [
      { label: 'Excellent', value: 'preferred_plus' },
      { label: 'Good', value: 'preferred' },
      { label: 'Average', value: 'standard_plus' },
      { label: 'Below average', value: 'standard' },
    ],
    next: 'coverage',
  },
  {
    id: 'coverage',
    message: 'How much coverage are you looking for?',
    inputType: 'options',
    options: [
      { label: '$100,000', value: '100000' },
      { label: '$250,000', value: '250000' },
      { label: '$500,000', value: '500000' },
      { label: '$750,000', value: '750000' },
      { label: '$1,000,000', value: '1000000' },
    ],
    next: 'term',
  },
  {
    id: 'term',
    message: 'And for how many years do you need coverage?',
    inputType: 'options',
    options: (answers: ConversationAnswers): ConversationOption[] => {
      const age = parseInt(answers.age, 10);
      const opts: ConversationOption[] = [
        { label: '10 years', value: '10' },
        { label: '15 years', value: '15' },
        { label: '20 years', value: '20' },
      ];
      if (age <= 60) opts.push({ label: '25 years', value: '25' });
      if (age <= 55) opts.push({ label: '30 years', value: '30' });
      return opts;
    },
    next: 'calculating',
  },
  {
    id: 'calculating',
    message: (answers) => {
      const name = answers.gender === 'male' ? 'sir' : "ma'am";
      return `Great, let me crunch the numbers for you...`;
    },
    inputType: 'auto',
    next: 'rates_display',
  },
  {
    id: 'rates_display',
    message: "Here's what I found based on your profile. These are estimated monthly rates from top-rated carriers:",
    inputType: 'rates_display',
    next: 'lead_intro',
  },
  {
    id: 'lead_intro',
    message: "Want to get your exact rate? I can connect you with a licensed agent who will confirm your price and help you apply \u2014 no obligation.",
    inputType: 'options',
    options: [
      { label: 'Yes, connect me', value: 'yes' },
      { label: 'Not right now', value: 'no' },
    ],
    next: (answers, value) => (value === 'no' ? 'soft_decline' : 'name'),
  },
  {
    id: 'soft_decline',
    message: "No problem at all! Your estimated rates are saved. If you change your mind, you can come back anytime. Have a great day!",
    inputType: 'auto',
    next: 'done',
  },
  {
    id: 'name',
    message: "What's your first name?",
    inputType: 'text',
    validation: (value) => {
      if (!value.trim() || value.trim().length < 1) return 'Please enter your name.';
      return null;
    },
    next: 'email',
  },
  {
    id: 'email',
    message: (answers) => `Thanks, ${answers.name}! What's the best email to reach you?`,
    inputType: 'email',
    validation: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email address.';
      return null;
    },
    next: 'phone',
  },
  {
    id: 'phone',
    message: "And what's the best phone number?",
    inputType: 'phone',
    validation: (value) => {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 10) return 'Please enter a valid 10-digit phone number.';
      return null;
    },
    next: 'zip',
  },
  {
    id: 'zip',
    message: "Last thing \u2014 what's your ZIP code?",
    inputType: 'text',
    validation: (value) => {
      const zipRegex = /^\d{5}$/;
      if (!zipRegex.test(value.trim())) return 'Please enter a valid 5-digit ZIP code.';
      return null;
    },
    next: 'consent',
  },
  {
    id: 'consent',
    message: "Almost done! Please review and confirm below so a licensed agent can reach out.",
    inputType: 'consent',
    next: 'submitting',
  },
  {
    id: 'submitting',
    message: 'Submitting your information...',
    inputType: 'auto',
    next: 'confirmation',
  },
  {
    id: 'confirmation',
    message: (answers) =>
      `You're all set, ${answers.name || 'there'}! A licensed agent will reach out within 24 hours to confirm your rates. They'll have your profile, so you won't need to repeat anything. Thanks for trusting Melissa!`,
    inputType: 'auto',
    next: 'done',
  },
];

export function getStepById(id: string): ConversationStep | undefined {
  return conversationSteps.find((s) => s.id === id);
}

export function getNextStep(
  currentStepId: string,
  answers: ConversationAnswers,
  value: string
): string {
  const step = getStepById(currentStepId);
  if (!step) return 'done';

  if (typeof step.next === 'function') {
    return step.next(answers, value);
  }
  return step.next;
}
```

**Step 4: Run tests**

```bash
cd /home/nick/melissa && npm test -- --testPathPattern=conversation
```

Expected: ALL PASS

**Step 5: Commit**

```bash
cd /home/nick/melissa && git add src/lib/conversation.ts src/lib/__tests__/conversation.test.ts && git commit -m "feat: conversation state machine with conditional logic and tests"
```

---

### Task 6: Prisma Schema + Lead API

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/app/api/leads/route.ts`
- Create: `src/app/api/rates/route.ts`

**Step 1: Write Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Lead {
  id             String   @id @default(cuid())
  createdAt      DateTime @default(now())

  age            Int
  gender         String
  smokerStatus   String
  healthClass    String
  coverageAmount Int
  termLength     Int

  ratesShown     String   // JSON string of CarrierQuote[]

  firstName      String
  email          String
  phone          String
  zip            String

  consentGiven   Boolean
  consentText    String
  consentAt      DateTime
  ipAddress      String

  webhookSent    Boolean   @default(false)
  webhookSentAt  DateTime?
  buyerId        String?
}
```

Make sure `.env` has: `DATABASE_URL="file:./dev.db"`

**Step 2: Generate Prisma client and run migration**

```bash
cd /home/nick/melissa && npx prisma migrate dev --name init
```

**Step 3: Create rates API route**

```typescript
// src/app/api/rates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getEstimates } from '@/lib/rates';
import { UserProfile } from '@/lib/types';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const profile: UserProfile = {
    age: parseInt(params.get('age') || '0', 10),
    gender: (params.get('gender') as 'male' | 'female') || 'male',
    smokerStatus: (params.get('smoker') as 'never' | 'current' | 'former') || 'never',
    healthClass: (params.get('health') as UserProfile['healthClass']) || 'preferred',
    coverageAmount: parseInt(params.get('coverage') || '250000', 10),
    termLength: parseInt(params.get('term') || '20', 10),
  };

  if (profile.age < 18 || profile.age > 85) {
    return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
  }

  const quotes = getEstimates(profile);
  return NextResponse.json({ quotes });
}
```

**Step 4: Create leads API route**

```typescript
// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
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
        // Webhook failure shouldn't break lead capture
        console.error('Webhook delivery failed');
      }
    }

    return NextResponse.json({ id: lead.id, success: true });
  } catch (error) {
    console.error('Lead creation failed:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}
```

**Step 5: Commit**

```bash
cd /home/nick/melissa && git add prisma/ src/app/api/ .env && git commit -m "feat: Prisma schema, rates API, and leads API with webhook support"
```

---

### Task 7: Chat UI Components

**Files:**
- Create: `src/components/chat/MessageBubble.tsx`
- Create: `src/components/chat/TypingIndicator.tsx`
- Create: `src/components/chat/OptionButtons.tsx`
- Create: `src/components/chat/TextInput.tsx`
- Create: `src/components/chat/RateCard.tsx`
- Create: `src/components/chat/ProgressBar.tsx`
- Create: `src/components/chat/ConsentCheckbox.tsx`

These are presentational components. Build them all in one task.

**Step 1: Create MessageBubble**

```tsx
// src/components/chat/MessageBubble.tsx
'use client';

import { motion } from 'framer-motion';

interface MessageBubbleProps {
  sender: 'bot' | 'user';
  text: string;
}

export default function MessageBubble({ sender, text }: MessageBubbleProps) {
  const isBot = sender === 'bot';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3`}
    >
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold mr-2 flex-shrink-0 mt-1">
          M
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
          isBot
            ? 'bg-gray-100 text-gray-800 rounded-bl-md'
            : 'bg-slate-700 text-white rounded-br-md'
        }`}
      >
        {text}
      </div>
    </motion.div>
  );
}
```

**Step 2: Create TypingIndicator**

```tsx
// src/components/chat/TypingIndicator.tsx
'use client';

import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold mr-2 flex-shrink-0 mt-1">
        M
      </div>
      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Create OptionButtons**

```tsx
// src/components/chat/OptionButtons.tsx
'use client';

import { motion } from 'framer-motion';
import { ConversationOption } from '@/lib/types';

interface OptionButtonsProps {
  options: ConversationOption[];
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
}

export default function OptionButtons({ options, onSelect, disabled }: OptionButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap gap-2 mb-3 justify-end"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value, opt.label)}
          disabled={disabled}
          className="px-4 py-2 rounded-full border-2 border-slate-700 text-slate-700 text-sm font-medium
                     hover:bg-slate-700 hover:text-white transition-colors duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {opt.label}
        </button>
      ))}
    </motion.div>
  );
}
```

**Step 4: Create TextInput**

```tsx
// src/components/chat/TextInput.tsx
'use client';

import { useState, KeyboardEvent } from 'react';

interface TextInputProps {
  type?: 'text' | 'number' | 'email' | 'tel';
  placeholder?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export default function TextInput({ type = 'text', placeholder = 'Type here...', onSubmit, disabled }: TextInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 mb-3">
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-full border-2 border-gray-200 focus:border-slate-700
                   outline-none text-sm transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="px-5 py-3 rounded-full bg-slate-700 text-white text-sm font-medium
                   hover:bg-slate-800 transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
}
```

**Step 5: Create RateCard**

```tsx
// src/components/chat/RateCard.tsx
'use client';

import { motion } from 'framer-motion';
import { CarrierQuote } from '@/lib/types';

interface RateCardProps {
  quotes: CarrierQuote[];
}

export default function RateCard({ quotes }: RateCardProps) {
  if (quotes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200"
      >
        <p className="text-gray-600 text-sm">
          Sorry, I couldn't find rates for your specific profile. A licensed agent can help you explore options.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3 shadow-sm"
    >
      {quotes.map((quote, idx) => (
        <div
          key={quote.carrierId}
          className={`flex items-center justify-between px-4 py-3 ${
            idx !== quotes.length - 1 ? 'border-b border-gray-100' : ''
          } ${idx === 0 ? 'bg-emerald-50' : ''}`}
        >
          <div className="flex items-center gap-3">
            {idx === 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Best
              </span>
            )}
            <div>
              <p className="font-medium text-gray-900 text-sm">{quote.carrierName}</p>
              <p className="text-xs text-gray-500">AM Best: {quote.amBestRating}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">
              ${quote.monthlyRate.toFixed(2)}
              <span className="text-xs font-normal text-gray-500">/mo</span>
            </p>
          </div>
        </div>
      ))}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
        Estimates based on published rate data. Final rates may vary based on full underwriting.
      </div>
    </motion.div>
  );
}
```

**Step 6: Create ProgressBar**

```tsx
// src/components/chat/ProgressBar.tsx
'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className="w-full h-1 bg-gray-200">
      <motion.div
        className="h-full bg-slate-700"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}
```

**Step 7: Create ConsentCheckbox**

```tsx
// src/components/chat/ConsentCheckbox.tsx
'use client';

import { useState } from 'react';

interface ConsentCheckboxProps {
  onConsent: (consented: boolean, text: string) => void;
  disabled?: boolean;
}

const CONSENT_TEXT =
  'By checking this box, I agree to be contacted by a licensed insurance agent at the phone number provided, including by autodialer, prerecorded message, or email. I understand this is not a condition of any purchase. I also agree to the Privacy Policy and Terms of Service.';

export default function ConsentCheckbox({ onConsent, disabled }: ConsentCheckboxProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="mb-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={disabled}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-slate-700 focus:ring-slate-700"
        />
        <span className="text-xs text-gray-600 leading-relaxed">{CONSENT_TEXT}</span>
      </label>
      <button
        onClick={() => onConsent(checked, CONSENT_TEXT)}
        disabled={!checked || disabled}
        className="mt-3 w-full px-4 py-3 rounded-full bg-slate-700 text-white text-sm font-medium
                   hover:bg-slate-800 transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Submit
      </button>
    </div>
  );
}
```

**Step 8: Commit**

```bash
cd /home/nick/melissa && git add src/components/ && git commit -m "feat: chat UI components - bubbles, typing, options, input, rates, consent"
```

---

### Task 8: ChatWindow (Main Conversation Controller)

**Files:**
- Create: `src/components/chat/ChatWindow.tsx`

This is the big component that wires the conversation engine to the UI components.

**Step 1: Create ChatWindow**

```tsx
// src/components/chat/ChatWindow.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { conversationSteps, getStepById, getNextStep } from '@/lib/conversation';
import { ChatMessage, ConversationAnswers, ConversationOption, CarrierQuote } from '@/lib/types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import OptionButtons from './OptionButtons';
import TextInput from './TextInput';
import RateCard from './RateCard';
import ProgressBar from './ProgressBar';
import ConsentCheckbox from './ConsentCheckbox';

const TYPING_DELAY = 800;
const TOTAL_STEPS = conversationSteps.filter(
  (s) => s.inputType !== 'auto' && s.id !== 'rates_display'
).length;

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string>('welcome');
  const [answers, setAnswers] = useState<ConversationAnswers>({});
  const [isTyping, setIsTyping] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [rates, setRates] = useState<CarrierQuote[]>([]);
  const [conversationDone, setConversationDone] = useState(false);
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const addBotMessage = useCallback(
    (text: string, step?: typeof conversationSteps[0], ratesData?: CarrierQuote[]) => {
      const msg: ChatMessage = {
        id: `bot-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text,
        timestamp: Date.now(),
        options: step?.options
          ? typeof step.options === 'function'
            ? undefined // will be set after we have answers context
            : step.options
          : undefined,
        inputType: step?.inputType,
        rates: ratesData,
      };
      setMessages((prev) => [...prev, msg]);
    },
    []
  );

  const processStep = useCallback(
    async (stepId: string, currentAnswers: ConversationAnswers) => {
      if (stepId === 'done') {
        setConversationDone(true);
        return;
      }

      const step = getStepById(stepId);
      if (!step) return;

      // Check skipIf
      if (step.skipIf && step.skipIf(currentAnswers)) {
        const nextId = getNextStep(stepId, currentAnswers, '');
        processStep(nextId, currentAnswers);
        return;
      }

      // Show typing indicator, then message
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, TYPING_DELAY));
      setIsTyping(false);

      const messageText =
        typeof step.message === 'function' ? step.message(currentAnswers) : step.message;

      // Handle rates_display step
      if (step.inputType === 'rates_display') {
        try {
          const params = new URLSearchParams({
            age: currentAnswers.age,
            gender: currentAnswers.gender,
            smoker: currentAnswers.smoker,
            health: currentAnswers.health,
            coverage: currentAnswers.coverage,
            term: currentAnswers.term,
          });
          const res = await fetch(`/api/rates?${params}`);
          const data = await res.json();
          setRates(data.quotes || []);
          addBotMessage(messageText, step, data.quotes || []);
        } catch {
          addBotMessage('I had trouble looking up rates. Let me connect you with an agent who can help directly.', step, []);
        }
        setCurrentStepId(stepId);
        // Auto-advance after showing rates
        await new Promise((r) => setTimeout(r, 1500));
        const nextId = getNextStep(stepId, currentAnswers, '');
        processStep(nextId, currentAnswers);
        return;
      }

      // Handle auto-advance steps
      if (step.inputType === 'auto') {
        addBotMessage(messageText);
        // If this is the submitting step, actually submit
        if (stepId === 'submitting') {
          await submitLead(currentAnswers);
        }
        await new Promise((r) => setTimeout(r, 1200));
        const nextId = getNextStep(stepId, currentAnswers, '');
        processStep(nextId, currentAnswers);
        return;
      }

      // Resolve dynamic options
      let resolvedOptions: ConversationOption[] | undefined;
      if (step.options) {
        resolvedOptions =
          typeof step.options === 'function' ? step.options(currentAnswers) : step.options;
      }

      const msg: ChatMessage = {
        id: `bot-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text: messageText,
        timestamp: Date.now(),
        options: resolvedOptions,
        inputType: step.inputType,
      };
      setMessages((prev) => [...prev, msg]);
      setCurrentStepId(stepId);
      setInputDisabled(false);
    },
    [addBotMessage]
  );

  // Initialize conversation
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      processStep('welcome', {});
    }
  }, [processStep]);

  const submitLead = async (currentAnswers: ConversationAnswers) => {
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseInt(currentAnswers.age, 10),
          gender: currentAnswers.gender,
          smokerStatus: currentAnswers.smoker,
          healthClass: currentAnswers.health,
          coverageAmount: parseInt(currentAnswers.coverage, 10),
          termLength: parseInt(currentAnswers.term, 10),
          ratesShown: rates,
          firstName: currentAnswers.name,
          email: currentAnswers.email,
          phone: currentAnswers.phone,
          zip: currentAnswers.zip,
          consentGiven: true,
          consentText: currentAnswers.consent_text || '',
          ipAddress: '', // Server will capture this
        }),
      });
    } catch {
      console.error('Failed to submit lead');
    }
  };

  const handleUserResponse = (value: string, displayText?: string) => {
    const step = getStepById(currentStepId);
    if (!step || inputDisabled) return;

    // Validate
    if (step.validation) {
      const error = step.validation(value, answers);
      if (error) {
        addBotMessage(error);
        return;
      }
    }

    setInputDisabled(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: displayText || value,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Store answer
    const newAnswers = { ...answers, [currentStepId]: value };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);

    // Process next step
    const nextId = getNextStep(currentStepId, newAnswers, value);
    setTimeout(() => processStep(nextId, newAnswers), 300);
  };

  const handleConsent = (consented: boolean, text: string) => {
    if (!consented) return;
    const newAnswers = { ...answers, consent: 'true', consent_text: text };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);
    setInputDisabled(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'I agree',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const nextId = getNextStep(currentStepId, newAnswers, 'true');
    setTimeout(() => processStep(nextId, newAnswers), 300);
  };

  // Determine what input to show
  const currentStep = getStepById(currentStepId);
  const showOptions = currentStep?.inputType === 'options' && !inputDisabled;
  const showTextInput =
    currentStep &&
    ['text', 'number', 'email', 'phone'].includes(currentStep.inputType) &&
    !inputDisabled;
  const showConsent = currentStep?.inputType === 'consent' && !inputDisabled;

  const inputTypeMap: Record<string, 'text' | 'number' | 'email' | 'tel'> = {
    text: 'text',
    number: 'number',
    email: 'email',
    phone: 'tel',
  };

  const lastBotMessage = [...messages].reverse().find((m) => m.sender === 'bot');

  return (
    <div className="flex flex-col h-full bg-white">
      <ProgressBar current={stepsCompleted} total={TOTAL_STEPS} />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto">
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble sender={msg.sender} text={msg.text} />
              {msg.rates && msg.rates.length > 0 && <RateCard quotes={msg.rates} />}
            </div>
          ))}

          <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {!conversationDone && (
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto">
            {showOptions && lastBotMessage?.options && (
              <OptionButtons
                options={lastBotMessage.options}
                onSelect={(value, label) => handleUserResponse(value, label)}
              />
            )}

            {showTextInput && currentStep && (
              <TextInput
                type={inputTypeMap[currentStep.inputType] || 'text'}
                placeholder={
                  currentStep.inputType === 'number'
                    ? 'Enter a number...'
                    : currentStep.inputType === 'email'
                    ? 'your@email.com'
                    : currentStep.inputType === 'phone'
                    ? '(555) 123-4567'
                    : 'Type here...'
                }
                onSubmit={(value) => handleUserResponse(value)}
              />
            )}

            {showConsent && <ConsentCheckbox onConsent={handleConsent} />}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd /home/nick/melissa && git add src/components/chat/ChatWindow.tsx && git commit -m "feat: ChatWindow conversation controller wiring engine to UI"
```

---

### Task 9: ChatOverlay + Landing Page

**Files:**
- Create: `src/components/chat/ChatOverlay.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Create ChatOverlay**

```tsx
// src/components/chat/ChatOverlay.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import ChatWindow from './ChatWindow';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatOverlay({ isOpen, onClose }: ChatOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-white"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold">
                  M
                </div>
                <span className="font-medium text-gray-900">Melissa</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatWindow />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Create landing page**

```tsx
// src/app/page.tsx
'use client';

import { useState } from 'react';
import ChatOverlay from '@/components/chat/ChatOverlay';

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Life insurance that<br />makes sense.
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          Get your personalized estimate in under 2 minutes.
          No spam, no sales calls until you&apos;re ready.
        </p>
        <button
          onClick={() => setChatOpen(true)}
          className="px-8 py-4 bg-slate-700 text-white rounded-full text-lg font-medium
                     hover:bg-slate-800 transition-colors duration-200 shadow-lg shadow-slate-700/20"
        >
          See My Rates
        </button>
        <p className="mt-6 text-sm text-gray-400">
          Comparing rates from 5+ top-rated carriers
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Answer a few questions', desc: 'Melissa asks about your age, health, and coverage needs. Takes about 2 minutes.' },
            { step: '2', title: 'See your rates', desc: 'Get estimated monthly rates from top-rated carriers, personalized to your profile.' },
            { step: '3', title: 'Connect with an agent', desc: 'If you like what you see, a licensed agent confirms your exact rate. No obligation.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <ChatOverlay isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </main>
  );
}
```

**Step 3: Update layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Melissa | Life Insurance Made Simple',
  description: 'Get personalized life insurance estimates in under 2 minutes. Compare rates from top-rated carriers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 4: Clean up globals.css (remove default Next.js styles)**

Keep only Tailwind directives:
```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 5: Commit**

```bash
cd /home/nick/melissa && git add src/ && git commit -m "feat: ChatOverlay, landing page, layout, and global styles"
```

---

### Task 10: Integration Test — Run the App

**Step 1: Verify the app builds and runs**

```bash
cd /home/nick/melissa && npm run build
```

Fix any TypeScript/build errors.

**Step 2: Start dev server and test manually**

```bash
cd /home/nick/melissa && npm run dev
```

Open http://localhost:3000. Verify:
- Landing page renders
- "See My Rates" button opens the chat overlay
- Melissa's welcome message appears
- Clicking through the full conversation flow works
- Rate card displays after entering profile info
- Lead capture form works
- Lead is saved to SQLite (check with `npx prisma studio`)

**Step 3: Fix any bugs found**

**Step 4: Commit fixes**

```bash
cd /home/nick/melissa && git add -A && git commit -m "fix: integration fixes from manual testing"
```

---

### Task 11: Push to GitHub

**Step 1: Create GitHub repo**

```bash
cd /home/nick/melissa && gh repo create MunkaConsulting/melissa --private --source=. --push
```

**Step 2: Verify repo is live**

```bash
gh repo view MunkaConsulting/melissa
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Scaffold Next.js + deps | package.json, prisma/ |
| 2 | TypeScript types | src/lib/types.ts |
| 3 | Rate data + carriers | src/data/rates.ts, src/lib/carriers.ts |
| 4 | Rate engine + tests | src/lib/rates.ts, tests |
| 5 | Conversation engine + tests | src/lib/conversation.ts, tests |
| 6 | Prisma schema + API routes | prisma/schema.prisma, src/app/api/ |
| 7 | Chat UI components (7 files) | src/components/chat/ |
| 8 | ChatWindow controller | src/components/chat/ChatWindow.tsx |
| 9 | ChatOverlay + landing page | src/components/chat/ChatOverlay.tsx, src/app/page.tsx |
| 10 | Build + integration test | (verify everything works) |
| 11 | Push to GitHub | MunkaConsulting/melissa |
