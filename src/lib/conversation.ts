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
    next: (_answers, value) => (value === 'more' ? 'explainer' : 'age'),
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
    message: () => {
      return 'Great, let me crunch the numbers for you...';
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
    next: (_answers, value) => (value === 'no' ? 'soft_decline' : 'name'),
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
