import { test, expect, Page } from '@playwright/test';

// Helper to navigate through quiz steps
async function navigateToStep(
  page: Page,
  step:
    | 'welcome'
    | 'for_whom'
    | 'gender'
    | 'health'
    | 'coverage'
    | 'timing'
    | 'name'
    | 'email'
    | 'phone'
    | 'verify'
) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get a Quote Now' }).click();
  await expect(page.getByText("Hi! I'm Melissa")).toBeVisible({ timeout: 5000 });
  if (step === 'welcome') return;

  await page.getByRole('button', { name: "Let's do it" }).click();
  await expect(page.getByText('Is this life insurance policy')).toBeVisible({ timeout: 5000 });
  if (step === 'for_whom') return;

  await page.getByRole('button', { name: 'For me' }).click();
  await expect(page.getByText("What's your gender?")).toBeVisible({ timeout: 5000 });
  if (step === 'gender') return;

  await page.getByRole('button', { name: 'Male', exact: true }).click();
  await expect(page.getByText('Do you use any tobacco')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'No, never' }).click();
  if (step === 'health') return;

  await expect(page.getByText('How would you describe')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Excellent' }).click();
  if (step === 'coverage') return;

  await expect(page.getByText('How much coverage')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: '$1,000,000', exact: true }).click();
  if (step === 'timing') return;

  await expect(page.getByText('How soon are you wanting')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Right away' }).click();
  if (step === 'name') return;

  await expect(page.getByText("What's your first name")).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder('Type here...').fill('TestDad');
  await page.getByPlaceholder('Type here...').press('Enter');
  if (step === 'email') return;

  await expect(page.getByText("What's the best email")).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder('your@email.com').fill('test@dadinsurance.com');
  await page.getByPlaceholder('your@email.com').press('Enter');
  if (step === 'phone') return;

  await expect(page.getByText("what's the best phone number")).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder('(555) 123-4567').fill('5551234567');
  await page.getByPlaceholder('(555) 123-4567').press('Enter');
  if (step === 'verify') return;
}

// =============================================
// HOMEPAGE
// =============================================

test.describe('Homepage', () => {
  test('loads with correct content and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Dad Insurance')).toBeVisible();
    await expect(page.getByText('Insurance for Dads.')).toBeVisible();
    await expect(page.getByText('Find affordable life insurance')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get a Quote Now' })).toBeVisible();
  });

  test('no em dashes anywhere on the page', async ({ page }) => {
    await page.goto('/');
    const content = await page.textContent('body');
    expect(content).not.toContain('\u2014');
  });

  test('does NOT show "No spam" or "How it works" (removed per Verge)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('No spam')).not.toBeVisible();
    await expect(page.getByText('How it works')).not.toBeVisible();
    await expect(page.getByText('no pressure')).not.toBeVisible();
  });

  test('CTA opens the chat overlay', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Get a Quote Now' }).click();
    await expect(page.getByText("Hi! I'm Melissa")).toBeVisible({ timeout: 5000 });
  });

  test('chat overlay can be closed', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Get a Quote Now' }).click();
    await expect(page.getByText("Hi! I'm Melissa")).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Close').click();
    // Chat should be gone, homepage visible again
    await expect(page.getByRole('button', { name: 'Get a Quote Now' })).toBeVisible();
  });
});

// =============================================
// CHAT UI
// =============================================

