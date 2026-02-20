import { ConversationStep, ConversationAnswers, ConversationOption } from './types';

const isForSelf = (answers: ConversationAnswers) => answers.for_whom !== 'other';

export const conversationSteps: ConversationStep[] = [
  {
    id: 'welcome',
    message:
      "Hi! I'm Melissa. I help dads like you find affordable life insurance so your family is always protected. This takes about two minutes to complete. Ready to get started?",
    inputType: 'options',
    options: [{ label: "Let's do it", value: 'yes' }],
    next: 'for_whom',
  },

  // --- Insurance questions first (sunk cost) ---
  {
    id: 'for_whom',
    message: 'Is this life insurance policy for you or for someone else?',
    inputType: 'options',
    options: [
      { label: 'For me', value: 'self' },
      { label: 'For someone else', value: 'other' },
    ],
    next: 'gender',
  },
  {
    id: 'gender',
    message: (answers) =>
      isForSelf(answers)
        ? "What's your gender? (This affects life insurance rates.)"
        : "What's their gender? (This affects life insurance rates.)",
    inputType: 'options',
    options: [
      { label: 'Male', value: 'male', icon: 'male' },
      { label: 'Female', value: 'female', icon: 'female' },
    ],
    next: 'smoker',
  },
  {
    id: 'smoker',
    message: (answers) =>
      isForSelf(answers)
        ? 'Do you use any tobacco products?'
        : 'Do they use any tobacco products?',
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
    message:
      "No worries, I can still find options. Just know that tobacco use does impact rates. Some carriers offer better rates for smokers than others, so it's still worth comparing.",
    inputType: 'auto',
    next: 'health',
  },
  {
    id: 'health',
    message: (answers) =>
      isForSelf(answers)
        ? 'How would you describe your overall health?'
        : 'How would you describe their overall health?',
    inputType: 'options',
    options: [
      { label: 'Excellent', value: 'preferred_plus', icon: 'hearts5' },
      { label: 'Great', value: 'preferred', icon: 'hearts4' },
      { label: 'Good', value: 'standard_plus', icon: 'hearts3' },
      { label: 'Could be better', value: 'standard', icon: 'hearts1' },
    ],
    next: 'coverage',
  },
  {
    id: 'coverage',
    message: 'How much coverage are you looking for?',
    inputType: 'options',
    options: [
      { label: '$250,000', value: '250000' },
      { label: '$500,000', value: '500000' },
      { label: '$750,000', value: '750000' },
      { label: '$1,000,000', value: '1000000' },
      { label: '$1,000,000+', value: '1500000' },
    ],
    next: 'timing',
  },
  {
    id: 'timing',
    message: 'How soon are you wanting to get this policy started?',
    inputType: 'options',
    options: [
      { label: 'Right away', value: 'right_away' },
      { label: 'Within a month', value: 'within_month' },
      { label: 'In a few months', value: 'few_months' },
      { label: "I'm not sure", value: 'not_sure' },
    ],
    next: 'name',
  },

  // --- Personal info (after insurance questions) ---
  {
    id: 'name',
    message:
      "Just a couple pieces of personal info so we can tailor this quote to you. What's your first name?",
    inputType: 'text',
    validation: (value) => {
      if (!value.trim() || value.trim().length < 1) return 'Please enter your name.';
      return null;
    },
    next: 'email',
  },
  {
    id: 'email',
    message: (answers) => `Perfect, ${answers.name}! What's the best email to reach you?`,
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
    message: "And what's the best phone number for us to contact you?",
    inputType: 'phone',
    validation: (value) => {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 10) return 'Please enter a valid 10-digit phone number.';
      return null;
    },
    next: 'phone_verify',
  },
  {
    id: 'phone_verify',
    message: (answers) =>
      `We just sent a verification code to ${answers.phone}. Can you check your texts and enter it below?`,
    inputType: 'verify_code',
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
  {
    id: 'age',
    message: (answers) =>
      isForSelf(answers)
        ? 'Last question, how old are you?'
        : 'Last question, how old are they?',
    inputType: 'number',
    validation: (value) => {
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 18 || n > 85) return 'Please enter an age between 18 and 85.';
      return null;
    },
    next: 'consent',
  },

  // --- Consent BEFORE quotes ---
  {
    id: 'consent',
    message: (answers) =>
      `All set, ${answers.name}. I have some quotes ready for you. Before I can show them, please confirm the following:`,
    inputType: 'consent',
    next: (_answers, value) => (value === 'decline' ? 'soft_decline' : 'calculating'),
  },
  {
    id: 'soft_decline',
    message: (answers) =>
      `No problem at all, ${answers.name}! When you're ready to protect your family, just come back anytime.`,
    inputType: 'auto',
    next: 'done',
  },
  {
    id: 'calculating',
    message: (answers) => `One moment, ${answers.name}. Let me crunch the numbers...`,
    inputType: 'auto',
    next: 'rates_display',
  },
  {
    id: 'rates_display',
    message: (answers) =>
      `Here's what I found for you, ${answers.name}. These are estimated monthly rates from top-rated carriers:`,
    inputType: 'rates_display',
    next: 'lock_in',
  },
  {
    id: 'lock_in',
    message: (answers) =>
      `${answers.name}, if you want to lock in this rate, you can speak to a representative right now. Just tap the number below and we can connect you right away.`,
    inputType: 'phone_cta',
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
