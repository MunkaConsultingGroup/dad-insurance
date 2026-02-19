import { ConversationStep, ConversationAnswers, ConversationOption } from './types';

export const conversationSteps: ConversationStep[] = [
  {
    id: 'welcome',
    message: "Hi! I'm Melissa. I help dads like you find affordable life insurance so your family is always protected. This takes about 2 minutes \u2014 no spam, no pressure. Ready?",
    inputType: 'options',
    options: [
      { label: "Let's do it", value: 'yes' },
      { label: 'Tell me more first', value: 'more' },
    ],
    next: (_answers, value) => (value === 'more' ? 'explainer' : 'name'),
  },
  {
    id: 'explainer',
    message: "I'll ask a few quick questions, then show you estimated rates from top-rated carriers. Most dads are surprised how affordable it is. If you like what you see, a licensed agent can lock in your exact rate. Your info stays private until you say otherwise.",
    inputType: 'options',
    options: [{ label: 'Sounds good', value: 'ok' }],
    next: 'name',
  },

  // --- Contact info upfront ---
  {
    id: 'name',
    message: "Awesome! What's your first name?",
    inputType: 'text',
    validation: (value) => {
      if (!value.trim() || value.trim().length < 1) return 'Please enter your name.';
      return null;
    },
    next: 'email',
  },
  {
    id: 'email',
    message: (answers) => `Nice to meet you, ${answers.name}! What's the best email to reach you?`,
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
    message: "What's your ZIP code?",
    inputType: 'text',
    validation: (value) => {
      const zipRegex = /^\d{5}$/;
      if (!zipRegex.test(value.trim())) return 'Please enter a valid 5-digit ZIP code.';
      return null;
    },
    next: 'age',
  },

  // --- Insurance questions (personalized) ---
  {
    id: 'age',
    message: (answers) => `Perfect, ${answers.name}! Now let's find your rates. How old are you?`,
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
      { label: 'Male', value: 'male', icon: 'male' },
      { label: 'Female', value: 'female', icon: 'female' },
    ],
    next: 'smoker',
  },
  {
    id: 'smoker',
    message: 'Do you use any tobacco products?',
    inputType: 'options',
    options: [
      { label: 'No, never', value: 'never', icon: 'noSmoking' },
      { label: 'I quit recently', value: 'former', icon: 'clock' },
      { label: 'Yes', value: 'current', icon: 'cigarette' },
    ],
    next: (_answers, value) => (value === 'current' ? 'smoker_note' : 'health'),
  },
  {
    id: 'smoker_note',
    message: "No worries \u2014 I can still find you options. Just know that tobacco use does significantly impact rates. Some carriers offer better rates for smokers than others, so it's still worth comparing.",
    inputType: 'auto',
    next: 'health',
  },
  {
    id: 'health',
    message: (answers) => `How would you describe your overall health, ${answers.name}?`,
    inputType: 'options',
    options: [
      { label: 'Excellent', value: 'preferred_plus', icon: 'heartPlus' },
      { label: 'Good', value: 'preferred', icon: 'heart' },
      { label: 'Average', value: 'standard_plus', icon: 'heartHalf' },
      { label: 'Below average', value: 'standard', icon: 'heartMinus' },
    ],
    next: 'coverage',
  },
  {
    id: 'coverage',
    message: 'How much coverage are you looking for?',
    inputType: 'options',
    options: [
      { label: '$100,000', value: '100000', icon: 'shield100' },
      { label: '$250,000', value: '250000', icon: 'shield250' },
      { label: '$500,000', value: '500000', icon: 'shield500' },
      { label: '$750,000', value: '750000', icon: 'shield750' },
      { label: '$1,000,000', value: '1000000', icon: 'shieldMax' },
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
        { label: '10 years', value: '10', icon: 'cal10' },
        { label: '15 years', value: '15', icon: 'cal15' },
        { label: '20 years', value: '20', icon: 'cal20' },
      ];
      if (age <= 60) opts.push({ label: '25 years', value: '25', icon: 'cal25' });
      if (age <= 55) opts.push({ label: '30 years', value: '30', icon: 'cal30' });
      return opts;
    },
    next: 'calculating',
  },
  {
    id: 'calculating',
    message: (answers) => `Great choices, ${answers.name}! Let me crunch the numbers...`,
    inputType: 'auto',
    next: 'rates_display',
  },
  {
    id: 'rates_display',
    message: (answers) => `Here's what I found for you, ${answers.name}. These are estimated monthly rates from top-rated carriers \u2014 that's the cost of keeping your family protected:`,
    inputType: 'rates_display',
    next: 'lead_intro',
  },
  {
    id: 'lead_intro',
    message: (answers) => `${answers.name}, want to lock in your exact rate? A licensed agent will confirm your price and help you get covered \u2014 so your kids and family are always taken care of. No obligation.`,
    inputType: 'options',
    options: [
      { label: 'Yes, connect me', value: 'yes', icon: 'handshake' },
      { label: 'Not right now', value: 'no', icon: 'wave' },
    ],
    next: (_answers, value) => (value === 'no' ? 'soft_decline' : 'consent'),
  },
  {
    id: 'soft_decline',
    message: (answers) => `No problem at all, ${answers.name}! Your estimated rates are saved. When you're ready to protect your family, just come back anytime.`,
    inputType: 'auto',
    next: 'done',
  },
  {
    id: 'consent',
    message: (answers) => `Almost done, ${answers.name}! Please review and confirm below so a licensed agent can reach out.`,
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
      `You're all set, ${answers.name}! A licensed agent will reach out within 24 hours to confirm your rates and help get your family covered. They'll have your profile, so you won't need to repeat anything. Your family is in good hands.`,
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