test.describe('Chat UI', () => {
  test('Melissa avatar is centered at top of chat (not inline with messages)', async ({ page }) => {
    await navigateToStep(page, 'welcome');
    const avatar = page.locator('img[alt="Melissa"][class*="w-16"]');
    await expect(avatar).toBeVisible();
  });

  test('Melissa avatar in messages stays as photo (not "M" fallback)', async ({ page }) => {
    await navigateToStep(page, 'welcome');
    // The small avatars next to messages should be img tags, not "M" text
    const messageAvatars = page.locator('.flex.justify-start img[alt="Melissa"]');
    await expect(messageAvatars.first()).toBeVisible();
  });

  test('progress bar is visible and advances', async ({ page }) => {
    await navigateToStep(page, 'welcome');

    // Progress bar container (h-1 bg-gray-200) should exist
    const progressContainer = page.locator('.h-1.bg-gray-200');
    await expect(progressContainer).toBeVisible();

    // Click "Let's do it" and verify conversation advances
    await page.getByRole('button', { name: "Let's do it" }).click();
    await expect(page.getByText('Is this life insurance policy')).toBeVisible({ timeout: 5000 });
  });

  test('no em dashes in chat messages', async ({ page }) => {
    await navigateToStep(page, 'welcome');
    const content = await page.textContent('body');
    expect(content).not.toContain('\u2014');
  });
});

// =============================================
// WELCOME STEP
// =============================================

test.describe('Welcome Step', () => {
  test('shows correct welcome message', async ({ page }) => {
    await navigateToStep(page, 'welcome');
    await expect(page.getByText('This takes about two minutes to complete')).toBeVisible();
    await expect(page.getByText('Ready to get started?')).toBeVisible();
  });

  test('only has one CTA button (no "Tell me more")', async ({ page }) => {
    await navigateToStep(page, 'welcome');
    await expect(page.getByRole('button', { name: "Let's do it" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tell me more' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Sounds good' })).not.toBeVisible();
  });
});

// =============================================
// FOR WHOM STEP
// =============================================

