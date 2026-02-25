// --- Conversation Types ---

export type InputType = 'auto' | 'options' | 'text' | 'number' | 'email' | 'phone' | 'consent' | 'rates_display' | 'phone_cta' | 'verify_code';

export interface ConversationOption {
  label: string;
  value: string;
  icon?: string;
}

export interface ConversationStep {
  id: string;
  message: string | ((answers: ConversationAnswers) => string);
  inputType: InputType;
  options?: ConversationOption[] | ((answers: ConversationAnswers) => ConversationOption[]);
  validation?: (value: string, answers: ConversationAnswers) => string | null;
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
  selectedValue?: string;
  selectedLabel?: string;
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
  age: number;
  gender: string;
  smokerStatus: string;
  healthClass: string;
  coverageAmount: number;
  termLength: number;
  householdIncome?: string;
  ratesShown: CarrierQuote[];

  firstName: string;
  email: string;
  phone: string;
  zip: string;

  consentGiven: boolean;
  consentText: string;
  ipAddress: string;

  // UTM tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landingPage?: string;
}