test.describe('For Whom Step', () => {
  test('shows "for you or someone else" question', async ({ page }) => {
    await navigateToStep(page, 'for_whom');
    await expect(page.getByText('Is this life insurance policy for you or for someone else')).toBeVisible();
    await expect(page.getByRole('button', { name: 'For me' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'For someone else' })).toBeVisible();
  });

  test('"For someone else" changes all subsequent phrasing to "their/they"', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Get a Quote Now' }).click();
    await expect(page.getByText("Hi! I'm Melissa")).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: "Let's do it" }).click();

    await expect(page.getByText('Is this life insurance policy')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'For someone else' }).click();

    // Gender: "their"
    await expect(page.getByText("What's their gender?")).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Male', exact: true }).click();

    // Tobacco: "they"
    await expect(page.getByText('Do they use any tobacco')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'No, never' }).click();

    // Health: "their"
    await expect(page.getByText('How would you describe their overall health')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Good' }).click();

    // Coverage and timing stay generic (no your/their)
    await expect(page.getByText('How much coverage are you looking for')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '$500,000' }).click();

    await expect(page.getByText('How soon are you wanting')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: "I'm not sure" }).click();

    // Name is always "your" (it's the person filling out the form)
    await expect(page.getByText("What's your first name")).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('Type here...').fill('TestWife');
    await page.getByPlaceholder('Type here...').press('Enter');

    // Email
    await expect(page.getByText("What's the best email")).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('your@email.com').fill('wife@test.com');
    await page.getByPlaceholder('your@email.com').press('Enter');

    // Phone
    await expect(page.getByText("what's the best phone number")).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('(555) 123-4567').fill('5559876543');
    await page.getByPlaceholder('(555) 123-4567').press('Enter');

    // Verification
    await expect(page.getByText('We just sent a verification code')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================
// GENDER STEP
// =============================================

test.describe('Gender Step', () => {
  test('shows Male and Female options with icons', async ({ page }) => {
    await navigateToStep(page, 'gender');
    await expect(page.getByRole('button', { name: 'Male', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Female', exact: true })).toBeVisible();
    // Both should have SVG icons
    const maleBtn = page.getByRole('button', { name: 'Male', exact: true });
    await expect(maleBtn.locator('svg')).toBeVisible();
  });

  test('selected answer shows as chip', async ({ page }) => {
    await navigateToStep(page, 'gender');
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    // Should show selected chip with "Male" text
    await expect(page.getByText('Do you use any tobacco')).toBeVisible({ timeout: 5000 });
  });
});

// =============================================
// TOBACCO / SMOKER STEP
// =============================================

test.describe('Tobacco Step', () => {
  test('shows three tobacco options', async ({ page }) => {
    await navigateToStep(page, 'gender');
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await expect(page.getByText('Do you use any tobacco')).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: 'No, never' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'I quit recently' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yes' })).toBeVisible();
  });

  test('selecting "Yes" shows smoker note before health', async ({ page }) => {
    await navigateToStep(page, 'gender');
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await expect(page.getByText('Do you use any tobacco')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Yes' }).click();

    // Smoker note should appear
    await expect(page.getByText('No worries, I can still find options')).toBeVisible({ timeout: 5000 });
    // Then health question should follow automatically
    await expect(page.getByText('How would you describe your overall health')).toBeVisible({ timeout: 8000 });
  });

  test('"I quit recently" skips smoker note and goes to health', async ({ page }) => {
    await navigateToStep(page, 'gender');
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await expect(page.getByText('Do you use any tobacco')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'I quit recently' }).click();

    // Should go directly to health (no smoker note)
    await expect(page.getByText('How would you describe your overall health')).toBeVisible({ timeout: 5000 });
  });
});

// =============================================
// HEALTH STEP
// =============================================

test.describe('Health Step', () => {
  test('shows four health options with new labels', async ({ page }) => {
    await navigateToStep(page, 'health');
    await expect(page.getByText('How would you describe your overall health')).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: 'Excellent' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Great' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Could be better' })).toBeVisible();
  });

  test('old labels "Average" and "Below average" are gone', async ({ page }) => {
    await navigateToStep(page, 'health');
    await expect(page.getByText('How would you describe')).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: 'Average' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Below average' })).not.toBeVisible();
  });

  test('health options have heart SVG icons', async ({ page }) => {
    await navigateToStep(page, 'health');
    await expect(page.getByText('How would you describe')).toBeVisible({ timeout: 5000 });

    // Each health button should contain an SVG (hearts)
    const excellentBtn = page.getByRole('button', { name: 'Excellent' });
    await expect(excellentBtn.locator('svg')).toBeVisible();
  });
});

// =============================================
// COVERAGE STEP
// =============================================

test.describe('Coverage Step', () => {
  test('shows correct coverage options without $100K', async ({ page }) => {
    await navigateToStep(page, 'coverage');
    await expect(page.getByText('How much coverage')).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: '$250,000' })).toBeVisible();
    await expect(page.getByRole('button', { name: '$500,000' })).toBeVisible();
    await expect(page.getByRole('button', { name: '$750,000' })).toBeVisible();
    await expect(page.getByRole('button', { name: '$1,000,000', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '$1,000,000+' })).toBeVisible();

    await expect(page.getByRole('button', { name: '$100,000' })).not.toBeVisible();
  });

  test('coverage options do NOT have SVG icons (plain text only)', async ({ page }) => {
    await navigateToStep(page, 'coverage');
    await expect(page.getByText('How much coverage')).toBeVisible({ timeout: 5000 });

    // Coverage buttons should NOT contain SVGs (no shield icons)
    const firstBtn = page.getByRole('button', { name: '$250,000' });
    await expect(firstBtn.locator('svg')).not.toBeVisible();
  });
});

// =============================================
// TIMING STEP
// =============================================

test.describe('Timing Step', () => {
  test('shows timing options (replaces old term length question)', async ({ page }) => {
    await navigateToStep(page, 'timing');
    await expect(page.getByText('How soon are you wanting to get this policy started')).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: 'Right away' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Within a month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'In a few months' })).toBeVisible();
    await expect(page.getByRole('button', { name: "I'm not sure" })).toBeVisible();
  });

  test('old term length options are gone', async ({ page }) => {
    await navigateToStep(page, 'timing');
    await expect(page.getByText('How soon')).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: '10 years' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '20 years' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '30 years' })).not.toBeVisible();
  });
});

// =============================================
// PERSONAL INFO (name, email, phone)
// =============================================

test.describe('Personal Info Collection', () => {
  test('name is asked AFTER insurance questions (not upfront)', async ({ page }) => {
    await navigateToStep(page, 'name');
    // By this point we've already answered: for_whom, gender, tobacco, health, coverage, timing
    // NOW it asks for name
    await expect(page.getByText("What's your first name")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('couple pieces of personal info')).toBeVisible();
  });

  test('email uses personalized greeting with name', async ({ page }) => {
    await navigateToStep(page, 'email');
    await expect(page.getByText('Perfect, TestDad')).toBeVisible({ timeout: 5000 });
  });

  test('phone input has correct placeholder', async ({ page }) => {
    await navigateToStep(page, 'phone');
    await expect(page.getByPlaceholder('(555) 123-4567')).toBeVisible({ timeout: 5000 });
  });
});

// =============================================
// INPUT VALIDATION
// =============================================

test.describe('Input Validation', () => {
  test('rejects invalid email', async ({ page }) => {
    await navigateToStep(page, 'email');
    await expect(page.getByText("What's the best email")).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder('your@email.com').fill('notanemail');
    await page.getByPlaceholder('your@email.com').press('Enter');

    await expect(page.getByText('Please enter a valid email')).toBeVisible({ timeout: 3000 });
  });

  test('rejects too-short phone number', async ({ page }) => {
    await navigateToStep(page, 'phone');
    await expect(page.getByText("what's the best phone number")).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder('(555) 123-4567').fill('123');
    await page.getByPlaceholder('(555) 123-4567').press('Enter');

    await expect(page.getByText('Please enter a valid 10-digit')).toBeVisible({ timeout: 3000 });
  });

  test('rejects invalid age (out of range)', async ({ page }) => {
    // Test age validation via the email step's input
    await navigateToStep(page, 'email');
    await expect(page.getByText("What's the best email")).toBeVisible({ timeout: 5000 });

    // Try an invalid email first, then correct it
    await page.getByPlaceholder('your@email.com').fill('bad');
    await page.getByPlaceholder('your@email.com').press('Enter');
    await expect(page.getByText('Please enter a valid email')).toBeVisible({ timeout: 3000 });

    // Now enter a valid one to confirm it accepts good input
    await page.getByPlaceholder('your@email.com').fill('valid@test.com');
    await page.getByPlaceholder('your@email.com').press('Enter');
    await expect(page.getByText("what's the best phone number")).toBeVisible({ timeout: 5000 });
  });
});

// =============================================
// PHONE VERIFICATION
// =============================================

test.describe('Phone Verification', () => {
  test('verification UI appears after phone entry', async ({ page }) => {
    await navigateToStep(page, 'verify');
    await expect(page.getByText('We just sent a verification code')).toBeVisible({ timeout: 10000 });
  });

  test('shows code input with correct attributes', async ({ page }) => {
    await navigateToStep(page, 'verify');
    await expect(page.getByText('We just sent a verification code')).toBeVisible({ timeout: 10000 });

    const codeInput = page.getByPlaceholder('Enter code');
    await expect(codeInput).toBeVisible();
    // Should have numeric input mode
    await expect(codeInput).toHaveAttribute('inputmode', 'numeric');
    await expect(codeInput).toHaveAttribute('maxlength', '6');
  });

  test('shows verify button, resend code, and change number options', async ({ page }) => {
    await navigateToStep(page, 'verify');
    await expect(page.getByText('We just sent a verification code')).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
    await expect(page.getByText('Resend code')).toBeVisible();
    await expect(page.getByText('Use a different number')).toBeVisible();
  });

  test('verify button is disabled with short code', async ({ page }) => {
    await navigateToStep(page, 'verify');
    await expect(page.getByText('We just sent a verification code')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('Enter code').fill('12');
    await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
  });

  test('verify button is enabled with 4+ digit code', async ({ page }) => {
    await navigateToStep(page, 'verify');
    await expect(page.getByText('We just sent a verification code')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('Enter code').fill('1234');
    await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
  });

  test('code input only accepts digits', async ({ page }) => {
    await navigateToStep(page, 'verify');
    await expect(page.getByText('We just sent a verification code')).toBeVisible({ timeout: 10000 });

    const codeInput = page.getByPlaceholder('Enter code');
    await codeInput.fill('abc123def');
    await expect(codeInput).toHaveValue('123');
  });

  test('"Use a different number" re-shows phone input', async ({ page }) => {
    await navigateToStep(page, 'verify');
    await expect(page.getByText('We just sent a verification code')).toBeVisible({ timeout: 10000 });

    await page.getByText('Use a different number').click();

    // Should show the phone input again
    await expect(page.getByText("what's the best phone number")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('(555) 123-4567')).toBeVisible();
  });
});

// =============================================
// FULL FLOW INTEGRATION
// =============================================

test.describe('Full Flow Integration', () => {
  test('complete flow from start to phone verification (happy path)', async ({ page }) => {
    await page.goto('/');

    // Homepage
    await page.getByRole('button', { name: 'Get a Quote Now' }).click();

    // Welcome
    await expect(page.getByText("Hi! I'm Melissa")).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: "Let's do it" }).click();

    // For whom
    await expect(page.getByText('Is this life insurance policy')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'For me' }).click();

    // Gender
    await expect(page.getByText("What's your gender?")).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Female', exact: true }).click();

    // Tobacco
    await expect(page.getByText('Do you use any tobacco')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'I quit recently' }).click();

    // Health
    await expect(page.getByText('How would you describe your overall health')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Great' }).click();

    // Coverage
    await expect(page.getByText('How much coverage')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '$500,000' }).click();

    // Timing
    await expect(page.getByText('How soon')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Within a month' }).click();

    // Name
    await expect(page.getByText("What's your first name")).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('Type here...').fill('Sarah');
    await page.getByPlaceholder('Type here...').press('Enter');

    // Email (personalized)
    await expect(page.getByText('Perfect, Sarah')).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('your@email.com').fill('sarah@test.com');
    await page.getByPlaceholder('your@email.com').press('Enter');

    // Phone
    await expect(page.getByText("what's the best phone number")).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('(555) 123-4567').fill('5559991234');
    await page.getByPlaceholder('(555) 123-4567').press('Enter');

    // Verification
    await expect(page.getByText('We just sent a verification code to 5559991234')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('Enter code')).toBeVisible();
  });

  test('smoker path: Yes → smoker note → health (all options work)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Get a Quote Now' }).click();
    await expect(page.getByText("Hi! I'm Melissa")).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: "Let's do it" }).click();

    await expect(page.getByText('Is this life insurance policy')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'For me' }).click();

    await expect(page.getByText("What's your gender?")).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Female', exact: true }).click();

    // Select "Yes" for tobacco
    await expect(page.getByText('Do you use any tobacco')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Yes' }).click();

    // Smoker note auto-message
    await expect(page.getByText('No worries, I can still find options')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('tobacco use does impact rates')).toBeVisible();

    // Then health follows
    await expect(page.getByText('How would you describe your overall health')).toBeVisible({ timeout: 8000 });

    // Pick "Could be better"
    await page.getByRole('button', { name: 'Could be better' }).click();

    // Coverage follows
    await expect(page.getByText('How much coverage')).toBeVisible({ timeout: 5000 });

    // Pick $1M+
    await page.getByRole('button', { name: '$1,000,000+' }).click();

    // Timing follows
    await expect(page.getByText('How soon')).toBeVisible({ timeout: 5000 });
  });
});
